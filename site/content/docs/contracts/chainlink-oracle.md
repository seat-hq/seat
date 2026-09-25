---
title: ChainlinkOracle
description: The vault's price source — an owner-curated map from token to Chainlink AggregatorV3 proxy.
order: 8
status: experimental
---

`contracts/src/ChainlinkOracle.sol` — inherits `Ownable`, implements `IPriceOracle`.

> token ⇒ AggregatorV3 proxy. Owner maps feeds from a cited source only (docs/phase-1-live.md). Unmapped tokens revert.

## Storage

`feedOf[token] → AggregatorV3 proxy address`.

## Interface

| Function | Behaviour |
|---|---|
| `setFeed(token, feed)` | Owner. `token ≠ 0`. Emits `FeedSet`. |
| `price(token) → (value, decimals, updatedAt)` | Reads `latestRoundData()`; reverts `NoFeed(token)` when unmapped, `BadPrice(token)` when the answer is ≤ 0 or `updated == 0`. Returns the feed's own `decimals()` (8 on the cited 4663 feeds). |

## Deployment status

🟡 Implemented and unit-tested (`ChainlinkOracle.t.sol`). **Not deployed on 46630** — no official Chainlink feed proxies are published for testnet, which is also why the testnet Stock Tokens stay `unverified` in the registry. The guarded mainnet scripts deploy it and wire the three cited feeds (NVDA, AAPL, SPY — addresses in [Networks → Mainnet](/docs/networks/mainnet)).

## Security assumptions

- The oracle trusts the Chainlink proxies it is pointed at; feed integrity is an external dependency.
- The vault layers its own defenses on top: zero-price rejection and a 120-second default staleness bound (`StalePrice`).
- Owner misconfiguration (wrong feed) is a trust assumption documented in [Security](/docs/security/security-model); feeds are only ever set from cited sources.
