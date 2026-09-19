/**
 * Keeper entrypoint (Phase 1).
 *
 * Binds to DESK_ADDRESS.leader() (or LEADER_ADDRESS fallback). Does not pick
 * a leader. Paper executor unless live guards pass — they do not: no router,
 * unverified registry, and mainnet is a hard error.
 *
 * Writes outcomes to data/fills.json with source=fixture.
 */
import { loadChainConfig, redactChainConfig } from "./chain.js";
import {
  createExecutor,
  createRiskState,
  processFill,
  type CopyConfig,
  type RiskConfig,
} from "./executor.js";
import { recordOutcome, writeFillTape } from "./fills.js";
import { StaticFillSource } from "./indexer.js";
import { buildStaticMarket } from "./market.js";
import type { LeaderFill } from "./signaler.js";
import { resolveLeader } from "./vault.js";

function usdg(n: number): bigint {
  return BigInt(Math.round(n * 1_000_000));
}

async function main(): Promise<void> {
  const cfg = loadChainConfig();
  // eslint-disable-next-line no-console
  console.log("[keeper] config=", redactChainConfig(cfg));

  const binding = await resolveLeader();
  // eslint-disable-next-line no-console
  console.log("[keeper] leader binding=", binding);

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

  const executor = createExecutor(market);
  const state = createRiskState(usdg(10_000), usdg(10_000));

  const fill: LeaderFill = {
    id: "demo-1",
    leader: binding.leader,
    symbol: "NVDA",
    side: "buy",
    notionalUsdg: usdg(20_000),
    price: 120_00000000n,
    priceDecimals: 8,
    // Fixed regular-session moment (Wed 2026-01-07 15:00 UTC = 10:00 ET).
    timestampMs: Date.parse("2026-01-07T15:00:00Z"),
  };

  const source = new StaticFillSource([fill]);
  const fills = [...(await source.fetchFills())];
  const recorded = [];

  for (const next of fills) {
    const outcome = processFill(next, state, {
      copy,
      risk,
      market,
      executor,
      now: new Date(next.timestampMs),
    });
    recorded.push(
      recordOutcome(outcome, {
        desk: binding.desk,
        leader: binding.leader,
        slippageBps: market.slippageBps,
        source: "fixture",
        timestamp: new Date(next.timestampMs).toISOString(),
      }),
    );
    // eslint-disable-next-line no-console
    console.log("[keeper] outcome=", {
      ...outcome,
      intendedUsdg: outcome.intendedUsdg.toString(),
      executedUsdg: outcome.executedUsdg.toString(),
      navAfterUsdg: outcome.navAfterUsdg.toString(),
      navPerShareAfter: outcome.navPerShareAfter.toString(),
    });
  }

  writeFillTape(recorded);
  // eslint-disable-next-line no-console
  console.log(`[keeper] wrote ${recorded.length} fill(s) source=fixture`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[keeper] fatal:", err);
  process.exitCode = 1;
});
