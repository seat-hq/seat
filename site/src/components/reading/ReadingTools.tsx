"use client";

import { useEffect, useState } from "react";
import type { Heading } from "@/lib/content";
import styles from "./Reading.module.css";

export function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const article = document.getElementById("reading-body");
    if (!article) return;
    let raf = 0;
    const update = (): void => {
      const r = article.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const done = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      setP(done);
    };
    const onScroll = (): void => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div
      className={styles.progress}
      role="progressbar"
      aria-label="Reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
    >
      <span style={{ transform: `scaleX(${p})` }} />
    </div>
  );
}

export function Toc({ headings }: { headings: readonly Heading[] }) {
  const [active, setActive] = useState<string | null>(headings[0]?.id ?? null);
  useEffect(() => {
    const els = headings.map((h) => document.getElementById(h.id)).filter((x): x is HTMLElement => Boolean(x));
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;
  return (
    <nav className={styles.toc} aria-label="On this page">
      <p className={`mono ${styles.tocTitle}`}>On this page</p>
      <ol>
        {headings.map((h) => (
          <li key={h.id} data-depth={h.depth}>
            <a href={`#${h.id}`} aria-current={active === h.id ? "location" : undefined}>
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ShareBar({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && "share" in navigator), []);

  const url = (): string => (typeof window === "undefined" ? "" : window.location.href.split("#")[0] ?? "");

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={styles.share} role="group" aria-label="Share">
      <button type="button" onClick={copy} className={styles.shareBtn}>
        {copied ? "Link copied" : "Copy link"}
      </button>
      <button
        type="button"
        className={styles.shareBtn}
        onClick={() =>
          window.open(
            `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url())}`,
            "_blank",
            "noopener,noreferrer",
          )
        }
      >
        Post on X
      </button>
      {canShare ? (
        <button type="button" className={styles.shareBtn} onClick={() => void navigator.share({ title, url: url() }).catch(() => undefined)}>
          Share…
        </button>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {copied ? "Link copied to clipboard" : ""}
      </span>
    </div>
  );
}
