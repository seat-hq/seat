import Link from "next/link";
import type { ReactNode } from "react";
import type { DocPage, SectionWithPages } from "@/lib/docs/content";
import { getSection } from "@/lib/docs/config";
import { links } from "@/lib/links";
import { StatusBadge } from "./Callout";
import { DocsNav } from "./DocsNav";
import { DocsSearch } from "./DocsSearch";
import styles from "./docs.module.css";

function Toc({ headings }: { headings: DocPage["headings"] }) {
  if (headings.length === 0) return null;
  return (
    <nav className={styles.toc} aria-label="On this page">
      <p className={styles.tocTitle}>On this page</p>
      <ul>
        {headings.map((h) => (
          <li key={h.id} className={h.depth === 3 ? styles.tocSub : undefined}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Full documentation page frame: sidebar, content column, TOC, prev/next. */
export function DocsShell({
  page,
  tree,
  prev,
  next,
  children,
}: {
  page: DocPage;
  tree: SectionWithPages[];
  prev: DocPage | null;
  next: DocPage | null;
  children: ReactNode;
}) {
  const section = getSection(page.section);
  const source = links.github.href
    ? `${links.github.href}/blob/main/${page.sourcePath}`
    : null;

  const navData = {
    sections: tree.map((s) => ({
      slug: s.slug,
      title: s.title,
      pages: s.pages.map((p) => ({ slug: p.slug, title: p.title, status: p.status })),
    })),
  };

  return (
    <div className={styles.shell}>
      <DocsNav data={navData} />
      <div className={styles.main}>
        <div className={styles.toolbar}>
          <DocsSearch />
        </div>
        <article className={styles.article}>
          <header className={styles.articleHead}>
            <p className={styles.breadcrumb}>
              <Link href="/docs">Docs</Link>
              <span aria-hidden="true"> / </span>
              <span>{section?.title ?? page.section}</span>
            </p>
            <h1 className={styles.title}>{page.title}</h1>
            {page.description ? <p className={styles.description}>{page.description}</p> : null}
            <div className={styles.metaRow}>
              {page.status ? <StatusBadge value={page.status} /> : null}
              <span className={styles.metaItem}>{page.minutes} min read</span>
              {source ? (
                <a
                  className={styles.metaItem}
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Source: {page.sourcePath}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <span className={styles.metaItem}>Source: {page.sourcePath}</span>
              )}
            </div>
          </header>
          {children}
          <nav className={styles.prevNext} aria-label="Pagination">
            {prev ? (
              <Link href={`/docs/${prev.slug}`} className={styles.prevNextLink}>
                <span className={styles.prevNextKicker}>← Previous</span>
                <span className={styles.prevNextTitle}>{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/docs/${next.slug}`}
                className={`${styles.prevNextLink} ${styles.prevNextRight}`}
              >
                <span className={styles.prevNextKicker}>Next →</span>
                <span className={styles.prevNextTitle}>{next.title}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </article>
        <Toc headings={page.headings} />
      </div>
    </div>
  );
}
