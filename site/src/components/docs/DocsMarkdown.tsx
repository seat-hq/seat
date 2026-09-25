import Link from "next/link";
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import { remarkDocsDirectives } from "@/lib/docs/directives";
import { resolveDocsHref, slugify } from "@/lib/docs/content";
import { links } from "@/lib/links";
import { Callout, StatusBadge } from "./Callout";
import { CodeBlock } from "./CodeBlock";
import { DocsTabs } from "./DocsTabs";
import { MermaidDiagram } from "./MermaidDiagram";
import styles from "./docs.module.css";

const textOf = (node: ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
};

/** Minimal shape of the hast element react-markdown passes as `node`. */
interface HastElement {
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastElement[];
}

function Anchor({ href, children }: { href?: string; children?: ReactNode }) {
  const target = href ? resolveDocsHref(href, links.github.href) : null;
  if (!target) return <span className={styles.deadLink}>{children}</span>;
  if (target.startsWith("/") || target.startsWith("#")) {
    return <Link href={target}>{children}</Link>;
  }
  return (
    <a href={target} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Pre({ children, node }: { children?: ReactNode; node?: unknown }) {
  // A <pre> wraps exactly one <code> element; read language + raw text from it.
  const hast = node as HastElement | undefined;
  const codeEl = hast?.children?.find((c) => c.tagName === "code");
  const className =
    (codeEl?.properties?.className as string[] | undefined)?.join(" ") ?? "";
  const lang = /language-([\w-]+)/.exec(className)?.[1] ?? "text";
  const code = textOf(children).replace(/\n$/, "");

  if (lang === "mermaid") {
    return <MermaidDiagram code={code} />;
  }
  return <CodeBlock language={lang} code={code} />;
}

function Div({
  className,
  children,
  node,
  ...rest
}: {
  className?: string;
  children?: ReactNode;
  node?: unknown;
} & Record<string, unknown>) {
  const cls = className ?? "";
  const props = rest as Record<string, unknown>;

  if (cls.includes("docs-callout")) {
    return (
      <Callout
        type={(props["data-callout"] as string) ?? "note"}
        title={props["data-title"] as string | undefined}
      >
        {children}
      </Callout>
    );
  }
  if (cls.includes("docs-tabs")) {
    const hast = node as HastElement | undefined;
    const labels = (hast?.children ?? [])
      .filter((c) => (c.properties?.className as string[] | undefined)?.includes("docs-tab"))
      .map((c) => String(c.properties?.["data-tab"] ?? "Tab"));
    return <DocsTabs labels={labels}>{children}</DocsTabs>;
  }
  if (cls.includes("docs-tab")) {
    return <div className={styles.tabContent}>{children}</div>;
  }
  return <div className={className}>{children}</div>;
}

function Span({
  className,
  children,
  ...rest
}: {
  className?: string;
  children?: ReactNode;
} & Record<string, unknown>) {
  if ((className ?? "").includes("docs-status")) {
    return <StatusBadge value={(rest as Record<string, unknown>)["data-status"] as string} />;
  }
  return <span className={className}>{children}</span>;
}

const components: Components = {
  h2: ({ children }) => {
    const id = slugify(textOf(children));
    return (
      <h2 id={id} className={styles.h2}>
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
      <h3 id={id} className={styles.h3}>
        <a href={`#${id}`} className={styles.hash} aria-hidden="true" tabIndex={-1}>
          #
        </a>
        {children}
      </h3>
    );
  },
  a: ({ href, children }) => <Anchor href={href}>{children}</Anchor>,
  pre: ({ children, node }) => <Pre node={node}>{children}</Pre>,
  div: Div as Components["div"],
  span: Span as Components["span"],
  table: ({ children }) => (
    <div className={styles.tableWrap}>
      <table>{children}</table>
    </div>
  ),
  code: ({ className, children }) => (
    <code className={`${styles.inlineCode} ${className ?? ""}`}>{children}</code>
  ),
};

export function DocsMarkdown({ source }: { source: string }) {
  return (
    <div className={styles.prose}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkDirective, remarkDocsDirectives]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
