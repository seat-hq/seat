/**
 * Deterministic market model for paper mode.
 *
 * Prices are supplied statically per symbol. They are treated as fresh at any
 * query time (updatedAt = query time) so staleness checks pass in simulation.
 * This is NOT a real oracle; live execution requires a verified price feed.
 */
import type { PriceData } from "@seat/sdk";
import type { MarketModel } from "./executor.js";

export interface StaticQuote {
  /** Price of one whole token, fixed-point. */
  readonly value: bigint;
  readonly decimals: number;
  /** Token decimals for converting notional <-> UI units. */
  readonly tokenDecimals: number;
}

export function buildStaticMarket(
  quotes: Record<string, StaticQuote>,
  slippageBps: number,
): MarketModel {
  return {
    slippageBps,
    priceOf(symbol: string, atMs: number): PriceData | undefined {
      const q = quotes[symbol];
      if (!q) return undefined;
      return {
        value: q.value,
        decimals: q.decimals,
        updatedAt: Math.floor(atMs / 1000),
      };
    },
    decimalsOf(symbol: string): number | undefined {
      return quotes[symbol]?.tokenDecimals;
    },
  };
}
