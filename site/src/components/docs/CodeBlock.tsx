"use client";

import { useCallback, useRef, useState } from "react";
import styles from "./docs.module.css";

/** Fenced code block with language label and copy button. */
export function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard API unavailable (permissions / non-secure context): select instead.
      const el = document.getElementById(`cb-${code.length}-${code.slice(0, 8)}`);
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }, [code]);

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHead}>
        <span className={styles.codeLang}>{language}</span>
        <button
          type="button"
          className={styles.copyBtn}
          onClick={copy}
          aria-live="polite"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className={styles.pre}>
        <code id={`cb-${code.length}-${code.slice(0, 8)}`}>{code}</code>
      </pre>
    </div>
  );
}
