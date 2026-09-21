// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IExactInputRouter} from "./interfaces/IExactInputRouter.sol";
import {ISwapAdapter} from "./interfaces/ISwapAdapter.sol";

/// @title SwapAdapter
/// @notice Restricted swap adapter. Never accepts arbitrary calldata. Only an
///         owner-set router implementing IExactInputRouter and allowlisted
///         tokens may be used. router = 0 (46630: no cited DEX) => revert.
///         4663 sets ExactInputRouter02 (SwapRouter02 wrapper), not the
///         Uniswap router directly.
contract SwapAdapter is ISwapAdapter, Ownable {
    using SafeERC20 for IERC20;

    address public router;
    mapping(address => bool) public allowedToken;

    error RouterNotConfigured();
    error TokenNotAllowed(address token);

    event RouterSet(address indexed router);
    event TokenAllowed(address indexed token, bool allowed);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setRouter(address newRouter) external onlyOwner {
        router = newRouter;
        emit RouterSet(newRouter);
    }

    function setAllowedToken(address token, bool allowed) external onlyOwner {
        allowedToken[token] = allowed;
        emit TokenAllowed(token, allowed);
    }

    function validate(SwapParams calldata params)
        public
        view
        returns (bool ok, string memory reason)
    {
        if (router == address(0)) return (false, "router not configured");
        if (!allowedToken[params.tokenIn]) return (false, "tokenIn not allowed");
        if (!allowedToken[params.tokenOut]) return (false, "tokenOut not allowed");
        return (true, "ok");
    }

    function quote(SwapParams calldata params) external view returns (uint256) {
        (bool ok,) = validate(params);
        if (!ok) {
            if (router == address(0)) revert RouterNotConfigured();
            revert TokenNotAllowed(
                !allowedToken[params.tokenIn] ? params.tokenIn : params.tokenOut
            );
        }
        // No official 46630 quoter. Tests use MockRouter via execute only.
        revert RouterNotConfigured();
    }

    function execute(SwapParams calldata params) external returns (uint256 amountOut) {
        if (router == address(0)) revert RouterNotConfigured();
        if (!allowedToken[params.tokenIn]) revert TokenNotAllowed(params.tokenIn);
        if (!allowedToken[params.tokenOut]) revert TokenNotAllowed(params.tokenOut);

        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        IERC20(params.tokenIn).forceApprove(router, params.amountIn);
        amountOut = IExactInputRouter(router).swapExactIn(
            params.tokenIn,
            params.tokenOut,
            params.amountIn,
            params.minAmountOut,
            params.recipient
        );
        IERC20(params.tokenIn).forceApprove(router, 0);
    }
}
