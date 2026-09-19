/**
 * Fail-closed guards for LiveExecutor / PaperExecutor mode split.
 */
import assert from "node:assert/strict";
import { LiveExecutor, PaperExecutor } from "./executor.js";
import { buildStaticMarket } from "./market.js";

const market = buildStaticMarket({}, 25);

assert.throws(
  () =>
    new LiveExecutor(
      { chainId: 4663, routerConfigured: true },
      { CHAIN_ID: "4663" },
    ),
  /4663/,
);

assert.throws(
  () =>
    new LiveExecutor(
      { chainId: 46630, routerConfigured: false },
      { CHAIN_ID: "46630" },
    ),
  /router/,
);

assert.throws(
  () =>
    new LiveExecutor(
      { chainId: 1, routerConfigured: true },
      { CHAIN_ID: "1" },
    ),
  /46630/,
);

assert.throws(
  () => new PaperExecutor(market, { EXECUTION_MODE: "LIVE" }),
  /LiveExecutor/,
);

const live = new LiveExecutor(
  { chainId: 46630, routerConfigured: true },
  { CHAIN_ID: "46630" },
);
assert.throws(
  () =>
    live.execute(
      {
        fillId: "x",
        leader: "0x1",
        symbol: "NVDA",
        side: "buy",
        leaderNotionalUsdg: 1n,
        price: 1n,
        priceDecimals: 8,
        timestampMs: 0,
      },
      { action: "accept", sizeUsdg: 1n, intendedUsdg: 1n, reason: "ok" },
      {
        cashUsdg: 1n,
        positionsUi: {},
        shares: 1n,
        highWaterNavPerShare: 0n,
        halted: false,
      },
    ),
  /unverified registry/,
);

console.log("live-guards ok");
