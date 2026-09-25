---
title: Deploy to Testnet
description: Reproducing the Phase 1 testnet deployment on 46630.
order: 2
---

::status{value="implemented"}

The live testnet deployment is documented in the repo's [Phase 1 live runbook](/docs/runbooks/phase-1-live). This page is the procedure.

## Prerequisites

- `make install` completed.
- A funded testnet key (ETH for gas).
- `.env` configured:

```env
RH_TESTNET_RPC_URL=<your-testnet-rpc-url>
PRIVATE_KEY=<your-private-key>
USDG_ADDRESS=0x7E955252E15c84f5768B83c41a71F9eba181802F
OWNER=<your-deployer-address>
LEADER_ADDRESS=<opted-in-leader-address>
KEEPER_ADDRESS=<keeper-address>
PROTOCOL_FEE_RECIPIENT=<treasury-address>   # defaults to OWNER
```

## Deploy

```bash
make deploy-testnet
```

What it does, in order:

1. Deploys `NavLib`, `FeeModule`, `RiskModule`, `SwapAdapter` (router unset), `DeskFactory`.
2. Calls `factory.createDesk(LEADER_ADDRESS)` → bootstrap `DeskVault`.
3. Sets the vault's keeper to `KEEPER_ADDRESS`.
4. **Never** calls `setRouter`, **never** deploys `SeatToken`, and skips `configureDesk` unless the `MAX_*` env vars are set.

## Record the addresses

```bash
make write-addresses
```

This regenerates `app/src/lib/addresses.ts` from `contracts/broadcast/**/run-latest.json`. Commit the result — it is the address source of truth.

## Verify

```bash
# factory produced one desk
cast call $FACTORY "allDesks(uint256)(address)" 0 --rpc-url $RH_TESTNET_RPC_URL

# vault is cash-only: router must be zero
cast call $ADAPTER "router()(address)" --rpc-url $RH_TESTNET_RPC_URL
# → 0x0000000000000000000000000000000000000000
```

## Run the keeper against it

```bash
make keeper-testnet
```

Paper executor, chain 46630, fixture fills. Live execution is impossible on testnet by design (`isTradeEligible` is false for every 46630 asset).
