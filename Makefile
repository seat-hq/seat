.PHONY: install build test paper deploy-testnet app-dev keeper-testnet write-addresses

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

write-addresses:
	pnpm exec tsx scripts/write-addresses.ts

app-dev:
	pnpm --filter @seat/app dev

# Paper executor unless live guards pass (they do not: no router in Phase 1).
keeper-testnet:
	EXECUTION_MODE=$${EXECUTION_MODE:-PAPER} CHAIN_ID=$${CHAIN_ID:-46630} pnpm --filter keeper exec tsx src/index.ts
