/**
 * Indexer: sources leader fills for the signaler.
 *
 * Phase 0 uses {@link StaticFillSource} (in-memory, deterministic) so the paper
 * engine is fully reproducible. {@link LiveFillSource} is a stub that refuses to
 * run — there is no live indexing path in Phase 0.
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

/** Placeholder for a real on-chain/WS indexer. Not implemented in Phase 0. */
export class LiveFillSource implements FillSource {
  constructor(private readonly rpcUrl: string) {}

  fetchFills(): Promise<readonly LeaderFill[]> {
    return Promise.reject(
      new Error(
        `LiveFillSource is not implemented in Phase 0 (paper only). rpc=${
          this.rpcUrl ? "<set>" : "<unset>"
        }`,
      ),
    );
  }
}
