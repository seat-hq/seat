Use a single monorepo named `seat`. Do not split contracts and the app until you have users.

```text
seat/
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
├── foundry.toml
├── package.json
├── pnpm-workspace.yaml
├── Makefile
│
├── docs/
│   ├── litepaper.md
│   ├── risk.md
│   ├── allowlist.md
│   └── not-affiliated.md
│
├── contracts/
│   ├── src/
│   │   ├── DeskFactory.sol
│   │   ├── DeskVault.sol
│   │   ├── RiskModule.sol
│   │   ├── SwapAdapter.sol
│   │   ├── FeeModule.sol
│   │   ├── SeatToken.sol
│   │   ├── interfaces/
│   │   │   ├── IDeskVault.sol
│   │   │   ├── IRiskModule.sol
│   │   │   └── ISwapAdapter.sol
│   │   └── libraries/
│   │       └── NavLib.sol
│   ├── test/
│   │   ├── DeskVault.t.sol
│   │   ├── RiskModule.t.sol
│   │   ├── NavLib.t.sol
│   │   └── invariants/
│   │       └── DeskInvariants.t.sol
│   ├── script/
│   │   ├── DeployTestnet.s.sol
│   │   └── DeployMainnet.s.sol
│   └── lib/                    # git submodule: forge-std, openzeppelin
│
├── keeper/
│   ├── src/
│   │   ├── index.ts
│   │   ├── chain.ts
│   │   ├── indexer.ts
│   │   ├── signaler.ts
│   │   ├── executor.ts
│   │   ├── nav.ts
│   │   └── session.ts
│   ├── test/
│   └── package.json
│
├── app/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   │   ├── wagmi.ts
│   │   │   ├── desks.ts
│   │   │   └── addresses.ts
│   │   └── abis/
│   ├── public/
│   └── package.json
│
├── sdk/
│   ├── src/
│   │   ├── index.ts
│   │   ├── registry.ts
│   │   └── nav.ts
│   └── package.json
│
└── scripts/
    ├── sync-allowlist.ts
    └── paper-copy.ts
```

## Root files

**`.gitignore`**
```gitignore
out/
cache/
broadcast/
lib/
node_modules/
.env
.env.local
*.log
dist/
.next/
coverage/
lcov.info
keeper/keys/
```

**`.env.example`**
```bash
RH_RPC_URL=https://robinhood-mainnet.g.alchemy.com/v2/YOUR_KEY
RH_TESTNET_RPC_URL=https://rpc.testnet.chain.robinhood.com
RH_WS_URL=wss://feed.mainnet.chain.robinhood.com
CHAIN_ID=4663
PRIVATE_KEY=
DESK_ADDRESS=
```

**`foundry.toml`**
```toml
[profile.default]
src = "contracts/src"
test = "contracts/test"
script = "contracts/script"
out = "out"
libs = ["contracts/lib"]
solc = "0.8.28"
optimizer = true
optimizer_runs = 200
via_ir = true
evm_version = "cancun"

[rpc_endpoints]
robinhood = "${RH_RPC_URL}"
robinhood_testnet = "${RH_TESTNET_RPC_URL}"

[etherscan]
robinhood = { key = "verifycontract", url = "https://robinhoodchain.blockscout.com/api" }
```

**`pnpm-workspace.yaml`**
```yaml
packages:
  - app
  - keeper
  - sdk
```

**`Makefile`**
```makefile
.PHONY: install build test paper deploy-testnet

install:
	forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts --no-commit
	pnpm install

build:
	forge build

test:
	forge test -vvv

paper:
	pnpm --filter keeper exec tsx ../scripts/paper-copy.ts

deploy-testnet:
	forge script contracts/script/DeployTestnet.s.sol --rpc-url robinhood_testnet --broadcast
```

## `README.md` (paste this)

```markdown
# SEAT

USDG desks that copy opted-in Stock Token traders on Robinhood Chain.

Not affiliated with Robinhood Markets. Stock Tokens are unavailable to US persons
and are tokenized debt securities, not shares.

## What this repo is

| Path | Job |
|---|---|
| `contracts/` | Desk factory, vault, risk, swap adapter |
| `keeper/` | Watches leader fills, submits vault copies |
| `app/` | Deposit / seats / fill tape |
| `sdk/` | Official token registry + NAV math |
| `docs/` | Litepaper and risk |

## Chain

- Mainnet `4663`
- Testnet `46630`
- Gas: ETH
- Accounting asset: USDG (6 decimals)
- v1 books: official NVDA, AAPL, SPY only

## Status

Phase 0 — paper copy. Do not deposit mainnet funds.

## Quick start

```bash
git clone git@github.com:seat-hq/seat.git
cd seat
make install
make test
```

## Rules

- No mint on `$SEAT`
- No volume fee
- NAV uses `balanceOfUI()`, not raw balances
- After-hours size is smaller than cash-session size
```

## What each contract is for

| File | Responsibility |
|---|---|
| `DeskFactory.sol` | Creates one `DeskVault` per leader |
| `DeskVault.sol` | Holds USDG + allowlisted stock tokens, issues seat shares |
| `RiskModule.sol` | Caps, session clock, drawdown halt, skip rules |
| `SwapAdapter.sol` | Uniswap v3/v4 + Universal Router |
| `FeeModule.sol` | High-water performance fee + AUM drip |
| `SeatToken.sol` | Empty until Phase 2. Do not deploy in week 1 |
| `NavLib.sol` | USDG NAV from `balanceOfUI` × Chainlink |

Leave `SeatToken.sol` as a stub with a comment: *do not deploy until one desk has 30 live days*.

## Commands to create it

```bash
mkdir seat && cd seat
git init
git checkout -b main

mkdir -p contracts/{src/{interfaces,libraries},test/invariants,script} \
         keeper/{src,test} app/src/{app,components,lib,abis} \
         sdk/src docs scripts

# add the files above, then:
git submodule add https://github.com/foundry-rs/forge-std contracts/lib/forge-std
git submodule add https://github.com/OpenZeppelin/openzeppelin-contracts contracts/lib/openzeppelin-contracts

git add .
git commit -m "init: SEAT monorepo for Robinhood Chain desks"
```

GitHub: org `seat-hq`, repo `seat`, description:

```text
Copy desks for official Stock Tokens on Robinhood Chain (4663)
```

Topics: `robinhood-chain`, `copy-trading`, `erc20`, `foundry`

Do not put private keys, allowlist CSVs with secrets, or mainnet broadcast logs in git. `broadcast/` stays ignored except you may commit testnet run addresses under `docs/deployments.md` later.

Phase 0 only needs `scripts/paper-copy.ts`, `sdk/src/registry.ts`, and `docs/`. Contracts can land in the same commit as empty skeletons so the tree is stable.