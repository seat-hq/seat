---
title: Keeper Overview
description: What the keeper does, how it is configured, and the guarantees it does and does not provide.
order: 1
---

The keeper (`keeper/`) is a TypeScript process that turns leader activity into vault copies. It is the only off-chain actor in the protocol, and it is deliberately simple: no framework, no database, one output file.

## What it does

1. **Resolves desks** — `DESK_ADDRESSES` (comma list), else `DESK_ADDRESS`, else walks `DESK_FACTORY`'s `allDesks`, else falls back to `LEADER_ADDRESS`. For each desk it reads `vault.leader()` over RPC; it never invents a leader.
2. **Loads chain config** — chain id, RPC/WS URLs, signer presence — and logs a redacted view (`redactChainConfig` masks URL paths and never prints keys).
3. **Sources fills** — fixture tape (paper) or ERC-20 `Transfer` logs (live).
4. **Runs the pipeline** per fill: normalize → session → risk → execute (paper or live) → record.
5. **Writes the tape** to `keeper/data/fills.json` (gitignored), which the app serves at `/api/fills`.

## Running it

```bash
make keeper-testnet   # EXECUTION_MODE=PAPER (default), CHAIN_ID=46630
make keeper-mainnet   # EXECUTION_MODE=LIVE, CHAIN_ID=4663, SWAP_ROUTER_CONFIGURED=1
```

Both targets run `pnpm --filter keeper exec tsx src/index.ts`. The keeper is a batch process: it processes the currently available fills, writes the tape, and exits. Scheduling (cron, systemd, a loop) is the operator's choice — see [Operations](/docs/operations/keeper-operations).

## Guarantees

**It does:**
- apply the same risk rules that the vault enforces, before submitting;
- label every tape row honestly (`source=fixture` or `source=chain`);
- fail closed at every guard — unknown chain, missing router, ineligible symbol, missing key all produce a throw, not a best-effort attempt.

**It does not:**
- custody funds (it has no allowance over vault assets beyond triggering swaps the vault executes on itself);
- choose leaders;
- guarantee copies happen — a stopped keeper means missed copies;
- guarantee execution quality beyond the `minAmountOut` it computes.

## Trust position

The keeper is a **single operator** in the current phase. Its on-chain authority is exactly one function (`executeCopy`), bounded by the risk module, the swap adapter's allowlist, and the vault's cash. The full trust matrix is in [Security](/docs/security/security-model); the failure playbook is in [Operations → Failure modes](/docs/operations/failure-modes).
