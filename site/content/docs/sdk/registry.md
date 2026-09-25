---
title: Registry API
description: The official Stock Token registry — verification states, lookups, and trade eligibility.
order: 2
---

Source: `sdk/src/registry.ts`. The registry is the single source of truth for which assets a desk may hold. Assets are **never** identified by symbol, name, or metadata alone.

## The entry type

```ts
interface OfficialStockToken {
  symbol: string;                    // e.g. "NVDA" — never sufficient alone
  name: string;                      // informational only
  chainId: number;                   // 4663 or 46630 — rows are chain-specific
  address: Address | null;           // null until authoritatively verified
  feed: Address | null;              // cited AggregatorV3 proxy, or null
  issuer: string | null;             // e.g. "Robinhood Assets (Jersey) Limited"
  decimals: number | null;           // null until verified on-chain
  bytecodeHash: `0x${string}` | null;
  verification: "verified" | "unverified" | "placeholder";
  enabled: boolean;                  // separate operator/governance decision
  note: string;                      // why the row has its state
}
```

## Verification states

| State | Meaning | Trade-eligible |
|---|---|---|
| `placeholder` | Seeded concept; no address/decimals asserted | No |
| `unverified` | Candidate under review; address/bytecode known, no cited feed | No |
| `verified` | Address, issuer, decimals, bytecode, feed confirmed | Only if also `enabled` |

## Functions

| Function | Behaviour |
|---|---|
| `getOfficialStockToken(symbol, chainId?)` | Case-insensitive lookup; chain-scoped when `chainId` is passed |
| `getOfficialStockTokenByAddress(address)` | Case-insensitive; validates the `0x` + 40-hex shape |
| `isTradeEligible(symbol, chainId)` | `true` only for `verified` + `enabled` rows with address, decimals **and** feed on that chain |
| `listSymbols()` | Unique symbols across all rows |
| `listedTokenAddresses(chainId)` | Concrete addresses that may appear on a live tape for that chain |

## Current rows (verified against the source)

| Symbol | Chain | Address | State | Enabled |
|---|---|---|---|---|
| NVDA | 4663 | `0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC` | verified | ✅ |
| AAPL | 4663 | `0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9` | verified | ✅ |
| SPY | 4663 | `0x117cc2133c37B721F49dE2A7a74833232B3B4C0C` | verified | ✅ |
| NVDA / AAPL / SPY | 46630 | `null` | placeholder | ❌ |
| TSLA | 46630 | `0xC9f9c86933092BbbfFF3CCb4b105A4A94bf3Bd4E` | unverified | ❌ |
| AMZN | 46630 | `0x5884aD2f920c162CFBbACc88C9C51AA75eC09E02` | unverified | ❌ |
| PLTR | 46630 | `0x1FBE1a0e43594b3455993B5dE5Fd0A7A266298d0` | unverified | ❌ |
| NFLX | 46630 | `0x3b8262A63d25f0477c4DDE23F83cfe22Cb768C93` | unverified | ❌ |
| AMD | 46630 | `0x71178BAc73cBeb415514eB542A8995b82669778d` | unverified | ❌ |

The promotion process a row must pass before `verified` (authoritative address, on-chain decimals, bytecode hash, issuer, `balanceOfUI` support, oracle feed) is documented in the repo's [allowlist doc](/docs/runbooks/allowlist) and mirrored in [Networks → Token registry](/docs/networks/token-registry).
