---
title: Keeper (Concept)
description: The off-chain operator that observes leader fills and triggers vault copies — what it is, and what happens when it stops.
order: 7
---

## Plain English

The **keeper** is the desk's employee. It watches the leader's trading activity, decides what the desk should do about each fill (copy it at full size, copy it smaller, or skip it), and — when the desk is live — submits the copy transaction to the vault. It is software run by the protocol operator, not a trusted fund manager: on-chain, it can only call one function, and that function re-runs the risk checks before any trade executes.

If the keeper goes offline, the worst case is **missed copies**, not lost funds. Deposits, redemptions and the withdrawal queue do not depend on the keeper.

## Technically

The keeper is a TypeScript process (`keeper/`) built from small, separately testable modules:

| Module | Responsibility |
|---|---|
| `indexer.ts` | Fill sources: `StaticFillSource` (fixtures) and `LiveFillSource` (ERC-20 `Transfer` logs for registry tokens) |
| `signaler.ts` | `normalizeFill`: registry membership, non-zero notional, valid price — fail closed |
| `session.ts` | US equities session clock (America/New_York), fail closed when undeterminable |
| `executor.ts` | `evaluateRisk` (TS port of the on-chain rules), `PaperExecutor`, `LiveExecutor` guards |
| `submit.ts` | Encodes `executeCopy` calldata; submits only when every live guard passes |
| `vault.ts` | Desk/leader resolution: `DESK_ADDRESSES` → `DESK_ADDRESS` → factory `allDesks` → `LEADER_ADDRESS` fallback |
| `chain.ts` | RPC/WS config with secret-redacting logs |
| `fills.ts` | Writes the outcome tape to `keeper/data/fills.json` |

### Authority

On-chain, the keeper's entire power is that `DeskVault.executeCopy` requires `msg.sender == keeper`. That call:

- re-evaluates the trade through `RiskModule.evaluate` and reverts unless the decision is `Accept`,
- can only swap through the restricted `SwapAdapter`,
- cannot move funds to the keeper, deposit, withdraw, or touch shares.

The keeper address is set by the owner (`setKeeper`). The keeper is a **single operator** in the current phase — a documented trust assumption; see [Security](/docs/security/security-model).

### Modes

| Mode | Trigger | Effect |
|---|---|---|
| `PAPER` (default) | `EXECUTION_MODE` unset or `PAPER` | Simulates copies against a static market; writes the tape; no transactions |
| `LIVE` | `EXECUTION_MODE=LIVE` **and** `SWAP_ROUTER_CONFIGURED=1` | Observes chain fills and submits copies — itself gated by chain id, registry eligibility, and `SEAT_SUBMIT_TX=1` |

The full guard matrix is in [Execution modes](/docs/keeper/execution-modes).

## What happens when the keeper is offline

- **No new copies.** The desk simply holds its current cash and positions.
- **NAV still moves** with the market prices of held positions.
- **Deposits and instant redemptions** keep working (they do not involve the keeper).
- **Queued redemptions** wait for cash; anyone can call `processWithdrawals` once the vault has cash.
- The owner can always `pause()` the vault to block new deposits and copies while leaving redemptions-to-queue functional.
