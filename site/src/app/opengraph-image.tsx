import { ImageResponse } from "next/og";

export const alt = "SEAT — Copy desk, not sniper bot. Leader wallet and desk vault, two separate piles.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#07140e";
const INK = "#f4f1e8";
const DIM = "#9fb2a8";
const DESK = "#35d07f";
const ALEX = "#e0b341";
const LINE = "#1d3a2c";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: BG,
          color: INK,
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
          <div style={{ width: 14, height: 18, background: ALEX }} />
          <div style={{ width: 14, height: 34, background: DESK }} />
          <div style={{ marginLeft: 10, fontSize: 30, letterSpacing: 10, fontFamily: "sans-serif" }}>SEAT</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 104, lineHeight: 1, letterSpacing: -3 }}>Copy desk,</div>
          <div style={{ fontSize: 104, lineHeight: 1.05, letterSpacing: -3, color: DESK, fontStyle: "italic" }}>
            not sniper bot.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28, fontFamily: "sans-serif" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "16px 22px",
              border: `2px solid ${ALEX}`,
              borderRadius: 14,
              color: ALEX,
              fontSize: 22,
            }}
          >
            Leader wallet
            <span style={{ color: DIM, fontSize: 16, marginTop: 4 }}>the desk cannot spend this</span>
          </div>
          <div style={{ display: "flex", flex: 1, borderTop: `2px dashed ${LINE}`, position: "relative" }} />
          <div style={{ color: DIM, fontSize: 18 }}>signal only</div>
          <div style={{ display: "flex", flex: 1, borderTop: `2px dashed ${LINE}` }} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "16px 22px",
              border: `2px solid ${DESK}`,
              borderRadius: 14,
              color: DESK,
              fontSize: 22,
            }}
          >
            Desk vault
            <span style={{ color: DIM, fontSize: 16, marginTop: 4 }}>the leader cannot withdraw this</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
