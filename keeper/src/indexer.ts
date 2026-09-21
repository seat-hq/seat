/**
 * Indexer: sources leader fills for the signaler.
 *
 * StaticFillSource is deterministic paper/fixture.
 * LiveFillSource reads ERC-20 Transfer logs for registry addresses only.
 * It never invents fills: empty tape if RPC/logs cannot be decoded.
 */
import {
  CHAIN,
  getOfficialStockTokenByAddress,
  listedTokenAddresses,
} from "@seat/sdk";
import type { LeaderFill } from "./signaler.js";

export interface FillSource {
  fetchFills(): Promise<readonly LeaderFill[]> | readonly LeaderFill[];
}

export class StaticFillSource implements FillSource {
  private readonly fills: readonly LeaderFill[];

  constructor(fills: readonly LeaderFill[]) {
    this.fills = [...fills].sort((a, b) => a.timestampMs - b.timestampMs);
  }

  fetchFills(): readonly LeaderFill[] {
    return this.fills;
  }
}

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function topicAddr(topic: string): string {
  return `0x${topic.slice(-40).toLowerCase()}`;
}

function hexToBigInt(hex: string): bigint {
  if (!hex || hex === "0x") return 0n;
  return BigInt(hex);
}

export interface LiveFillSourceOpts {
  readonly rpcUrl: string;
  readonly leader: string;
  readonly chainId?: number;
  readonly fromBlock?: bigint;
  readonly toBlock?: bigint | "latest";
}

interface RpcLog {
  readonly address?: string;
  readonly topics?: string[];
  readonly data?: string;
  readonly transactionHash?: string;
  readonly logIndex?: string;
  readonly blockNumber?: string;
}

/**
 * On-chain tape. Labels must be `source=chain` at the recorder.
 * Returns [] if RPC fails or logs cannot be decoded — does not invent history.
 */
export class LiveFillSource implements FillSource {
  constructor(private readonly opts: LiveFillSourceOpts) {}

  async fetchFills(): Promise<readonly LeaderFill[]> {
    const rpc = this.opts.rpcUrl.trim();
    const leader = this.opts.leader.trim().toLowerCase();
    if (!rpc || !/^0x[0-9a-f]{40}$/.test(leader)) {
      // eslint-disable-next-line no-console
      console.warn("[indexer] LiveFillSource: missing rpc/leader; empty tape");
      return [];
    }
    const tokens = listedTokenAddresses(
      this.opts.chainId ?? CHAIN.TESTNET_ID,
    );
    if (tokens.length === 0) {
      // eslint-disable-next-line no-console
      console.warn("[indexer] LiveFillSource: no cited token addresses; empty tape");
      return [];
    }

    let toBlock = this.opts.toBlock ?? "latest";
    let fromBlock = this.opts.fromBlock;
    try {
      if (fromBlock === undefined) {
        const head = await this.rpc<string>("eth_blockNumber", []);
        const n = BigInt(head);
        const lookback = 2_000n;
        fromBlock = n > lookback ? n - lookback : 0n;
      }
      const logs = await this.rpc<RpcLog[]>("eth_getLogs", [
        {
          fromBlock: `0x${fromBlock.toString(16)}`,
          toBlock: toBlock === "latest" ? "latest" : `0x${toBlock.toString(16)}`,
          address: tokens,
          topics: [TRANSFER_TOPIC],
        },
      ]);
      return this.decode(logs, leader);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        "[indexer] LiveFillSource: decode/rpc failed; empty tape:",
        err instanceof Error ? err.message : err,
      );
      return [];
    }
  }

  decode(logs: readonly RpcLog[], leader: string): LeaderFill[] {
    const want = leader.toLowerCase();
    const out: LeaderFill[] = [];
    for (const log of logs) {
      const tokenAddr = (log.address ?? "").toLowerCase();
      const entry = getOfficialStockTokenByAddress(tokenAddr);
      if (!entry || !entry.address) continue;
      const topics = log.topics ?? [];
      if (topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
      if (topics.length < 3) continue;
      const from = topicAddr(topics[1] ?? "0x");
      const to = topicAddr(topics[2] ?? "0x");
      let side: "buy" | "sell";
      if (to === want && from !== want) side = "buy";
      else if (from === want && to !== want) side = "sell";
      else continue;
      const raw = hexToBigInt(log.data ?? "0x");
      const dec = entry.decimals ?? 18;
      // Notional stays 0 unless a cited feed/price is attached later.
      const id = `${log.transactionHash ?? "0x"}-${log.logIndex ?? "0"}`;
      out.push({
        id,
        leader: want,
        symbol: entry.symbol,
        side,
        notionalUsdg: 0n,
        price: 0n,
        priceDecimals: 8,
        timestampMs: 0,
      });
      void raw;
      void dec;
    }
    return out;
  }

  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const res = await fetch(this.opts.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (!res.ok) throw new Error(`rpc HTTP ${res.status}`);
    const json = (await res.json()) as { result?: T; error?: { message?: string } };
    if (json.error?.message) throw new Error(json.error.message);
    if (json.result === undefined) throw new Error("rpc empty result");
    return json.result;
  }
}
