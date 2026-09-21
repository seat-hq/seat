# SEAT

USDG desks that copy opted-in Stock Token traders on Robinhood Chain.

Not affiliated with Robinhood Markets. Stock Tokens may be subject to
jurisdictional restrictions and are not the same as directly owning shares.

## What this repo is

| Path | Job |
|---|---|
| `contracts/` | Desk factory, vault, risk, swap adapter |
| `keeper/` | Watches leader fills, submits vault copies |
| `app/` | Deposit / seats / fill tape |
| `sdk/` | Official token registry + NAV math |
| `docs/` | Litepaper, Phase 1/2 runbooks, and risk |

## Chain

- Mainnet `4663` — capped live desk ($50k USDG) after a guarded deploy
- Testnet `46630` — Phase 1 cash vault (shipped)
- Gas: ETH
- Accounting asset: USDG (6 decimals)
- v1 books: official NVDA, AAPL, SPY on **4663** (`verified` + `enabled`)

## Status

Phase 0 paper copy is shipped. **Phase 1 (testnet desks) is shipped on
Robinhood testnet `46630`**: factory + cash vault, USDG deposit/redeem in the
blotter, keeper bound to `vault.leader()`. **Phase 2 code is shipped**:
fixed-supply `$SEAT` (1B, no mint), 70/20/10 fees, stake-to-list, extra
desks, 12-month LP locker. Mainnet TGE still needs dual confirm
(`CONFIRM_MAINNET` + `CONFIRM_SEAT_TGE`) — addresses stay null until then.
The app falls back to the paper blotter when the connected chain has no vault.

See [`docs/phase-1.md`](docs/phase-1.md) for the testnet runbook,
[`docs/phase-1-live.md`](docs/phase-1-live.md) for cited 4663 MAG7 / feeds /
SwapRouter02 and the $50k cap, and [`docs/phase-2.md`](docs/phase-2.md) for
`$SEAT` + open desks.

## Quick start

```bash
git clone git@github.com:seat-hq/seat.git
cd seat
make install
make test
```

Run the paper-copy engine (no private key required):

```bash
make paper
```

App (defaults to testnet 46630; deposit/redeem write on 4663 or 46630 when
that chain has a real vault):

```bash
make app-dev
```

Keeper on testnet config (paper executor unless live guards pass — they do
not in Phase 1, because no SwapAdapter router is set):

```bash
make keeper-testnet
```

Guarded Phase 2 TGE (does not run unless both confirms are set):

```bash
CONFIRM_MAINNET=I_UNDERSTAND CONFIRM_SEAT_TGE=I_UNDERSTAND make deploy-phase2
```

## Rules

- No mint on `$SEAT`
- No volume fee
- NAV uses `balanceOfUI()`, not raw balances
- After-hours size is smaller than cash-session size
- Writes on chain `46630` (testnet vault) or `4663` (capped desk, once wired).
- No ungated mainnet AUM. Cap is $50k USDG.

## Layout

| File | Responsibility |
|---|---|
| `contracts/src/DeskFactory.sol` | Creates one `DeskVault` per leader |
| `contracts/src/DeskVault.sol` | Holds USDG + allowlisted stock tokens, issues seat shares |
| `contracts/src/RiskModule.sol` | Caps, session clock, drawdown halt, skip rules |
| `contracts/src/SwapAdapter.sol` | Restricted swap adapter (no arbitrary calldata) |
| `contracts/src/FeeModule.sol` | High-water performance fee + AUM accrual + 70/20/10 split |
| `contracts/src/SeatToken.sol` | Fixed 1B `$SEAT`, no mint after deploy |
| `contracts/src/StakingPool.sol` | Stake `$SEAT`, claim USDG fee share |
| `contracts/src/LpLocker.sol` | 12-month Uniswap v3 position NFT lock |
| `contracts/src/libraries/NavLib.sol` | USDG NAV from `balanceOfUI` x oracle price |

Not affiliated with Robinhood Markets. This is not investment advice. See
[`docs/not-affiliated.md`](docs/not-affiliated.md) and [`docs/risk.md`](docs/risk.md).
