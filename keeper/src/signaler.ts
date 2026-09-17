/**
 * Signaler: turns raw leader fills into normalized copy signals.
 *
 * The signaler is the first gate. It rejects anything it cannot understand or
 * that is not a known registry asset. Trade-eligibility for LIVE execution is a
 * stronger check (verified + enabled) enforced downstream; in Phase 0 paper mode
 * we still require the symbol to be a known official token.
 */
import { getOfficialStockToken } from "@seat/sdk";

export type Side = "buy" | "sell";

/** A leader's executed trade, as observed by the indexer. */
export interface LeaderFill {
  readonly id: string;
  readonly leader: string;
  readonly symbol: string;
  readonly side: Side;
  /** Leader's fill notional in USDG base units (6 decimals). */
  readonly notionalUsdg: bigint;
  /** Execution price of one whole token, fixed-point. */
  readonly price: bigint;
  readonly priceDecimals: number;
  readonly timestampMs: number;
}

/** A normalized, understood copy intent (pre-risk, pre-sizing). */
export interface CopySignal {
  readonly fillId: string;
  readonly leader: string;
  readonly symbol: string;
  readonly side: Side;
  readonly leaderNotionalUsdg: bigint;
  readonly price: bigint;
  readonly priceDecimals: number;
  readonly timestampMs: number;
}

export type SignalRejectReason =
  | "UNKNOWN_SYMBOL"
  | "ZERO_NOTIONAL"
  | "BAD_PRICE";

export type NormalizeResult =
  | { readonly ok: true; readonly signal: CopySignal }
  | {
      readonly ok: false;
      readonly reason: SignalRejectReason;
      readonly detail: string;
    };

/** Normalize a single leader fill, failing closed on anything suspicious. */
export function normalizeFill(fill: LeaderFill): NormalizeResult {
  const token = getOfficialStockToken(fill.symbol);
  if (!token) {
    return {
      ok: false,
      reason: "UNKNOWN_SYMBOL",
      detail: `${fill.symbol} is not in the official registry`,
    };
  }
  if (fill.notionalUsdg <= 0n) {
    return {
      ok: false,
      reason: "ZERO_NOTIONAL",
      detail: `notional must be > 0 (got ${fill.notionalUsdg})`,
    };
  }
  if (fill.price <= 0n || !Number.isInteger(fill.priceDecimals)) {
    return {
      ok: false,
      reason: "BAD_PRICE",
      detail: `price must be > 0 with integer decimals`,
    };
  }
  return {
    ok: true,
    signal: {
      fillId: fill.id,
      leader: fill.leader,
      symbol: token.symbol,
      side: fill.side,
      leaderNotionalUsdg: fill.notionalUsdg,
      price: fill.price,
      priceDecimals: fill.priceDecimals,
      timestampMs: fill.timestampMs,
    },
  };
}
