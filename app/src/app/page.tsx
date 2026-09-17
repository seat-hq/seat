import { Badge } from "@/components/Badge";
import { PAPER_DESK, formatNav, type PaperFill } from "@/lib/desks";

function sessionTone(session: PaperFill["session"]): "green" | "warn" | "muted" {
  if (session === "regular") return "green";
  if (session === "after_hours" || session === "pre_market") return "warn";
  return "muted";
}

export default function Page() {
  const desk = PAPER_DESK;
  return (
    <main className="container">
      <div className="header">
        <div>
          <div className="brand">SEAT</div>
          <div className="tagline">Copy desks for official Stock Tokens</div>
        </div>
        <Badge tone="warn">Phase 0 · PAPER</Badge>
      </div>

      <p className="tagline">
        {desk.name} · leader <strong>{desk.leaderLabel}</strong>
      </p>

      <div className="grid">
        <div className="card">
          <div className="label">NAV</div>
          <div className="value">{formatNav(desk.navUsdg)} USDG</div>
        </div>
        <div className="card">
          <div className="label">NAV / seat</div>
          <div className="value">{formatNav(desk.navPerShareUsdg)} USDG</div>
        </div>
        <div className="card">
          <div className="label">Mode</div>
          <div className="value">
            <Badge tone="warn">PAPER</Badge>
          </div>
        </div>
      </div>

      <div className="section-title">Supported assets</div>
      <div className="symbols">
        {desk.supportedSymbols.map((s) => (
          <Badge key={s} tone="muted">
            {s}
          </Badge>
        ))}
      </div>

      <div className="section-title">Fill tape (TEST DATA)</div>
      <table>
        <thead>
          <tr>
            <th>Fill</th>
            <th>Symbol</th>
            <th>Side</th>
            <th>Notional</th>
            <th>Session</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {desk.fills.map((f) => (
            <tr key={f.id}>
              <td>{f.id}</td>
              <td>{f.symbol}</td>
              <td>{f.side}</td>
              <td>{formatNav(f.notionalUsdg)} USDG</td>
              <td>
                <Badge tone={sessionTone(f.session)}>{f.session}</Badge>
              </td>
              <td>{f.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="section-title">Seat</div>
      <div className="actions">
        <button className="btn" disabled>
          Deposit USDG — Coming in Phase 1
        </button>
        <button className="btn" disabled>
          Redeem — Coming in Phase 1
        </button>
      </div>

      <div className="disclaimer">
        <strong>Phase 0 paper mode.</strong> All figures on this page are TEST
        DATA and do not represent a real desk, leader, or performance. SEAT is
        not affiliated with Robinhood Markets. Stock Tokens are not shares. This
        is not investment advice. Do not deposit mainnet funds.
      </div>
    </main>
  );
}
