---
title: NAV Math API
description: calculateNav, valuePosition, navPerShare and the normalization helpers — bigint fixed-point, mirroring NavLib.
order: 3
---

Source: `sdk/src/nav.ts`. All arithmetic is integer fixed-point with `bigint`; there is no floating point anywhere in the accounting path. These functions are the TypeScript twins of `NavLib` — same formulas, same truncation (toward zero), same fail-closed validation.

## Types

```ts
const USDG_DECIMALS = 6;

interface PriceData {
  value: bigint;      // price of one whole token in USDG, fixed-point
  decimals: number;   // e.g. 8 for the cited Chainlink feeds
  updatedAt: number;  // unix seconds
}

interface Position {
  symbol: string;
  uiBalance: bigint;  // from balanceOfUI(), token base units
  decimals: number;
  price: PriceData;
}

interface NavOptions {
  now?: number;              // required when maxStalenessSec is set
  maxStalenessSec?: number;  // older prices throw STALE_PRICE
  liabilities?: bigint;      // fees to subtract, USDG base units
  usdgDecimals?: number;     // defaults to 6
}

interface NavResult {
  cash: bigint;
  positionsValue: bigint;
  liabilities: bigint;
  equity: bigint;            // cash + positionsValue − liabilities
}
```

## Functions

### `valuePosition(position, opts?) → bigint`

```
value = uiBalance × price.value × 10^usdgDecimals
        / (10^tokenDecimals × 10^priceDecimals)
```

Validates decimals ranges, non-negative balance, positive price, and staleness when `maxStalenessSec` is set.

### `calculateNav(cashUsdg, positions, opts?) → NavResult`

Sums position values and returns `{ cash, positionsValue, liabilities, equity }`. Throws `NavError` on negative cash/liabilities or any invalid position.

### `navPerShare(equityUsdg, totalShares, sharePrecision = 6) → bigint`

`equity × 10^sharePrecision / totalShares`; returns `0n` for a shareless desk.

### `normalizeBalance(amount, fromDecimals, toDecimals) → bigint`

Rescales an integer amount between fixed-point precisions. Scaling down truncates toward zero; negative amounts throw.

### `normalizePrice(value, fromDecimals, toDecimals) → bigint`

Same rescaling for prices, rejecting non-positive values (`ZERO_PRICE`).

### `formatUsdg(amount, usdgDecimals = 6) → string`

Display-only formatting: `12_345_000000n → "12345.000000"`. Never parse the result back into accounting math.

## A complete example

```ts
import { calculateNav, navPerShare, formatUsdg, type Position } from "@seat/sdk";

const now = Math.floor(Date.now() / 1000);

const positions: Position[] = [
  {
    symbol: "NVDA",
    uiBalance: 41_666666666666666666n,  // ≈ 41.67 NVDA (UI balance)
    decimals: 18,
    price: { value: 120_00000000n, decimals: 8, updatedAt: now - 30 },
  },
];

const nav = calculateNav(15_000_000000n, positions, {
  now,
  maxStalenessSec: 120,
  liabilities: 200_000000n,             // accrued fees
});

console.log(formatUsdg(nav.positionsValue)); // position value in USDG
console.log(formatUsdg(nav.equity));         // desk equity
console.log(formatUsdg(navPerShare(nav.equity, 20_000_000000n))); // per share
```

:::callout{type="tip"}
When in doubt, compute twice: once with the SDK off-chain and once by reading `DeskVault.totalAssetsUsdg()` / `navPerShare()` on-chain. They implement the same formulas; a disagreement means your inputs (balances, prices, liabilities) differ — investigate before trusting either.
:::
