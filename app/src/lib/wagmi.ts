/**
 * wagmi / viem configuration for Robinhood Chain.
 *
 * Default chain is testnet 46630. Writes are refused on mainnet 4663
 * (see canWriteOnChain). RPC URLs come from env; placeholder hosts keep
 * the app type-checking when unset.
 */
import { http, createConfig } from "wagmi";
import { defineChain } from "viem";
import { CHAIN } from "@seat/sdk";
import { injected } from "@/lib/injected";

const MAINNET_RPC =
  process.env.NEXT_PUBLIC_RH_RPC_URL ?? "https://rpc.invalid/mainnet";
const TESTNET_RPC =
  process.env.NEXT_PUBLIC_RH_TESTNET_RPC_URL ?? "https://rpc.invalid/testnet";

export const robinhood = defineChain({
  id: CHAIN.MAINNET_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: CHAIN.GAS_ASSET, decimals: 18 },
  rpcUrls: { default: { http: [MAINNET_RPC] } },
});

export const robinhoodTestnet = defineChain({
  id: CHAIN.TESTNET_ID,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: CHAIN.GAS_ASSET, decimals: 18 },
  rpcUrls: { default: { http: [TESTNET_RPC] } },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [robinhoodTestnet, robinhood],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [robinhood.id]: http(MAINNET_RPC),
    [robinhoodTestnet.id]: http(TESTNET_RPC),
  },
  ssr: true,
});
