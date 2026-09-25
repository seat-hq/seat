---
title: NavLib
description: The fixed-point NAV library — one definition of desk equity shared by the vault, the SDK and the keeper.
order: 9
status: implemented
---

`contracts/src/libraries/NavLib.sol` — a pure library plus the `IPriceOracle` interface.

> Fixed-point NAV math in USDG base units. No floating point. Mirrors the SDK's `nav.ts`. Multiplication precedes division to preserve precision; division truncates toward zero.

## Functions

### `valuePosition(uiBalance, tokenDecimals, price, priceDecimals, usdgDecimals) → uint256`

```
value = uiBalance × price × 10^usdgDecimals / (10^tokenDecimals × 10^priceDecimals)
```

Reverts `ZeroPrice` on `price == 0`.

### `equity(cashUsdg, positionsValueUsdg, liabilitiesUsdg) → uint256`

`cash + positions − liabilities`. (The vault guards the underflow case before calling.)

### `navPerShare(equityUsdg, totalShares, sharePrecision) → uint256`

`equity × 10^sharePrecision / totalShares`; returns `0` when there are no shares.

### `sharesForDeposit(assetsUsdg, totalShares, equityUsdg) → uint256`

Pro-rata `assets × totalShares / equity`; bootstraps **1:1** when the desk is empty or equity is zero.

### `assetsForRedeem(shares, totalShares, equityUsdg) → uint256`

Pro-rata `shares × equity / totalShares`; `0` when there are no shares.

## `IPriceOracle`

```solidity
interface IPriceOracle {
  function price(address token)
    external
    view
    returns (uint256 value, uint8 decimals, uint256 updatedAt);
}
```

The minimal oracle surface the vault needs. `ChainlinkOracle` implements it.

## Why a library

NAV is computed in three places — the vault (on-chain), the keeper (paper accounting) and the app (display). `NavLib` + `sdk/src/nav.ts` are deliberately the same five formulas with the same truncation rules, so all three agree bit-for-bit. The SDK page has the TypeScript twins: [SDK → NAV math](/docs/sdk/nav-math).
