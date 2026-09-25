export type IconName = "wallet" | "signal" | "gate" | "vault" | "nav" | "shares" | "keeper" | "code" | "front" | "eye";

const paths: Record<IconName, JSX.Element> = {
  wallet: (
    <>
      <rect x="3" y="7" width="26" height="19" rx="3" />
      <path d="M3 12h26" />
      <circle cx="23" cy="18.5" r="2" />
    </>
  ),
  signal: <path d="M2 16h6l3-8 5 16 4-12 3 4h7" />,
  gate: (
    <>
      <path d="M6 4v24M26 4v24" />
      <path d="M6 11h20M6 21h20" strokeDasharray="3 3" />
      <path d="M13 16h6" />
    </>
  ),
  vault: (
    <>
      <rect x="3" y="4" width="26" height="24" rx="3" />
      <circle cx="16" cy="16" r="6" />
      <path d="M16 10v2M16 20v2M10 16h2M20 16h2" />
    </>
  ),
  nav: (
    <>
      <path d="M3 27h26" />
      <path d="M5 22l6-6 5 4 10-11" />
      <path d="M21 9h5v5" />
    </>
  ),
  shares: (
    <>
      <path d="M4 8h24v5a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6z" />
      <path d="M12 8v16" strokeDasharray="2 2.5" />
    </>
  ),
  keeper: (
    <>
      <circle cx="16" cy="16" r="11" />
      <path d="M16 9v7l5 3" />
    </>
  ),
  code: <path d="M11 9l-7 7 7 7M21 9l7 7-7 7M18 6l-4 20" />,
  front: (
    <>
      <rect x="3" y="5" width="26" height="18" rx="2" />
      <path d="M11 28h10M16 23v5" />
    </>
  ),
  eye: (
    <>
      <path d="M2 16s5-9 14-9 14 9 14 9-5 9-14 9S2 16 2 16z" />
      <circle cx="16" cy="16" r="4" />
    </>
  ),
};

export function Icon({ name, size = 28, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}
