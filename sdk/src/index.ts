/**
 * @seat/sdk
 *
 * Phase 0 surface:
 *  - Official Stock Token registry (with explicit verification states).
 *  - USDG NAV math (fixed-point, fail-closed).
 *
 * No live addresses are fabricated. See docs/allowlist.md and docs/risk.md.
 */
export {
  OFFICIAL_STOCK_TOKENS,
  getOfficialStockToken,
  getOfficialStockTokenByAddress,
  isTradeEligible,
  listSymbols,
  listedTokenAddresses,
} from "./registry.js";
export type {
  Address,
  OfficialStockToken,
  VerificationState,
} from "./registry.js";
export {
  USDG_DECIMALS,
  NavError,
  calculateNav,
  valuePosition,
  navPerShare,
  normalizeBalance,
  normalizePrice,
  formatUsdg,
} from "./nav.js";
export type {
  NavErrorCode,
  NavOptions,
  NavResult,
  Position,
  PriceData,
} from "./nav.js";

/** Robinhood Chain parameters. Chain IDs provided by spec; endpoints via env. */
export const CHAIN = {
  MAINNET_ID: 4663,
  TESTNET_ID: 46630,
  GAS_ASSET: "ETH",
  ACCOUNTING_ASSET: "USDG",
  /** Idea.md mainnet desk cap, USDG base units (50_000 × 10^6). */
  DEPOSIT_CAP_USDG: 50_000n * 1_000_000n,
} as const;
