---
title: Application Overview
description: The desk blotter — what it shows, what it writes, and how it stays honest when nothing is deployed.
order: 1
---

The app (`app/`, `@seat/app`) is a Next.js 14 + wagmi front end with a single screen: the **desk blotter**. It is the depositor-facing surface of the protocol.

## What the blotter shows

| Element | Source |
|---|---|
| Desk NAV, cash, total shares, NAV per share | `DeskVault.totalAssetsUsdg / cashUsdg / totalShares / navPerShare` |
| The desk's leader | `DeskVault.leader()` |
| Your seat (shares, value) | `DeskVault.sharesOf[you]` |
| Desk picker (when multiple desks exist) | `DeskFactory.deskCount` / `allDesks`, or `?desk=<address>` |
| Fill tape with per-row source labels | `/api/fills` → `keeper/data/fills.json` |
| Session and risk context on tape rows | Recorded by the keeper |

## What it writes

- **Deposit:** `USDG.approve` + `DeskVault.deposit`
- **Redeem:** `DeskVault.redeem`
- **Phase 2 (when `seatToken` is wired):** stake/unstake/claim on `StakingPool`, and `listDesk` on the factory

Writes are gated by `canWriteOnChain(chainId, addresses)`: the connected chain must be Robinhood mainnet or testnet **and** have a non-null vault address. Mainnet writes are impossible until a real 4663 deploy is recorded.

## The honest fallback

When no wallet is connected on a Robinhood chain, or the chain has no wired vault, the blotter renders `PAPER_DESK` — a fixed test dataset (`app/src/lib/desks.ts`) whose own header states it is *"TEST DATA … not sourced from any chain and represents no real desk, leader, or performance."* The paper desk exists to render the layout; it is never presented as live.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18 |
| Chain client | wagmi 2 + viem 2, injected connector only |
| Data | `@tanstack/react-query` (via wagmi), `@seat/sdk` |
| Styling | One `globals.css`; no Tailwind, no animation libraries |
| ABIs | Extracted from Foundry `out/` into `app/src/abis/` (see its README for the re-extraction script) |

## Development

```bash
make app-dev   # pnpm --filter @seat/app dev
```

Environment: `NEXT_PUBLIC_RH_TESTNET_RPC_URL`, `NEXT_PUBLIC_RH_RPC_URL`, `NEXT_PUBLIC_CHAIN_ID`. Details: [Configuration](/docs/application/configuration).
