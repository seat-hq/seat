/**
 * Keeper entrypoint (Phase 0).
 *
 * Runs a single illustrative leader fill through the shared paper pipeline and
 * prints a redacted config plus the explainable outcome. No network, no signer,
 * no on-chain effect.
 */
import { loadChainConfig, redactChainConfig } from "./chain.js";
import {
  PaperExecutor,
  createRiskState,
  processFill,
  type CopyConfig,
  type RiskConfig,
} from "./executor.js";
import { buildStaticMarket } from "./market.js";
import type { LeaderFill } from "./signaler.js";

function usdg(n: number): bigint {
  return BigInt(Math.round(n * 1_000_000));
}

async function main(): Promise<void> {
  const cfg = loadChainConfig();
  // eslint-disable-next-line no-console
  console.log("[keeper] mode=PAPER config=", redactChainConfig(cfg));

  const market = buildStaticMarket(
    { NVDA: { value: 120_00000000n, decimals: 8, tokenDecimals: 18 } },
    25, // 0.25% slippage
  );

  const copy: CopyConfig = {
    baseCopyBps: 500, // copy 5% of leader notional
    maxFillUsdg: usdg(2_000),
    maxPositionUsdg: usdg(5_000),
  };
  const risk: RiskConfig = {
    maxGrossExposureUsdg: usdg(10_000),
    maxDrawdownBps: 2_000, // 20%
    maxStalenessSec: 120,
  };

  const executor = new PaperExecutor(market);
  const state = createRiskState(usdg(10_000), usdg(10_000));

  const fill: LeaderFill = {
    id: "demo-1",
    leader: "0xleader",
    symbol: "NVDA",
    side: "buy",
    notionalUsdg: usdg(20_000),
    price: 120_00000000n,
    priceDecimals: 8,
    // Fixed regular-session moment (Wed 2026-01-07 15:00 UTC = 10:00 ET).
    timestampMs: Date.parse("2026-01-07T15:00:00Z"),
  };

  const outcome = processFill(fill, state, {
    copy,
    risk,
    market,
    executor,
    now: new Date(fill.timestampMs),
  });

  // eslint-disable-next-line no-console
  console.log("[keeper] outcome=", {
    ...outcome,
    intendedUsdg: outcome.intendedUsdg.toString(),
    executedUsdg: outcome.executedUsdg.toString(),
    navAfterUsdg: outcome.navAfterUsdg.toString(),
    navPerShareAfter: outcome.navPerShareAfter.toString(),
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[keeper] fatal:", err);
  process.exitCode = 1;
});
