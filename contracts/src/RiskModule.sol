// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IRiskModule} from "./interfaces/IRiskModule.sol";

/// @title RiskModule
/// @notice Deterministic, fail-closed risk checks for copy trades. Configured
///         per desk by the owner (governance/operator). Applies session sizing,
///         per-fill / per-position / gross caps, staleness and drawdown halts.
contract RiskModule is IRiskModule, Ownable {
    uint256 internal constant BPS = 10_000;

    struct DeskConfig {
        uint256 maxFillUsdg;
        uint256 maxPositionUsdg;
        uint256 maxGrossExposureUsdg;
        uint16 maxDrawdownBps;
        uint32 maxStalenessSec;
        bool configured;
    }

    mapping(address => DeskConfig) public deskConfig;
    /// @dev desk => token => allowed.
    mapping(address => mapping(address => bool)) public allowedToken;
    /// @dev desk => session => size multiplier (bps of requested size).
    mapping(address => mapping(Session => uint16)) public sessionBps;

    event DeskConfigured(address indexed desk);
    event TokenAllowed(address indexed desk, address indexed token, bool allowed);
    event SessionRiskSet(address indexed desk, Session session, uint16 bps);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function configureDesk(
        address desk,
        uint256 maxFillUsdg,
        uint256 maxPositionUsdg,
        uint256 maxGrossExposureUsdg,
        uint16 maxDrawdownBps,
        uint32 maxStalenessSec
    ) external onlyOwner {
        require(desk != address(0), "desk=0");
        require(maxDrawdownBps <= BPS, "dd>100%");
        deskConfig[desk] = DeskConfig({
            maxFillUsdg: maxFillUsdg,
            maxPositionUsdg: maxPositionUsdg,
            maxGrossExposureUsdg: maxGrossExposureUsdg,
            maxDrawdownBps: maxDrawdownBps,
            maxStalenessSec: maxStalenessSec,
            configured: true
        });
        emit DeskConfigured(desk);
    }

    function setTokenAllowed(address desk, address token, bool allowed) external onlyOwner {
        allowedToken[desk][token] = allowed;
        emit TokenAllowed(desk, token, allowed);
    }

    function setSessionRisk(address desk, Session session, uint16 bps) external onlyOwner {
        require(bps <= BPS, "bps>100%");
        sessionBps[desk][session] = bps;
        emit SessionRiskSet(desk, session, bps);
    }

    /// @inheritdoc IRiskModule
    function evaluate(CheckInput calldata input)
        external
        view
        returns (Decision decision, uint256 allowedSizeUsdg, string memory reason)
    {
        DeskConfig memory cfg = deskConfig[input.desk];
        if (!cfg.configured) {
            return (Decision.Reject, 0, "desk not configured");
        }
        if (!allowedToken[input.desk][input.token]) {
            return (Decision.Reject, 0, "token not allowed");
        }
        if (input.session == Session.Closed) {
            return (Decision.Reject, 0, "session closed");
        }
        uint16 sizeBps = sessionBps[input.desk][input.session];
        if (sizeBps == 0) {
            return (Decision.Reject, 0, "session not tradable");
        }
        // Staleness (fail closed on future or too-old prices).
        if (input.nowTs < input.priceUpdatedAt) {
            return (Decision.Reject, 0, "price in future");
        }
        if (input.nowTs - input.priceUpdatedAt > cfg.maxStalenessSec) {
            return (Decision.Reject, 0, "price stale");
        }
        // Drawdown halt.
        if (input.highWaterNavPerShare > 0 && input.navPerShare < input.highWaterNavPerShare) {
            uint256 ddBps =
                ((input.highWaterNavPerShare - input.navPerShare) * BPS) / input.highWaterNavPerShare;
            if (ddBps >= cfg.maxDrawdownBps) {
                return (Decision.Reject, 0, "drawdown halt");
            }
        }
        if (input.sizeUsdg == 0) {
            return (Decision.Reject, 0, "zero size");
        }

        // Session sizing then caps.
        uint256 size = (input.sizeUsdg * sizeBps) / BPS;
        if (size == 0) {
            return (Decision.Reject, 0, "size rounds to zero");
        }
        if (size > cfg.maxFillUsdg) {
            size = cfg.maxFillUsdg;
        }

        if (input.isBuy) {
            if (input.positionValueUsdg >= cfg.maxPositionUsdg) {
                return (Decision.Reject, 0, "position cap reached");
            }
            uint256 posHeadroom = cfg.maxPositionUsdg - input.positionValueUsdg;
            if (size > posHeadroom) {
                size = posHeadroom;
            }
            if (input.grossExposureUsdg >= cfg.maxGrossExposureUsdg) {
                return (Decision.Reject, 0, "gross cap reached");
            }
            uint256 grossHeadroom = cfg.maxGrossExposureUsdg - input.grossExposureUsdg;
            if (size > grossHeadroom) {
                size = grossHeadroom;
            }
        } else {
            if (input.positionValueUsdg == 0) {
                return (Decision.Reject, 0, "no position to sell");
            }
            if (size > input.positionValueUsdg) {
                size = input.positionValueUsdg;
            }
        }

        if (size == 0) {
            return (Decision.Reject, 0, "size reduced to zero");
        }
        return (Decision.Accept, size, "accepted");
    }
}
