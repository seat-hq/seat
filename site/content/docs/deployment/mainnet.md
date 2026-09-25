---
title: Deploy to Mainnet
description: The capped Phase 1 mainnet desk on 4663 — guards, defaults, and what the script refuses to do.
order: 3
---

::status{value="planned"}

`DeployMainnet.s.sol` is written and tested but **has never been broadcast**. This page documents the procedure as implemented.

## Hard guards (all enforced in the script)

- `CONFIRM_MAINNET=I_UNDERSTAND` — anything else reverts.
- Chain ID must be `4663`.
- `USDG_ADDRESS` must be exactly `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`.
- `OWNER` must equal the broadcaster.

## Configuration

```env
RH_RPC_URL=<your-mainnet-rpc-url>
PRIVATE_KEY=<your-private-key>
USDG_ADDRESS=0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168
OWNER=<your-deployer-address>
LEADER_ADDRESS=<opted-in-leader-address>
KEEPER_ADDRESS=<keeper-address>
PROTOCOL_FEE_RECIPIENT=<treasury-address>
CONFIRM_MAINNET=I_UNDERSTAND
# optional tuning (defaults shown):
# MAX_FILL_USDG=5000 MAX_POSITION_USDG=20000 MAX_GROSS_USDG=50000
# MAX_DRAWDOWN_BPS=2000 MAX_STALENESS_SEC=120 DEPOSIT_CAP_USDG=50000
```

## Deploy

```bash
make deploy-mainnet
```

The script deploys the module set (including `ChainlinkOracle` with the three cited 4663 feeds), creates one desk, applies the capped risk parameters and the 50,000 USDG deposit cap, and sets the keeper. It does **not**:

- set a swap router (no `ExactInputRouter02` is deployed — execution reverts until one is),
- deploy `SeatToken` / `StakingPool` / `LpLocker` (that is [Phase 2](/docs/deployment/phase-2)),
- set a `stakerRecipient` (the 10% staker fee slice accrues as a vault liability).

## After deploy

1. `make write-addresses` and commit.
2. Verify with `cast` (see [Deployment overview](/docs/deployment/overview#verification)).
3. Run the keeper in dry-run first: `make keeper-mainnet` **without** `SEAT_SUBMIT_TX=1` — it evaluates and encodes but never broadcasts.
4. Only then consider `SEAT_SUBMIT_TX=1`, and only with a deployed router — otherwise every copy reverts on-chain.

:::callout{type="warning" title="Execution is not wired"}
Until an `ExactInputRouter02` is deployed and set on the adapter, `executeCopy` reverts. A mainnet desk without a router is a cash vault with live deposits. That is the intended Phase 1 posture — do not improvise a router.
:::
