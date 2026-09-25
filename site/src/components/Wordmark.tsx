/** The SEAT mark: two separate piles on one baseline. Swap for final brand assets later. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="2.5" y="10" width="6.5" height="10" rx="1.2" fill="var(--alex)" />
      <rect x="13" y="4" width="8.5" height="16" rx="1.2" fill="var(--desk)" />
      <rect x="1" y="21.5" width="22" height="1.3" rx="0.65" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

export function Wordmark({ size = 22 }: { size?: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.55em",
        fontFamily: "var(--font-display)",
        fontWeight: 600,
        letterSpacing: "0.22em",
        fontSize: size * 0.82,
        lineHeight: 1,
      }}
    >
      <Mark size={size} />
      <span>SEAT</span>
    </span>
  );
}
