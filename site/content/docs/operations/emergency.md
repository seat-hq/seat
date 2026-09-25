---
title: Emergency Procedures
description: Pause semantics, owner powers, and recovery — what you can and cannot do in an incident.
order: 4
---

## The pause switch

Each `DeskVault` is pausable by the **owner**:

```bash
cast send $DESK "pause()" --rpc-url $RPC --private-key $PRIVATE_KEY
# ...and to resume:
cast send $DESK "unpause()" --rpc-url $RPC --private-key $PRIVATE_KEY
```

Pause semantics are deliberately depositor-safe:

| Action while paused | Behaviour |
|---|---|
| `deposit` | Reverts |
| `executeCopy` | Reverts |
| `redeem` | **Does not revert** — the redemption enters the withdrawal queue |
| `processWithdrawals` | Reverts |

**Shares are never trapped by a pause.** A depositor can always queue an exit; the queue pays out after unpause (or when cash allows). This is an invariant worth verifying in an incident rather than assuming.

## Owner powers (and their limits)

The owner **can**: pause/unpause, set risk parameters within bounds, set the keeper, set fee recipients, configure the desk.

The owner **cannot**: withdraw user funds. There is no admin sweep. Vault assets move only through deposits, redemptions, fee payments, and keeper-executed copies within risk limits.

## Incident playbook

1. **Stop new risk:** `pause()` the affected vault. Copies and deposits halt immediately; exits queue safely.
2. **Stop the keeper** so it does not hammer a reverting path.
3. **Diagnose from state, not logs alone:** NAV/share, HWM, queue depth, adapter router, oracle prices (`cast` recipes in [Monitoring](/docs/operations/monitoring)).
4. **Fix the cause** — parameter, key, RPC, router, or upstream feed.
5. **Unpause** and restart the keeper in dry-run first; confirm sane decisions before re-enabling broadcast.

## Recovery notes

- There is **no upgrade path** — contracts are immutable. A defective contract means deploying a replacement and migrating (factory → new vault), not patching in place.
- The factory's `returnBond` returns a leader's listing bond; it does not affect vault funds.
- If a key is compromised: rotate `KEEPER_ADDRESS` on the vault immediately (owner call), and rotate `OWNER` off the compromised key. The keeper key alone can only call `executeCopy` — bounded by risk limits — but treat any compromise as an incident.

## What emergencies cannot fix

- Losses from leader trading are market risk, not an incident; the drawdown halt is the control.
- A compromised **owner** key is the worst case: pause powers and configuration are owner-gated. Protect it accordingly (see [Security](/docs/security/security-model)).
