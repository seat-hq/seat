---
title: Why the copy is smaller
description: How the risk module decides to copy, resize, skip or halt — and why a desk's trade is often smaller than the leader's on purpose.
category: Risk
date: 2026-09-24
author: SEAT contributors
tags: risk, sizing, sessions
---

When a leader buys, a SEAT desk does not simply buy the same amount. It asks a fixed set of questions, in a fixed order, and the answer is often **"yes — but smaller."** This article walks through those questions using the defaults in the repository.

## The order of the checks

The risk module evaluates every candidate copy the same way. Roughly:

1. **Is the desk configured, and is the token allowlisted?** If not, skip.
2. **Is the market session open?** If the session is closed or its sizing is zero, skip.
3. **Is the price fresh?** A price from the future, or older than the staleness limit (120 seconds by default), fails closed.
4. **Is the desk inside its drawdown limit?** If the desk has fallen too far from its peak (20% by default on mainnet), copying halts.
5. **How big may this copy be?** Apply session sizing, then the per-fill cap, then position and gross headroom for buys. Sells are capped at what the desk actually holds.

The result is one of four outcomes: **copy**, **resize**, **skip** or **halt**.

The vault runs this same evaluation again inside `executeCopy`, so a keeper cannot bypass it.

## Session sizing

Stock Tokens trade around the clock, but the underlying market does not. SEAT scales copies by session, in US Eastern time:

| Session | Window (ET) | Sizing |
|---|---|---|
| Pre-market | 04:00 – 09:30 | 30% |
| Regular | 09:30 – 16:00 | 100% |
| After-hours | 16:00 – 20:00 | 30% |
| Closed | 20:00 – 04:00 | 0% — skip |

Market holidays are not modeled yet, which is one of the listed risks.

## Caps

The mainnet deployment defaults are:

- **Max fill:** 5,000 USDG per copy.
- **Max position:** 20,000 USDG per token.
- **Max gross:** 50,000 USDG across positions.

A copy larger than any of these is cut down to fit. A copy with zero room left is skipped.

## A worked example

Alex buys 60,000 USDG of NVDA from Alex's own wallet. The desk holds 20,000 USDG. The desk copies **12,000 USDG** of NVDA — smaller, filtered, and sized to the desk rather than to Alex.

In the same stretch, two other trades never reach the desk:

- An **AAPL** buy is skipped because its price feed is stale. The desk fails closed.
- An **SPY** sell is skipped because the desk holds no SPY to sell.

*Example numbers — not a live desk or forecast. Illustrative sizes; the live caps above would resize differently.*

## Why smaller is the point

A desk is shared. Copying the leader's full size, at any hour, on any feed, would make every follower carry the leader's full risk with none of the leader's context. Shrinking the copy is how the desk turns *"what Alex did"* into *"what this pool of money should do about it."*

It is still not safe in any absolute sense. The copy can lose money, a feed can be wrong within its freshness window, and the rules are only as good as their configuration. The [risk document](/docs/risk) lists what the module does not cover.

Try the risk machine on the [home page](/#risk) to see each gate decide.
