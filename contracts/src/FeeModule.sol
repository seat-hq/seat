// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title FeeModule
/// @notice Fee math for desks: high-water-mark performance fee, time-based AUM
///         fee, and protocol/leader split. Pure math + owner-set params. There
///         is NO volume fee (by design). All amounts in USDG base units.
contract FeeModule is Ownable {
    uint256 internal constant BPS = 10_000;
    uint256 internal constant YEAR = 365 days;

    struct FeeParams {
        /// @dev Performance fee on profit above the high-water mark, in bps.
        uint16 performanceFeeBps;
        /// @dev Annualized AUM fee, in bps per year.
        uint16 aumFeeBpsPerYear;
        /// @dev Protocol's share of any fee, in bps (remainder goes to leader).
        uint16 protocolShareBps;
    }

    struct FeeSplit {
        uint256 protocolUsdg;
        uint256 leaderUsdg;
    }

    FeeParams public params;

    event ParamsUpdated(uint16 performanceFeeBps, uint16 aumFeeBpsPerYear, uint16 protocolShareBps);

    constructor(address initialOwner, FeeParams memory initialParams) Ownable(initialOwner) {
        _setParams(initialParams);
    }

    function setParams(FeeParams calldata newParams) external onlyOwner {
        _setParams(newParams);
    }

    function _setParams(FeeParams memory p) internal {
        require(p.performanceFeeBps <= BPS, "perf>100%");
        require(p.protocolShareBps <= BPS, "proto>100%");
        params = p;
        emit ParamsUpdated(p.performanceFeeBps, p.aumFeeBpsPerYear, p.protocolShareBps);
    }

    /// @notice Performance fee on realized profit above the high-water mark.
    function performanceFee(uint256 profitUsdg) public view returns (uint256) {
        return (profitUsdg * params.performanceFeeBps) / BPS;
    }

    /// @notice Time-prorated AUM fee for `elapsedSec` on `aumUsdg`.
    function aumFee(uint256 aumUsdg, uint256 elapsedSec) public view returns (uint256) {
        return (aumUsdg * params.aumFeeBpsPerYear * elapsedSec) / (BPS * YEAR);
    }

    /// @notice Split a fee into protocol and leader portions.
    function splitFee(uint256 feeUsdg) public view returns (FeeSplit memory) {
        uint256 protocolUsdg = (feeUsdg * params.protocolShareBps) / BPS;
        return FeeSplit({protocolUsdg: protocolUsdg, leaderUsdg: feeUsdg - protocolUsdg});
    }
}
