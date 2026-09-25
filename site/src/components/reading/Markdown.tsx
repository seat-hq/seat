import Link from "next/link";
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { resolveDocHref, slugify } from "@/lib/content";
import styles from "./Reading.module.css";

const textOf = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
};

function Anchor({ href, children }: { href?: string; children?: ReactNode }) {
  const target = href ? resolveDocHref(href) : null;
  if (!target) return <span className={styles.deadLink}>{children}</span>;
  if (target.startsWith("/") || target.startsWith("#")) return <Link href={target}>{children}</Link>;
  return (
    <a href={target} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

const components: Components = {
  h1: ({ children }) => <h2 id={slugify(textOf(children))}>{children}</h2>,
  h2: ({ children }) => {
    const id = slugify(textOf(children));
    return (
      <h2 id={id}>
        <a href={`#${id}`} className={styles.hash} aria-hidden="true" tabIndex={-1}>
          #
        </a>
        {children}
      </h2>
    );
  },
  h3: ({ children }) => {
    const id = slugify(textOf(children));
    return (
      <h3 id={id}>
        <a href={`#${id}`} className={styles.hash} aria-hidden="true" tabIndex={-1}>
          #
        </a>
        {children}
      </h3>
    );
  },
  a: ({ href, children }) => <Anchor href={href}>{children}</Anchor>,
  table: ({ children }) => (
    <div className={styles.tableWrap}>
      <table>{children}</table>
    </div>
  ),
  pre: ({ children }) => <pre className={styles.pre}>{children}</pre>,
};

export function Markdown({ source }: { source: string }) {
  return (
    <div className={styles.prose}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
