/**
 * Read vault.leader() from chain. The keeper does not pick a leader.
 *
 * Falls back to LEADER_ADDRESS when the RPC/desk is missing or the call fails.
 * Selector `leader()` = 0x40eedabb (from Foundry methodIdentifiers).
 */
const LEADER_SELECTOR = "0x40eedabb";

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

export async function readVaultLeader(
  rpcUrl: string,
  desk: string,
): Promise<string> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: desk, data: LEADER_SELECTOR }, "latest"],
    }),
  });
  if (!res.ok) {
    throw new Error(`eth_call leader() HTTP ${res.status}`);
  }
  const json = (await res.json()) as { result?: string; error?: { message?: string } };
  if (json.error?.message) {
    throw new Error(`eth_call leader(): ${json.error.message}`);
  }
  const result = json.result;
  if (!result || result === "0x") {
    throw new Error("eth_call leader() empty");
  }
  const addr = `0x${result.slice(-40)}`;
  if (!isAddress(addr) || addr === "0x0000000000000000000000000000000000000000") {
    throw new Error(`eth_call leader() invalid: ${addr}`);
  }
  return addr.toLowerCase();
}

/** Bind to DESK_ADDRESS.leader(), else LEADER_ADDRESS. Never invent a leader. */
export async function resolveLeader(env: Env = process.env): Promise<LeaderBinding> {
  const deskRaw = env.DESK_ADDRESS?.trim() ?? "";
  const desk = isAddress(deskRaw) ? deskRaw : null;
  const fallbackRaw = env.LEADER_ADDRESS?.trim() ?? "";
  const fallback = isAddress(fallbackRaw) ? fallbackRaw : null;
  const rpc = env.RH_TESTNET_RPC_URL?.trim() ?? "";

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
