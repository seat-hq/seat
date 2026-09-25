---
title: Risk Engine Overview
description: The fail-closed philosophy, the two enforcement layers, and the full rule inventory.
order: 1
---

## The operating rule

From the repo's risk disclosure: **uncertain = do not trade.** Every ambiguity resolves against execution:

- Asset not authoritatively verified and enabled → skip
- Oracle price missing, zero, negative, or stale → skip
- Session undeterminable or closed → skip
- Caps would be exceeded → resize or skip
- Drawdown breached → halt new copies

This is implemented, not aspirational: `RiskModule.evaluate` returns `Reject` for every one of these cases, and the keeper's off-chain port does the same before anything is submitted.

## Two layers, one rule set

| Layer | Code | Role |
|---|---|---|
| On-chain enforcement | `RiskModule.evaluate` (called by `DeskVault.executeCopy`) | Final authority; reverts the trade on `Reject` |
| Off-chain explanation | `evaluateRisk` in `keeper/src/executor.ts` | Decides whether to submit; records the reason on the tape |

The keeper's port mirrors the on-chain order (halt → session → price → sizing → caps) and adds one practical check the on-chain function leaves to a revert: cash availability for buys.

## The rule inventory

| Rule | Where enforced | Status |
|---|---|---|
| Desk must be configured | On-chain | 🟢 Implemented |
| Per-desk token allowlist | On-chain (+ SwapAdapter global list) | 🟢 Implemented |
| Session closed ⇒ no trade | On-chain + keeper | 🟢 Implemented |
| Session size multipliers (100% / 30% / 30%) | On-chain + keeper | 🟢 Implemented |
| Price staleness bound (default 120 s) | On-chain + keeper | 🟢 Implemented |
| Future-price rejection | On-chain + keeper | 🟢 Implemented |
| Drawdown halt (default 20% from HWM) | On-chain + keeper | 🟢 Implemented |
| Per-fill cap | On-chain + keeper | 🟢 Implemented |
| Per-position cap (buys) | On-chain + keeper | 🟢 Implemented |
| Gross exposure cap (buys) | On-chain + keeper | 🟢 Implemented |
| Sell only what you hold | On-chain + keeper | 🟢 Implemented |
| Cash availability (buys) | Keeper (on-chain: swap reverts) | 🟢 Implemented |
| Registry verification gate (`isTradeEligible`) | Keeper live guards | 🟢 Implemented |
| Holiday calendar | — | 🔴 Not implemented (documented approximation) |
| Bond slashing for bad leaders | — | 🔴 Phase 3 |

## What risk is *not* handled

Honest boundaries, from the code and the risk disclosure:

- **Slippage beyond `minAmountOut`.** The keeper computes a floor from the observed price; thin pools can still deliver exactly that floor.
- **Leader quality.** The risk engine bounds *size and timing*, not *judgment*. A desk can lose money on copies.
- **Gap risk across sessions.** Prices can move while the session is closed and the desk cannot trade.
- **Oracle manipulation/failure** beyond the staleness and positivity checks.
- **Keeper liveness.** A stopped keeper means missed copies, not protected exits — the drawdown halt only triggers when copies are evaluated.

See [Security → Limitations](/docs/security/limitations) for the full list.
