// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title IRiskModule
/// @notice Deterministic risk evaluation for copy trades. Fails closed: any
///         uncertainty (unknown token, closed session, stale price, breached
///         caps or drawdown) results in a `Reject`.
interface IRiskModule {
    enum Session {
        Closed,
        PreMarket,
        Regular,
        AfterHours
    }

    enum Decision {
        Reject,
        Accept
    }

    struct CheckInput {
        address desk;
        address token;
        bool isBuy;
        /// @dev Requested copy notional in USDG base units (before caps/session).
        uint256 sizeUsdg;
        /// @dev Current value of this token position, USDG base units.
        uint256 positionValueUsdg;
        /// @dev Current gross exposure across all positions, USDG base units.
        uint256 grossExposureUsdg;
        /// @dev Current NAV per share and high-water NAV per share.
        uint256 navPerShare;
        uint256 highWaterNavPerShare;
        Session session;
        /// @dev Oracle price timestamp and current time (for staleness).
        uint256 priceUpdatedAt;
        uint256 nowTs;
    }

    /// @notice Evaluate a copy request.
    /// @return decision Accept or Reject.
    /// @return allowedSizeUsdg Permitted size (<= requested) when accepted; 0 when rejected.
    /// @return reason Human-readable explanation.
    function evaluate(CheckInput calldata input)
        external
        view
        returns (Decision decision, uint256 allowedSizeUsdg, string memory reason);
}
