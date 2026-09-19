/** Fill-tape row served by /api/fills. Never label `fixture` as live. */
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

export function parseUsdgField(value: string): bigint {
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}
