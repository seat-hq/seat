/**
 * The Alex / You / Sam example. Illustrative numbers only — not a live desk
 * or forecast. Every figure on the site is derived here so the story cannot
 * drift out of arithmetic agreement.
 */
import { BPS, fees } from "./protocol";

export const EXAMPLE_LABEL = "Example numbers — not a live desk or forecast.";

const round2 = (n: number): number => Math.round(n * 100) / 100;

const youDeposit = 10_000;
const samDeposit = 10_000;

// Stage 02 — deposits at NAV/share 1.00 (first deposit mints 1:1).
const startNavPerShare = 1;
const youShares = youDeposit / startNavPerShare;
const samShares = samDeposit / startNavPerShare;
const totalShares = youShares + samShares;
const startCash = youDeposit + samDeposit;
const startNav = startCash;

// Stage 03 — the copy. Built over several capped fills, not one mirror.
const copySpend = 12_000;
const cashAfterCopy = startCash - copySpend;

// Stage 05 — price moves.
const nvdaUp = 14_000;
const navUp = cashAfterCopy + nvdaUp;
const navPerShareUp = navUp / totalShares;
const gain = navUp - startNav; // above the high-water mark of 1.00
const perfFee = (gain * fees.performanceBps.value) / BPS;
const feeProtocol = (perfFee * fees.protocolShareBps.value) / BPS;
const feeStakers = (perfFee * fees.stakerShareBps.value) / BPS;
const feeAlex = perfFee - feeProtocol - feeStakers;
const navAfterFee = navUp - perfFee;
const navPerShareAfterFee = navAfterFee / totalShares;
const cashAfterFee = cashAfterCopy - perfFee;

const nvdaDown = 10_800;
const navDown = cashAfterCopy + nvdaDown;
const navPerShareDown = navDown / totalShares;

// Stage 06 — leaving.
const redeemShares = 5_000;
const redeemClaimPreFee = redeemShares * navPerShareUp;
const redeemClaimAfterFee = redeemShares * navPerShareAfterFee;
const youValuePreFee = youShares * navPerShareUp;
const youValueAfterFee = youShares * navPerShareAfterFee;
const cashAfterRedeem = cashAfterFee - redeemClaimAfterFee;
const sharesAfterRedeem = totalShares - redeemShares;
const navAfterRedeem = cashAfterRedeem + nvdaUp;

export const story = {
  deposits: {
    you: youDeposit,
    sam: samDeposit,
    youShares,
    samShares,
    totalShares,
    cash: startCash,
    nav: startNav,
    navPerShare: startNavPerShare,
    youPct: (youShares / totalShares) * 100,
    samPct: (samShares / totalShares) * 100,
  },
  copy: {
    /** Illustrative: Alex's own trade is much larger than what the desk copies. */
    alexTradeUsdg: 60_000,
    spend: copySpend,
    cashAfter: cashAfterCopy,
    deployedPct: (copySpend / startCash) * 100,
    tape: [
      { symbol: "AAPL", side: "BUY", decision: "SKIPPED", reason: "Price feed stale — fail closed" },
      { symbol: "NVDA", side: "BUY", decision: "COPIED", reason: "Allowlisted · session open · inside caps" },
      { symbol: "SPY", side: "SELL", decision: "SKIPPED", reason: "Desk holds no SPY to sell" },
    ],
  },
  up: {
    nvda: nvdaUp,
    cash: cashAfterCopy,
    nav: navUp,
    navPerShare: round2(navPerShareUp),
    gain,
    perfFee,
    split: { alex: feeAlex, protocol: feeProtocol, stakers: feeStakers },
    navAfterFee,
    navPerShareAfterFee: round2(navPerShareAfterFee),
    cashAfterFee,
  },
  down: {
    nvda: nvdaDown,
    cash: cashAfterCopy,
    nav: navDown,
    navPerShare: round2(navPerShareDown),
    change: navDown - startNav,
  },
  redeem: {
    youValuePreFee,
    youValueAfterFee,
    shares: redeemShares,
    claimPreFee: redeemClaimPreFee,
    claimAfterFee: redeemClaimAfterFee,
    cashAvailable: cashAfterFee,
    after: {
      cash: cashAfterRedeem,
      nvda: nvdaUp,
      nav: navAfterRedeem,
      shares: sharesAfterRedeem,
      navPerShare: round2(navAfterRedeem / sharesAfterRedeem),
      youShares: youShares - redeemShares,
      samShares,
    },
    /** Alternate moment: the desk has deployed most of its cash into tokens. */
    queueScenarioCash: 2_000,
  },
} as const;

export const usd = (n: number, digits = 0): string =>
  n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const nps = (n: number): string => n.toFixed(2);
