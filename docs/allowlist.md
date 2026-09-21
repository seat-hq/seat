# Asset Allowlist & Verification

A desk may only ever hold assets that are **authoritatively verified** and
**enabled** in the registry (`sdk/src/registry.ts`). Assets are **never**
identified by symbol, name, or metadata alone.

## Verification states

| State | Meaning | Trade-eligible? |
|---|---|---|
| `placeholder` | Seeded concept, no address/decimals asserted | No |
| `unverified` | Candidate under review, not yet confirmed | No |
| `verified` | Address, issuer, decimals authoritatively confirmed | Only if also `enabled` |

The initial v1 names (NVDA, AAPL, SPY) stay **`placeholder` on testnet
46630** (not on the official testnet contracts table). On **mainnet 4663**
they are **`verified` + `enabled`** with cited addresses, bytecode, and
Chainlink feeds. Official testnet names (TSLA, AMZN, PLTR, NFLX, AMD) stay
**`unverified`** until a 46630 Chainlink feed is published. **No addresses
are invented. Do not copy 4663 rows onto 46630.** See
[`phase-1-live.md`](phase-1-live.md).

## Promotion process (required before any reliance)

To move an entry from `placeholder`/`unverified` to `verified`:

1. Obtain the contract address from an authoritative issuer/on-chain source.
2. Confirm token `decimals` on-chain.
3. Record the deployed **bytecode hash** where applicable.
4. Confirm the issuer identity.
5. Confirm the asset exposes the authoritative supported-balance interface
   (`balanceOfUI()`), and that an oracle price feed exists.
6. Only then set `verification: "verified"`. Enabling for trading
   (`enabled: true`) is a separate, explicit governance/operator decision.

## Fail-closed guarantee

`isTradeEligible(symbol, chainId)` returns `true` only for entries that are
`verified`, `enabled`, and have a concrete address, decimals, and cited feed
**on that chain**. Everything else — including all 46630 placeholders —
returns `false`.
