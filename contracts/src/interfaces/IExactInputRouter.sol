// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title IExactInputRouter
/// @notice Narrow swap surface. SwapAdapter calls only this function — no
///         arbitrary calldata. Foundry tests implement this on MockRouter.
///         4663 uses ExactInputRouter02 wrapping Uniswap SwapRouter02.
///         46630 has no cited DEX, so SwapAdapter.router stays address(0).
interface IExactInputRouter {
    function swapExactIn(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut);
}
