---
title: RiskModule
description: Deterministic, fail-closed risk checks for copy trades — the evaluate() reference.
order: 4
status: implemented
---

`contracts/src/RiskModule.sol` — inherits `Ownable`, implements `IRiskModule`.

> Deterministic, fail-closed risk checks for copy trades. Configured per desk by the owner (governance/operator). Applies session sizing, per-fill / per-position / gross caps, staleness and drawdown halts.

## Types (from `IRiskModule`)

```solidity
enum Session { Closed, PreMarket, Regular, AfterHours }
enum Decision { Reject, Accept }

struct CheckInput {
  address desk;
  address token;
  bool isBuy;
  uint256 sizeUsdg;            // requested copy notional (USDG base units)
  uint256 positionValueUsdg;   // current value of this token position
  uint256 grossExposureUsdg;   // sum of all position values
  uint256 navPerShare;
  uint256 highWaterNavPerShare;
  Session session;
  uint256 priceUpdatedAt;
  uint256 nowTs;
}
```

## Storage

| Field | Meaning |
|---|---|
| `deskConfig[desk]` | `maxFillUsdg`, `maxPositionUsdg`, `maxGrossExposureUsdg`, `maxDrawdownBps`, `maxStalenessSec`, `configured` |
| `allowedToken[desk][token]` | Per-desk token allowlist |
| `sessionBps[desk][session]` | Per-desk session size multipliers (bps of requested size) |

## Owner functions

| Function | Validation |
|---|---|
| `configureDesk(desk, maxFill, maxPosition, maxGross, maxDrawdownBps, maxStalenessSec)` | `desk ≠ 0`, `maxDrawdownBps ≤ 10_000`; sets `configured = true`; emits `DeskConfigured` |
| `setTokenAllowed(desk, token, allowed)` | Emits `TokenAllowed` |
| `setSessionRisk(desk, session, bps)` | `bps ≤ 10_000`; emits `SessionRiskSet` |

## `evaluate(CheckInput) → (Decision, allowedSizeUsdg, reason)`

Pure `view`. The exact rule order (each reject returns a reason; the vault reverts `"risk rejected"` on any `Reject`):

1. `!configured` → `desk not configured`
2. token not allowlisted → `token not allowed`
3. `session == Closed` → `session closed`
4. `sessionBps == 0` → `session not tradable`
5. `nowTs < priceUpdatedAt` → `price in future`
6. `nowTs − priceUpdatedAt > maxStalenessSec` → `price stale`
7. `navPerShare < highWaterNavPerShare` and drawdown `≥ maxDrawdownBps` → `drawdown halt`
8. `sizeUsdg == 0` → `zero size`
9. `size = sizeUsdg × sessionBps / 10_000`; `size == 0` → `size rounds to zero`
10. Clamp `size` to `maxFillUsdg`
11. Buys: `positionValue ≥ maxPosition` → `position cap reached`; else clamp to headroom. `gross ≥ maxGross` → `gross cap reached`; else clamp to headroom.
12. Sells: `positionValue == 0` → `no position to sell`; else clamp to the position value.
13. `size == 0` → `size reduced to zero`; otherwise `(Accept, size, "accepted")`.

## Events

`DeskConfigured`, `TokenAllowed`, `SessionRiskSet`.

## Security assumptions

- The function is only as good as its inputs: `session` and `priceUpdatedAt` arrive via the keeper through the vault. The bounds (owner-set multipliers, staleness window, `minAmountOut` on the swap) limit what a wrong input can achieve.
- Drawdown is measured on NAV per share against the vault-supplied high-water mark.
- The module holds no funds and has no external calls; its entire risk surface is configuration integrity (owner key).
