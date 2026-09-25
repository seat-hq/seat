---
title: Testing
description: What is tested, how, and what the tests prove — Foundry suites, invariants, keeper guards, site number tests.
order: 4
---

## Foundry (contracts)

`forge test -vvv` — **90 tests across 13 suites**, all passing at the time of writing:

| Suite | Coverage highlights |
|---|---|
| `DeskVault.t.sol` | Deposits (bootstrap, pro-rata), instant vs queued redeems, queue processing, caps, pause semantics, keeper gating |
| `DeskVaultLive.t.sol` | Live-wiring simulation: oracle-priced positions, copy execution against a mock router, fee accrual |
| `RiskModule.t.sol` | Every reject reason, cap clamping, session sizing, drawdown halt |
| `FeeModule.t.sol` | Performance/AUM math, split validation |
| `SwapAdapter.t.sol` | Router unset ⇒ revert, token allowlist, approval hygiene |
| `ExactInputRouter02.t.sol` | SwapRouter02 wrapping, immutable fee |
| `ChainlinkOracle.t.sol` | Feed mapping, bad-price rejection |
| `DeskFactory.t.sol` | One-vault-per-leader, bonded listing, bond return |
| `SeatToken.t.sol` | Fixed supply, no mint |
| `StakingPool.t.sol` | Stake/unstake/claim, reward folding, idle-reward handling |
| `LpLocker.t.sol` | Lock duration, early-withdraw refusal, beneficiary |
| `NavLib.t.sol` | Fixed-point NAV formulas |
| `DeskInvariants.t.sol` | Invariant: NAV == cash (cash-only phase); accounting cash == vault balance; no shares ⇒ NAV/share 0 |

## Keeper

`pnpm --filter keeper test` runs `src/live-guards.test.ts`:

- `isTradeEligible` truth table (NVDA/AAPL/SPY eligible on 4663 only; TSLA nowhere).
- `LiveExecutor` refuses non-Robinhood chains, refuses without a router, refuses ineligible symbols.
- `PaperExecutor` refuses `EXECUTION_MODE=LIVE`.
- `parseDeskList` parsing rules.

## Site

`pnpm --filter @seat/site test` runs `node --test` over `src/lib/*.test.ts` — the narrative site's worked-example numbers (deposits, fees, splits, redemptions) are unit-tested against a TypeScript port of the risk/fee rules, so the story cannot drift from the contracts.

## Typechecking

`pnpm typecheck` runs `tsc --noEmit` in every package plus the root tsconfig.

## What tests do not prove

- No audit. Tests express intent; they are not a security review.
- The live fill indexer direction-only limitation is covered by design (rejects as `ZERO_NOTIONAL`), not fixed.
- Mainnet deploys are simulated in scripts/tests but have never been broadcast. See [Project status](/docs/introduction/project-status).
