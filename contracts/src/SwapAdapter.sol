// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ISwapAdapter} from "./interfaces/ISwapAdapter.sol";

/// @title SwapAdapter
/// @notice Restricted swap adapter. It never accepts arbitrary calldata or
///         arbitrary routers. Only an owner-set, verified router and explicitly
///         allowlisted tokens may be used. In Phase 0 no router is configured,
///         so `quote` and `execute` revert — there is no live trading path.
contract SwapAdapter is ISwapAdapter, Ownable {
    /// @notice The verified router. address(0) in Phase 0 (disabled).
    address public router;
    /// @notice Explicitly allowlisted tokens.
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

    /// @inheritdoc ISwapAdapter
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

    /// @inheritdoc ISwapAdapter
    function quote(SwapParams calldata params) external view returns (uint256) {
        if (router == address(0)) revert RouterNotConfigured();
        if (!allowedToken[params.tokenIn]) revert TokenNotAllowed(params.tokenIn);
        if (!allowedToken[params.tokenOut]) revert TokenNotAllowed(params.tokenOut);
        // No verified pricing path in Phase 0.
        revert RouterNotConfigured();
    }

    /// @inheritdoc ISwapAdapter
    function execute(SwapParams calldata params) external returns (uint256) {
        // Fail closed: Phase 0 never executes real swaps.
        if (router == address(0)) revert RouterNotConfigured();
        if (!allowedToken[params.tokenIn]) revert TokenNotAllowed(params.tokenIn);
        if (!allowedToken[params.tokenOut]) revert TokenNotAllowed(params.tokenOut);
        revert RouterNotConfigured();
    }
}
