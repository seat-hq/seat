/**
 * A pure port of RiskModule.evaluate (contracts/src/RiskModule.sol), with a
 * gate-by-gate trace so the site can show where a trade was stopped or resized.
 * Contract order is kept: configured → token → session → staleness → drawdown
 * → size → session sizing → caps.
 */
import { BPS, risk as riskDefaults, session as sessionDefaults } from "./protocol";

export type Session = "closed" | "pre_market" | "regular" | "after_hours";
export type Outcome = "COPY" | "RESIZE" | "SKIP" | "HALT";
export type GateId = "asset" | "session" | "price" | "drawdown" | "size";
export type GateState = "pass" | "resize" | "fail" | "idle";

export interface RiskConfig {
  readonly maxFillUsdg: number;
  readonly maxPositionUsdg: number;
  readonly maxGrossExposureUsdg: number;
  readonly maxDrawdownBps: number;
  readonly maxStalenessSec: number;
  readonly allowed: readonly string[];
  readonly sessionBps: Readonly<Record<Session, number>>;
}

export interface RiskInput {
  readonly symbol: string;
  readonly isBuy: boolean;
  readonly sizeUsdg: number;
  readonly positionValueUsdg: number;
  readonly grossExposureUsdg: number;
  readonly navPerShare: number;
  readonly highWaterNavPerShare: number;
  readonly session: Session;
  readonly priceAgeSec: number;
}

export interface GateResult {
  readonly id: GateId;
  readonly state: GateState;
  readonly note: string;
}

export interface RiskResult {
  readonly outcome: Outcome;
  readonly allowedSizeUsdg: number;
  readonly reason: string;
  readonly gates: readonly GateResult[];
}

export const defaultConfig: RiskConfig = {
  maxFillUsdg: riskDefaults.maxFillUsdg.value,
  maxPositionUsdg: riskDefaults.maxPositionUsdg.value,
  maxGrossExposureUsdg: riskDefaults.maxGrossUsdg.value,
  maxDrawdownBps: riskDefaults.maxDrawdownBps.value,
  maxStalenessSec: riskDefaults.maxStalenessSec.value,
  allowed: ["NVDA", "AAPL", "SPY"],
  sessionBps: {
    regular: sessionDefaults.regularBps.value,
    pre_market: sessionDefaults.preMarketBps.value,
    after_hours: sessionDefaults.afterHoursBps.value,
    closed: sessionDefaults.closedBps.value,
  },
};

export const GATE_ORDER: readonly GateId[] = ["asset", "session", "price", "drawdown", "size"];

export const GATE_LABEL: Record<GateId, string> = {
  asset: "Asset",
  session: "Session",
  price: "Price fresh",
  drawdown: "Drawdown",
  size: "Size / caps",
};

const SESSION_LABEL: Record<Session, string> = {
  regular: "regular session",
  pre_market: "pre-market",
  after_hours: "after hours",
  closed: "closed",
};

export function evaluate(input: RiskInput, cfg: RiskConfig = defaultConfig): RiskResult {
  const gates: GateResult[] = [];
  const stop = (id: GateId, outcome: "SKIP" | "HALT", reason: string): RiskResult => {
    gates.push({ id, state: "fail", note: reason });
    for (const g of GATE_ORDER) {
      if (!gates.some((x) => x.id === g)) gates.push({ id: g, state: "idle", note: "not reached" });
    }
    return { outcome, allowedSizeUsdg: 0, reason, gates };
  };

  if (!cfg.allowed.includes(input.symbol)) {
    return stop("asset", "SKIP", `${input.symbol} is not on this desk's allowlist`);
  }
  gates.push({ id: "asset", state: "pass", note: `${input.symbol} allowlisted` });

  const sizeBps = cfg.sessionBps[input.session];
  if (input.session === "closed" || sizeBps === 0) {
    return stop("session", "SKIP", "Session closed — not tradable");
  }
  gates.push({
    id: "session",
    state: sizeBps < BPS ? "resize" : "pass",
    note: `${SESSION_LABEL[input.session]} · ${sizeBps / 100}% of copy size`,
  });

  if (input.priceAgeSec < 0) return stop("price", "SKIP", "Price timestamp in the future");
  if (input.priceAgeSec > cfg.maxStalenessSec) {
    return stop("price", "SKIP", `Price ${input.priceAgeSec}s old · max ${cfg.maxStalenessSec}s`);
  }
  gates.push({ id: "price", state: "pass", note: `Price ${input.priceAgeSec}s old` });

  if (input.highWaterNavPerShare > 0 && input.navPerShare < input.highWaterNavPerShare) {
    const ddBps = ((input.highWaterNavPerShare - input.navPerShare) * BPS) / input.highWaterNavPerShare;
    if (ddBps >= cfg.maxDrawdownBps) {
      return stop(
        "drawdown",
        "HALT",
        `Drawdown ${(ddBps / 100).toFixed(1)}% ≥ ${cfg.maxDrawdownBps / 100}% halt`,
      );
    }
    gates.push({ id: "drawdown", state: "pass", note: `Drawdown ${(ddBps / 100).toFixed(1)}%` });
  } else {
    gates.push({ id: "drawdown", state: "pass", note: "At high-water mark" });
  }

  if (input.sizeUsdg <= 0) return stop("size", "SKIP", "Zero size");

  const sessionSized = Math.floor((input.sizeUsdg * sizeBps) / BPS);
  let size = sessionSized;
  const notes: string[] = [];
  if (size === 0) return stop("size", "SKIP", "Size rounds to zero");
  if (size > cfg.maxFillUsdg) {
    size = cfg.maxFillUsdg;
    notes.push(`fill cap ${cfg.maxFillUsdg.toLocaleString("en-US")}`);
  }

  if (input.isBuy) {
    if (input.positionValueUsdg >= cfg.maxPositionUsdg) return stop("size", "SKIP", "Position cap reached");
    const posHeadroom = cfg.maxPositionUsdg - input.positionValueUsdg;
    if (size > posHeadroom) {
      size = posHeadroom;
      notes.push("position cap");
    }
    if (input.grossExposureUsdg >= cfg.maxGrossExposureUsdg) return stop("size", "SKIP", "Gross cap reached");
    const grossHeadroom = cfg.maxGrossExposureUsdg - input.grossExposureUsdg;
    if (size > grossHeadroom) {
      size = grossHeadroom;
      notes.push("gross cap");
    }
  } else {
    if (input.positionValueUsdg === 0) return stop("size", "SKIP", "No position to sell");
    if (size > input.positionValueUsdg) {
      size = input.positionValueUsdg;
      notes.push("position size");
    }
  }

  if (size === 0) return stop("size", "SKIP", "Size reduced to zero");

  const resized = size < input.sizeUsdg;
  gates.push({
    id: "size",
    state: notes.length > 0 ? "resize" : "pass",
    note: notes.length > 0 ? `Capped by ${notes.join(", ")}` : "Inside caps",
  });

  return {
    outcome: resized ? "RESIZE" : "COPY",
    allowedSizeUsdg: size,
    reason: resized
      ? `Requested ${input.sizeUsdg.toLocaleString("en-US")} → copied ${size.toLocaleString("en-US")}`
      : "Copied at requested size",
    gates,
  };
}

export interface SampleTrade {
  readonly id: string;
  readonly label: string;
  readonly input: RiskInput;
}

const base: RiskInput = {
  symbol: "NVDA",
  isBuy: true,
  sizeUsdg: 4_000,
  positionValueUsdg: 0,
  grossExposureUsdg: 0,
  navPerShare: 1,
  highWaterNavPerShare: 1,
  session: "regular",
  priceAgeSec: 12,
};

export const sampleTrades: readonly SampleTrade[] = [
  { id: "clean", label: "NVDA buy · regular hours", input: base },
  { id: "after", label: "NVDA buy · after hours", input: { ...base, session: "after_hours" } },
  { id: "closed", label: "AAPL buy · market closed", input: { ...base, symbol: "AAPL", session: "closed" } },
  { id: "big", label: "SPY buy · oversized", input: { ...base, symbol: "SPY", sizeUsdg: 40_000 } },
  { id: "unlisted", label: "TSLA buy · not allowlisted", input: { ...base, symbol: "TSLA" } },
  { id: "stale", label: "AAPL buy · stale price", input: { ...base, symbol: "AAPL", priceAgeSec: 300 } },
  {
    id: "drawdown",
    label: "NVDA buy · desk down 22%",
    input: { ...base, navPerShare: 0.78, highWaterNavPerShare: 1 },
  },
];
