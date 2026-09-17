I’ll pull live competitor names and on-chain metrics so the project pack is based on what’s actually deployed, not guesses.This is the full project pack for the Stock Token copy-desk. It is not affiliated with Robinhood. Stock Tokens are restricted for US persons. None of this is investment advice.

**Working name:** WAKE  
**Ticker:** `$WAKE`  
**One line:** Deposit USDG. Sit in a risk-boxed desk that copies an opted-in Stock Token trader.

---

## 1. Competitors

Split them. Most “copy” tools on this chain are **meme snipers**, not **pooled Stock Token desks**. That gap is the product.

### Direct: copy / follow / snipe terminals

| Project | What they actually are | On-chain / published metrics | Why they are not you |
|---|---|---|---|
| **FOMO** | Cross-chain terminal + follow feed. ~0.5% fee. Copy works like Solana follow. | ~**375,700** users traded RH Chain via FOMO since launch. **95.2%** lost money or made under $100. Only **3,504** made >$1k; **229** made >$10k (~0.06%). At one print FOMO had **~36–42%** of *terminal* volume; ~half of FOMO’s own volume was on this chain. Late Aug daily terminal print ~**$100M**. | Per-wallet tasks. Optimized for memes and launches. No shared vault, no Stock Token allowlist, no high-water profit share. |
| **GMGN** | Terminal + smart-money copy. | 1–3 Sep sample: **4.86M swaps**, **$947.5M** / 3 days, **53,529** wallets, **~18.5%** of USDG-quoted flow. 29 Aug: **$115M** day, **41.2%** terminal share. With FOMO, often **~65–80%** of bot/terminal volume. | Same category: fast copy of whatever the wallet buys, including memes. High round-trip cost on small trades. |
| **APM** | Wallet Copy, FOMO Copy, PONS snipe on RH / BSC / Solana. | No public TVL. Docs say RH copy targets **the next block** after the leader tx. Engine upgraded 9 Sep 2026 for speed. Quote Filter can limit snipes to tokenized-equity quotes. | Closest copy engine. Still a **personal bot task**, not a pooled desk with on-chain caps and NAV shares. |
| **Axiom / other terminals** | Same terminal bucket. | In the 1–3 Sep audit, well behind GMGN (GMGN ~6× Axiom in that window). | Same problem: execution layer for degens, not a fund-like desk. |

GeckoTerminal (26 Aug): FOMO **41.6%** / GMGN **33.6%** of *trading-bot* volume on the chain. Terminals as a class went from **<$20M/week** (late June) to **>$1.2B/week**, and ~**33%** of cross-chain terminal volume sat on Robinhood Chain. That is demand for “follow this wallet.” It is not a desk product.

### Adjacent: vaults / agents / stock tools (not copy desks)

| Project | Lane | Public footprint | Overlap |
|---|---|---|---|
| **EARN** | Agent-steered LP vaults on NVDA/SPY/SPCX/GME vs USDG | Live Uniswap v3/v4 vault contracts. TVL not a chain-level headline. | Yield on stock pairs, not copy of a person. |
| **HoodVault** (hoodchain.app) | Automated LP / lend / MM vaults on stock tokens | **Pre-launch, deposits sealed** as of mid-Sep. | Strategy vault, not social copy. |
| **Sherwood** | Telegram bot for stocks via Rialto + Uniswap, TP/SL | Live bot. Protocol `$WOOD` “mainnet approaching.” | Self-trade bot, not pooled follow. |
| **Longbow** | After-hours gap orders vs the cash quote | Live executor, `$LONGBOW` on Flap, 2/2 tax | Session tool you can *plug into* a desk later. Not a competitor desk. |
| **NetNetCap** | Reserve token + 60s stock/casino minigames | Multiple game contracts live; treasury self-reported | Casino lane. Already taken. |
| **Prism / Hood Index / The Index** | Baskets, dividend-tax index | Early / announcement-scale | Index, not copy. |
| **Morpho + Steakhouse** | Lending | Morpho **~$529M** TVL; Steakhouse curator **~$489M** on this chain | Idle USDG home. Not trading. |

**Honest read:** nobody has shipped a **USDG-NAV desk that only copies official Stock Tokens with on-chain risk boxes**. The copy market is huge and almost entirely meme-terminal. That is the hole.

---

## 2. Why this chain, why this product

### The chain is already a trading venue

DefiLlama snapshot around 16–17 Sep 2026:

- DeFi TVL **~$930M** (from ~$4M on 1 Jul)
- DEX **~$1.47B / 24h**, **~$12.1B / 7d**
- Stablecoins **~$1.00B** (USDG ~**67%**)
- RWA active AUM **~$286M**
- Perps **~$523M / 24h**
- Bridged TVL **~$3.1B**
- App fees **~$7.8M / 24h** on top of chain fees

Peak days have printed **$3B+** DEX. Cumulative DEX was **$34.6B** two months in, with **190+ Stock Tokens** and **$3B+** Stock Token DEX volume. Dune lifetime prints are even larger (volume and wallets keep climbing).

### The people who need a desk are already here — and losing

- Robinhood’s **own app users are only ~1–2%** of chain txs. Almost all flow is crypto-native terminals. Distribution is still “off.”
- Uniswap is **~77–95%** of DEX volume. Stock-token liquidity is findable. A vault can route.
- **~60%** of Uniswap stock-token volume happens **outside US cash hours**. People already trade NVDA at 2am. They just do it raw.
- FOMO’s own user P&L: **19 in 20 users** made nothing meaningful. Copy-trading as practiced today is a fee engine on noise. A capped MAG7 desk is the opposite product.
- Indexes + agent vaults on the chain were still tiny vs lending when last mapped (indexes on the order of **thousands of dollars**, agents **tens of thousands**). Lending ate **hundreds of millions**. Capital wants a simple USDG wrapper. Give it a trading mandate instead of 7% idle.

**Why people pick WAKE instead of GMGN/FOMO/APM**

1. You deposit once. You do not babysit a sniper task.  
2. The desk cannot buy a Pons launch or a fake “NVDA.” Official bytecode/issuer only.  
3. Size is capped per name and per session. Overnight is smaller on purpose.  
4. Fees are on **profits above high-water**, not on every buy.  
5. NAV, fills, and slippage vs the leader are public.  
6. You can leave through a queue. You are not stuck in a leader’s bag.

**Why leaders pick it**

They get **70% of performance fees** on other people’s USDG without giving those people a withdrawal key to the leader wallet.

---

## 3. Brand

### Primary: **WAKE**

**Meaning.** A ship leaves a wake. You do not stand on the bow and guess the wave. You ride the water already displaced by someone who is already moving. On this chain that also maps to the **cash-session wake**: most Stock Token volume is the after-hours trail of the real tape.

**Ticker:** `$WAKE`  
**Line:** *Trade in the wake. Not in the wash.*  
**Desk metaphor:** each vault is a **desk**. Followers take a **seat**. Leaders run a **book**.

Do not use Robin, Hood, Sherwood, Merry Men, or the feather logo. Those collide with the broker and with Sherwood Protocol.

### Backup names if WAKE is taken

| Name | Why |
|---|---|
| **SEAT** | Take a seat at a desk. Clean, retail, not cute. |
| **LATCH** | You latch a mandate onto a book. Mechanical. |
| **AFT** | Behind the lead ship. Same metaphor, more obscure. |

Visual: no mascot. A single wake line behind a block “desk.” Dark green / paper white. Looks like a blotter, not a meme.

---

## 4. Tokenomics (`$WAKE`)

Do not launch the token before one live desk has real deposits.

**Supply:** 1,000,000,000  
**Standard:** fixed ERC-20, 18 decimals, no mint, no tax, verified, LP locked.

| Bucket | % | Unlock |
|---|---|---|
| Community / liquidity / public launch | 40 | At TGE, LP locked ≥ 12 months |
| Ecosystem / maker + leader incentives | 20 | 24-month drip, only against measured desk volume and positive high-water |
| Treasury | 15 | Multisig, 6-month cliff, 18-month vest |
| Team + builders | 12 | 12-month cliff, 24-month vest after first $1M desk AUM *or* 12 months, whichever later |
| Followers / early desk points | 8 | Airdrop to people who deposited and stayed ≥ 30 days, not to snipers |
| Market making / listings | 5 | Operational |

**Value loop (keep it one loop)**

- Desk takes **2% of profits above each seat’s high-water** + **0.50% AUM / year**
- Split: **70% leader / 20% protocol / 10% stakers**
- Protocol share: **50% buyback-and-burn `$WAKE`, 50% treasury**
- Stake `$WAKE` to: list a desk (bond), boost a desk in the UI, and cut follower fees

No vote-to-print. No rebase. No “reflections.”

If the desks do not generate performance fees, the token should not pretend to.

---

## 5. Roadmap

### Phase 0 — Paper (weeks 1–2)

- Index official NVDA / AAPL / SPY swaps
- Paper-copy one wallet with ERC-8056 + Chainlink NAV
- Kill the idea if lag + slippage vs leader stays >1% after costs

### Phase 1 — One desk, no token (weeks 3–6)

- Testnet `46630`, then mainnet cap **$50k**
- You are leader #1, MAG7 spot only
- Public fill tape: leader fill → vault fill → bps slippage
- Instant redeem if USDG cash is there; else 24h unwind

**Exit gate:** 30 days live, withdrawals work, no admin key used.

### Phase 2 — Open desks + token (weeks 7–12)

- Second and third opted-in leaders
- `$WAKE` + locked LP
- Stake-to-list
- Session-aware size (cash hours vs overnight vs weekend)

### Phase 3 — Trading tools people keep open (months 4–6)

- After-hours basis cap + optional Longbow-style gap skip
- Agent seat (same risk module, no special leverage)
- Multi-leader portfolio seat (“40% desk A / 60% desk B”)
- Tax lot / PnL export

### Phase 4 — Market (months 6–12)

- RFQ / Rialto path when AMM is thin
- Desk insurance fund from protocol fees
- Isolated “meme desk” only if MAG7 desks are already profitable — separate factory, never mixed

---

## 6. Features that actually help traders

Ship only what changes a fill or a loss.

**Must have**

- Official Stock Token allowlist (issuer + bytecode hash)
- NAV in USDG using `balanceOfUI()`, not raw balances
- Per-name cap, daily turnover cap, 15% desk drawdown halt
- Smaller size when NYSE is shut (this is where 60% of stock-token volume lives)
- Skip if AMM is too far from Chainlink
- High-water performance fee
- Public slippage vs leader
- Withdrawal queue instead of forced market dumps

**Should have**

- Session clock on every desk card (open / extended / overnight / weekend)
- “Would this copy have filled?” simulator on last 7 days
- Leader bond in `$WAKE` slashed if they trade off-allowlist through the desk key
- One-click reduce-only (flatten to USDG, stop copying)
- Agent API: subscribe, cap, flatten

**Nice later**

- Copy the *delta*, not every clip (net 10 minutes of leader flow into one vault trade)
- Pair with Longbow: desk may rest a gap bid instead of chasing a 2am wick
- PnL split by session so people see overnight is the expensive part

Do not build: launch sniper, leverage, token-only deposits, 2/2 tax.

---

## 7. Positioning vs the field

```
FOMO / GMGN / APM     →  copy anything, pay on volume, die on launches
EARN / HoodVault      →  LP the stock, ignore the trader
Sherwood bot          →  you still click
WAKE                  →  USDG in, MAG7 book, caps on-chain, fee on profit
```

---

## 8. One-page story you can publish

WAKE is a desk protocol on Robinhood Chain.  
Followers deposit USDG into a vault.  
The vault copies an opted-in trader on official Stock Tokens only.  
Risk limits are in the contract.  
Leaders earn a cut of profits above the high-water mark.  
`$WAKE` is the fee and listing token, not the chip.

The chain already clears **more than a billion dollars a day**. Terminals already proved people will follow wallets. Those terminals also proved that **almost everyone who follows noise loses**. WAKE exists so the follow is a mandate, not a snipe.

If you want next, I can turn this into a public litepaper layout (same sections, tighter language) or the Phase-1 contract + keeper checklist.