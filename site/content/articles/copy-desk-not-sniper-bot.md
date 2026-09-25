---
title: Copy desk, not sniper bot
description: Why SEAT copies a leader into a shared vault with its own rules, instead of mirroring every trade into your wallet as fast as possible.
category: Concepts
date: 2026-09-24
author: SEAT contributors
tags: desks, custody, copy trading
---

Most copy trading products are built around one promise: **be as fast and as faithful as possible**. A leader buys, and a bot buys the same thing in your wallet a moment later. Speed is the product.

SEAT starts from a different question. Not *"how fast can I mirror this trader?"* but *"who is holding the money while I do?"*

## The familiar model

In a typical copy setup, three things are bundled together:

- **The signal** — what the leader traded.
- **The capital** — the money used to copy it.
- **The execution** — the software that turns one into the other.

Because the capital sits in each follower's own wallet, every follower needs their own bot, their own approvals and their own execution. The copy is only as careful as the least careful bot, and the rules that decide *whether* to copy tend to live off-chain, where nobody else can check them.

That model is not wrong. It is simply a different product: a personal mirror.

## The primitive SEAT adds

SEAT separates the signal from the capital.

A **leader** keeps trading from their own wallet, exactly as they would anyway. SEAT never takes custody of it, never asks for approval on it, and cannot move anything in it.

A **desk** is a separate vault contract. Followers deposit USDG into the desk and receive **seats** — shares that represent a claim on the desk's net asset value (NAV). When the leader trades, a keeper reads that trade as *information* and asks the desk's risk module whether the desk should copy it, resize it, or skip it. Only then does the desk move its own funds.

So there are always two piles:

1. The leader's wallet — the leader's money, which the desk cannot spend.
2. The desk vault — pooled follower money, which the leader cannot withdraw.

The only thing that crosses from pile one to pile two is a signal.

## Why a desk, not a bot

Putting capital in one vault changes what is possible:

- **Rules live on-chain.** The vault re-runs the risk module inside every `executeCopy` call. A keeper cannot push a trade the rules reject.
- **Everyone gets the same copy.** Followers share one position at one price, instead of racing each other with separate bots.
- **Accounting is shared and visible.** NAV per share rises and falls with the desk's holdings. Your ownership is your share count, not a separate history of fills.
- **The copy can be smaller on purpose.** Session sizing, fill caps, position caps and gross caps all shrink a trade before it reaches the desk. A smaller copy is a feature, not slippage.

## What it does not promise

A desk is not a guarantee. Stock Token prices can fall, the leader can be wrong, and a copy can lose money — our worked example shows a desk at **0.94 NAV per share** after a drop. Redemptions are paid from the desk's cash when there is enough; when there is not, or when the vault is paused, they wait in a first-in, first-out queue.

The contracts are unaudited, the keeper is a single operator today, and SEAT is not affiliated with Robinhood. Read the [risk document](/docs/risk) before you treat any of this as more than an experiment.

## The short version

A sniper bot tries to be the leader, faster. A desk tries to be a **careful, shared, rule-bound follower** — with the leader's money and the followers' money never in the same place.

*Example numbers — not a live desk or forecast.*
