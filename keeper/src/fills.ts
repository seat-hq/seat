/**
 * Persist processFill outcomes for the blotter.
 *
 * Outcomes-only JSON (no keys). The file is gitignored.
 * `source` must be `fixture` or `chain` — never label fixtures as live.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FillOutcome } from "./executor.js";

export type FillSourceLabel = "fixture" | "chain";

export interface RecordedFill {
  readonly desk: string | null;
  readonly leader: string;
  readonly fillId: string;
  readonly symbol: string;
  readonly side: string;
  readonly action: string;
  readonly reason: string;
  readonly intendedUsdg: string;
  readonly executedUsdg: string;
  readonly slippageBps: number;
  readonly source: FillSourceLabel;
  readonly session: string;
  readonly timestamp: string;
}

export const DEFAULT_FILLS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "fills.json",
);

export function recordOutcome(
  outcome: FillOutcome,
  extra: {
    desk: string | null;
    leader: string;
    slippageBps: number;
    source: FillSourceLabel;
    timestamp?: string;
  },
): RecordedFill {
  return {
    desk: extra.desk,
    leader: extra.leader,
    fillId: outcome.fillId,
    symbol: outcome.symbol,
    side: outcome.side,
    action: outcome.action,
    reason: outcome.reason,
    intendedUsdg: outcome.intendedUsdg.toString(),
    executedUsdg: outcome.executedUsdg.toString(),
    slippageBps: extra.slippageBps,
    source: extra.source,
    session: outcome.session,
    timestamp: extra.timestamp ?? new Date().toISOString(),
  };
}

/** Overwrite the tape with this run's outcomes (outcomes-only). */
export function writeFillTape(
  fills: readonly RecordedFill[],
  dest = DEFAULT_FILLS_PATH,
): void {
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, JSON.stringify({ fills }, null, 2) + "\n");
}
