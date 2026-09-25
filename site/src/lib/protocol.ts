/**
 * Protocol parameters shown on the site, each with the file it comes from.
 * The code is the source of truth; if a value changes there, change it here.
 */
export interface Cited<T> {
  readonly value: T;
  readonly source: string;
}

const REPO = "https://github.com/seat-hq/seat/blob/main";

export const sources = {
  riskModule: `${REPO}/contracts/src/RiskModule.sol`,
  feeModule: `${REPO}/contracts/src/FeeModule.sol`,
  deskVault: `${REPO}/contracts/src/DeskVault.sol`,
  session: `${REPO}/keeper/src/session.ts`,
  deployMainnet: `${REPO}/contracts/script/DeployMainnet.s.sol`,
  deployPhase2: `${REPO}/contracts/script/DeployPhase2.s.sol`,
  phase2: `${REPO}/docs/phase-2.md`,
  risk: `${REPO}/docs/risk.md`,
} as const;

export const BPS = 10_000;

/** Phase 2 desk defaults. Phase 1 cash vaults keep stakerShareBps = 0 (80 / 20). */
export const fees = {
  performanceBps: { value: 1_000, source: "contracts/script/DeployPhase2.s.sol" },
  aumBpsPerYear: { value: 200, source: "contracts/script/DeployPhase2.s.sol" },
  leaderShareBps: { value: 7_000, source: "contracts/src/FeeModule.sol (remainder to leader)" },
  protocolShareBps: { value: 2_000, source: "contracts/script/DeployPhase2.s.sol" },
  stakerShareBps: { value: 1_000, source: "contracts/script/DeployPhase2.s.sol" },
} as const satisfies Record<string, Cited<number>>;

export const phase1FeeNote =
  "Phase 1 cash vaults keep the staker share at 0, so their split is 80 / 20 (leader / protocol).";

export const session = {
  regularBps: { value: 10_000, source: "keeper/src/session.ts" },
  preMarketBps: { value: 3_000, source: "keeper/src/session.ts" },
  afterHoursBps: { value: 3_000, source: "keeper/src/session.ts" },
  closedBps: { value: 0, source: "keeper/src/session.ts" },
} as const satisfies Record<string, Cited<number>>;

/** US equities wall clock in America/New_York, minutes since midnight. */
export const sessionWindows = [
  { id: "closed_am", from: 0, to: 4 * 60, session: "closed" as const },
  { id: "pre", from: 4 * 60, to: 9 * 60 + 30, session: "pre_market" as const },
  { id: "regular", from: 9 * 60 + 30, to: 16 * 60, session: "regular" as const },
  { id: "after", from: 16 * 60, to: 20 * 60, session: "after_hours" as const },
  { id: "closed_pm", from: 20 * 60, to: 24 * 60, session: "closed" as const },
];

export const risk = {
  maxDrawdownBps: { value: 2_000, source: "contracts/script/DeployMainnet.s.sol (MAX_DRAWDOWN_BPS default)" },
  maxFillUsdg: { value: 5_000, source: "contracts/script/DeployMainnet.s.sol (MAX_FILL_USDG default)" },
  maxPositionUsdg: { value: 20_000, source: "contracts/script/DeployMainnet.s.sol (MAX_POSITION_USDG default)" },
  maxGrossUsdg: { value: 50_000, source: "contracts/script/DeployMainnet.s.sol (MAX_GROSS_USDG default)" },
  maxStalenessSec: { value: 120, source: "contracts/src/DeskVault.sol (DEFAULT_STALENESS)" },
  depositCapUsdg: { value: 50_000, source: "README.md · docs/phase-2.md (per desk)" },
} as const satisfies Record<string, Cited<number>>;

export const books = ["NVDA", "AAPL", "SPY"] as const;

export const seatToken = {
  totalSupply: "1,000,000,000",
  mint: "No mint after deploy",
  source: "contracts/src/SeatToken.sol · docs/phase-2.md",
} as const;

export const pct = (bps: number): string => `${(bps / 100).toLocaleString("en-US")}%`;
