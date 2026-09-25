---
title: SDK (Architecture)
description: Why the SDK exists — one registry and one NAV definition shared by keeper, app and docs.
order: 11
---

**Responsibility.** Be the single off-chain source of truth for two things: **which assets a desk may hold** and **how NAV is computed**. **Package:** `sdk/` (`@seat/sdk`). Full API docs in the [SDK section](/docs/sdk/installation).

## The two modules

### `registry.ts` — the official Stock Token registry

Every candidate asset is a row with a **verification state**, per chain:

- `placeholder` — seeded concept, no address asserted (e.g. NVDA/AAPL/SPY on 46630).
- `unverified` — real address and bytecode confirmed, but no cited price feed (TSLA, AMZN, PLTR, NFLX, AMD on 46630).
- `verified` — address, issuer, decimals, bytecode and feed all confirmed (NVDA, AAPL, SPY on 4663).

Only `verified` **and** `enabled` rows with a concrete address, decimals and feed pass `isTradeEligible(symbol, chainId)`. The registry's own header states the rule the whole repo follows: *no token addresses are invented.*

### `nav.ts` — fixed-point NAV math

`calculateNav`, `valuePosition`, `navPerShare`, `normalizeBalance`, `normalizePrice`, `formatUsdg` — all `bigint`, no floating point, mirroring the on-chain `NavLib`. Errors are structured (`NavError` with codes like `STALE_PRICE`, `ZERO_PRICE`) so callers can fail closed deliberately.

### `index.ts` — chain constants

`CHAIN.MAINNET_ID = 4663`, `CHAIN.TESTNET_ID = 46630`, `GAS_ASSET = "ETH"`, `ACCOUNTING_ASSET = "USDG"`, `DEPOSIT_CAP_USDG = 50_000e6`.

## Who consumes it

| Consumer | Uses |
|---|---|
| Keeper | Registry membership in the signaler, trade-eligibility in live guards, NAV math in the paper executor |
| App | `CHAIN`, `formatUsdg`, `listSymbols` for the paper desk |
| Site (this docs site) | Numbers in the narrative are unit-tested against the same rules |

## Why it matters

The keeper deciding "is this symbol allowed" with a different list than the contracts, or computing NAV differently than the vault, would be a classic copy-trading bug class. The SDK exists so there is exactly one answer to both questions everywhere off-chain — and `NavLib` is the same answer on-chain.
