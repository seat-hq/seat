---
title: Execution Modes
description: PAPER vs LIVE — the full guard matrix that stands between a signal and an on-chain transaction.
order: 4
---

The keeper has exactly two modes, and the boundary between them is a stack of explicit guards. Nothing "partially live" exists.

## PAPER (default)

`EXECUTION_MODE` unset or `PAPER`.

- `PaperExecutor` simulates fills against a `MarketModel` (static prices, 25 bps simulated slippage) and mutates in-memory state.
- The constructor **refuses to run** if `EXECUTION_MODE=LIVE` — a paper executor can never be accidentally promoted.
- No RPC writes, no signer, no on-chain effect. The tape is labelled `source=fixture`.

## LIVE

`EXECUTION_MODE=LIVE` **and** `SWAP_ROUTER_CONFIGURED=1` engage the live path. The guards, in order:

| # | Guard | Failure |
|---|---|---|
| 1 | `CHAIN_ID` is 4663 or 46630 | `LiveExecutor refuses chain …` |
| 2 | `SWAP_ROUTER_CONFIGURED=1` | `LiveExecutor refuses: SwapAdapter router is not configured` |
| 3 | `isTradeEligible(symbol, chainId)` — verified + enabled + address + decimals + feed | `refuses unverified registry symbol` |
| 4 | `DESK_ADDRESS`, RPC URL, `PRIVATE_KEY` all present | `submit refuses: DESK_ADDRESS / RPC / PRIVATE_KEY required` |
| 5 | Registry has a concrete token address | `submit refuses: no address for …` |
| 6 | `SEAT_SUBMIT_TX=1` | **dry-run throw** containing the encoded calldata |

Guard 6 is the last deliberate brake: even a fully configured live keeper *dry-runs* — it encodes the exact `executeCopy` calldata and throws with it — until the operator sets `SEAT_SUBMIT_TX=1`.

If guards 1–2 fail for a desk at startup, the keeper logs a warning and **falls back to paper** for that desk rather than crashing.

## The submission path

`submitExecuteCopy` hand-encodes the call (selector `0xf18f678f`):

```
executeCopy(address token, bool isBuy, uint256 sizeUsdg,
            uint8 session, uint256 priceUpdatedAt, uint256 minAmountOut)
```

- `token` — the registry address for the symbol on that chain.
- `sizeUsdg` — the risk-allowed size, not the requested one.
- `session` — the enum index (`Closed=0, PreMarket=1, Regular=2, AfterHours=3`).
- `minAmountOut` — computed from the signal price (`minAmountOutFromSignal`): for buys, the token amount the size implies at that price; for sells, the USDG size itself. Always ≥ 1.

Broadcast uses `eth_sendTransaction` from `KEEPER_ADDRESS` over the configured RPC — which assumes an unlocked keeper account at that endpoint. The code calls this out explicitly and keeps `SEAT_SUBMIT_TX=0` as the default.

## Why 46630 can never go live today

Testnet fails guard 2 by construction: no cited DEX router exists for 46630, so `SwapAdapter.router` is `address(0)` and `SWAP_ROUTER_CONFIGURED` must stay `0`. Even if submitted, the vault's swap would revert `RouterNotConfigured`. The live path is real only on 4663 after a guarded deploy.
