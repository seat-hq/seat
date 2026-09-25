import Link from "next/link";
import type { ReactNode } from "react";
import type { Heading } from "@/lib/content";
import { Markdown } from "./Markdown";
import { ReadingProgress, ShareBar, Toc } from "./ReadingTools";
import styles from "./Reading.module.css";

export interface RelatedItem {
  readonly href: string;
  readonly title: string;
  readonly kicker: string;
}

interface Props {
  readonly back: { href: string; label: string };
  readonly kicker: string;
  readonly title: string;
  readonly description?: string;
  readonly meta: readonly { k: string; v: ReactNode }[];
  readonly headings: readonly Heading[];
  readonly body: string;
  readonly related: readonly RelatedItem[];
  readonly footer?: ReactNode;
}

export function ReadingLayout({ back, kicker, title, description, meta, headings, body, related, footer }: Props) {
  return (
    <article className={styles.page}>
      <ReadingProgress />
      <header className={`wrap ${styles.header}`}>
        <Link href={back.href} className={styles.back}>
          <span aria-hidden="true">←</span> {back.label}
        </Link>
        <p className="eyebrow">{kicker}</p>
        <h1 className={`display ${styles.title}`}>{title}</h1>
        {description ? <p className={styles.desc}>{description}</p> : null}
        <dl className={styles.meta}>
          {meta.map((m) => (
            <div key={m.k}>
              <dt>{m.k}</dt>
              <dd>{m.v}</dd>
            </div>
          ))}
        </dl>
        <ShareBar title={title} />
      </header>

      <div className={`wrap ${styles.layout}`}>
        <aside className={styles.side}>
          <Toc headings={headings} />
        </aside>
        <div id="reading-body" className={styles.body}>
          <Markdown source={body} />
          {footer}
        </div>
      </div>

      {related.length > 0 ? (
        <section className={`wrap ${styles.related}`} aria-labelledby="related-title">
          <h2 id="related-title" className={`mono ${styles.relatedTitle}`}>
            Keep reading
          </h2>
          <ul>
            {related.map((r) => (
              <li key={r.href}>
                <Link href={r.href}>
                  <span className="mono">{r.kicker}</span>
                  <span className={styles.relatedName}>{r.title}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
