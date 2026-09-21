// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IStakingPool} from "./interfaces/IStakingPool.sol";

/// @title StakingPool
/// @notice Stake $SEAT, earn pro-rata USDG from desk fee harvest. No rebase.
contract StakingPool is IStakingPool, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 internal constant ACC_PRECISION = 1e18;

    IERC20 public immutable seat;
    IERC20 public immutable usdg;

    uint256 public totalStaked;
    uint256 public accUsdgPerShare;
    uint256 public undistributedUsdg;

    mapping(address => uint256) public stakedOf;
    mapping(address => uint256) public rewardDebt;
    mapping(address => uint256) public claimedUsdg;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event Claimed(address indexed user, uint256 usdgAmount);
    event RewardNotified(uint256 amountUsdg, uint256 distributed);

    error ZeroAmount();

    constructor(address seat_, address usdg_) {
        require(seat_ != address(0), "seat=0");
        require(usdg_ != address(0), "usdg=0");
        seat = IERC20(seat_);
        usdg = IERC20(usdg_);
    }

    function pendingUsdg(address user) public view returns (uint256) {
        uint256 acc = accUsdgPerShare;
        if (totalStaked > 0 && undistributedUsdg > 0) {
            acc += (undistributedUsdg * ACC_PRECISION) / totalStaked;
        }
        return (stakedOf[user] * acc) / ACC_PRECISION - rewardDebt[user];
    }

    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (totalStaked > 0) {
            _foldUndistributed();
            _claim(msg.sender);
        }
        seat.safeTransferFrom(msg.sender, address(this), amount);
        bool first = totalStaked == 0;
        stakedOf[msg.sender] += amount;
        totalStaked += amount;
        if (undistributedUsdg > 0) {
            accUsdgPerShare += (undistributedUsdg * ACC_PRECISION) / totalStaked;
            undistributedUsdg = 0;
        }
        // First staker after idle rewards keeps rewardDebt at 0 so they earn
        // the folded acc. Later stakes checkpoint at the current acc.
        if (first) {
            rewardDebt[msg.sender] = 0;
        } else {
            rewardDebt[msg.sender] = (stakedOf[msg.sender] * accUsdgPerShare) / ACC_PRECISION;
        }
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        require(stakedOf[msg.sender] >= amount, "stake");
        _foldUndistributed();
        _claim(msg.sender);
        stakedOf[msg.sender] -= amount;
        totalStaked -= amount;
        rewardDebt[msg.sender] = (stakedOf[msg.sender] * accUsdgPerShare) / ACC_PRECISION;
        seat.safeTransfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    function claim() external nonReentrant {
        _foldUndistributed();
        _claim(msg.sender);
        rewardDebt[msg.sender] = (stakedOf[msg.sender] * accUsdgPerShare) / ACC_PRECISION;
    }

    /// @notice Pull USDG from the caller (desk vault) and credit stakers.
    function notifyReward(uint256 amountUsdg) external nonReentrant {
        if (amountUsdg == 0) revert ZeroAmount();
        usdg.safeTransferFrom(msg.sender, address(this), amountUsdg);
        if (totalStaked == 0) {
            undistributedUsdg += amountUsdg;
            emit RewardNotified(amountUsdg, 0);
            return;
        }
        uint256 dist = amountUsdg + undistributedUsdg;
        undistributedUsdg = 0;
        accUsdgPerShare += (dist * ACC_PRECISION) / totalStaked;
        emit RewardNotified(amountUsdg, dist);
    }

    function _foldUndistributed() internal {
        if (undistributedUsdg == 0 || totalStaked == 0) return;
        accUsdgPerShare += (undistributedUsdg * ACC_PRECISION) / totalStaked;
        undistributedUsdg = 0;
    }

    function _claim(address user) internal {
        uint256 pending = (stakedOf[user] * accUsdgPerShare) / ACC_PRECISION - rewardDebt[user];
        if (pending == 0) return;
        claimedUsdg[user] += pending;
        usdg.safeTransfer(user, pending);
        emit Claimed(user, pending);
    }
}
