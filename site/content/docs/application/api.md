---
title: Application API
description: The single API route — GET /api/fills — and the RecordedFill shape it serves.
order: 3
---

The app has exactly one API route.

## `GET /api/fills`

Reads the keeper's tape file and returns it as JSON.

- **Handler:** `app/src/app/api/fills/route.ts` (`force-dynamic`, Node runtime).
- **Source:** the first readable of `../keeper/data/fills.json` or `keeper/data/fills.json` relative to the app's working directory.
- **Missing/invalid file:** `{ "fills": [] }` — the route never errors on an absent tape.

### Response

```json
{
  "fills": [
    {
      "desk": "0x8ff6ef04312679a0112b5229c6911cbc026e73ff",
      "leader": "0x…",
      "fillId": "demo-…",
      "symbol": "NVDA",
      "side": "buy",
      "action": "resize",
      "reason": "accepted with size reduced by caps",
      "intendedUsdg": "1000000000",
      "executedUsdg": "500000000",
      "slippageBps": 25,
      "source": "fixture",
      "session": "regular",
      "timestamp": "2026-01-07T15:00:00.000Z"
    }
  ]
}
```

`RecordedFill` is defined in `app/src/lib/fills.ts` (mirroring `keeper/src/fills.ts`). USDG amounts are decimal strings of base units; the app parses them with `parseUsdgField` (`BigInt`, `0n` on garbage).

## Consuming it

```ts
const { fills } = await fetch("/api/fills").then((r) => r.json());
// fills: RecordedFill[] — render source === "chain" distinctly from "fixture"
```

The blotter tones rows by source (`chain` rows are accented; `fixture` rows are muted) so a simulated fill can never masquerade as a live one. The tape's own semantics are documented in [Keeper → Fill tape](/docs/keeper/fill-tape).
