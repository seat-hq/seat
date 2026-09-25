---
title: Monitoring
description: What to watch — logs, the fill tape, on-chain state, and health signals.
order: 2
---

The repository ships no metrics server or alerting stack. Monitoring is log- and state-based; this page lists the concrete signals.

## Keeper logs

The keeper logs each pipeline stage per fill: observed → session decision → risk decision (`Decision`, allowed size, reason) → execution result (tx hash, dry-run calldata, or skip). Grep for:

- `REJECT` / reason codes (`ZERO_NOTIONAL`, `SESSION_CLOSED`, cap names, `DRAWDOWN_HALT`) — expected skips.
- `dry-run` — live mode without `SEAT_SUBMIT_TX`; calldata is logged for inspection.
- Executor errors — RPC failures, revert reasons.

## Fill tape

`keeper/data/fills.json` (gitignored, overwritten per run) records every processed fill with an honest `source` label: `fixture` or `chain`. A tape that stops growing while the leader is active means the fill source is stale or the RPC is down.

## On-chain health checks

```bash
# NAV per share — should move only with P&L and fees
cast call $DESK "navPerShare()(uint256)" --rpc-url $RPC

# high-water mark vs NAV — approaching from below after losses is normal;
# a drawdown halt trips at 20% below HWM (default)
cast call $DESK "highWaterMark()(uint256)" --rpc-url $RPC

# withdrawal queue depth — growth means redemptions are outpacing cash
cast call $DESK "withdrawalQueueLength()(uint256)" --rpc-url $RPC

# pause flag
cast call $DESK "paused()(bool)" --rpc-url $RPC
```

(Function names per the contract sources; see [DeskVault](/docs/contracts/desk-vault).)

## App-level signals

The app (`@seat/app`) renders the fill tape and vault state from the same chain reads. If the app and `cast` disagree, trust `cast` and investigate the app's RPC (`NEXT_PUBLIC_*_RPC_URL`).

## What "healthy" looks like

| Signal | Healthy |
|---|---|
| Keeper process | Running, logging decisions each leader fill |
| Tape | Growing while leader trades; `source` matches intent |
| NAV/share | Changes only with P&L/fees |
| Queue | Drains as cash allows |
| RPC | No sustained error streak in keeper logs |
