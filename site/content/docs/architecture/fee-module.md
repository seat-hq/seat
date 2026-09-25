---
title: FeeModule (Architecture)
description: Pure fee math — high-water performance fee, time-based AUM fee, and the 70/20/10 split.
order: 6
---

**Responsibility.** Compute fees and splits. `FeeModule` is deliberately stateless about desks: it holds one `FeeParams` struct (owner-set) and exposes three pure functions. All custody and liability accounting stays in `DeskVault`.

**Contract:** `contracts/src/FeeModule.sol` — reference: [FeeModule](/docs/contracts/fee-module).

## Interface

| Function | Formula |
|---|---|
| `performanceFee(profitUsdg)` | `profit × performanceFeeBps / 10_000` |
| `aumFee(aumUsdg, elapsedSec)` | `aum × aumFeeBpsPerYear × elapsed / (10_000 × 365 days)` |
| `splitFee(feeUsdg)` | protocol `= fee × protocolShareBps / 10_000`, staker likewise, leader = remainder |

Validation in `setParams`: `performanceFeeBps ≤ 10_000`, `protocolShareBps + stakerShareBps ≤ 10_000`.

## Why stateless

Fees are computed *by* the vault *at* state transitions (deposit, redeem, copy), using the vault's own equity and high-water mark. Keeping the module pure means:

- the math is trivially unit-testable (see `FeeModule.t.sol`),
- one module can serve many desks,
- there is no fee state to corrupt — only the vault's `feeLiabilitiesUsdg`.

## Parameters by deployment

| Deployment | Performance | AUM | Split (leader/protocol/staker) |
|---|---|---|---|
| Testnet `46630` (live) | 10% | 2%/yr | 80 / 20 / 0 |
| `DeployMainnet` (guarded) | 10% | 2%/yr | 80 / 20 / 0 |
| `DeployPhase2` (guarded) | 10% | 2%/yr | 70 / 20 / 10 |

## Interactions

`DeskVault._accrueFees` calls `aumFee` and `performanceFee`; `_tryPayFees` calls `splitFee` and pushes the staker slice to `StakingPool.notifyReward`. If the staker recipient is unset, that slice stays an unpaid liability in the vault — it is never rerouted to the protocol or leader.
