// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IExactInputRouter} from "./interfaces/IExactInputRouter.sol";
import {ISwapRouter02} from "./interfaces/ISwapRouter02.sol";

/// @title ExactInputRouter02
/// @notice Adapts Uniswap SwapRouter02.exactInputSingle to IExactInputRouter
///         so SwapAdapter never sends arbitrary calldata. Fee is constructor-
///         immutable (4663 MAG7/USDG pools exist at 3000 — see phase-1-live).
contract ExactInputRouter02 is IExactInputRouter {
    using SafeERC20 for IERC20;

    ISwapRouter02 public immutable swapRouter;
    uint24 public immutable poolFee;

    constructor(address swapRouter_, uint24 poolFee_) {
        require(swapRouter_ != address(0), "router=0");
        require(poolFee_ != 0, "fee=0");
        swapRouter = ISwapRouter02(swapRouter_);
        poolFee = poolFee_;
    }

    function swapExactIn(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut) {
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).forceApprove(address(swapRouter), amountIn);
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: poolFee,
                recipient: recipient,
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        IERC20(tokenIn).forceApprove(address(swapRouter), 0);
    }
}
