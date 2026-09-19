# SEAT — Litepaper

SEAT is a protocol for USDG-denominated **copy-trading desks** on Robinhood
Chain. A desk mirrors the trades of an opted-in leader across a small set of
authoritatively verified, official Stock Tokens (initially NVDA, AAPL, SPY).
Depositors receive **seat shares** representing a pro-rata claim on desk equity
(NAV), computed from USDG cash plus the USDG value of held Stock Tokens.

This document describes the concept. It makes **no guarantees** of returns and
is **not investment advice**. See [`risk.md`](risk.md) and
[`not-affiliated.md`](not-affiliated.md).

## Status

**Phase 0 is shipped** (paper copy, deterministic risk, no funds move).

**Phase 1 is shipped on Robinhood testnet `46630`**: factory + cash vault
deploy, USDG deposit/redeem in the blotter, keeper bound to `vault.leader()`,
honest fill tape (`source=fixture|chain`). There is **no `$SEAT` token**.
Stock Token copies stay paper/skip until the registry is verified. SEAT is
**not affiliated** with Robinhood Markets.

Nothing in this repository should be deposited against on mainnet (`4663`).

## Phase 0 — Paper Copy

Phase 0 exists to prove the mechanism **without real money**:

- The keeper observes hypothetical leader fills and produces copy signals.
- The risk module accepts/rejects/sizes each signal deterministically.
- Execution is **paper only** — no router is configured and no funds move.
- Every decision is explainable (why a fill was copied, resized, or skipped).

## Phase 1 — Testnet desks

Phase 1 wires the cash vault to testnet:

- `DeskFactory.createDesk(leader)` on `46630` (optional in the deploy script).
- Depositors approve USDG and mint seat shares; redeem is instant when cash
  is available, otherwise queued.
- The app reads NAV, shares, cash, and leader from the vault. Deposit/redeem
  are enabled only when connected on `46630` with a real vault address.
- The keeper does **not** pick a leader. It reads `vault.leader()` (or an
  explicit `LEADER_ADDRESS` fallback).
- Fill tape rows are labeled `source=fixture` or `source=chain`. Fixtures are
  never labeled live.
- Live execution still fails closed: no SwapAdapter router, unverified
  registry, and mainnet `4663` is a hard error.

## Accounting

- Accounting asset: **USDG** (6 decimals).
- Gas asset: **ETH**.
- NAV = USDG cash + Σ(token UI balance × oracle price) − liabilities.
- Seat NAV = desk equity ÷ outstanding seat shares.
- Token balances use the authoritative `balanceOfUI()` supported-balance
  interface, never raw ERC-20 `balanceOf()`.
- Phase 1 vaults are cash-only, so NAV equals USDG cash.

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
| `SeatToken` | Governance stub — not deployed in Phase 0 or Phase 1 |

## Roadmap (non-binding)

1. **Phase 0** — paper copy, deterministic risk, full test coverage. **Shipped.**
2. **Phase 1** — testnet deposits/redeems, blotter on real 46630 data. **Shipped.**
3. **Later** — verified router integration, live desks, governance token
   (only after a desk has 30 live days).
