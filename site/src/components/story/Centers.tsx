"use client";

import { story, usd } from "@/lib/story";
import { pct, risk, session, sessionWindows } from "@/lib/protocol";
import type { CenterKind } from "./beats";
import { TwoPiles } from "./TwoPiles";
import styles from "./Story.module.css";

const u = story.up;
const r = story.redeem;

function Wall() {
  return (
    <div className={styles.cWall}>
      <p className={`mono ${styles.cKicker}`}>Separate custody</p>
      <p className={styles.cBig}>Nothing flows between the piles.</p>
      <p className={styles.cSmall}>Later, only one thing will cross this line: a signal about what Alex traded.</p>
    </div>
  );
}

function Deposit({ who }: { who: "you" | "sam" }) {
  const amount = who === "you" ? story.deposits.you : story.deposits.sam;
  const shares = who === "you" ? story.deposits.youShares : story.deposits.samShares;
  return (
    <div className={styles.cDeposit} data-who={who}>
      <div className={styles.ticket}>
        <p className={`mono ${styles.cKicker}`}>{who === "you" ? "You" : "Sam"} → desk</p>
        <p className={`mono ${styles.ticketAmt}`}>+{usd(amount)} USDG</p>
      </div>
      <div className={styles.flowArrow} aria-hidden="true">
        <span />
      </div>
      <div className={`${styles.ticket} ${styles.ticketShares}`}>
        <p className={`mono ${styles.cKicker}`}>Desk → {who === "you" ? "you" : "Sam"}</p>
        <p className={`mono ${styles.ticketAmt}`}>+{usd(shares)} shares</p>
      </div>
      <p className={styles.cSmall}>
        shares = deposit ÷ NAV/share = {usd(amount)} ÷ 1.00
      </p>
    </div>
  );
}

function Tape() {
  return (
    <div className={styles.cTape}>
      <p className={`mono ${styles.cKicker}`}>
        <span className="c-alex">Alex&apos;s tape</span> → keeper → rules
      </p>
      <ol className={styles.tape}>
        {story.copy.tape.map((t, i) => (
          <li
            key={t.symbol}
            className={styles.tapeRow}
            data-decision={t.decision}
            style={{ "--i": i } as React.CSSProperties}
          >
            <span className={`mono ${styles.tapeSym}`}>
              {t.side} {t.symbol}
            </span>
            <span className={styles.tapeReason}>{t.reason}</span>
            <span className={`chip ${t.decision === "COPIED" ? "chip--desk" : "chip--loss"}`}>{t.decision}</span>
            {t.decision === "SKIPPED" ? <span className={styles.strike} aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>
      <p className={styles.cSmall}>Signals cross the custody line. Money doesn&apos;t.</p>
    </div>
  );
}

function Size() {
  const alex = story.copy.alexTradeUsdg;
  const desk = story.copy.spend;
  const ratio = (desk / alex) * 100;
  const fills = [5_000, 5_000, 2_000];
  return (
    <div className={styles.cSize}>
      <div className={styles.barGroup}>
        <p className={styles.barLabel}>
          <span className="c-alex">Alex&apos;s NVDA buy</span>
          <span className="mono">{usd(alex)} USDG · illustrative</span>
        </p>
        <div className={styles.barTrack}>
          <span className={styles.barAlex} />
        </div>
      </div>
      <div className={styles.barGroup}>
        <p className={styles.barLabel}>
          <span className="c-desk">Desk copy</span>
          <span className="mono">{usd(desk)} USDG</span>
        </p>
        <div className={styles.barTrack}>
          <span className={styles.barDesk} style={{ "--w": `${ratio}%` } as React.CSSProperties}>
            {fills.map((f, i) => (
              <i key={i} style={{ flexGrow: f }} title={`fill ${i + 1}: ${usd(f)}`} />
            ))}
          </span>
        </div>
      </div>
      <p className={`mono ${styles.cFacts}`}>
        3 fills ≤ {usd(risk.maxFillUsdg.value)} · position cap {usd(risk.maxPositionUsdg.value)} · {story.copy.deployedPct}% of cash deployed
      </p>
      <p className={styles.cSmall}>Illustrative sizes. The copy is smaller by design.</p>
    </div>
  );
}

const SESSION_BPS: Record<string, number> = {
  closed: session.closedBps.value,
  pre_market: session.preMarketBps.value,
  regular: session.regularBps.value,
  after_hours: session.afterHoursBps.value,
};

function arc(fromMin: number, toMin: number, radius: number): string {
  const a0 = (fromMin / 1440) * Math.PI * 2 - Math.PI / 2;
  const a1 = (toMin / 1440) * Math.PI * 2 - Math.PI / 2;
  const large = toMin - fromMin > 720 ? 1 : 0;
  const x0 = 100 + radius * Math.cos(a0);
  const y0 = 100 + radius * Math.sin(a0);
  const x1 = 100 + radius * Math.cos(a1);
  const y1 = 100 + radius * Math.sin(a1);
  return `M ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1}`;
}

export function Clock() {
  return (
    <div className={styles.cClock}>
      <svg viewBox="0 0 200 200" className={styles.clock} role="img" aria-label="24-hour US market session clock">
        <circle cx="100" cy="100" r="78" className={styles.clockBase} />
        {sessionWindows.map((w) => (
          <path key={w.id} d={arc(w.from, w.to - 4, 78)} className={styles.clockArc} data-session={w.session} />
        ))}
        {[0, 6, 12, 18].map((h) => {
          const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
          return (
            <text key={h} x={100 + 58 * Math.cos(a)} y={100 + 58 * Math.sin(a) + 4} className={styles.clockTick} textAnchor="middle">
              {String(h).padStart(2, "0")}
            </text>
          );
        })}
        <g className={styles.clockHand}>
          <line x1="100" y1="100" x2="100" y2="34" />
          <circle cx="100" cy="100" r="4" />
        </g>
        <text x="100" y="124" textAnchor="middle" className={styles.clockTz}>
          ET
        </text>
      </svg>
      <ul className={styles.clockLegend}>
        <li data-session="regular">
          <span>Regular 09:30–16:00</span>
          <b className="mono">{pct(SESSION_BPS.regular ?? 0)} size</b>
        </li>
        <li data-session="pre_market">
          <span>Pre-market 04:00–09:30</span>
          <b className="mono">{pct(SESSION_BPS.pre_market ?? 0)} size</b>
        </li>
        <li data-session="after_hours">
          <span>After hours 16:00–20:00</span>
          <b className="mono">{pct(SESSION_BPS.after_hours ?? 0)} size</b>
        </li>
        <li data-session="closed">
          <span>Closed · weekends</span>
          <b className="mono">SKIP</b>
        </li>
        <li data-session="halt">
          <span>Drawdown ≥ {pct(risk.maxDrawdownBps.value)} from HWM</span>
          <b className="mono">HALT</b>
        </li>
      </ul>
      <p className={styles.cSmall}>
        Default policy in the repo (<code>keeper/src/session.ts</code>, deploy scripts). Configurable per desk. Holidays
        not modeled yet.
      </p>
    </div>
  );
}

function Chart({ to, tone }: { to: number; tone: "up" | "down" }) {
  const from = story.copy.spend;
  const min = 10_000;
  const max = 15_000;
  const y = (v: number): number => 110 - ((v - min) / (max - min)) * 90;
  const pts =
    tone === "up"
      ? [from, 12_300, 12_050, 12_900, 13_400, 13_150, to]
      : [from, 11_800, 12_100, 11_400, 11_000, 11_250, to];
  const d = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${20 + i * 43} ${y(v)}`).join(" ");
  return (
    <svg viewBox="0 0 300 130" className={styles.chart} data-tone={tone} aria-hidden="true">
      <line x1="20" x2="280" y1={y(from)} y2={y(from)} className={styles.chartBase} strokeDasharray="3 4" />
      <text x="22" y={y(from) - 6} className={styles.chartLabel}>
        spent {usd(from)}
      </text>
      <path d={d} className={styles.chartLine} pathLength={1} />
      <circle cx={20 + 6 * 43} cy={y(to)} r="4" className={styles.chartDot} />
      <text x="276" y={y(to) + (tone === "up" ? -10 : 18)} textAnchor="end" className={styles.chartLabelStrong}>
        worth {usd(to)}
      </text>
    </svg>
  );
}

function PriceUp() {
  return (
    <div className={styles.cPrice}>
      <p className={`mono ${styles.cKicker}`}>NVDA position value</p>
      <Chart to={u.nvda} tone="up" />
      <p className={`mono ${styles.cEq}`}>
        {usd(u.cash)} cash + {usd(u.nvda)} NVDA = <b>{usd(u.nav)}</b> NAV
      </p>
      <p className={`mono ${styles.cEq}`}>
        {usd(u.nav)} ÷ {usd(story.deposits.totalShares)} shares = <b className="c-desk">1.10</b>{" "}
        <span className="dim">before performance fee</span>
      </p>
      <p className={styles.cCallout}>
        +{usd(u.gain)} came from NVDA appreciating — not from the copy.
      </p>
    </div>
  );
}

function Fee() {
  const parts = [
    { k: "Alex", v: u.split.alex, p: 70, cls: styles.feeAlex },
    { k: "Protocol", v: u.split.protocol, p: 20, cls: styles.feeProtocol },
    { k: "Stakers", v: u.split.stakers, p: 10, cls: styles.feeStakers },
  ];
  return (
    <div className={styles.cFee}>
      <ol className={styles.feeFlow}>
        <li>
          <span className="mono">+{usd(u.gain)}</span> gain above high-water mark
        </li>
        <li>
          <span className="mono">× 10%</span> performance fee
        </li>
        <li>
          <span className="mono">= {usd(u.perfFee)}</span> fee, paid from profit
        </li>
      </ol>
      <div className={styles.feeBars}>
        {parts.map((p, i) => (
          <div key={p.k} className={styles.feeRow} style={{ "--i": i } as React.CSSProperties}>
            <span className={styles.feeName}>
              {p.k} <span className="mono dim">{p.p}%</span>
            </span>
            <span className={styles.feeTrack}>
              <span className={p.cls} style={{ "--w": `${p.p}%` } as React.CSSProperties} />
            </span>
            <span className="mono">{usd(p.v)}</span>
          </div>
        ))}
      </div>
      <p className={`mono ${styles.cEq}`}>
        {usd(u.nav)} − {usd(u.perfFee)} = <b>{usd(u.navAfterFee)}</b> NAV → <b className="c-desk">{u.navPerShareAfterFee.toFixed(2)}</b>/share
      </p>
      <p className={styles.cCallout}>The remaining NAV belongs to shareholders.</p>
    </div>
  );
}

function PriceDown() {
  const dn = story.down;
  return (
    <div className={styles.cPrice}>
      <p className={`mono ${styles.cKicker}`}>NVDA position value</p>
      <Chart to={dn.nvda} tone="down" />
      <p className={`mono ${styles.cEq}`}>
        {usd(dn.cash)} cash + {usd(dn.nvda)} NVDA = <b>{usd(dn.nav)}</b> NAV
      </p>
      <p className={`mono ${styles.cEq}`}>
        NAV/share 1.00 → <b className="c-loss">{dn.navPerShare.toFixed(2)}</b>
      </p>
      <p className={`${styles.cCallout} ${styles.cCalloutLoss}`}>
        Separation is about custody, not protection from losses.
      </p>
    </div>
  );
}

function Redeem({ queue }: { queue: boolean }) {
  const cash = queue ? r.queueScenarioCash : r.cashAvailable;
  const covered = Math.min(100, (cash / r.claimAfterFee) * 100);
  return (
    <div className={styles.cRedeem} data-queue={queue}>
      <div className={styles.ticket}>
        <p className={`mono ${styles.cKicker}`}>Redeem</p>
        <p className={`mono ${styles.ticketAmt}`}>{usd(r.shares)} shares</p>
        <p className={`mono ${styles.ticketSub}`}>
          × 1.09 = {usd(r.claimAfterFee)} USDG claim
          <br />
          <span className="dim">(× 1.10 before fee = {usd(r.claimPreFee)})</span>
        </p>
      </div>
      <div className={styles.gauge}>
        <p className={styles.barLabel}>
          <span>Desk cash</span>
          <span className="mono">
            {usd(cash)} / {usd(r.claimAfterFee)}
          </span>
        </p>
        <div className={styles.barTrack}>
          <span className={styles.gaugeFill} style={{ "--w": `${covered}%` } as React.CSSProperties} />
          <span className={styles.gaugeNeed} aria-hidden="true" />
        </div>
      </div>
      <p className={styles.decision} data-queue={queue}>
        <span className="mono">{queue ? "QUEUE" : "PAY"}</span>
        {queue ? "Claim waits in the withdrawal queue, paid in order as cash returns." : "Paid now from the vault's cash."}
      </p>
      {queue ? (
        <ol className={styles.queue} aria-label="Withdrawal queue">
          <li>#1 · earlier request</li>
          <li data-you="true">#2 · you · {usd(r.claimAfterFee)} USDG</li>
        </ol>
      ) : null}
      <p className={styles.cSmall}>Alex&apos;s wallet: unchanged.</p>
    </div>
  );
}

export function Center({ kind }: { kind: CenterKind }) {
  switch (kind) {
    case "wall":
      return <Wall />;
    case "deposit-you":
      return <Deposit who="you" />;
    case "deposit-sam":
      return <Deposit who="sam" />;
    case "tape":
      return <Tape />;
    case "size":
      return <Size />;
    case "clock":
      return <Clock />;
    case "price-up":
      return <PriceUp />;
    case "fee":
      return <Fee />;
    case "price-down":
      return <PriceDown />;
    case "redeem-pay":
      return <Redeem queue={false} />;
    case "redeem-queue":
      return <Redeem queue />;
    case "finale":
      return <TwoPiles compact />;
  }
}
