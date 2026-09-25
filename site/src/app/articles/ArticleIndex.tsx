"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "@/components/reading/Reading.module.css";

export interface ArticleCard {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly minutes: number;
  readonly tags: readonly string[];
  readonly text: string;
}

export function ArticleIndex({ articles }: { articles: readonly ArticleCard[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const categories = useMemo(() => [...new Set(articles.map((a) => a.category))], [articles]);

  const shown = articles.filter((a) => {
    if (cat && a.category !== cat) return false;
    const needle = q.trim().toLowerCase();
    return needle === "" || a.text.includes(needle);
  });

  return (
    <>
      <div className={styles.filters}>
        <label>
          <span className="sr-only">Search articles</span>
          <input
            type="search"
            className={styles.search}
            placeholder="Search articles…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className={styles.chips} role="group" aria-label="Filter by category">
          <button type="button" className={styles.chipBtn} aria-pressed={cat === null} onClick={() => setCat(null)}>
            All
          </button>
          {categories.map((c) => (
            <button key={c} type="button" className={styles.chipBtn} aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {shown.length} article{shown.length === 1 ? "" : "s"} shown
      </p>

      {shown.length === 0 ? (
        <p className={styles.empty}>No articles match that search.</p>
      ) : (
        <ul className={styles.cards} style={{ marginTop: "2.5rem" }}>
          {shown.map((a) => (
            <li key={a.slug}>
              <Link href={`/articles/${a.slug}`} className={styles.card}>
                <span className={styles.cardKicker}>
                  <span>{a.category}</span>
                  <span>{a.minutes} min</span>
                </span>
                <span className={styles.cardTitle}>{a.title}</span>
                <span className={styles.cardDesc}>{a.description}</span>
                <span className={styles.tags}>
                  {a.tags.map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
