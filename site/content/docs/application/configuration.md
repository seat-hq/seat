---
title: Application Configuration
description: Environment variables, the generated address book, and the write-gate logic.
order: 2
---

## Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_RH_TESTNET_RPC_URL` | RPC for testnet `46630` (default chain) |
| `NEXT_PUBLIC_RH_RPC_URL` | RPC for mainnet `4663` |
| `NEXT_PUBLIC_CHAIN_ID` | Chain the app targets by default |

Unset RPCs fall back to `https://rpc.invalid/…` placeholders — enough to typecheck and render, not to read a chain.

## The address book (`app/src/lib/addresses.ts`)

Per-chain `AddressEntry` records:

```ts
interface AddressEntry {
  riskModule: `0x${string}` | null;
  swapAdapter: `0x${string}` | null;
  feeModule: `0x${string}` | null;
  deskFactory: `0x${string}` | null;
  deskVault: `0x${string}` | null;
  chainlinkOracle: `0x${string}` | null;
  usdg: `0x${string}` | null;
  seatToken: `0x${string}` | null;
  stakingPool: `0x${string}` | null;
  lpLocker: `0x${string}` | null;
}
```

- The file is **generated** by `scripts/write-addresses.ts` from Foundry broadcast logs — do not hand-edit invented addresses (the file header says so).
- Today: testnet `46630` has the Phase 1 deployment filled in; mainnet `4663` has only the official USDG address, everything else `null`.
- `getAddresses(chainId)` returns the entry (or all-null `EMPTY`); `hasTestnetVault` and `canWriteOnChain` derive UI gating.

## The write gate

```ts
function canWriteOnChain(chainId: number, entry: AddressEntry): boolean {
  if (chainId !== CHAIN.MAINNET_ID && chainId !== CHAIN.TESTNET_ID) return false;
  return entry.deskVault !== null;
}
```

No vault address ⇒ no writes, on any chain. This is why "do not deposit on mainnet" is enforced by the UI rather than by convention.

## wagmi configuration

`app/src/lib/wagmi.ts` defines both chains with `defineChain` (ETH as native currency), an injected connector with `shimDisconnect`, HTTP transports from the env URLs, and `ssr: true`. There is no WalletConnect or hosted connector — an injected wallet on a Robinhood chain is the only path.
