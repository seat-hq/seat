// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title SeatToken (STUB — DO NOT DEPLOY IN PHASE 0 OR PHASE 1)
/// @notice Placeholder for a future governance/utility token. Per protocol
///         rules there is NO mint function and the token MUST NOT be deployed
///         until at least one desk has 30 live days. This stub intentionally
///         has no supply, no mint, and no transfer logic.
///
/// @dev Deployment is guarded: the constructor always reverts so the artifact
///      cannot be put on-chain during Phase 0 or Phase 1.
contract SeatToken {
    string public constant name = "SEAT";
    string public constant symbol = "SEAT";

    error NotDeployableInPhase0();

    constructor() {
        revert NotDeployableInPhase0();
    }
}
