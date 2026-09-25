---
title: Decision Flow
description: The exact evaluation order every copy passes through — with the reason strings you will see on the tape.
order: 3
---

## The flow

```mermaid
flowchart TD
  IN["Copy request<br/>token · side · size · session · priceUpdatedAt"] --> C1{"Desk configured?"}
  C1 -->|"no"| RJ1["Reject: desk not configured"]
  C1 --> C2{"Token allowlisted?"}
  C2 -->|"no"| RJ2["Reject: token not allowed"]
  C2 --> C3{"Session closed?"}
  C3 -->|"yes"| RJ3["Reject: session closed"]
  C3 --> C4{"Session bps set?"}
  C4 -->|"no"| RJ4["Reject: session not tradable"]
  C4 --> C5{"Price from future?"}
  C5 -->|"yes"| RJ5["Reject: price in future"]
  C5 --> C6{"Price age > maxStalenessSec?"}
  C6 -->|"yes"| RJ6["Reject: price stale"]
  C6 --> C7{"Drawdown ≥ maxDrawdownBps?"}
  C7 -->|"yes"| RJ7["Reject: drawdown halt"]
  C7 --> C8{"size > 0?"}
  C8 -->|"no"| RJ8["Reject: zero size"]
  C8 --> S1["size ×= sessionBps"]
  S1 --> S2{"size > 0?"}
  S2 -->|"no"| RJ9["Reject: size rounds to zero"]
  S2 --> S3["clamp to maxFillUsdg"]
  S3 --> SD{"buy or sell?"}
  SD -->|"buy"| B1{"position cap headroom?"}
  B1 -->|"none"| RJ10["Reject: position cap reached"]
  B1 --> B2["clamp to position headroom"]
  B2 --> B3{"gross cap headroom?"}
  B3 -->|"none"| RJ11["Reject: gross cap reached"]
  B3 --> B4["clamp to gross headroom"]
  SD -->|"sell"| S4{"position exists?"}
  S4 -->|"no"| RJ12["Reject: no position to sell"]
  S4 --> S5["clamp to position value"]
  B4 --> F{"size > 0?"}
  S5 --> F
  F -->|"no"| RJ13["Reject: size reduced to zero"]
  F -->|"yes"| OK["Accept · allowedSizeUsdg"]
```

## Reading the tape

The keeper records the same decision in its own vocabulary:

| Tape action | Meaning | Example reason |
|---|---|---|
| `accept` | Full intended size | `accepted at full size` |
| `resize` | Capped/clamped | `accepted with size reduced by caps` |
| `skip` | Rule rejection | `session closed not tradable`, `price stale (181s > 120s)`, `position cap reached for NVDA`, … |
| `reject` | Failed normalization (before risk) | `UNKNOWN_SYMBOL: …`, `ZERO_NOTIONAL: …`, `BAD_PRICE: …` |
| `halted: true` | Drawdown halt active | `desk halted by drawdown protection` |

## Drawdown halt mechanics

- The desk's high-water mark is the highest NAV/share ever reached (updated on deposits and copies).
- Drawdown in bps: `(hwm − navPerShare) × 10_000 / hwm`.
- At or above `maxDrawdownBps` (default 2,000 = 20%), evaluation rejects with `drawdown halt` — **new copies stop**. Redemptions are unaffected.
- The keeper latches its own `halted` flag (`updateDrawdown`) so subsequent paper/live evaluations short-circuit.
- There is no automatic un-halt: the halt clears only when NAV per share recovers enough that the drawdown is again below the threshold (on-chain, evaluation is stateless), or after operator review of the configuration.

## A fully worked rejection

Example numbers — not a live desk or forecast. A 60,000 USDG leader buy of NVDA in regular hours, desk at 5% copy fraction:

1. Intended: `60,000 × 5% × 100% = 3,000 USDG`
2. Per-fill cap 2,000 (keeper config) → **resize** to 2,000
3. Current NVDA position value 4,500; position cap 5,000 → headroom 500 → **resize** to 500
4. Gross exposure 9,800; gross cap 10,000 → headroom 200 → **resize** to 200
5. Cash 10,000 → no further clamp
6. Decision: `resize`, executed 200 USDG, reason `accepted with size reduced by caps`

The same input on-chain yields `(Accept, 200e6, "accepted")` with the on-chain caps substituted.
