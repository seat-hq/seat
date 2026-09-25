"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./docs.module.css";

type MermaidApi = (typeof import("mermaid"))["default"];

let mermaidPromise: Promise<MermaidApi> | null = null;

/** Lazy-load mermaid once, themed to match the site's dark ledger palette. */
function loadMermaid() {
  mermaidPromise ??= import("mermaid").then((mod) => {
    const mermaid = mod.default;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      themeVariables: {
        background: "#07140e",
        primaryColor: "#0f2a1e",
        primaryBorderColor: "#2a5540",
        primaryTextColor: "#eaf5ee",
        secondaryColor: "#0b1f16",
        tertiaryColor: "#0b1f16",
        lineColor: "#35d07f",
        textColor: "#eaf5ee",
        mainBkg: "#0f2a1e",
        nodeBorder: "#2a5540",
        clusterBkg: "#0b1f16",
        clusterBorder: "#1c3b2c",
        edgeLabelBackground: "#07140e",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: "14px",
      },
      flowchart: { htmlLabels: true, curve: "basis" },
      sequence: { actorMargin: 24, messageMargin: 32 },
    });
    return mermaid;
  });
  return mermaidPromise;
}

/** Renders a ```mermaid fenced block as inline SVG. Falls back to source on error. */
export function MermaidDiagram({ code }: { code: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadMermaid().then(async (mermaid) => {
      if (cancelled || !ref.current) return;
      try {
        const { svg } = await mermaid.render(`mmd-${id}`, code);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  const label = code.split("\n").find((l) => l.trim().length > 0)?.trim() ?? "diagram";

  if (error) {
    return (
      <div className={styles.codeBlock}>
        <div className={styles.codeHead}>
          <span className={styles.codeLang}>mermaid (render failed)</span>
        </div>
        <pre className={styles.pre}>
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={styles.mermaid}
      role="img"
      aria-label={`Diagram: ${label}`}
    />
  );
}
