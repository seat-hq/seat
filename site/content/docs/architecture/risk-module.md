---
title: RiskModule (Architecture)
description: The deterministic decision contract — pure evaluation, per-desk configuration, and why it is the enforcement layer.
order: 4
---

**Responsibility.** Given a proposed copy and the desk's current state, decide `Accept` (with an allowed size) or `Reject` (with a reason). Nothing more — it holds no funds and executes nothing.

**Contract:** `contracts/src/RiskModule.sol` — reference: [RiskModule](/docs/contracts/risk-module).

## Inputs / outputs

`evaluate(CheckInput)` is a pure `view` function. The input packs everything the decision needs: desk, token, side, requested size, current position value, gross exposure, NAV per share, high-water mark, session, price timestamp, and current time. The output is `(Decision, allowedSizeUsdg, reason)`.

Because it is pure, the keeper can simulate the exact on-chain decision off-chain, and the vault enforces it in-transaction. Same input, same answer, in both places.

## Configuration surface (owner, per desk)

| Setting | Function | Default in deploy scripts |
|---|---|---|
| Caps: fill / position / gross + drawdown + staleness | `configureDesk` | Mainnet: 5k / 20k / 50k USDG, 2000 bps, 120 s |
| Token allowlist | `setTokenAllowed` | NVDA, AAPL, SPY on 4663 |
| Session multipliers | `setSessionRisk` | regular 10000, pre/AH 3000, closed 0 |

An unconfigured desk rejects everything (`desk not configured`) — fail closed by default.

## Important state

`deskConfig[desk]`, `allowedToken[desk][token]`, `sessionBps[desk][session]`. All owner-gated; `maxDrawdownBps ≤ 10_000` and session `bps ≤ 10_000` are validated.

## Security considerations

- **Determinism is the security property.** There is no randomness, no external call, no discretion — the vault can require `Accept` and know exactly what that means.
- **Ordering matters:** cheap identity checks (configured, allowlist, session) run before arithmetic; the drawdown halt runs before any sizing; caps clamp after session sizing.
- The keeper passes `session` and `priceUpdatedAt` as *inputs* — the module trusts the vault's plumbing, and the vault trusts the keeper for those two values. A keeper lying about the session can only pick among owner-configured multipliers; a keeper lying about price freshness is bounded by the staleness window and the swap's `minAmountOut`. See [Security](/docs/security/security-model).

## Failure modes

Every rejection is a reason string returned (not a revert), so the vault can surface it and the keeper can record it: `desk not configured`, `token not allowed`, `session closed`, `session not tradable`, `price in future`, `price stale`, `drawdown halt`, `zero size`, `size rounds to zero`, `position cap reached`, `gross cap reached`, `no position to sell`, `size reduced to zero`.

## Interactions

Called only by `DeskVault.executeCopy` on-chain; mirrored off-chain by the keeper's `evaluateRisk` port. The full rule-by-rule walk is in [Risk → Decision flow](/docs/risk/decision-flow).
