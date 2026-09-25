---
title: The Fill Tape
description: The keeper's public record — schema, source labelling, and how the app serves it.
order: 5
---

The tape is the keeper's audit trail: one JSON file, `keeper/data/fills.json` (gitignored), overwritten each run with that run's outcomes. The app serves it at `/api/fills` and renders it in the blotter.

## Schema

```json
{
  "fills": [
    {
      "desk": "0x8ff6ef04312679a0112b5229c6911cbc026e73ff",
      "leader": "0x…",
      "fillId": "demo-0x8ff6…",
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

| Field | Meaning |
|---|---|
| `desk` | The vault this outcome belongs to (`null` for the unbound paper script) |
| `leader` | The observed leader address |
| `action` | `accept` · `resize` · `skip` · `reject` |
| `reason` | The human-readable decision reason |
| `intendedUsdg` / `executedUsdg` | USDG base units (strings, bigint-safe) |
| `source` | `fixture` or `chain` — **fixtures are never labelled live** |
| `session` | The market session at evaluation time |

## Honesty rules

These are enforced by the writer (`keeper/src/fills.ts`) and the API:

- `source` is a closed union: `fixture | chain`. Paper runs always write `fixture`.
- The file contains outcomes only — no keys, no secrets.
- The app renders the source label on every row, so a fixture row is visibly a fixture in the UI.

## Serving

`app/src/app/api/fills/route.ts` reads `keeper/data/fills.json` (trying both `../keeper/data` and `keeper/data` relative to the app working directory) and returns `{ fills: [] }` when the file is absent. It is `force-dynamic`, so each request reads the current file.

## Operational notes

- The file is **overwritten per run**, not appended — it is a latest-run view, not a history. Persist history by archiving the file per run if you need it.
- Because it is gitignored, a fresh clone has no tape; the blotter shows an empty tape until the keeper runs.
- Monitoring ideas and failure playbooks: [Operations → Monitoring](/docs/operations/monitoring).
