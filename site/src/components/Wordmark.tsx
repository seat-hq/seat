type Tone = "inherit" | "dark" | "light" | "badge";

/**
 * Official SEAT mark: a seat (lid over a rounded body) inside a gold ring.
 * `inherit` follows the surrounding ink (cream on the dark site, forest on paper).
 */
export function Mark({ size = 26, tone = "inherit" }: { size?: number; tone?: Tone }) {
  if (tone === "badge") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <circle cx="50" cy="50" r="48.6" fill="none" stroke="var(--brand-gold)" strokeWidth="1.4" />
        <circle cx="50" cy="50" r="45.5" fill="var(--brand-green)" />
        <rect x="31.5" y="27" width="37" height="8.6" rx="4.3" fill="none" stroke="var(--brand-cream)" strokeWidth="4.2" />
        <rect x="31.5" y="41.5" width="37" height="32" rx="6.5" fill="none" stroke="var(--brand-cream)" strokeWidth="4.2" />
      </svg>
    );
  }
  const glyph =
    tone === "light" ? "var(--brand-green)" : tone === "dark" ? "var(--brand-cream)" : "currentColor";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="46" fill="none" stroke="var(--brand-gold)" strokeWidth="3.2" />
      <rect x="29.2" y="24.2" width="41.6" height="6.9" rx="1.6" fill={glyph} />
      <rect x="27.2" y="33.3" width="45.6" height="43.6" rx="7.3" fill={glyph} />
    </svg>
  );
}

export function Wordmark({ size = 26, tone = "inherit" }: { size?: number; tone?: Tone }) {
  return (
    <span
      className="wordmark"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.6em",
        fontFamily: "var(--font-brand)",
        fontWeight: 600,
        letterSpacing: "0.16em",
        fontSize: size * 0.62,
        lineHeight: 1,
      }}
    >
      <Mark size={size} tone={tone} />
      <span style={{ marginRight: "-0.16em" }}>SEAT</span>
    </span>
  );
}
