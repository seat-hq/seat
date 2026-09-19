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
| `docs/` | Litepaper, Phase 1 runbook, and risk |

## Chain

- Mainnet `4663` — do not deposit
- Testnet `46630` — Phase 1 (shipped)
- Gas: ETH
- Accounting asset: USDG (6 decimals)
- v1 books: official NVDA, AAPL, SPY only (registry still placeholder)

## Status

Phase 0 paper copy is shipped. **Phase 1 (testnet desks) is shipped on
Robinhood testnet `46630`**: factory + cash vault, USDG deposit/redeem in the
blotter, keeper bound to `vault.leader()`. No `$SEAT` token. No mainnet vault.
The app falls back to the paper blotter when 46630 addresses are unset.

See [`docs/phase-1.md`](docs/phase-1.md) for the testnet runbook.

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

App (defaults to testnet 46630; deposit/redeem write only on that chain):

```bash
make app-dev
```

Keeper on testnet config (paper executor unless live guards pass — they do
not in Phase 1, because no SwapAdapter router is set):

```bash
make keeper-testnet
```

## Rules

- No mint on `$SEAT`
- No volume fee
- NAV uses `balanceOfUI()`, not raw balances
- After-hours size is smaller than cash-session size
- Writes only on chain `46630`. Mainnet `4663` is always refused.

## Layout

| File | Responsibility |
|---|---|
| `contracts/src/DeskFactory.sol` | Creates one `DeskVault` per leader |
| `contracts/src/DeskVault.sol` | Holds USDG + allowlisted stock tokens, issues seat shares |
| `contracts/src/RiskModule.sol` | Caps, session clock, drawdown halt, skip rules |
| `contracts/src/SwapAdapter.sol` | Restricted swap adapter (no arbitrary calldata) |
| `contracts/src/FeeModule.sol` | High-water performance fee + AUM accrual |
| `contracts/src/SeatToken.sol` | Stub. Do not deploy until one desk has 30 live days |
| `contracts/src/libraries/NavLib.sol` | USDG NAV from `balanceOfUI` x oracle price |

Not affiliated with Robinhood Markets. This is not investment advice. See
[`docs/not-affiliated.md`](docs/not-affiliated.md) and [`docs/risk.md`](docs/risk.md).
