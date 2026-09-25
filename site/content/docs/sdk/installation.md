---
title: SDK Installation & Setup
description: Install @seat/sdk, understand what it contains, and make your first registry and NAV calls.
order: 1
---

`@seat/sdk` is the protocol's shared TypeScript library: the official Stock Token registry, fixed-point NAV math, and chain constants. It has **zero runtime dependencies** and is `bigint`-only in the accounting path.

## Install

The SDK is a private workspace package (`"private": true`, version `0.0.0`) — it is consumed inside the monorepo, not published to npm.

```bash
# inside the seat monorepo
pnpm add @seat/sdk@workspace:*   # already wired for keeper/ and app/
pnpm --filter @seat/sdk build    # tsc → dist/
```

## What's exported

| Surface | Exports |
|---|---|
| Registry | `OFFICIAL_STOCK_TOKENS`, `getOfficialStockToken`, `getOfficialStockTokenByAddress`, `isTradeEligible`, `listSymbols`, `listedTokenAddresses` + types `Address`, `OfficialStockToken`, `VerificationState` |
| NAV | `USDG_DECIMALS`, `NavError`, `calculateNav`, `valuePosition`, `navPerShare`, `normalizeBalance`, `normalizePrice`, `formatUsdg` + types `NavErrorCode`, `NavOptions`, `NavResult`, `Position`, `PriceData` |
| Chain | `CHAIN` |

## First calls

```ts
import { CHAIN, isTradeEligible, getOfficialStockToken, formatUsdg } from "@seat/sdk";

isTradeEligible("NVDA", CHAIN.MAINNET_ID); // true  (verified + enabled on 4663)
isTradeEligible("NVDA", CHAIN.TESTNET_ID); // false (placeholder on 46630)
isTradeEligible("TSLA", CHAIN.MAINNET_ID); // false (not in the 4663 registry)

const nvda = getOfficialStockToken("NVDA", 4663);
// → { symbol, name, chainId, address, feed, issuer, decimals, bytecodeHash, verification, enabled, note }

formatUsdg(12_345_000000n); // "12345.000000"
```

```ts
import { calculateNav, navPerShare } from "@seat/sdk";

const nav = calculateNav(8_000_000000n, [
  {
    symbol: "NVDA",
    uiBalance: 100n * 10n ** 18n,                 // 100 tokens (UI balance)
    decimals: 18,
    price: { value: 120_00000000n, decimals: 8, updatedAt: nowSec },
  },
], { now: nowSec, maxStalenessSec: 120 });

nav.equity;                 // 20_000_000000n  (8,000 cash + 12,000 position)
navPerShare(nav.equity, 20_000_000000n); // 1_000000n  (1.00 USDG/share)
```

## Error handling

All NAV validation failures throw `NavError` with a machine-readable `code`:

| Code | Thrown when |
|---|---|
| `INVALID_DECIMALS` | decimals outside `[0, 36]` or non-integer |
| `NEGATIVE_VALUE` | negative cash, balance, shares or liabilities |
| `ZERO_PRICE` | price ≤ 0 |
| `STALE_PRICE` | price age outside `maxStalenessSec` (or `now` missing) |
| `DIVIDE_BY_ZERO` | reserved division guard |

The convention is fail closed: catch `NavError`, treat the value as unknown, and do not trade on it — the same rule the contracts apply with reverts.
