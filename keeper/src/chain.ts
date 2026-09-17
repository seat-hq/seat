/**
 * Chain configuration for the keeper.
 *
 * Endpoints and keys are read from the environment. Nothing sensitive is ever
 * logged: {@link redactChainConfig} produces a safe view for diagnostics.
 */
import { CHAIN } from "@seat/sdk";

export interface ChainConfig {
  readonly chainId: number;
  readonly rpcUrl: string;
  readonly wsUrl: string | null;
  readonly testnet: boolean;
  /** Whether a signing key is present. The key itself is never stored here. */
  readonly hasSigner: boolean;
}

export interface RedactedChainConfig {
  readonly chainId: number;
  readonly rpcUrl: string;
  readonly wsUrl: string | null;
  readonly testnet: boolean;
  readonly hasSigner: boolean;
}

type Env = Record<string, string | undefined>;

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    // Drop any embedded credentials and mask the path (often contains API keys).
    const path = u.pathname === "/" ? "" : "/<redacted>";
    return `${u.protocol}//${u.host}${path}`;
  } catch {
    return "<invalid-url>";
  }
}

/**
 * Load chain config from the environment. Defaults to testnet when the chain id
 * is not the known mainnet id, so we fail toward the safer network.
 */
export function loadChainConfig(env: Env = process.env): ChainConfig {
  const chainId = Number(env.CHAIN_ID ?? CHAIN.TESTNET_ID);
  const testnet = chainId !== CHAIN.MAINNET_ID;
  const rpcUrl =
    (testnet ? env.RH_TESTNET_RPC_URL : env.RH_RPC_URL) ??
    env.RH_TESTNET_RPC_URL ??
    "";
  const wsUrl = env.RH_WS_URL ?? null;
  const hasSigner = Boolean(env.PRIVATE_KEY && env.PRIVATE_KEY.length > 0);
  return { chainId, rpcUrl, wsUrl, testnet, hasSigner };
}

/** Safe-to-log view: URLs masked, key presence only (never the key). */
export function redactChainConfig(cfg: ChainConfig): RedactedChainConfig {
  return {
    chainId: cfg.chainId,
    rpcUrl: cfg.rpcUrl ? redactUrl(cfg.rpcUrl) : "<unset>",
    wsUrl: cfg.wsUrl ? redactUrl(cfg.wsUrl) : null,
    testnet: cfg.testnet,
    hasSigner: cfg.hasSigner,
  };
}
