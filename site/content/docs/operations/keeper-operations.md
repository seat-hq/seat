---
title: Keeper Operations
description: Starting, stopping, and supervising the keeper in paper and live modes.
order: 1
---

## Startup

```bash
# testnet, paper fills, no broadcast possible
make keeper-testnet

# mainnet posture: live mode, router flag, but DRY-RUN unless SEAT_SUBMIT_TX=1
make keeper-mainnet
```

The keeper is a long-running `tsx` process (`keeper/src/index.ts`). It loads `.env`, resolves its desk set (from `DESK_ADDRESS`, `DESK_ADDRESSES`, or by walking `DESK_FACTORY`), then loops: observe fills → normalize → session → risk → execute → record.

## Shutdown

Send `SIGINT`/`SIGTERM` (Ctrl-C). The keeper has no in-flight transaction queue of its own — a submitted transaction is already on-chain; an unsubmitted decision is simply lost and will be re-derived from the next fill. There is no state to drain beyond the fill tape, which is rewritten each run.

## Restart

Restart freely. The keeper is stateless across runs except for `keeper/data/fills.json` (gitignored, overwritten per run). On-chain state (NAV, positions, queue) is the real state; the keeper re-reads it.

## Mode matrix

| `EXECUTION_MODE` | `SEAT_SUBMIT_TX` | Behaviour |
|---|---|---|
| `PAPER` (default) | — | Paper executor; refuses to run if mode is `LIVE`; records decisions only |
| `LIVE` | unset / `0` | Dry-run: full evaluation, encoded calldata logged, **throws instead of broadcasting** |
| `LIVE` | `1` | Broadcasts `executeCopy` via `eth_sendTransaction` from `KEEPER_ADDRESS` |

Live mode additionally requires: chain `4663`/`46630`, `SWAP_ROUTER_CONFIGURED=1`, `isTradeEligible(symbol, chainId)`, and `DESK_ADDRESS` + RPC + `PRIVATE_KEY`.

## What happens when the keeper is offline

- **Deposits and withdrawals are unaffected** — they are user/vault interactions, not keeper-mediated (queue processing is permissionless).
- **Copies stop.** Leader fills are simply not replicated. No funds move, no positions change.
- **Risk halts stay in force.** The drawdown halt and pause flags are on-chain; they do not need the keeper to protect the vault.
- On restart, the keeper resumes from current chain state. Missed fills are not backfilled — copying is point-in-time by design.
