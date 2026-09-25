---
title: Fees (Accounting)
description: Exactly when fees accrue, when they are paid, and where every USDG of fee goes.
order: 3
---

The concepts are in [Fees & High-Water Mark](/docs/concepts/fees-and-high-water-mark); this page is the accounting mechanics.

## Accrual timing

`_accrueFees()` runs at the top of `deposit`, `redeem`, and twice inside `executeCopy` (before the risk check and after the swap). Each run:

1. **AUM fee:** if `lastFeeTs` is set and time has passed, `feeLiabilitiesUsdg += feeModule.aumFee(equity, elapsed)`. `lastFeeTs` updates every call.
2. **Performance fee:** compute `navPerShare` on post-AUM equity.
   - If the high-water mark is unset, set it to the current NAV/share (no fee).
   - If NAV/share exceeds it: charge 10% of `(nav − hwm) × totalShares / 10^6`, add to liabilities, and **raise the high-water mark to the post-fee NAV/share**.
3. Emit `FeesAccrued(aumCharged, perfCharged, feeLiabilitiesUsdg)` when either charged non-zero.

With no fee module set or no shares, accrual is a no-op beyond timestamping.

## The high-water mark's two jobs

| Consumer | Use |
|---|---|
| `FeeModule` path | Performance fee only on NAV/share above the mark |
| `RiskModule` path | Drawdown halt when NAV/share falls `maxDrawdownBps` below the mark |

`_touchHighWater()` (after deposits and copies) raises the mark whenever NAV/share exceeds it, without charging.

## Payout mechanics

`_tryPayFees()` runs after deposits, redeems and copies:

1. No liabilities or no fee module → return.
2. Need both `protocolRecipient` and a leader payee (defaults to `leader`) → else wait.
3. Split via `FeeModule.splitFee`: protocol 20%, staker 10%, leader 70% (Phase 2 parameters).
4. **Fail-closed staker slice:** if `stakerRecipient` is unset, only protocol + leader are paid; the staker slice *remains* in `feeLiabilitiesUsdg`. It is never given to anyone else.
5. Payout requires `cashUsdg ≥ payout`; otherwise liabilities wait for cash.
6. Staker payment: the vault `forceApprove`s the pool, calls `StakingPool.notifyReward`, zeroes the approval. Emits `FeesPaid`.

## Effect on depositors

- Fees reduce `equity`, hence NAV per share, hence both deposit share-minting and redemption values — always *after* accrual, so no transaction front-runs its own fee.
- Because `totalAssetsUsdg()` nets out pending fee estimates, displayed NAV already reflects fees that have accrued but not yet been booked.

## Numbers

Example numbers — not a live desk or forecast. 20,000 shares, HWM 1.00, NAV/share reaches 1.10:

| Step | Amount |
|---|---|
| Profit above HWM | 2,000 USDG |
| Performance fee (10%) | 200 USDG |
| → Leader (70%) | 140 USDG |
| → Protocol (20%) | 40 USDG |
| → Stakers (10%) | 20 USDG |
| Post-fee NAV/share | ≈ 1.09 |

The AUM fee (2%/yr, ≈ 0.38 USDG per 10,000 USDG per day) accrues independently by time.
