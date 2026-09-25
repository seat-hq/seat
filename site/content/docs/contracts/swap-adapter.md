---
title: SwapAdapter
description: The restricted swap surface — no arbitrary calldata, one owner-set router, allowlisted tokens only.
order: 5
status: implemented
---

`contracts/src/SwapAdapter.sol` — inherits `Ownable`, implements `ISwapAdapter`.

> Restricted swap adapter. Never accepts arbitrary calldata. Only an owner-set router implementing `IExactInputRouter` and allowlisted tokens may be used. `router = 0` (46630: no cited DEX) ⇒ revert. 4663 sets `ExactInputRouter02` (SwapRouter02 wrapper), not the Uniswap router directly.

## Storage

| Field | Meaning |
|---|---|
| `router` | The single permitted `IExactInputRouter`; `address(0)` by default |
| `allowedToken[token]` | Global token allowlist (independent of RiskModule's per-desk list) |

## Interface

| Function | Behaviour |
|---|---|
| `setRouter(newRouter)` | Owner. Emits `RouterSet`. |
| `setAllowedToken(token, allowed)` | Owner. Emits `TokenAllowed`. |
| `validate(params) → (ok, reason)` | Checks router set + both tokens allowed |
| `quote(params)` | **Always reverts** (`RouterNotConfigured` or `TokenNotAllowed`) — no quoter is wired; tests execute against a mock router |
| `execute(params) → amountOut` | Pulls `tokenIn` from the caller, `forceApprove`s the router, calls `router.swapExactIn`, zeroes the approval |

`SwapParams`: `tokenIn`, `tokenOut`, `amountIn`, `minAmountOut`, `recipient`.

## Errors

`RouterNotConfigured`, `TokenNotAllowed(token)`.

## Security assumptions

- The vault is the only caller in the system; it approves exactly `amountIn` for the adapter and the adapter approves exactly that for the router, zeroed after.
- `minAmountOut` comes from the keeper and is enforced by the underlying router call; the vault separately requires it to be non-zero.
- With `router = 0` there is **no execution path at all** — the current testnet state.

## Interactions

Called by `DeskVault.executeCopy`. On mainnet the router is [ExactInputRouter02](/docs/contracts/exact-input-router-02); in Foundry tests it is a `MockRouter` implementing `IExactInputRouter`.
