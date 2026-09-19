# Phase 1 runbook — testnet desks (46630)

**Status: shipped** on Robinhood testnet `46630` after a real USDG
deposit/redeem path on the blotter.

Phase 1 wires Phase 0’s cash vault and factory to **Robinhood testnet
`46630`**. It does **not** deploy `$SEAT`, does **not** set a SwapAdapter
router, and does **not** invent USDG / token / oracle / router addresses.

`make paper` still runs the Phase 0 paper engine with no key and no RPC.

## 1. Obtain authoritative endpoints

Do not invent these. Copy them from the issuer / chain docs you trust:

- Testnet RPC → `RH_TESTNET_RPC_URL` / `NEXT_PUBLIC_RH_TESTNET_RPC_URL`
- Testnet USDG → `USDG_ADDRESS`
- Deployer / owner → `OWNER` (should be the address that signs the deploy)
- Opted-in leader → `LEADER_ADDRESS` (protocol owner chooses; keeper does not)
- Keeper hot wallet → `KEEPER_ADDRESS` (optional)

Leave `PRIVATE_KEY` empty in `.env.example`. Put the real key only in a local
`.env` that is gitignored.

Default `CHAIN_ID=46630`. Do not point local work at mainnet `4663`.

```bash
cp .env.example .env
# fill RH_TESTNET_RPC_URL, USDG_ADDRESS, OWNER, optional LEADER_ADDRESS
```

## 2. Deploy core contracts

From the repo root (Foundry uses `foundry.toml` `robinhood_testnet`):

```bash
make deploy-testnet
```

This is `forge script contracts/script/DeployTestnet.s.sol --rpc-url robinhood_testnet --broadcast`.

It deploys **RiskModule, SwapAdapter (router = 0), FeeModule, DeskFactory**.
It never deploys `SeatToken` and never calls `setRouter`.

If `LEADER_ADDRESS` is set **and** the broadcaster is `OWNER`, the script also
calls `factory.createDesk(leader)` and logs the vault. If `KEEPER_ADDRESS` is
set, it calls `vault.setKeeper`. If `MAX_FILL_USDG` is set, it calls
`RiskModule.configureDesk`.

## 3. Record addresses (do not type them by hand)

```bash
pnpm exec tsx scripts/write-addresses.ts
```

The script reads `broadcast/DeployTestnet.s.sol/46630/run-latest.json` if
present and writes `46630` entries in `app/src/lib/addresses.ts`. Mainnet
stays `null`. If there is no broadcast file, addresses stay `null` and the
app keeps the Phase 0 paper blotter (honest fallback).

## 4. Create a desk (if the deploy skipped it)

```text
DeskFactory.createDesk(LEADER_ADDRESS)   # owner only, one vault per leader
DeskVault.setKeeper(KEEPER_ADDRESS)      # owner only
RiskModule.configureDesk(...)            # optional caps
```

The keeper **reads** `vault.leader()`. It does not choose a leader.

## 5. Two deposits and one redeem

On the app (`make app-dev`), connect a wallet **on chain 46630**:

1. Approve USDG for the vault, deposit amount A.
2. Deposit amount B (pro-rata shares).
3. Redeem some shares.

Instant redeem pays USDG immediately when the vault is unpaused and
`cashUsdg` covers the assets. Otherwise the redeem is **queued**
(`WithdrawQueued`) until `processWithdrawals`.

The blotter should show on-chain NAV, cash, shares, and your seat. Mainnet
`4663` writes are refused.

## 6. Keeper fill tape

```bash
make keeper-testnet
```

`EXECUTION_MODE` defaults to `PAPER`. The keeper binds to `DESK_ADDRESS`
(`leader()` on chain, else `LEADER_ADDRESS`), processes the static fixture
tape, and appends outcomes to `keeper/data/fills.json` with
`source=fixture`. The app’s `/api/fills` serves that file. Fixtures are
never labeled live.

`LiveExecutor` throws unless `CHAIN_ID===46630` **and** a router is
configured **and** the symbol is `isTradeEligible`. `CHAIN_ID===4663` is
always a hard error. Phase 1 has no router, so the live path never submits.

## 7. Verify without testnet keys

```bash
forge test -vvv
pnpm --filter @seat/app typecheck
make paper
```

If `RH_TESTNET_RPC_URL`, `USDG_ADDRESS`, and a key are missing, stop after
this dry-run. Do not fabricate addresses in `addresses.ts`.

## Out of scope for Phase 1

Stock Token swaps, oracle NAV with positions, FeeModule hooked into the
vault, `$SEAT`, and mainnet deposit cap. The 46630 deposit/redeem path is
proven; merging this branch to `main` is a repo step, not a product gate.
