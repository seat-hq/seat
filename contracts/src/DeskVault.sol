// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {FeeModule} from "./FeeModule.sol";
import {IDeskVault} from "./interfaces/IDeskVault.sol";
import {IRiskModule} from "./interfaces/IRiskModule.sol";
import {IScaledUIAmount} from "./interfaces/IScaledUIAmount.sol";
import {IStakingPool} from "./interfaces/IStakingPool.sol";
import {ISwapAdapter} from "./interfaces/ISwapAdapter.sol";
import {IPriceOracle, NavLib} from "./libraries/NavLib.sol";

/// @title DeskVault
/// @notice USDG desk: seat shares, oracle NAV, fee liabilities, keeper copies.
///         Live swaps require a configured SwapAdapter router (none on 46630).
///         Mainnet uses depositCapUsdg = 50_000e6 (0 = unlimited, testnet).
contract DeskVault is IDeskVault, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint8 public constant SHARE_PRECISION = 6;
    uint8 internal constant USDG_DECIMALS = 6;
    uint32 internal constant DEFAULT_STALENESS = 120;

    IERC20 public immutable usdg;
    IRiskModule public immutable riskModule;
    ISwapAdapter public immutable swapAdapter;
    address public immutable leader;

    IPriceOracle public oracle;
    FeeModule public feeModule;
    address public protocolRecipient;
    address public leaderFeeRecipient;
    address public stakerRecipient;

    uint256 public totalShares;
    mapping(address => uint256) public sharesOf;
    uint256 public cashUsdg;
    uint256 public feeLiabilitiesUsdg;
    uint256 public highWaterNavPerShare;
    uint256 public lastFeeTs;
    uint32 public maxStalenessSec = DEFAULT_STALENESS;

    address public keeper;
    address[] public heldTokens;
    mapping(address => bool) public isHeld;
    /// @notice Max desk equity after a deposit, in USDG base units. 0 = none.
    uint256 public depositCapUsdg;

    struct WithdrawRequest {
        address user;
        uint256 assetsUsdg;
        bool fulfilled;
    }

    WithdrawRequest[] public withdrawQueue;
    uint256 public queueHead;

    event KeeperSet(address indexed keeper);
    event OracleSet(address indexed oracle);
    event FeeModuleSet(address indexed feeModule);
    event FeeRecipientsSet(address indexed protocol, address indexed leaderPayee, address indexed staker);
    event FeesAccrued(uint256 aumUsdg, uint256 performanceUsdg, uint256 liabilities);
    event FeesPaid(uint256 protocolUsdg, uint256 leaderUsdg, uint256 stakerUsdg);
    event CopyExecuted(address indexed token, bool isBuy, uint256 amountIn, uint256 amountOut);
    event DepositCapSet(uint256 capUsdg);

    error NotKeeper();
    error ZeroAmount();
    error InsufficientShares();
    error ZeroMinOut();
    error MissingOracle();
    error StalePrice();
    error DepositCap();

    constructor(
        address initialOwner,
        address usdg_,
        IRiskModule riskModule_,
        ISwapAdapter swapAdapter_,
        address leader_
    ) Ownable(initialOwner) {
        require(usdg_ != address(0), "usdg=0");
        require(leader_ != address(0), "leader=0");
        usdg = IERC20(usdg_);
        riskModule = riskModule_;
        swapAdapter = swapAdapter_;
        leader = leader_;
        leaderFeeRecipient = leader_;
    }

    function setKeeper(address newKeeper) external onlyOwner {
        keeper = newKeeper;
        emit KeeperSet(newKeeper);
    }

    function setOracle(IPriceOracle newOracle) external onlyOwner {
        oracle = newOracle;
        emit OracleSet(address(newOracle));
    }

    function setFeeModule(FeeModule newFeeModule) external onlyOwner {
        feeModule = newFeeModule;
        emit FeeModuleSet(address(newFeeModule));
    }

    function setMaxStalenessSec(uint32 sec) external onlyOwner {
        maxStalenessSec = sec == 0 ? DEFAULT_STALENESS : sec;
    }

    function setFeeRecipients(address protocol, address leaderPayee, address staker) external onlyOwner {
        protocolRecipient = protocol;
        leaderFeeRecipient = leaderPayee;
        stakerRecipient = staker;
        emit FeeRecipientsSet(protocol, leaderPayee, staker);
    }

    function setDepositCap(uint256 capUsdg) external onlyOwner {
        depositCapUsdg = capUsdg;
        emit DepositCapSet(capUsdg);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function asset() external view returns (address) {
        return address(usdg);
    }

    function heldTokenCount() external view returns (uint256) {
        return heldTokens.length;
    }

    function totalAssetsUsdg() public view returns (uint256) {
        return _equityWithPending();
    }

    function navPerShare() external view returns (uint256) {
        return NavLib.navPerShare(totalAssetsUsdg(), totalShares, SHARE_PRECISION);
    }

    function withdrawQueueLength() external view returns (uint256) {
        return withdrawQueue.length;
    }

    function deposit(uint256 assetsUsdg) external nonReentrant whenNotPaused returns (uint256 shares) {
        if (assetsUsdg == 0) revert ZeroAmount();
        _accrueFees();
        uint256 equity = _equity();
        if (depositCapUsdg != 0 && equity + assetsUsdg > depositCapUsdg) revert DepositCap();
        shares = NavLib.sharesForDeposit(assetsUsdg, totalShares, equity);
        require(shares > 0, "zero shares");

        usdg.safeTransferFrom(msg.sender, address(this), assetsUsdg);
        cashUsdg += assetsUsdg;
        totalShares += shares;
        sharesOf[msg.sender] += shares;
        _touchHighWater();
        _tryPayFees();

        emit Deposit(msg.sender, assetsUsdg, shares);
    }

    function redeem(uint256 shares) external nonReentrant returns (uint256 assetsUsdg) {
        if (shares == 0) revert ZeroAmount();
        if (sharesOf[msg.sender] < shares) revert InsufficientShares();

        _accrueFees();
        uint256 equity = _equity();
        assetsUsdg = NavLib.assetsForRedeem(shares, totalShares, equity);

        sharesOf[msg.sender] -= shares;
        totalShares -= shares;

        if (!paused() && cashUsdg >= assetsUsdg) {
            cashUsdg -= assetsUsdg;
            usdg.safeTransfer(msg.sender, assetsUsdg);
            emit Redeem(msg.sender, shares, assetsUsdg);
        } else {
            uint256 id = withdrawQueue.length;
            withdrawQueue.push(
                WithdrawRequest({user: msg.sender, assetsUsdg: assetsUsdg, fulfilled: false})
            );
            emit Redeem(msg.sender, shares, assetsUsdg);
            emit WithdrawQueued(msg.sender, id, assetsUsdg);
        }
        _tryPayFees();
    }

    function processWithdrawals(uint256 maxCount) external nonReentrant whenNotPaused {
        uint256 processed;
        while (queueHead < withdrawQueue.length && processed < maxCount) {
            WithdrawRequest storage req = withdrawQueue[queueHead];
            if (req.fulfilled) {
                queueHead++;
                continue;
            }
            if (cashUsdg < req.assetsUsdg) break;
            req.fulfilled = true;
            cashUsdg -= req.assetsUsdg;
            usdg.safeTransfer(req.user, req.assetsUsdg);
            emit WithdrawFulfilled(req.user, queueHead, req.assetsUsdg);
            queueHead++;
            processed++;
        }
    }

    function executeCopy(
        address token,
        bool isBuy,
        uint256 sizeUsdg,
        IRiskModule.Session session,
        uint256 priceUpdatedAt,
        uint256 minAmountOut
    ) external nonReentrant whenNotPaused {
        if (msg.sender != keeper) revert NotKeeper();
        if (minAmountOut == 0) revert ZeroMinOut();
        if (sizeUsdg == 0) revert ZeroAmount();

        _accrueFees();

        uint256 posVal = _tokenValue(token);
        uint256 gross = _positionsValue();
        uint256 nps = NavLib.navPerShare(_equity(), totalShares, SHARE_PRECISION);

        IRiskModule.CheckInput memory input = IRiskModule.CheckInput({
            desk: address(this),
            token: token,
            isBuy: isBuy,
            sizeUsdg: sizeUsdg,
            positionValueUsdg: posVal,
            grossExposureUsdg: gross,
            navPerShare: nps,
            highWaterNavPerShare: highWaterNavPerShare,
            session: session,
            priceUpdatedAt: priceUpdatedAt,
            nowTs: block.timestamp
        });

        (IRiskModule.Decision decision, uint256 allowed,) = riskModule.evaluate(input);
        require(decision == IRiskModule.Decision.Accept, "risk rejected");

        uint256 amountIn;
        address tokenIn;
        address tokenOut;
        if (isBuy) {
            amountIn = allowed;
            tokenIn = address(usdg);
            tokenOut = token;
            require(cashUsdg >= amountIn, "cash");
        } else {
            amountIn = _usdgToTokenAmount(token, allowed);
            require(amountIn > 0, "token in=0");
            tokenIn = token;
            tokenOut = address(usdg);
        }

        IERC20(tokenIn).forceApprove(address(swapAdapter), amountIn);
        ISwapAdapter.SwapParams memory p = ISwapAdapter.SwapParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            recipient: address(this)
        });
        uint256 amountOut = swapAdapter.execute(p);
        IERC20(tokenIn).forceApprove(address(swapAdapter), 0);

        if (isBuy) {
            cashUsdg -= amountIn;
            _markHeld(token);
        } else {
            cashUsdg += amountOut;
        }

        _accrueFees();
        _touchHighWater();
        _tryPayFees();
        emit CopyExecuted(token, isBuy, amountIn, amountOut);
    }

    // --- Internal accounting -------------------------------------------------

    function _markHeld(address token) internal {
        if (!isHeld[token]) {
            isHeld[token] = true;
            heldTokens.push(token);
        }
    }

    function _staleness() internal view returns (uint32) {
        return maxStalenessSec == 0 ? DEFAULT_STALENESS : maxStalenessSec;
    }

    function _positionsValue() internal view returns (uint256 total) {
        uint256 n = heldTokens.length;
        for (uint256 i; i < n; i++) {
            total += _tokenValue(heldTokens[i]);
        }
    }

    function _tokenValue(address token) internal view returns (uint256) {
        uint256 ui;
        try IScaledUIAmount(token).balanceOfUI(address(this)) returns (uint256 v) {
            ui = v;
        } catch {
            try IERC20(token).balanceOf(address(this)) returns (uint256 v2) {
                ui = v2;
            } catch {
                return 0;
            }
        }
        if (ui == 0) return 0;
        if (address(oracle) == address(0)) revert MissingOracle();
        (uint256 px, uint8 pdec, uint256 updatedAt) = oracle.price(token);
        if (px == 0) revert NavLib.ZeroPrice();
        if (updatedAt > block.timestamp || block.timestamp - updatedAt > _staleness()) {
            revert StalePrice();
        }
        uint8 tdec = IERC20Metadata(token).decimals();
        return NavLib.valuePosition(ui, tdec, px, pdec, USDG_DECIMALS);
    }

    function _usdgToTokenAmount(address token, uint256 usdgAmount) internal view returns (uint256) {
        if (address(oracle) == address(0)) revert MissingOracle();
        (uint256 px, uint8 pdec,) = oracle.price(token);
        if (px == 0) revert NavLib.ZeroPrice();
        uint8 tdec = IERC20Metadata(token).decimals();
        // tokens = usdg * 10^tdec * 10^pdec / (price * 10^usdgDec)
        return (usdgAmount * (10 ** uint256(tdec)) * (10 ** uint256(pdec))) / (px * (10 ** uint256(USDG_DECIMALS)));
    }

    function _grossEquity() internal view returns (uint256) {
        return cashUsdg + _positionsValue();
    }

    function _equity() internal view returns (uint256) {
        uint256 gross = _grossEquity();
        if (feeLiabilitiesUsdg >= gross) return 0;
        return NavLib.equity(cashUsdg, _positionsValue(), feeLiabilitiesUsdg);
    }

    function _pendingFeeDelta() internal view returns (uint256) {
        if (address(feeModule) == address(0) || totalShares == 0) return 0;
        uint256 extra;
        if (lastFeeTs != 0 && block.timestamp > lastFeeTs) {
            uint256 base = _equity();
            extra += feeModule.aumFee(base, block.timestamp - lastFeeTs);
        }
        uint256 liab = feeLiabilitiesUsdg + extra;
        uint256 gross = _grossEquity();
        uint256 eq = gross > liab ? gross - liab : 0;
        uint256 nav = NavLib.navPerShare(eq, totalShares, SHARE_PRECISION);
        if (highWaterNavPerShare > 0 && nav > highWaterNavPerShare) {
            uint256 profit = ((nav - highWaterNavPerShare) * totalShares) / (10 ** uint256(SHARE_PRECISION));
            extra += feeModule.performanceFee(profit);
        }
        return extra;
    }

    function _equityWithPending() internal view returns (uint256) {
        uint256 gross = _grossEquity();
        uint256 liab = feeLiabilitiesUsdg + _pendingFeeDelta();
        if (liab >= gross) return 0;
        return gross - liab;
    }

    function _accrueFees() internal {
        if (address(feeModule) == address(0) || totalShares == 0) {
            lastFeeTs = block.timestamp;
            return;
        }
        uint256 aumCharged;
        if (lastFeeTs != 0 && block.timestamp > lastFeeTs) {
            aumCharged = feeModule.aumFee(_equity(), block.timestamp - lastFeeTs);
            feeLiabilitiesUsdg += aumCharged;
        }
        lastFeeTs = block.timestamp;

        uint256 perfCharged;
        uint256 nav = NavLib.navPerShare(_equity(), totalShares, SHARE_PRECISION);
        if (highWaterNavPerShare == 0) {
            highWaterNavPerShare = nav;
        } else if (nav > highWaterNavPerShare) {
            uint256 profit = ((nav - highWaterNavPerShare) * totalShares) / (10 ** uint256(SHARE_PRECISION));
            perfCharged = feeModule.performanceFee(profit);
            feeLiabilitiesUsdg += perfCharged;
            highWaterNavPerShare = NavLib.navPerShare(_equity(), totalShares, SHARE_PRECISION);
        }
        if (aumCharged > 0 || perfCharged > 0) {
            emit FeesAccrued(aumCharged, perfCharged, feeLiabilitiesUsdg);
        }
    }

    function _touchHighWater() internal {
        if (totalShares == 0) return;
        uint256 nav = NavLib.navPerShare(_equity(), totalShares, SHARE_PRECISION);
        if (nav > highWaterNavPerShare) {
            highWaterNavPerShare = nav;
        }
    }

    function _tryPayFees() internal {
        uint256 due = feeLiabilitiesUsdg;
        if (due == 0 || address(feeModule) == address(0)) return;
        address proto = protocolRecipient;
        address lead = leaderFeeRecipient == address(0) ? leader : leaderFeeRecipient;
        if (proto == address(0) || lead == address(0)) return;

        FeeModule.FeeSplit memory s = feeModule.splitFee(due);
        bool stakerReady = s.stakerUsdg == 0 || stakerRecipient != address(0);
        uint256 payout = stakerReady ? due : s.protocolUsdg + s.leaderUsdg;
        if (payout == 0 || cashUsdg < payout) return;

        cashUsdg -= payout;
        feeLiabilitiesUsdg = stakerReady ? 0 : s.stakerUsdg;
        if (s.protocolUsdg > 0) usdg.safeTransfer(proto, s.protocolUsdg);
        if (s.leaderUsdg > 0) usdg.safeTransfer(lead, s.leaderUsdg);
        uint256 stakerPaid;
        if (stakerReady && s.stakerUsdg > 0) {
            usdg.forceApprove(stakerRecipient, s.stakerUsdg);
            IStakingPool(stakerRecipient).notifyReward(s.stakerUsdg);
            usdg.forceApprove(stakerRecipient, 0);
            stakerPaid = s.stakerUsdg;
        }
        emit FeesPaid(s.protocolUsdg, s.leaderUsdg, stakerPaid);
    }
}
