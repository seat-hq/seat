---
title: Commands
description: Every Makefile target and package script — what each one actually runs.
order: 3
---

## Makefile targets

| Target | Runs | Notes |
|---|---|---|
| `make install` | `forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts --no-commit` + `pnpm install` | First-time setup |
| `make build` | `forge build` | Contracts only |
| `make test` | `forge test -vvv` | 90 tests, 13 suites |
| `make paper` | `pnpm --filter keeper exec tsx ../scripts/paper-copy.ts` | Phase 0 engine; no key/RPC needed |
| `make deploy-testnet` | `forge script DeployTestnet.s.sol --rpc-url robinhood_testnet --broadcast` | Sources `.env`; never deploys SeatToken, never sets a router |
| `make deploy-mainnet` | `forge script DeployMainnet.s.sol --rpc-url robinhood --broadcast` | **Refuses** without `CONFIRM_MAINNET=I_UNDERSTAND` |
| `make deploy-phase2` | `forge script DeployPhase2.s.sol --rpc-url robinhood --broadcast` | **Refuses** without both `CONFIRM_MAINNET` and `CONFIRM_SEAT_TGE` |
| `make write-addresses` | `pnpm exec tsx scripts/write-addresses.ts` | Regenerates `app/src/lib/addresses.ts` from broadcast logs |
| `make app-dev` | `pnpm --filter @seat/app dev` | The blotter |
| `make site-dev` / `make site-build` | `pnpm --filter @seat/site dev/build` | This documentation site (dev port 3100) |
| `make keeper-testnet` | keeper with `EXECUTION_MODE=PAPER`, `CHAIN_ID=46630` | Paper executor unless live guards pass (they do not on 46630) |
| `make keeper-mainnet` | keeper with `EXECUTION_MODE=LIVE`, `CHAIN_ID=4663`, `SWAP_ROUTER_CONFIGURED=1` | Still dry-runs unless `SEAT_SUBMIT_TX=1` |

The Makefile prepends `~/.foundry/bin` to `PATH`, so cron/systemd contexts work without an interactive shell profile.

## Package scripts

| Package | Scripts |
|---|---|
| root | `build` / `test` / `typecheck` (recursive), `paper` |
| `keeper` | `start` (`tsx src/index.ts`), `build`/`typecheck` (`tsc`), `test` (live-guards) |
| `@seat/sdk` | `build`/`typecheck` (`tsc` → `dist/`) |
| `@seat/app` | `dev`, `build`, `start`, `typecheck` |
| `@seat/site` | `dev` (port 3100), `build`, `start`, `typecheck`, `test` (story numbers) |

## Everyday loops

```bash
# contracts
forge build && forge test -vvv

# keeper change
pnpm --filter keeper test && make paper

# app change
pnpm --filter @seat/app typecheck && make app-dev

# docs change (this site)
make site-dev
```
