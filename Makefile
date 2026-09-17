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
