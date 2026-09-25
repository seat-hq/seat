import type { Metadata } from "next";
import Link from "next/link";
import { getDocs, type Doc } from "@/lib/content";
import { links } from "@/lib/links";
import styles from "@/components/reading/Reading.module.css";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "The SEAT litepaper, risk model, allowlist process and phase runbooks — rendered from the protocol repository.",
  alternates: { canonical: "/docs" },
};

const GROUPS: readonly Doc["group"][] = ["Protocol", "Runbooks", "Legal"];

export default function DocsIndex() {
  const docs = getDocs();
  return (
    <div className={styles.page}>
      <div className="wrap">
        <header className={styles.indexHead}>
          <p className="eyebrow">Documentation</p>
          <h1 className={`display ${styles.indexTitle}`}>
            Read the <em>source.</em>
          </h1>
          <p className="lede">
            These pages are rendered from the <code className="mono">docs/</code> folder of the protocol repository at build
            time. When they disagree with this site, the code and these docs win.
          </p>
          {links.github.href ? (
            <a className={styles.back} href={links.github.href} target="_blank" rel="noopener noreferrer">
              Browse the repository on GitHub →<span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : null}
        </header>

        {GROUPS.map((g) => {
          const items = docs.filter((d) => d.group === g);
          if (items.length === 0) return null;
          return (
            <section key={g} className={styles.group} aria-labelledby={`g-${g}`}>
              <h2 id={`g-${g}`} className={`mono ${styles.groupTitle}`}>
                {g}
              </h2>
              <ul className={styles.cards}>
                {items.map((d) => (
                  <li key={d.slug}>
                    <Link href={`/docs/${d.slug}`} className={styles.card}>
                      <span className={styles.cardKicker}>
                        <span>{d.sourcePath}</span>
                        <span>{d.minutes} min</span>
                      </span>
                      <span className={styles.cardTitle}>{d.title}</span>
                      <span className={styles.cardDesc}>{d.description}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
