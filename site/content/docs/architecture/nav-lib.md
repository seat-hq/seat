---
title: NavLib & ChainlinkOracle (Architecture)
description: The valuation stack — fixed-point NAV math and the feed-backed price oracle the vault trusts.
order: 7
---

Two small components decide what every position is worth. They are the most security-critical read path in the system.

## NavLib — the math

**Contract:** `contracts/src/libraries/NavLib.sol` — reference: [NavLib](/docs/contracts/nav-lib).

A pure library of five functions, all integer fixed-point, mirrored one-to-one by the SDK's `nav.ts`:

| Function | Computes |
|---|---|
| `valuePosition` | `uiBalance × price × 10^usdgDec / (10^tokenDec × 10^priceDec)` |
| `equity` | `cash + positions − liabilities` |
| `navPerShare` | `equity × 10^sharePrecision / totalShares` (0 when no shares) |
| `sharesForDeposit` | pro-rata shares; 1:1 bootstrap on an empty desk |
| `assetsForRedeem` | pro-rata assets for shares burned |

Multiplication always precedes division; division truncates toward zero; a zero price reverts `ZeroPrice`. The library also defines `IPriceOracle` — the minimal interface the vault needs: `price(token) → (value, decimals, updatedAt)`.

## ChainlinkOracle — the data

**Contract:** `contracts/src/ChainlinkOracle.sol` — reference: [ChainlinkOracle](/docs/contracts/chainlink-oracle).

An owner-curated map from token to Chainlink `AggregatorV3` proxy. `price(token)` reads `latestRoundData`, rejects non-positive answers and zero timestamps (`BadPrice`), and reverts `NoFeed` for unmapped tokens. Feeds are only ever set from cited sources (the 4663 feed addresses are documented in [Networks → Mainnet](/docs/networks/mainnet)).

## How the vault uses them

`DeskVault._tokenValue(token)`:

1. Read the balance via `balanceOfUI()` (fall back to `balanceOf`, then to 0).
2. Require an oracle is set (`MissingOracle`), require `px > 0` (`ZeroPrice`).
3. Require freshness: `updatedAt` not in the future and at most `maxStalenessSec` old (default 120 s) — else `StalePrice`.
4. Value with `NavLib.valuePosition`.

Any failure **reverts the calling transaction** — deposits, redemptions and copies that need a position value cannot proceed on bad data. This is the fail-closed principle applied to valuation.

## Failure modes

| Case | Effect |
|---|---|
| Token without a feed | `NoFeed` → vault calls revert |
| Feed returns ≤ 0 or `updated = 0` | `BadPrice` → reverts |
| Price older than 120 s (default) | `StalePrice` → reverts |
| `balanceOfUI` and `balanceOf` both fail | Position valued at 0 (the one non-reverting path) |

## Status

🟡 `ChainlinkOracle` is implemented and unit-tested but **not deployed on 46630** (no cited testnet feeds); the testnet vault is cash-only, so NAV there equals USDG cash and never needs a price. It deploys with the guarded mainnet scripts.
