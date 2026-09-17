// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IDeskVault} from "./interfaces/IDeskVault.sol";
import {IRiskModule} from "./interfaces/IRiskModule.sol";
import {ISwapAdapter} from "./interfaces/ISwapAdapter.sol";
import {NavLib} from "./libraries/NavLib.sol";

/// @title DeskVault
/// @notice Holds USDG (and, in later phases, allowlisted stock tokens) and
///         issues seat shares. Phase 0 holds USDG cash only: no swaps execute
///         (the SwapAdapter fails closed), so NAV == cash. Withdrawals are
///         instant when cash is available, otherwise queued.
contract DeskVault is IDeskVault, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint8 public constant SHARE_PRECISION = 6;

    IERC20 public immutable usdg;
    IRiskModule public immutable riskModule;
    ISwapAdapter public immutable swapAdapter;
    address public immutable leader;

    uint256 public totalShares;
    mapping(address => uint256) public sharesOf;

    /// @notice USDG cash held by the desk (base units).
    uint256 public cashUsdg;

    /// @notice Keeper authorized to submit copies (paper-only in Phase 0).
    address public keeper;

    struct WithdrawRequest {
        address user;
        uint256 assetsUsdg;
        bool fulfilled;
    }

    WithdrawRequest[] public withdrawQueue;
    /// @notice Next queue index awaiting fulfillment.
    uint256 public queueHead;

    event KeeperSet(address indexed keeper);

    error NotKeeper();
    error ZeroAmount();
    error InsufficientShares();

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
    }

    // --- Admin ---------------------------------------------------------------

    function setKeeper(address newKeeper) external onlyOwner {
        keeper = newKeeper;
        emit KeeperSet(newKeeper);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Views ---------------------------------------------------------------

    function asset() external view returns (address) {
        return address(usdg);
    }

    /// @notice Phase 0: NAV equals USDG cash (no valued positions).
    function totalAssetsUsdg() public view returns (uint256) {
        return cashUsdg;
    }

    function navPerShare() external view returns (uint256) {
        return NavLib.navPerShare(totalAssetsUsdg(), totalShares, SHARE_PRECISION);
    }

    function withdrawQueueLength() external view returns (uint256) {
        return withdrawQueue.length;
    }

    // --- Deposits / redemptions ---------------------------------------------

    function deposit(uint256 assetsUsdg) external nonReentrant whenNotPaused returns (uint256 shares) {
        if (assetsUsdg == 0) revert ZeroAmount();
        uint256 equity = totalAssetsUsdg();
        shares = NavLib.sharesForDeposit(assetsUsdg, totalShares, equity);
        require(shares > 0, "zero shares");

        usdg.safeTransferFrom(msg.sender, address(this), assetsUsdg);
        cashUsdg += assetsUsdg;
        totalShares += shares;
        sharesOf[msg.sender] += shares;

        emit Deposit(msg.sender, assetsUsdg, shares);
    }

    function redeem(uint256 shares) external nonReentrant returns (uint256 assetsUsdg) {
        if (shares == 0) revert ZeroAmount();
        if (sharesOf[msg.sender] < shares) revert InsufficientShares();

        uint256 equity = totalAssetsUsdg();
        assetsUsdg = NavLib.assetsForRedeem(shares, totalShares, equity);

        // Burn shares first (checks-effects-interactions).
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
    }

    /// @notice Fulfill queued withdrawals in FIFO order while cash is available.
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

    // --- Copy execution (Phase 0: fails closed) ------------------------------

    /// @notice Submit a copy trade. In Phase 0 the SwapAdapter has no verified
    ///         router configured, so this reverts — there is no live trading.
    function executeCopy(
        address token,
        bool isBuy,
        uint256 sizeUsdg,
        IRiskModule.Session session,
        uint256 priceUpdatedAt
    ) external nonReentrant whenNotPaused {
        if (msg.sender != keeper) revert NotKeeper();

        IRiskModule.CheckInput memory input = IRiskModule.CheckInput({
            desk: address(this),
            token: token,
            isBuy: isBuy,
            sizeUsdg: sizeUsdg,
            positionValueUsdg: 0,
            grossExposureUsdg: 0,
            navPerShare: NavLib.navPerShare(totalAssetsUsdg(), totalShares, SHARE_PRECISION),
            highWaterNavPerShare: 0,
            session: session,
            priceUpdatedAt: priceUpdatedAt,
            nowTs: block.timestamp
        });

        (IRiskModule.Decision decision, uint256 allowed,) = riskModule.evaluate(input);
        require(decision == IRiskModule.Decision.Accept, "risk rejected");

        // Fail closed: SwapAdapter.execute reverts in Phase 0.
        ISwapAdapter.SwapParams memory p = ISwapAdapter.SwapParams({
            tokenIn: isBuy ? address(usdg) : token,
            tokenOut: isBuy ? token : address(usdg),
            amountIn: allowed,
            minAmountOut: 0,
            recipient: address(this)
        });
        swapAdapter.execute(p);
    }
}
