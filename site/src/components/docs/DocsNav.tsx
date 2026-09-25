"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import styles from "./docs.module.css";

export interface DocsNavData {
  readonly sections: readonly {
    readonly slug: string;
    readonly title: string;
    readonly pages: readonly {
      readonly slug: string;
      readonly title: string;
      readonly status: string | null;
    }[];
  }[];
}

const STATUS_MARK: Record<string, string> = {
  implemented: "🟢",
  experimental: "🟡",
  planned: "🔵",
  "not-implemented": "🔴",
};

function NavList({ data, onNavigate }: { data: DocsNavData; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className={styles.sideNav} aria-label="Documentation">
      <Link href="/docs" className={styles.sideHome} onClick={onNavigate}>
        Docs home
      </Link>
      {data.sections.map((section) => (
        <div className={styles.sideSection} key={section.slug}>
          <p className={styles.sideSectionTitle}>{section.title}</p>
          <ul>
            {section.pages.map((page) => {
              const href = `/docs/${page.slug}`;
              const active = pathname === href;
              return (
                <li key={page.slug}>
                  <Link
                    href={href}
                    className={`${styles.sideLink} ${active ? styles.sideLinkActive : ""}`}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                  >
                    <span>{page.title}</span>
                    {page.status ? (
                      <span className={styles.sideStatus} aria-label={page.status}>
                        {STATUS_MARK[page.status] ?? ""}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Documentation sidebar: static aside on desktop, drawer on small screens. */
export function DocsNav({ data }: { data: DocsNavData }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        className={styles.menuBtn}
        aria-expanded={open}
        aria-controls="docs-drawer"
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">☰</span> Docs menu
      </button>
      <aside className={styles.sidebar}>
        <NavList data={data} />
      </aside>
      {open ? (
        <div className={styles.drawerOverlay} onClick={close}>
          <div
            id="docs-drawer"
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label="Documentation navigation"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className={styles.drawerClose} onClick={close}>
              Close <span aria-hidden="true">×</span>
            </button>
            <NavList data={data} onNavigate={close} />
          </div>
        </div>
      ) : null}
    </>
  );
}
