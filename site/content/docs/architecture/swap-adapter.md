---
title: SwapAdapter & ExactInputRouter02 (Architecture)
description: The restricted execution surface — why the vault never touches a DEX directly.
order: 5
---

**Responsibility.** Be the *only* path through which a vault swaps, and make that path incapable of doing anything unexpected: no arbitrary calldata, no arbitrary router, no non-allowlisted tokens.

**Contracts:** `contracts/src/SwapAdapter.sol`, `contracts/src/ExactInputRouter02.sol` — references: [SwapAdapter](/docs/contracts/swap-adapter), [ExactInputRouter02](/docs/contracts/exact-input-router-02).

## Why the indirection

A vault that could call a DEX router directly could be pointed at a malicious router or crafted calldata. Instead:

1. `DeskVault` knows only `ISwapAdapter.execute(SwapParams)` — tokenIn, tokenOut, amountIn, minAmountOut, recipient.
2. `SwapAdapter` knows only one owner-set `router` implementing `IExactInputRouter.swapExactIn`, plus a token allowlist.
3. `ExactInputRouter02` knows only Uniswap SwapRouter02's `exactInputSingle`, with a constructor-immutable pool fee and `sqrtPriceLimitX96 = 0`.

No layer accepts free-form calldata. Each layer narrows the previous one.

## Inputs / outputs

| Function | Behaviour |
|---|---|
| `validate(params)` | `(false, reason)` unless router set and both tokens allowlisted |
| `quote(params)` | **Always reverts** — there is no cited on-chain quoter wired; tests use a mock router via `execute` |
| `execute(params)` | Pulls `tokenIn` from the caller (the vault), approves the router, swaps, resets the approval |

## Configuration and status

| Network | Router | Consequence |
|---|---|---|
| Testnet `46630` | `address(0)` — no cited DEX | `execute` reverts `RouterNotConfigured`; live copies are impossible by construction |
| Mainnet `4663` | `ExactInputRouter02` wrapping SwapRouter02 `0xCaf6…5cb2`, pool fee 3000 | Set only by the guarded deploy scripts |

## Failure modes

| Case | Behaviour |
|---|---|
| Router unset | `RouterNotConfigured` |
| Either token not allowlisted | `TokenNotAllowed(token)` |
| Swap output below `minAmountOut` | Reverts inside the Uniswap router call |

## Interactions

Called only by `DeskVault.executeCopy` (which first force-approves the adapter and zeroes the approval after). The allowlist is owner-managed and independent of the RiskModule's per-desk list — a token must pass **both** to trade.
