import type { ReactNode } from "react";

type Tone = "green" | "muted" | "warn";

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
