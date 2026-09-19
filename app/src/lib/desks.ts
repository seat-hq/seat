/**
 * Read-only paper desk data for the Phase 0 UI.
 *
 * This is TEST DATA. It is not sourced from any chain and represents no real
 * desk, leader, or performance. It exists only to render the blotter layout.
 */
import { formatUsdg, listSymbols } from "@seat/sdk";

export type PaperSide = "buy" | "sell";

export interface PaperFill {
  readonly id: string;
  readonly symbol: string;
  readonly side: PaperSide;
  readonly notionalUsdg: bigint;
  readonly session: "regular" | "after_hours" | "pre_market";
  readonly timestamp: string;
}

export interface PaperDesk {
  readonly name: string;
  readonly leaderLabel: string;
  readonly navUsdg: bigint;
  readonly navPerShareUsdg: bigint;
  readonly supportedSymbols: readonly string[];
  readonly fills: readonly PaperFill[];
}

/** A single illustrative desk. TEST DATA ONLY. */
export const PAPER_DESK: PaperDesk = {
  name: "Paper Desk #1",
  leaderLabel: "leader.paper.eth",
  navUsdg: 10_000_000000n, // 10,000 USDG
  navPerShareUsdg: 1_000000n, // 1.00 USDG/share
  supportedSymbols: listSymbols(),
  fills: [
    {
      id: "f1",
      symbol: "NVDA",
      side: "buy",
      notionalUsdg: 1_000_000000n,
      session: "regular",
      timestamp: "2026-01-07T15:00:00Z",
    },
    {
      id: "f2",
      symbol: "NVDA",
      side: "buy",
      notionalUsdg: 2_000_000000n,
      session: "regular",
      timestamp: "2026-01-07T15:05:00Z",
    },
    {
      id: "f3",
      symbol: "AAPL",
      side: "buy",
      notionalUsdg: 300_000000n,
      session: "after_hours",
      timestamp: "2026-01-07T22:00:00Z",
    },
  ],
};

/** Format a USDG base-unit bigint for display (e.g. "10,000.00"). */
export function formatNav(amount: bigint): string {
  const raw = formatUsdg(amount);
  const [whole, frac = "00"] = raw.split(".");
  const grouped = (whole ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}.${frac.slice(0, 2)}`;
}
