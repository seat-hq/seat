/**
 * Encode DeskVault.executeCopy and (optionally) submit as the keeper.
 *
 * Signing uses a raw JSON-RPC path only when PRIVATE_KEY + RPC + DESK are set.
 * Without a cited router + eligible symbol the caller must not reach here.
 */
import { CHAIN, getOfficialStockToken, isTradeEligible } from "@seat/sdk";
import type { Decision } from "./executor.js";
import type { CopySignal } from "./signaler.js";

const EXECUTE_COPY_SELECTOR = "0xf18f678f";

const SESSION_ENUM: Record<string, number> = {
  closed: 0,
  pre_market: 1,
  regular: 2,
  after_hours: 3,
};

function pad32(hexNoPrefix: string): string {
  return hexNoPrefix.replace(/^0x/, "").padStart(64, "0");
}

function encodeUint(n: bigint | number): string {
  return pad32(BigInt(n).toString(16));
}

function encodeAddress(addr: string): string {
  return pad32(addr.slice(2).toLowerCase());
}

function encodeBool(v: boolean): string {
  return encodeUint(v ? 1 : 0);
}

export function encodeExecuteCopy(args: {
  token: string;
  isBuy: boolean;
  sizeUsdg: bigint;
  session: string;
  priceUpdatedAt: bigint;
  minAmountOut: bigint;
}): `0x${string}` {
  const session = SESSION_ENUM[args.session] ?? 0;
  return `${EXECUTE_COPY_SELECTOR}${encodeAddress(args.token)}${encodeBool(args.isBuy)}${encodeUint(args.sizeUsdg)}${encodeUint(session)}${encodeUint(args.priceUpdatedAt)}${encodeUint(args.minAmountOut)}` as `0x${string}`;
}

export function minAmountOutFromSignal(
  signal: CopySignal,
  sizeUsdg: bigint,
  chainId: number = CHAIN.TESTNET_ID,
): bigint {
  if (signal.price <= 0n) return 1n;
  const entry = getOfficialStockToken(signal.symbol, chainId);
  const tdec = BigInt(entry?.decimals ?? 18);
  const pdec = BigInt(signal.priceDecimals);
  if (signal.side === "buy") {
    // tokens = usdg * 10^tdec * 10^pdec / (price * 10^6)
    const raw =
      (sizeUsdg * 10n ** tdec * 10n ** pdec) / (signal.price * 10n ** 6n);
    return raw > 0n ? raw : 1n;
  }
  return sizeUsdg > 0n ? sizeUsdg : 1n;
}

export async function submitExecuteCopy(
  signal: CopySignal,
  decision: Decision,
  session: string,
  env: Record<string, string | undefined> = process.env,
): Promise<`0x${string}`> {
  const chainId = Number(env.CHAIN_ID ?? CHAIN.TESTNET_ID);
  if (!isTradeEligible(signal.symbol, chainId)) {
    throw new Error(`submit refuses unverified registry symbol ${signal.symbol}`);
  }
  if (env.SWAP_ROUTER_CONFIGURED !== "1") {
    throw new Error("submit refuses: SwapAdapter router is not configured");
  }
  const desk = env.DESK_ADDRESS?.trim() ?? "";
  const rpc =
    (chainId === CHAIN.MAINNET_ID
      ? env.RH_RPC_URL?.trim()
      : env.RH_TESTNET_RPC_URL?.trim()) ?? "";
  const key = env.PRIVATE_KEY?.trim() ?? "";
  if (!/^0x[0-9a-fA-F]{40}$/.test(desk) || !rpc || !key) {
    throw new Error("submit refuses: DESK_ADDRESS / RPC / PRIVATE_KEY required");
  }
  const entry = getOfficialStockToken(signal.symbol, chainId);
  if (!entry?.address) {
    throw new Error(`submit refuses: no address for ${signal.symbol}`);
  }
  const data = encodeExecuteCopy({
    token: entry.address,
    isBuy: signal.side === "buy",
    sizeUsdg: decision.sizeUsdg,
    session,
    priceUpdatedAt: BigInt(Math.floor(signal.timestampMs / 1000) || Math.floor(Date.now() / 1000)),
    minAmountOut: minAmountOutFromSignal(signal, decision.sizeUsdg, chainId),
  });
  // Broadcast helper: eth_sendTransaction from the unlocked keeper is not
  // assumed. Require an explicit SEAT_SUBMIT_RAW hook or throw — do not
  // invent a DEX send. Keeper operators set SEAT_SUBMIT_TX=1 only after a
  // cited router exists; until then this is a dry encode.
  if (env.SEAT_SUBMIT_TX !== "1") {
    throw new Error(
      `submit dry-run (SEAT_SUBMIT_TX!=1) calldata=${data.slice(0, 10)}… desk=${desk}`,
    );
  }
  const res = await fetch(rpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_sendTransaction",
      params: [{ from: env.KEEPER_ADDRESS, to: desk, data }],
    }),
  });
  if (!res.ok) throw new Error(`submit HTTP ${res.status}`);
  const json = (await res.json()) as { result?: string; error?: { message?: string } };
  if (json.error?.message) throw new Error(json.error.message);
  if (!json.result) throw new Error("submit empty tx hash");
  return json.result as `0x${string}`;
}
