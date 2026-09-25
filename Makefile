.PHONY: install build test paper deploy-testnet deploy-mainnet deploy-phase2 app-dev site-dev site-build keeper-testnet keeper-mainnet write-addresses

# Foundry is installed to ~/.foundry/bin; make does not inherit an interactive PATH.
export PATH := $(HOME)/.foundry/bin:$(PATH)

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
	set -a && [ -f .env ] && . ./.env && set +a; \
	forge script contracts/script/DeployTestnet.s.sol --rpc-url robinhood_testnet --broadcast --private-key "$$PRIVATE_KEY"

# Refuses unless CONFIRM_MAINNET=I_UNDERSTAND. Never deploys SeatToken.
deploy-mainnet:
	set -a && [ -f .env ] && . ./.env && set +a; \
	test "$$CONFIRM_MAINNET" = "I_UNDERSTAND" || { echo "set CONFIRM_MAINNET=I_UNDERSTAND"; exit 1; }; \
	forge script contracts/script/DeployMainnet.s.sol --rpc-url robinhood --broadcast --private-key "$$PRIVATE_KEY"

# Phase 2 TGE + extra desks. Dual confirm. Does not invent leaders or NPM.
deploy-phase2:
	set -a && [ -f .env ] && . ./.env && set +a; \
	test "$$CONFIRM_MAINNET" = "I_UNDERSTAND" || { echo "set CONFIRM_MAINNET=I_UNDERSTAND"; exit 1; }; \
	test "$$CONFIRM_SEAT_TGE" = "I_UNDERSTAND" || { echo "set CONFIRM_SEAT_TGE=I_UNDERSTAND"; exit 1; }; \
	forge script contracts/script/DeployPhase2.s.sol --rpc-url robinhood --broadcast --private-key "$$PRIVATE_KEY"

write-addresses:
	pnpm exec tsx scripts/write-addresses.ts

app-dev:
	pnpm --filter @seat/app dev

site-dev:
	pnpm --filter @seat/site dev

site-build:
	pnpm --filter @seat/site build

# Paper executor unless live guards pass (no cited 46630 router).
keeper-testnet:
	EXECUTION_MODE=$${EXECUTION_MODE:-PAPER} CHAIN_ID=$${CHAIN_ID:-46630} pnpm --filter keeper exec tsx src/index.ts

# LIVE on 4663 still dry-runs unless SEAT_SUBMIT_TX=1 after a real vault.
keeper-mainnet:
	EXECUTION_MODE=$${EXECUTION_MODE:-LIVE} CHAIN_ID=4663 SWAP_ROUTER_CONFIGURED=$${SWAP_ROUTER_CONFIGURED:-1} pnpm --filter keeper exec tsx src/index.ts
