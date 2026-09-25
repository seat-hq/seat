---
title: Where your money sits
description: A walk through custody in a SEAT desk — who can move what, what the owner can change, and what nobody can do.
category: Architecture
date: 2026-09-24
author: SEAT contributors
tags: custody, vault, trust
---

The first question to ask of any pooled product is simple: **where is the money, and who can move it?** This article answers that for a SEAT desk, using the contracts as the source of truth.

## Two wallets that never touch

Alex is a leader. Alex trades from Alex's own wallet on Robinhood Chain. The desk contract stores Alex's address as an **immutable** `leader` value — fixed when the desk is created — and uses it only to know *whose trades to read*.

Alex's wallet is never approved to the desk, never swept, and never touched. The desk cannot spend Alex's balance, and Alex cannot spend the desk's.

You and Sam are followers. You each deposit USDG into the **desk vault** and receive seats. In our worked example:

| | Deposit | Seats | Ownership |
|---|---|---|---|
| You | 10,000 USDG | 10,000 | 50% |
| Sam | 10,000 USDG | 10,000 | 50% |
| **Desk** | **20,000 USDG** | **20,000** | NAV / share **1.00** |

*Example numbers — not a live desk or forecast.*

## What sits inside the desk

The desk holds two kinds of assets:

- **Cash** — USDG waiting to be used or paid out.
- **Positions** — allowlisted Stock Tokens bought by copies.

NAV is cash plus each position valued with `balanceOfUI()` multiplied by its Chainlink price. Your seats are a claim on a fraction of that NAV — nothing more, nothing less.

## Who can do what

### The keeper

The keeper is the only address that can call `executeCopy`. Even then:

- The vault re-runs `riskModule.evaluate` inside the call.
- The swap must specify `minAmountOut > 0`.
- The swap recipient is the vault itself (`address(this)`). A copy cannot send tokens anywhere else.

Anyone — not only the keeper — can call `processWithdrawals` to pay queued redemptions once cash is available.

### The owner

The desk owner can change operating settings: the keeper, the oracle, the fee module, fee recipients and the deposit cap, and can **pause** or **unpause** the vault.

The owner **cannot** withdraw or sweep follower funds. There is no such function in the vault.

### Alex

Alex can trade Alex's own wallet. Alex earns a share of fees when the desk earns them. Alex has no function to pull desk funds.

### You

You can deposit (up to the desk's cap — $50k per desk on mainnet today) and redeem your seats.

## Redeeming

When you redeem, fees accrue first, so you are paid at the **post-fee NAV**. In the example, after NVDA rises and the 200 USDG performance fee is taken, NAV per share is 1.09. Redeeming 5,000 seats is a claim of **5,450 USDG**.

- If the vault is not paused and holds enough cash, you are paid immediately.
- Otherwise your request joins a **FIFO withdraw queue** and is paid as cash becomes available.

Neither case changes Alex's wallet by a single unit.

## What is not true yet

- The contracts are **unaudited**.
- There is a **single keeper** operator.
- Owner powers such as pause and keeper changes are real and centralised today.
- SEAT is **not affiliated** with Robinhood.

Read the full [risk document](/docs/risk) and the [litepaper](/docs/litepaper) for the details.
