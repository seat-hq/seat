---
title: Development Setup
description: Requirements, installation, build, test, and lint — the exact commands from the repository.
order: 1
---

## Requirements

| Tool | Version | Source of truth |
|---|---|---|
| Node.js | `>= 18` | root `package.json` `engines` |
| pnpm | `9.0.0` | root `package.json` `packageManager` |
| Foundry | latest (`forge`, `cast`) | `foundry.toml`; the Makefile prepends `~/.foundry/bin` to `PATH` |
| Solidity | `0.8.28` | `foundry.toml` `solc` |

## Installation

```bash
git clone git@github.com:seat-hq/seat.git
cd seat
make install
```

`make install` runs `forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts --no-commit` then `pnpm install`.

## Build

```bash
make build          # forge build (contracts)
pnpm -r build       # sdk (tsc), keeper (tsc), app + site (next build)
```

## Test

```bash
make test                       # forge test -vvv — 90 tests, 13 suites
pnpm --filter keeper test       # live-guard tests (tsx)
pnpm --filter @seat/site test   # story-number tests (node --test)
pnpm typecheck                  # workspace-wide tsc --noEmit
```

## Lint / format

```bash
forge fmt                # Solidity formatting
pnpm exec eslint .       # where eslint configs exist (keeper has eslint directives)
```

There is no repo-wide ESLint config at the root; formatting discipline for contracts is `forge fmt`, and TypeScript is kept honest by `pnpm typecheck`.

## Local chain

No local-chain harness (anvil fork scripts, etc.) is shipped. Development against a chain uses Robinhood **testnet `46630`**; the paper engine (`make paper`) needs no chain at all. Do not point local work at mainnet `4663` — the Phase 1 runbook states this explicitly.

## Repository layout

| Path | Job |
|---|---|
| `contracts/` | Desk factory, vault, risk, swap adapter (Foundry) |
| `keeper/` | Watches leader fills, submits vault copies |
| `app/` | Deposit / seats / fill tape (Next.js) |
| `sdk/` | Official token registry + NAV math |
| `site/` | This documentation and project site |
| `docs/` | Litepaper, phase runbooks, risk (rendered under [Runbooks](/docs/runbooks/litepaper)) |
| `scripts/` | `paper-copy.ts`, `write-addresses.ts` |
