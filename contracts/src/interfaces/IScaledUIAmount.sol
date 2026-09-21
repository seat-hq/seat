// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title IScaledUIAmount
/// @notice ERC-8056 UI balance used for NAV. Never use raw balanceOf for equity.
interface IScaledUIAmount {
    function balanceOfUI(address account) external view returns (uint256);
}
