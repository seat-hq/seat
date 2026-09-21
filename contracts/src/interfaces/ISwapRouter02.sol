// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title ISwapRouter02
/// @notice Uniswap SwapRouter02 `exactInputSingle` (no deadline field).
///         4663 address cited in docs/phase-1-live.md.
interface ISwapRouter02 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}
