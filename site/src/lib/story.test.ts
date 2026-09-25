import { test } from "node:test";
import assert from "node:assert/strict";
import { story } from "./story";
import { evaluate, sampleTrades } from "./risk";
import { fees, BPS } from "./protocol";

test("deposits: 1:1 at NAV/share 1.00, 50 / 50 ownership", () => {
  const d = story.deposits;
  assert.equal(d.youShares, 10_000);
  assert.equal(d.samShares, 10_000);
  assert.equal(d.totalShares, 20_000);
  assert.equal(d.cash, 20_000);
  assert.equal(d.nav, 20_000);
  assert.equal(d.navPerShare, 1);
  assert.equal(d.youPct, 50);
  assert.equal(d.samPct, 50);
});

test("copy: the desk deploys part of its cash, and the copy is smaller than Alex", () => {
  assert.equal(story.copy.spend, 12_000);
  assert.equal(story.copy.cashAfter, 8_000);
  assert.equal(story.copy.deployedPct, 60);
  assert.ok(story.copy.spend < story.copy.alexTradeUsdg);
  assert.equal(story.copy.tape.filter((t) => t.decision === "COPIED").length, 1);
});

test("gain comes from appreciation: 12,000 spent, worth 14,000", () => {
  const u = story.up;
  assert.equal(u.cash + u.nvda, u.nav);
  assert.equal(u.nav, 22_000);
  assert.equal(u.navPerShare, 1.1);
  assert.equal(u.nvda - story.copy.spend, u.gain);
  assert.equal(u.gain, 2_000);
});

test("performance fee: 10% of profit above HWM, split 70 / 20 / 10", () => {
  const u = story.up;
  assert.equal(fees.performanceBps.value / BPS, 0.1);
  assert.equal(u.perfFee, 200);
  assert.equal(u.split.alex, 140);
  assert.equal(u.split.protocol, 40);
  assert.equal(u.split.stakers, 20);
  assert.equal(u.split.alex + u.split.protocol + u.split.stakers, u.perfFee);
  assert.equal(u.navAfterFee, 21_800);
  assert.equal(u.navPerShareAfterFee, 1.09);
});

test("loss: NVDA falls to 10,800 and NAV/share falls to 0.94", () => {
  const d = story.down;
  assert.equal(d.cash + d.nvda, d.nav);
  assert.equal(d.nav, 18_800);
  assert.equal(d.navPerShare, 0.94);
  assert.equal(d.change, -1_200);
});

test("redemption: 5,000 shares claim 5,500 before fee, 5,450 after", () => {
  const r = story.redeem;
  assert.equal(r.youValuePreFee, 11_000);
  assert.equal(r.claimPreFee, 5_500);
  assert.equal(r.claimAfterFee, 5_450);
  assert.ok(r.cashAvailable >= r.claimAfterFee, "story path pays from cash");
  assert.ok(r.queueScenarioCash < r.claimAfterFee, "alternate path queues");
});

test("fee is paid from cash; redemption leaves NAV/share unchanged", () => {
  assert.equal(story.up.cashAfterFee, 7_800);
  assert.equal(story.up.cashAfterFee + story.up.nvda, story.up.navAfterFee);
  const a = story.redeem.after;
  assert.equal(a.cash, 2_350);
  assert.equal(a.nav, 16_350);
  assert.equal(a.shares, 15_000);
  assert.equal(a.navPerShare, story.up.navPerShareAfterFee);
  assert.equal(a.youShares, 5_000);
  assert.equal(story.redeem.youValueAfterFee, 10_900);
});

test("risk port: sample trades land on the expected outcomes", () => {
  const byId = Object.fromEntries(sampleTrades.map((t) => [t.id, evaluate(t.input)]));
  assert.equal(byId.clean?.outcome, "COPY");
  assert.equal(byId.clean?.allowedSizeUsdg, 4_000);
  assert.equal(byId.after?.outcome, "RESIZE");
  assert.equal(byId.after?.allowedSizeUsdg, 1_200);
  assert.equal(byId.closed?.outcome, "SKIP");
  assert.equal(byId.big?.outcome, "RESIZE");
  assert.equal(byId.big?.allowedSizeUsdg, 5_000);
  assert.equal(byId.unlisted?.outcome, "SKIP");
  assert.equal(byId.stale?.outcome, "SKIP");
  assert.equal(byId.drawdown?.outcome, "HALT");
  for (const r of Object.values(byId)) assert.equal(r.gates.length, 5);
});

test("story beats: every panel shows arithmetic-consistent NAV/share", async () => {
  const { beats, navOf, npsOf } = await import("../components/story/beats");
  const byId = Object.fromEntries(beats.map((b) => [b.id, b]));
  const r2 = (n: number): number => Math.round(n * 100) / 100;
  assert.equal(npsOf(byId["deposit-sam"]!.vault), 1);
  assert.equal(npsOf(byId.size!.vault), 1, "buying NVDA does not change NAV");
  assert.equal(r2(npsOf(byId["price-up"]!.vault)), 1.1);
  assert.equal(r2(npsOf(byId.fee!.vault)), 1.09);
  assert.equal(r2(npsOf(byId["price-down"]!.vault)), 0.94);
  assert.equal(r2(npsOf(byId["redeem-pay"]!.vault)), 1.09);
  assert.equal(navOf(byId["redeem-pay"]!.vault), 16_350);
  for (const b of beats) assert.ok(b.vault.you + b.vault.sam === b.vault.shares, b.id);
});
