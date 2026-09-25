"use client";

import { useState, type ReactNode } from "react";
import styles from "./docs.module.css";

/**
 * Tabbed content (e.g. package-manager variants). Labels are extracted
 * server-side from :::tab{label="..."} directives and passed as data.
 */
export function DocsTabs({ labels, children }: { labels: string[]; children: ReactNode }) {
  const [active, setActive] = useState(0);
  const panels = Array.isArray(children) ? children : [children];

  return (
    <div className={styles.tabs}>
      <div className={styles.tabList} role="tablist">
        {labels.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={`${styles.tabBtn} ${i === active ? styles.tabBtnActive : ""}`}
            onClick={() => setActive(i)}
          >
            {label}
          </button>
        ))}
      </div>
      {panels.map((panel, i) => (
        <div
          key={labels[i] ?? i}
          role="tabpanel"
          hidden={i !== active}
          className={styles.tabPanel}
        >
          {panel}
        </div>
      ))}
    </div>
  );
}
