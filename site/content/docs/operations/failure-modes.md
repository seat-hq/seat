---
title: Failure Modes
description: What breaks, how it presents, and what to do — keeper, RPC, transactions, execution, risk halts.
order: 3
---

## Keeper offline / crashed

**Presentation:** tape stops growing; no copy transactions; deposits/withdrawals still work.
**Action:** restart the process. No backfill occurs — missed fills are simply not copied. Investigate the crash log before restarting in a loop.

## RPC failure

**Presentation:** keeper log error streaks; reads revert; dry-runs fail.
**Action:** fail over by updating `RH_RPC_URL` / `RH_TESTNET_RPC_URL` (and the `NEXT_PUBLIC_` twins for the app) and restarting. The keeper has no multi-RPC fallback built in.

## Transaction failure (live mode)

**Presentation:** `eth_sendTransaction` errors or on-chain reverts in the keeper log.
**Likely causes, in order:**

1. **Router unset** — `SwapAdapter.router == address(0)` ⇒ every `executeCopy` reverts. Expected on 46630; a misconfiguration on 4663.
2. **Risk rejection raced on-chain** — caps/session/drawdown re-evaluated at execution; the copy reverts rather than executes oversized. This is the system working.
3. **Insufficient cash** — copy notional exceeds vault cash.
4. **Gas/nonce issues** — standard key management; the keeper submits from `KEEPER_ADDRESS` with the configured `PRIVATE_KEY`.

**Action:** read the revert reason, fix the cause, let the next fill trigger a fresh decision. Do not manually replay old calldata — decisions are point-in-time.

## Stuck execution

There is no keeper-side queue to get stuck. "Stuck" usually means the **withdrawal queue** is growing because the desk is fully invested (mainnet, future) or paused. Queue processing is permissionless — anyone can call `processWithdrawals`; the keeper is not required.

## Risk halt (drawdown)

**Presentation:** every copy rejected with the drawdown reason; `cast` shows NAV/share ≥ 20% (default) below the high-water mark.
**Action:** this is intended behavior. The halt lifts only when NAV/share recovers above the threshold. Do not "fix" it by raising `MAX_DRAWDOWN_BPS` mid-drawdown — that defeats the control. Communicate to depositors; evaluate the leader.

## Oracle staleness / bad price

**Presentation:** copies rejected for staleness (default max 120 s) or oracle `BadPrice` reverts.
**Action:** check the Chainlink feed on-chain. The system fails closed — no price, no trade. Never point `feedOf` at an unverified feed to force trades through.

## Fill-source garbage (live indexer)

**Presentation:** live fills rejected as `ZERO_NOTIONAL`.
**Explanation:** the shipped `LiveFillSource` decodes direction only; notional/price are zero until a cited price source is attached. This is a **known limitation**, not a bug to hot-patch. Use the fixture source or attach a real price source before expecting live copies.
