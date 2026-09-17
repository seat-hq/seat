// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title ISwapAdapter
/// @notice Restricted swap surface. Implementations MUST NOT accept arbitrary
///         calldata or arbitrary routers; only explicitly allowlisted tokens and
///         a configured, verified router may be used. In Phase 0 no router is
///         configured, so `execute` reverts (fail closed).
interface ISwapAdapter {
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        address recipient;
    }

    /// @notice Static quote for a swap. Reverts if the swap is not permitted.
    function quote(SwapParams calldata params) external view returns (uint256 amountOut);

    /// @notice Whether the swap is currently permitted (tokens allowed + router set).
    function validate(SwapParams calldata params) external view returns (bool ok, string memory reason);

    /// @notice Execute a swap. Reverts in Phase 0 (no verified router configured).
    function execute(SwapParams calldata params) external returns (uint256 amountOut);
}
