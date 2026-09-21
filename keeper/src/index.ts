/**
 * Keeper entrypoint.
 *
 * Binds to DESK_ADDRESSES, DESK_ADDRESS, or factory.allDesks.
 * Does not pick a leader.
 * PAPER + fixture by default. LIVE + LiveFillSource when
 * EXECUTION_MODE=LIVE and SWAP_ROUTER_CONFIGURED=1.
 */
import { loadChainConfig, redactChainConfig } from "./chain.js";
import {
  LiveExecutor,
  createExecutor,
  createRiskState,
  evaluateRisk,
  processFill,
  type CopyConfig,
  type RiskConfig,
} from "./executor.js";
import { recordOutcome, writeFillTape, type RecordedFill } from "./fills.js";
import { LiveFillSource, StaticFillSource } from "./indexer.js";
import { buildStaticMarket } from "./market.js";
import { getSessionState } from "./session.js";
import { normalizeFill, type LeaderFill } from "./signaler.js";
import { resolveDesks, type LeaderBinding } from "./vault.js";

function usdg(n: number): bigint {
  return BigInt(Math.round(n * 1_000_000));
}

async function main(): Promise<void> {
  const cfg = loadChainConfig();
  // eslint-disable-next-line no-console
  console.log("[keeper] config=", redactChainConfig(cfg));

  const bindings = await resolveDesks();
  // eslint-disable-next-line no-console
  console.log("[keeper] desks=", bindings);

  const market = buildStaticMarket(
    { NVDA: { value: 120_00000000n, decimals: 8, tokenDecimals: 18 } },
    25,
  );

  const copy: CopyConfig = {
    baseCopyBps: 500,
    maxFillUsdg: usdg(2_000),
    maxPositionUsdg: usdg(5_000),
  };
  const risk: RiskConfig = {
    maxGrossExposureUsdg: usdg(10_000),
    maxDrawdownBps: 2_000,
    maxStalenessSec: 120,
  };

  const liveWanted = (process.env.EXECUTION_MODE ?? "PAPER").toUpperCase() === "LIVE";
  const routerOn = process.env.SWAP_ROUTER_CONFIGURED === "1";
  const recorded: RecordedFill[] = [];

  if (liveWanted && routerOn) {
    for (const binding of bindings) {
      if (binding.leader === "unbound") continue;
      const env = { ...process.env, DESK_ADDRESS: binding.desk ?? "" };
      let live: LiveExecutor;
      try {
        live = new LiveExecutor(
          { chainId: cfg.chainId, routerConfigured: true },
          env,
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[keeper] LIVE refused for desk, paper fallback:", err);
        await runPaper(binding, market, copy, risk, recorded);
        continue;
      }

      const source = new LiveFillSource({
        rpcUrl: cfg.rpcUrl,
        leader: binding.leader,
        chainId: cfg.chainId,
      });
      const fills = [...(await source.fetchFills())];
      const state = createRiskState(usdg(10_000), usdg(10_000));
      for (const next of fills) {
        const session = getSessionState(new Date(next.timestampMs || Date.now()));
        const norm = normalizeFill(next);
        if (!norm.ok) {
          recorded.push(
            recordOutcome(
              {
                fillId: next.id,
                symbol: next.symbol,
                side: next.side,
                action: "reject",
                reason: `${norm.reason}: ${norm.detail}`,
                session: session.session,
                intendedUsdg: 0n,
                executedUsdg: 0n,
                navAfterUsdg: state.cashUsdg,
                navPerShareAfter: 0n,
                halted: state.halted,
              },
              {
                desk: binding.desk,
                leader: binding.leader,
                slippageBps: market.slippageBps,
                source: "chain",
                timestamp: new Date().toISOString(),
              },
            ),
          );
          continue;
        }
        const decision = evaluateRisk(norm.signal, session, state, copy, risk, market);
        let executed = 0n;
        let reason = decision.reason;
        if (decision.action !== "skip" && decision.sizeUsdg > 0n) {
          try {
            await live.submitCopy(norm.signal, decision, session.session);
            executed = decision.sizeUsdg;
          } catch (err) {
            reason = err instanceof Error ? err.message : String(err);
          }
        }
        recorded.push(
          recordOutcome(
            {
              fillId: next.id,
              symbol: next.symbol,
              side: next.side,
              action: decision.action,
              reason,
              session: session.session,
              intendedUsdg: decision.intendedUsdg,
              executedUsdg: executed,
              navAfterUsdg: state.cashUsdg,
              navPerShareAfter: 0n,
              halted: state.halted,
            },
            {
              desk: binding.desk,
              leader: binding.leader,
              slippageBps: market.slippageBps,
              source: "chain",
            },
          ),
        );
      }
    }
    writeFillTape(recorded);
    // eslint-disable-next-line no-console
    console.log(`[keeper] wrote ${recorded.length} fill(s) source=chain`);
    return;
  }

  for (const binding of bindings) {
    await runPaper(binding, market, copy, risk, recorded);
  }
  writeFillTape(recorded);
  // eslint-disable-next-line no-console
  console.log(`[keeper] wrote ${recorded.length} fill(s) source=fixture`);
}

async function runPaper(
  binding: LeaderBinding,
  market: ReturnType<typeof buildStaticMarket>,
  copy: CopyConfig,
  risk: RiskConfig,
  recorded: RecordedFill[],
): Promise<void> {
  const executor = createExecutor(market);
  const state = createRiskState(usdg(10_000), usdg(10_000));
  const fill: LeaderFill = {
    id: `demo-${binding.desk ?? "unbound"}`,
    leader: binding.leader,
    symbol: "NVDA",
    side: "buy",
    notionalUsdg: usdg(20_000),
    price: 120_00000000n,
    priceDecimals: 8,
    timestampMs: Date.parse("2026-01-07T15:00:00Z"),
  };
  const source = new StaticFillSource([fill]);
  const fills = [...(await source.fetchFills())];
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
      desk: binding.desk,
      ...outcome,
      intendedUsdg: outcome.intendedUsdg.toString(),
      executedUsdg: outcome.executedUsdg.toString(),
      navAfterUsdg: outcome.navAfterUsdg.toString(),
      navPerShareAfter: outcome.navPerShareAfter.toString(),
    });
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[keeper] fatal:", err);
  process.exitCode = 1;
});
