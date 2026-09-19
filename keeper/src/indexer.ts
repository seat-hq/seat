/**
 * Indexer: sources leader fills for the signaler.
 *
 * Phase 1 uses {@link StaticFillSource} (in-memory, deterministic).
 * {@link LiveFillSource} is a documented stub: chain logs cannot be decoded
 * yet, so it returns no fills and logs `source=fixture`. It does not invent
 * leader history.
 */
import type { LeaderFill } from "./signaler.js";

export interface FillSource {
  /** Return the batch of leader fills to process, oldest first. */
  fetchFills(): Promise<readonly LeaderFill[]> | readonly LeaderFill[];
}

/** Deterministic, in-memory source for paper mode and tests. */
export class StaticFillSource implements FillSource {
  private readonly fills: readonly LeaderFill[];

  constructor(fills: readonly LeaderFill[]) {
    // Sort a copy by timestamp so ordering is deterministic regardless of input.
    this.fills = [...fills].sort((a, b) => a.timestampMs - b.timestampMs);
  }

  fetchFills(): readonly LeaderFill[] {
    return this.fills;
  }
}

/**
 * Placeholder for a real on-chain/WS indexer.
 * Returns an empty tape and logs source=fixture — does not invent fills.
 */
export class LiveFillSource implements FillSource {
  constructor(private readonly rpcUrl: string) {}

  fetchFills(): Promise<readonly LeaderFill[]> {
    // eslint-disable-next-line no-console
    console.warn(
      `[indexer] LiveFillSource: chain logs not decoded yet; source=fixture (empty). rpc=${
        this.rpcUrl ? "<set>" : "<unset>"
      }`,
    );
    return Promise.resolve([]);
  }
}
