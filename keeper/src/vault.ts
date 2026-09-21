/**
 * Read vault.leader() from chain. The keeper does not pick a leader.
 *
 * Falls back to LEADER_ADDRESS when the RPC/desk is missing or the call fails.
 * Selector `leader()` = 0x40eedabb (from Foundry methodIdentifiers).
 */
const LEADER_SELECTOR = "0x40eedabb";
/** deskCount() */
const DESK_COUNT_SELECTOR = "0x47d0a311";
/** allDesks(uint256) */
const ALL_DESKS_SELECTOR = "0x9078d16c";

export interface LeaderBinding {
  readonly desk: string | null;
  readonly leader: string;
  /** How the leader was resolved — not a fill-tape source label. */
  readonly binding: "chain" | "env" | "unbound";
}

type Env = Record<string, string | undefined>;

function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

function rpcFor(env: Env): string {
  return (
    (Number(env.CHAIN_ID) === 4663
      ? env.RH_RPC_URL?.trim()
      : env.RH_TESTNET_RPC_URL?.trim()) ??
    env.RH_TESTNET_RPC_URL?.trim() ??
    env.RH_RPC_URL?.trim() ??
    ""
  );
}

async function ethCall(
  rpcUrl: string,
  to: string,
  data: string,
): Promise<string> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  if (!res.ok) {
    throw new Error(`eth_call HTTP ${res.status}`);
  }
  const json = (await res.json()) as { result?: string; error?: { message?: string } };
  if (json.error?.message) {
    throw new Error(`eth_call: ${json.error.message}`);
  }
  if (!json.result || json.result === "0x") {
    throw new Error("eth_call empty");
  }
  return json.result;
}

function parseAddressWord(result: string): string {
  const addr = `0x${result.slice(-40)}`;
  if (!isAddress(addr) || addr === "0x0000000000000000000000000000000000000000") {
    throw new Error(`eth_call invalid address: ${addr}`);
  }
  return addr.toLowerCase();
}

export async function readVaultLeader(
  rpcUrl: string,
  desk: string,
): Promise<string> {
  const result = await ethCall(rpcUrl, desk, LEADER_SELECTOR);
  return parseAddressWord(result);
}

/** Walk factory.deskCount / allDesks. Never invents desks. */
export async function readFactoryDesks(
  rpcUrl: string,
  factory: string,
): Promise<string[]> {
  const countHex = await ethCall(rpcUrl, factory, DESK_COUNT_SELECTOR);
  const n = Number(BigInt(countHex));
  if (!Number.isFinite(n) || n <= 0) return [];
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const data = `${ALL_DESKS_SELECTOR}${i.toString(16).padStart(64, "0")}`;
    out.push(await ethCall(rpcUrl, factory, data).then(parseAddressWord));
  }
  return out;
}

/** Bind to DESK_ADDRESS.leader(), else LEADER_ADDRESS. Never invent a leader. */
export async function resolveLeader(env: Env = process.env): Promise<LeaderBinding> {
  const deskRaw = env.DESK_ADDRESS?.trim() ?? "";
  const desk = isAddress(deskRaw) ? deskRaw : null;
  const fallbackRaw = env.LEADER_ADDRESS?.trim() ?? "";
  const fallback = isAddress(fallbackRaw) ? fallbackRaw : null;
  const rpc = rpcFor(env);

  if (desk && rpc) {
    try {
      const leader = await readVaultLeader(rpc, desk);
      return { desk, leader, binding: "chain" };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        "[keeper] vault.leader() failed; using LEADER_ADDRESS fallback:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (fallback) {
    return { desk, leader: fallback, binding: "env" };
  }
  return { desk, leader: "unbound", binding: "unbound" };
}

/** DESK_ADDRESSES comma-list, else DESK_ADDRESS. */
export function parseDeskList(env: Env = process.env): string[] {
  const multi = (env.DESK_ADDRESSES ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(isAddress);
  if (multi.length > 0) {
    return [...new Set(multi.map((a) => a.toLowerCase()))];
  }
  const one = env.DESK_ADDRESS?.trim() ?? "";
  return isAddress(one) ? [one.toLowerCase()] : [];
}

export async function resolveDesks(env: Env = process.env): Promise<LeaderBinding[]> {
  let desks = parseDeskList(env);
  if (desks.length === 0) {
    const factoryRaw = env.DESK_FACTORY?.trim() ?? env.FACTORY_ADDRESS?.trim() ?? "";
    const factory = isAddress(factoryRaw) ? factoryRaw : null;
    const rpc = rpcFor(env);
    if (factory && rpc) {
      try {
        desks = await readFactoryDesks(rpc, factory);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          "[keeper] factory.allDesks failed:",
          err instanceof Error ? err.message : err,
        );
      }
    }
  }
  if (desks.length === 0) {
    return [await resolveLeader(env)];
  }
  const out: LeaderBinding[] = [];
  for (const desk of desks) {
    out.push(await resolveLeader({ ...env, DESK_ADDRESS: desk }));
  }
  return out;
}
