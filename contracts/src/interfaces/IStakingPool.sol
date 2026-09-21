// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title IStakingPool
/// @notice $SEAT staking that receives USDG fee share from desks.
interface IStakingPool {
    function notifyReward(uint256 amountUsdg) external;
}
