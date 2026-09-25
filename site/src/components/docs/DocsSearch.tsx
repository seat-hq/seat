"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./docs.module.css";

interface SearchEntry {
  readonly slug: string;
  readonly title: string;
  readonly section: string;
  readonly description: string;
  readonly headings: string;
  readonly text: string;
}

interface ScoredEntry {
  readonly entry: SearchEntry;
  readonly score: number;
}

let indexCache: Promise<SearchEntry[]> | null = null;

function loadIndex(): Promise<SearchEntry[]> {
  indexCache ??= fetch("/docs/search-index.json")
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);
  return indexCache;
}

function search(index: SearchEntry[], query: string): ScoredEntry[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const out: ScoredEntry[] = [];
  for (const entry of index) {
    const title = entry.title.toLowerCase();
    const headings = entry.headings.toLowerCase();
    const desc = entry.description.toLowerCase();
    const text = entry.text.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 10;
      if (headings.includes(term)) score += 5;
      if (desc.includes(term)) score += 4;
      if (text.includes(term)) score += 1;
    }
    if (score > 0) out.push({ entry, score });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 14);
}

/** ⌘K / Ctrl+K documentation search over the build-time index. */
export function DocsSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const openSearch = useCallback(() => {
    setOpen(true);
    setQuery("");
    setCursor(0);
    void loadIndex().then(setIndex);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        if (!open) openSearch();
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, openSearch]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(
    () => (index && query.trim() ? search(index, query) : []),
    [index, query],
  );

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && results[cursor]) {
      window.location.href = `/docs/${results[cursor].entry.slug}`;
    }
  };

  return (
    <>
      <button type="button" className={styles.searchBtn} onClick={openSearch}>
        <span aria-hidden="true">⌕</span> Search docs
        <kbd className={styles.kbd}>⌘K</kbd>
      </button>
      {open ? (
        <div className={styles.searchOverlay} onClick={() => setOpen(false)}>
          <div
            className={styles.searchModal}
            role="dialog"
            aria-modal="true"
            aria-label="Search documentation"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="search"
              className={styles.searchInput}
              placeholder="Search contracts, keeper, SDK, runbooks…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              onKeyDown={onInputKey}
              aria-label="Search documentation"
            />
            <div className={styles.searchResults} role="listbox">
              {query.trim() && results.length === 0 ? (
                <p className={styles.searchEmpty}>No results for “{query}”.</p>
              ) : null}
              {!query.trim() ? (
                <p className={styles.searchEmpty}>
                  Try “executeCopy”, “high-water mark”, “deploy”, “NAV”, “4663”…
                </p>
              ) : null}
              {results.map((r, i) => (
                <Link
                  key={r.entry.slug}
                  href={`/docs/${r.entry.slug}`}
                  role="option"
                  aria-selected={i === cursor}
                  className={`${styles.searchResult} ${i === cursor ? styles.searchResultActive : ""}`}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setCursor(i)}
                >
                  <span className={styles.searchResultSection}>{r.entry.section}</span>
                  <span className={styles.searchResultTitle}>{r.entry.title}</span>
                  {r.entry.description ? (
                    <span className={styles.searchResultDesc}>{r.entry.description}</span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
