---
title: Risk Parameters
description: Every knob in the risk engine, its default, and where it is set — with source citations.
order: 2
---

Risk parameters exist at three levels: the on-chain desk configuration, the keeper's off-chain copy configuration, and the session policy. All values below are verified against the deploy scripts and keeper source.

## On-chain desk configuration (`RiskModule.configureDesk`)

| Parameter | Meaning | Mainnet default (`DeployMainnet`) | Testnet default (`DeployTestnet`, when `MAX_FILL_USDG` set) |
|---|---|---|---|
| `maxFillUsdg` | Max notional per copy | 5,000 USDG | `MAX_FILL_USDG` env |
| `maxPositionUsdg` | Max value per token position | 20,000 USDG | 5,000 USDG |
| `maxGrossExposureUsdg` | Max sum of position values | 50,000 USDG | 10,000 USDG |
| `maxDrawdownBps` | Halt threshold below high-water NAV/share | 2,000 (20%) | 2,000 (20%) |
| `maxStalenessSec` | Max oracle price age | 120 s | 120 s |

Env overrides: `MAX_FILL_USDG`, `MAX_POSITION_USDG`, `MAX_GROSS_USDG`, `MAX_DRAWDOWN_BPS`, `MAX_STALENESS_SEC`.

Related vault-level bounds:

| Parameter | Default | Setter |
|---|---|---|
| `DeskVault.depositCapUsdg` | 50,000 USDG on mainnet; 0 (unlimited) on testnet | `setDepositCap` / `DEPOSIT_CAP_USDG` env |
| `DeskVault.maxStalenessSec` | 120 s | `setMaxStalenessSec` |

## Session multipliers (`RiskModule.setSessionRisk`)

| Session | Default bps | Size |
|---|---|---|
| Regular | 10,000 | 100% |
| Pre-market | 3,000 | 30% |
| After-hours | 3,000 | 30% |
| Closed | 0 | rejected |

Source: `DEFAULT_SESSION_POLICY` in `keeper/src/session.ts`; the deploy scripts wire the same values on-chain.

## Keeper copy configuration (`keeper/src/index.ts`)

| Parameter | Value | Meaning |
|---|---|---|
| `baseCopyBps` | 500 | Copy 5% of the leader's notional |
| `maxFillUsdg` | 2,000 USDG | Keeper-side per-fill cap |
| `maxPositionUsdg` | 5,000 USDG | Keeper-side per-position cap |
| `maxGrossExposureUsdg` | 10,000 USDG | Keeper-side gross cap |
| `maxDrawdownBps` | 2,000 | Keeper-side halt threshold |
| `maxStalenessSec` | 120 | Keeper-side staleness bound |
| Slippage (paper) | 25 bps | Simulated worse-price fill |

:::callout{type="note" title="Two sets of caps is not a bug"}
The keeper's tighter caps shape what it *submits*; the on-chain caps bound what can *execute*. If they ever disagree, the on-chain values win — the vault reverts anything the risk module rejects.
:::

## Sizing pipeline

```
requested  = leaderNotional                    (USDG base units)
intended   = requested × baseCopyBps / 10_000
           × sessionBps / 10_000
allowed    = intended
           ≤ maxFillUsdg
           ≤ maxPositionUsdg − positionValue   (buys)
           ≤ maxGrossUsdg − grossExposure      (buys)
           ≤ cashUsdg                          (buys, keeper-side)
           ≤ positionValue                     (sells)
```

A copy whose allowed size rounds to zero is skipped (`size rounds to zero` / `size reduced to zero`).
