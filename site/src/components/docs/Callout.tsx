import type { ReactNode } from "react";
import styles from "./docs.module.css";

const LABELS: Record<string, string> = {
  note: "Note",
  tip: "Tip",
  info: "Info",
  warning: "Warning",
  danger: "Danger",
  implemented: "Implemented",
  planned: "Planned",
  experimental: "Experimental",
  stub: "Stub",
};

/** Admonition block rendered from :::callout directives. */
export function Callout({
  type,
  title,
  children,
}: {
  type: string;
  title?: string;
  children?: ReactNode;
}) {
  const label = title ?? LABELS[type] ?? "Note";
  return (
    <aside className={`${styles.callout} ${styles[`callout-${type}`] ?? ""}`}>
      <p className={styles.calloutLabel}>{label}</p>
      <div className={styles.calloutBody}>{children}</div>
    </aside>
  );
}

const STATUS_LABELS: Record<string, string> = {
  implemented: "Implemented",
  experimental: "Experimental",
  planned: "Planned",
  "not-implemented": "Not implemented",
};

const STATUS_DOTS: Record<string, string> = {
  implemented: "🟢",
  experimental: "🟡",
  planned: "🔵",
  "not-implemented": "🔴",
};

/** Inline implementation-status badge rendered from ::status directives. */
export function StatusBadge({ value }: { value: string }) {
  const label = STATUS_LABELS[value] ?? value;
  const dot = STATUS_DOTS[value] ?? "⚪";
  return (
    <span className={`${styles.status} ${styles[`status-${value}`] ?? ""}`}>
      <span aria-hidden="true">{dot}</span> {label}
    </span>
  );
}
