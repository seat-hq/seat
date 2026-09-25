---
title: ExactInputRouter02
description: The thin, immutable adapter from IExactInputRouter to Uniswap's SwapRouter02 — so SwapAdapter never sends arbitrary calldata.
order: 6
status: experimental
---

`contracts/src/ExactInputRouter02.sol` — implements `IExactInputRouter`. No owner, no state beyond two immutables.

> Adapts Uniswap `SwapRouter02.exactInputSingle` to `IExactInputRouter` so `SwapAdapter` never sends arbitrary calldata. Fee is constructor-immutable (4663 MAG7/USDG pools exist at 3000 — see phase-1-live).

## Storage

| Field | Meaning |
|---|---|
| `swapRouter` | Immutable `ISwapRouter02` (the cited Uniswap SwapRouter02) |
| `poolFee` | Immutable `uint24` pool fee tier (3000 on the cited 4663 pools) |

Constructor reverts on a zero router or zero fee.

## Interface

`swapExactIn(tokenIn, tokenOut, amountIn, minAmountOut, recipient) → amountOut`:

1. Pulls `tokenIn` from the caller (the SwapAdapter).
2. Approves SwapRouter02 for exactly `amountIn`.
3. Calls `exactInputSingle` with the immutable fee and `sqrtPriceLimitX96 = 0`.
4. Zeroes the approval.

## Deployment status

🟡 Implemented and unit-tested (`ExactInputRouter02.t.sol`, against a mock SwapRouter02). It is deployed only by the guarded `DeployMainnet` / `DeployPhase2` scripts, wrapping the cited SwapRouter02 at `0xCaf681a66D020601342297493863E78C959E5cb2`. It does not exist on testnet.

## Security assumptions

- Immutability is the point: after deployment, nothing about the downstream router or fee tier can change.
- Slippage protection is entirely the caller's `minAmountOut`; the wrapper adds none of its own.
