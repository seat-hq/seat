---
title: Interfaces
description: The contract boundaries — IDeskVault, IRiskModule, ISwapAdapter, IExactInputRouter, IScaledUIAmount, IStakingPool, AggregatorV3Interface.
order: 13
---

Interfaces in `contracts/src/interfaces/` define the narrow boundaries between components. They are the actual coupling surface of the protocol — worth reading before the implementations.

## `IDeskVault`

The vault's public face: events (`Deposit`, `Redeem`, `WithdrawQueued`, `WithdrawFulfilled`) and the core functions `asset()`, `totalShares()`, `totalAssetsUsdg()`, `deposit(assetsUsdg)`, `redeem(shares)`. Withdrawals are documented as "instant when cash is available, otherwise queued".

## `IRiskModule`

The decision boundary: `Session` and `Decision` enums, the `CheckInput` struct, and `evaluate(input) → (Decision, allowedSizeUsdg, reason)`. Its header states the fail-closed contract: any uncertainty — unknown token, closed session, stale price, breached caps or drawdown — results in `Reject`.

## `ISwapAdapter`

`SwapParams` plus `quote`, `validate`, `execute`. Its header is the security rule: implementations **must not** accept arbitrary calldata or arbitrary routers; only explicitly allowlisted tokens and a configured, verified router. When no router is configured, `execute` reverts (fail closed).

## `IExactInputRouter`

One function: `swapExactIn(tokenIn, tokenOut, amountIn, minAmountOut, recipient) → amountOut`. The only call `SwapAdapter` can make. Implemented by `ExactInputRouter02` on 4663 and by `MockRouter` in tests.

## `ISwapRouter02`

The slice of Uniswap's SwapRouter02 that `ExactInputRouter02` uses: `exactInputSingle(ExactInputSingleParams)` (no deadline field). The 4663 address is cited in [Networks → Mainnet](/docs/networks/mainnet).

## `IScaledUIAmount`

```solidity
interface IScaledUIAmount {
  function balanceOfUI(address account) external view returns (uint256);
}
```

The ERC-8056 UI-balance interface exposed by official Stock Tokens. The header is a protocol rule: *Never use raw `balanceOf` for equity.*

## `IStakingPool`

`notifyReward(amountUsdg)` — the hook a vault calls to push the staker fee slice.

## `AggregatorV3Interface`

The Chainlink feed surface (`decimals`, `latestRoundData`) as documented on Robinhood Chain's oracles page, consumed by `ChainlinkOracle`.
