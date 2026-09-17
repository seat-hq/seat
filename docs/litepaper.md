# SEAT — Litepaper (Phase 0)

SEAT is a protocol for USDG-denominated **copy-trading desks** on Robinhood
Chain. A desk mirrors the trades of an opted-in leader across a small set of
authoritatively verified, official Stock Tokens (initially NVDA, AAPL, SPY).
Depositors receive **seat shares** representing a pro-rata claim on desk equity
(NAV), computed from USDG cash plus the USDG value of held Stock Tokens.

This document describes the concept. It makes **no guarantees** of returns and
is **not investment advice**. See [`risk.md`](risk.md) and
[`not-affiliated.md`](not-affiliated.md).

## Phase 0 — Paper Copy

Phase 0 exists to prove the mechanism **without real money**:

- The keeper observes hypothetical leader fills and produces copy signals.
- The risk module accepts/rejects/sizes each signal deterministically.
- Execution is **paper only** — no router is configured and no funds move.
- Every decision is explainable (why a fill was copied, resized, or skipped).

Nothing in Phase 0 should be deposited against on mainnet.

## Accounting

- Accounting asset: **USDG** (6 decimals).
- Gas asset: **ETH**.
- NAV = USDG cash + Σ(token UI balance × oracle price) − liabilities.
- Seat NAV = desk equity ÷ outstanding seat shares.
- Token balances use the authoritative `balanceOfUI()` supported-balance
  interface, never raw ERC-20 `balanceOf()`.

## Sessions

Copy sizing depends on the market session. After-hours size is strictly smaller
than cash-session size. When the session or price is uncertain, the system fails
closed (does not trade).

## Components

| Component | Role |
|---|---|
| `DeskFactory` | One `DeskVault` per leader |
| `DeskVault` | Holds USDG + Stock Tokens, issues seat shares |
| `RiskModule` | Caps, session clock, drawdown halt, skip rules |
| `SwapAdapter` | Restricted swap surface (no arbitrary calldata) |
| `FeeModule` | High-water performance fee + AUM accrual |
| `SeatToken` | Governance stub — not deployed in Phase 0 |

## Roadmap (non-binding)

1. **Phase 0** — paper copy, deterministic risk, full test coverage.
2. **Phase 1** — testnet deposits/redeems, read-only UI on real data.
3. **Later** — verified router integration, live desks, governance token
   (only after a desk has 30 live days).
