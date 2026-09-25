---
title: Fill Sources
description: Where the keeper gets leader fills — the static fixture source and the live chain indexer, with current limitations.
order: 3
---

The keeper's input abstraction is `FillSource` (`keeper/src/indexer.ts`): anything that returns `LeaderFill[]`. Two implementations exist.

## StaticFillSource

A deterministic, in-memory tape used by paper mode and tests. Fills are sorted by timestamp and processed as-is. `make paper` and the default keeper run both use fixtures — the shipped keeper entrypoint processes a single demo NVDA buy (20,000 USDG notional at a fixed reference time) per bound desk.

## LiveFillSource

Reads the chain directly with raw JSON-RPC:

1. Resolve the registry's token addresses for the configured chain (`listedTokenAddresses(chainId)`). No cited addresses ⇒ empty tape.
2. `eth_getLogs` over those addresses for the ERC-20 `Transfer` topic, over a ~2,000-block lookback from head (or an explicit `fromBlock`/`toBlock`).
3. Decode each log: transfer **to** the leader ⇒ `buy`; **from** the leader ⇒ `sell`; anything else is ignored.
4. On any RPC or decode failure ⇒ **empty tape** (it never invents history).

:::callout{type="warning" title="Current limitation — direction only"}
`LiveFillSource.decode` currently emits fills with `notionalUsdg = 0`, `price = 0`, `timestampMs = 0`: it recovers **direction** but not size or price. Those fills are then rejected by the signaler as `ZERO_NOTIONAL`. In other words, the live observation path records rejections until a cited price/notional source is attached. This is deliberate fail-closed behaviour, not a bug — but it means the exercised copy path today is the fixture pipeline. The code marks the spot: *"Notional stays 0 unless a cited feed/price is attached later."*
:::

## What a fill looks like

```ts
interface LeaderFill {
  id: string;
  leader: string;
  symbol: string;
  side: "buy" | "sell";
  notionalUsdg: bigint;   // 6-decimal USDG base units
  price: bigint;          // fixed-point price of one whole token
  priceDecimals: number;
  timestampMs: number;
}
```

## Desk and leader resolution (`vault.ts`)

Before any fill is fetched, the keeper binds desks:

| Priority | Source | Binding label |
|---|---|---|
| 1 | `DESK_ADDRESSES` comma list | per-desk `vault.leader()` |
| 2 | `DESK_ADDRESS` | `vault.leader()` |
| 3 | `DESK_FACTORY` / `FACTORY_ADDRESS` — walk `deskCount`/`allDesks` | per-desk `vault.leader()` |
| 4 | `LEADER_ADDRESS` env fallback | `env` |
| 5 | none | `unbound` (paper-only) |

Reads use raw `eth_call` with hardcoded selectors (`leader()` = `0x40eedabb`, `deskCount()` = `0x47d0a311`, `allDesks(uint256)` = `0x9078d16c`). A failed leader read falls back to `LEADER_ADDRESS` with a warning; an invalid or zero address is never accepted.
