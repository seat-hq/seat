---
title: FeeModule
description: Pure fee math — high-water performance fee, time-prorated AUM fee, and the leader/protocol/staker split.
order: 7
status: implemented
---

`contracts/src/FeeModule.sol` — inherits `Ownable`.

> Fee math for desks: high-water-mark performance fee, time-based AUM fee, and 70/20/10 leader/protocol/staker split. Pure math + owner-set params. There is NO volume fee (by design). Amounts in USDG base units.

## Storage

`params` — a single `FeeParams` struct:

| Field | Meaning | Constraint |
|---|---|---|
| `performanceFeeBps` | Performance fee on profit above the high-water mark | `≤ 10_000` |
| `aumFeeBpsPerYear` | Annualized AUM fee | — |
| `protocolShareBps` | Protocol's share of any fee | `protocolShareBps + stakerShareBps ≤ 10_000` |
| `stakerShareBps` | Stakers' share; the remainder goes to the leader | — |

## Interface

| Function | Returns |
|---|---|
| `setParams(newParams)` | Owner. Emits `ParamsUpdated`. |
| `performanceFee(profitUsdg)` | `profit × performanceFeeBps / 10_000` |
| `aumFee(aumUsdg, elapsedSec)` | `aum × aumFeeBpsPerYear × elapsed / (10_000 × 365 days)` |
| `splitFee(feeUsdg) → FeeSplit` | `{ protocolUsdg, leaderUsdg, stakerUsdg }`; leader is the remainder |

## Events

`ParamsUpdated(performanceFeeBps, aumFeeBpsPerYear, protocolShareBps, stakerShareBps)`.

## Deployment configurations

| Deploy script | perf | AUM | protocol | staker | ⇒ leader |
|---|---|---|---|---|---|
| `DeployTestnet` (live on 46630) | 1000 | 200 | 2000 | 0 | 80% |
| `DeployMainnet` (guarded) | 1000 | 200 | 2000 | 0 | 80% |
| `DeployPhase2` (guarded) | 1000 | 200 | 2000 | 1000 | 70% |

## Interactions

Called only by `DeskVault`: `_accrueFees` uses `aumFee`/`performanceFee`; `_tryPayFees` uses `splitFee`. The module never holds funds.
