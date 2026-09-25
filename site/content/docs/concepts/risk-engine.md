---
title: Risk Engine (Concept)
description: The deterministic, fail-closed rule set every copy must pass — twice.
order: 8
---

## Plain English

Before the desk copies any trade, the trade goes through a fixed list of questions, in a fixed order:

1. Is this desk configured?
2. Is this exact token allowed for this desk?
3. Is the market open? (And which session are we in?)
4. Is the price fresh — or missing, zero, or from the future?
5. Is the desk in a drawdown halt?
6. How big may the copy be — after the session multiplier, the per-fill cap, the per-position cap, the gross-exposure cap, and the cash the vault actually has?

Any "no" or "unknown" ends the trade. There is no override and no discretion: the same inputs always produce the same decision, and every decision carries a human-readable reason.

## Technically

The rules exist **twice**, deliberately:

- **On-chain:** `RiskModule.evaluate(CheckInput)` — a pure `view` function. `DeskVault.executeCopy` calls it in the same transaction as the swap and reverts unless it returns `Accept`. This is the enforcement layer.
- **Off-chain:** `evaluateRisk` in the keeper (`keeper/src/executor.ts`) — a TypeScript port used to decide *whether to submit at all* and to record the reason on the tape. This is the explanation layer.

### The decision type

On-chain, evaluation returns `(decision, allowedSizeUsdg, reason)`:

- `Reject` with a reason string — the vault reverts with `"risk rejected"`.
- `Accept` with `allowedSizeUsdg ≤ requestedSize` — the vault swaps exactly the allowed size.

The keeper mirrors this as `accept` / `resize` / `skip` outcomes on the fill tape.

### The rules, in evaluation order

| # | Rule | Failure reason |
|---|---|---|
| 1 | Desk configured | `desk not configured` |
| 2 | Token allowlisted for this desk | `token not allowed` |
| 3 | Session not closed | `session closed` |
| 4 | Session multiplier configured | `session not tradable` |
| 5 | Price not from the future | `price in future` |
| 6 | Price age ≤ `maxStalenessSec` (default 120s) | `price stale` |
| 7 | Drawdown from high-water < `maxDrawdownBps` (default 2000 = 20%) | `drawdown halt` |
| 8 | Requested size > 0 | `zero size` |
| 9 | Session-sized amount > 0 | `size rounds to zero` |
| 10 | Clamp to per-fill cap | (resize) |
| 11 | Buys: clamp to position-cap headroom, reject if none | `position cap reached` |
| 12 | Buys: clamp to gross-exposure headroom, reject if none | `gross cap reached` |
| 13 | Sells: require an existing position, clamp to its value | `no position to sell` |
| 14 | Final size > 0 | `size reduced to zero` |

The keeper adds one more practical clamp the pure on-chain function leaves to a revert: **cash availability** (a buy is resized down to the vault's free USDG; on-chain, insufficient cash reverts the swap).

Deep dive with parameters, defaults and citations: [Risk Engine section](/docs/risk/overview).
