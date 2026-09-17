/**
 * SEAT official Stock Token registry.
 *
 * The registry is the single source of truth for which assets a desk may hold.
 * Assets are NOT identified by symbol, name, or metadata alone. Every entry
 * declares a verification state, and only `verified` + `enabled` entries may be
 * traded by a desk.
 *
 * IMPORTANT: No token addresses are invented in this repository. The initial
 * entries (NVDA, AAPL, SPY) are seeded as `placeholder` with no address. They
 * MUST be populated from authoritative issuer / on-chain verification before any
 * deployment relies on them. See docs/allowlist.md.
 */

/** Verification state of a registry entry. See docs/allowlist.md. */
export type VerificationState = "verified" | "unverified" | "placeholder";

/** A `0x`-prefixed 20-byte hex address. */
export type Address = `0x${string}`;

/** Registry entry for a candidate/official Stock Token. */
export interface OfficialStockToken {
  /** Ticker symbol, e.g. "NVDA". Never used alone to identify an asset. */
  readonly symbol: string;
  /** Human-readable name. Informational only; never used to identify an asset. */
  readonly name: string;
  /**
   * On-chain contract address. `null` when not yet authoritatively verified.
   * Never fabricate this value.
   */
  readonly address: Address | null;
  /** Verified issuer identity, or `null` if not yet verified. */
  readonly issuer: string | null;
  /** Token decimals. `null` until verified on-chain. */
  readonly decimals: number | null;
  /**
   * Optional deployed-bytecode hash used for identity verification where
   * applicable. `null` when not applicable or not yet recorded.
   */
  readonly bytecodeHash: `0x${string}` | null;
  /** Verification state. Only `verified` entries are trade-eligible. */
  readonly verification: VerificationState;
  /** Whether the operator/governance process has enabled trading this asset. */
  readonly enabled: boolean;
  /** Free-form note explaining verification status or required follow-up. */
  readonly note: string;
}

/**
 * Initial conceptual allowlist. All entries are placeholders: no addresses,
 * issuers, or decimals are asserted, because none have been authoritatively
 * verified in this repository. Do not promote to `verified` without completing
 * the process in docs/allowlist.md.
 */
export const OFFICIAL_STOCK_TOKENS: readonly OfficialStockToken[] = [
  {
    symbol: "NVDA",
    name: "NVIDIA (Stock Token)",
    address: null,
    issuer: null,
    decimals: null,
    bytecodeHash: null,
    verification: "placeholder",
    enabled: false,
    note: "Placeholder. Populate address/issuer/decimals from authoritative verification.",
  },
  {
    symbol: "AAPL",
    name: "Apple (Stock Token)",
    address: null,
    issuer: null,
    decimals: null,
    bytecodeHash: null,
    verification: "placeholder",
    enabled: false,
    note: "Placeholder. Populate address/issuer/decimals from authoritative verification.",
  },
  {
    symbol: "SPY",
    name: "S&P 500 ETF (Stock Token)",
    address: null,
    issuer: null,
    decimals: null,
    bytecodeHash: null,
    verification: "placeholder",
    enabled: false,
    note: "Placeholder. Populate address/issuer/decimals from authoritative verification.",
  },
];

/** Case-insensitive lookup by symbol. Returns `undefined` if not present. */
export function getOfficialStockToken(
  symbol: string,
): OfficialStockToken | undefined {
  const target = symbol.trim().toUpperCase();
  return OFFICIAL_STOCK_TOKENS.find((t) => t.symbol.toUpperCase() === target);
}

/**
 * Whether an asset is trade-eligible: it must be present, fully `verified`, and
 * `enabled`, with a concrete address and decimals. Placeholder/unverified assets
 * always return false, so the system fails closed.
 */
export function isTradeEligible(symbol: string): boolean {
  const token = getOfficialStockToken(symbol);
  return Boolean(
    token &&
      token.verification === "verified" &&
      token.enabled &&
      token.address !== null &&
      token.decimals !== null,
  );
}

/** All symbols currently in the registry (regardless of verification state). */
export function listSymbols(): string[] {
  return OFFICIAL_STOCK_TOKENS.map((t) => t.symbol);
}
