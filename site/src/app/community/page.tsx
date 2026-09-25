import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/LinkButton";
import { links, type LinkKey } from "@/lib/links";
import styles from "./Community.module.css";

export const metadata: Metadata = {
  title: "Community",
  description: "Where SEAT is discussed: announcements, community chat and technical discussion in the open repository.",
  alternates: { canonical: "/community" },
};

const CHANNELS: readonly { key: LinkKey; kicker: string; body: string }[] = [
  {
    key: "x",
    kicker: "Announcements",
    body: "Release notes and status changes. No price talk, no performance claims.",
  },
  {
    key: "community",
    kicker: "Chat",
    body: "A place for leaders, depositors and builders to ask questions in the open.",
  },
  {
    key: "discussions",
    kicker: "Technical",
    body: "Design questions, bugs and proposals live in the repository, next to the code they change.",
  },
  {
    key: "github",
    kicker: "Source",
    body: "Contracts, keeper, SDK, docs and this site. Read it before you trust any sentence on it.",
  },
];

export default function CommunityPage() {
  return (
    <div className={styles.page}>
      <div className="wrap">
        <header className={styles.head}>
          <p className="eyebrow">Community</p>
          <h1 className={`display ${styles.title}`}>
            Talk to the <em>people</em>, read the <em>code.</em>
          </h1>
          <p className="lede">
            SEAT is an independent, open project. Some channels are not open yet — they are marked, not guessed.
          </p>
        </header>

        <ul className={styles.grid}>
          {CHANNELS.map((c) => {
            const link = links[c.key];
            const live = Boolean(link.href);
            return (
              <li key={c.key} className={styles.card} data-live={live}>
                <div className={styles.cardTop}>
                  <span className="mono">{c.kicker}</span>
                  <span className={`chip ${live ? "chip--desk" : ""}`}>{live ? "Open" : "Not open yet"}</span>
                </div>
                <h2 className={styles.cardTitle}>{link.label}</h2>
                <p>{c.body}</p>
                <LinkButton to={c.key} variant="ghost">
                  {live ? "Visit" : link.label}
                </LinkButton>
              </li>
            );
          })}
        </ul>

        <section className={styles.rules} aria-labelledby="norms">
          <h2 id="norms" className="h-md">
            House rules
          </h2>
          <ul>
            <li>Nobody from SEAT will DM you first, ask for a seed phrase, or ask you to “verify” a wallet.</li>
            <li>There are no guaranteed returns. Anyone promising them is not speaking for the project.</li>
            <li>Contract addresses come from the repo and docs — never from a chat message.</li>
            <li>
              SEAT is not affiliated with Robinhood. See <Link href="/docs/not-affiliated">the notice</Link>.
            </li>
          </ul>
        </section>

        <section className={styles.kit} aria-labelledby="brand-kit">
          <h2 id="brand-kit" className="h-md">
            Brand kit
          </h2>
          <p>Forest green, cream and gold. Keep the ring around the mark and give it room to breathe.</p>
          <ul className={styles.kitGrid}>
            {BRAND_ASSETS.map((a) => (
              <li key={a.file} className={styles.kitItem} data-surface={a.surface}>
                <div className={styles.kitPreview}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/brand/${a.file}`} alt={a.alt} loading="lazy" />
                </div>
                <div className={styles.kitMeta}>
                  <span>{a.label}</span>
                  <a href={`/brand/${a.file}`} download>
                    SVG
                    <span className="sr-only"> — download {a.label}</span>
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <dl className={styles.swatches}>
            {SWATCHES.map((s) => (
              <div key={s.hex}>
                <dt>
                  <span style={{ background: s.hex }} aria-hidden="true" />
                  {s.name}
                </dt>
                <dd className="mono">{s.hex}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}

const BRAND_ASSETS: readonly { file: string; label: string; alt: string; surface: "light" | "dark" }[] = [
  { file: "seat-mark-light.svg", label: "Mark · light", alt: "SEAT mark in green on cream", surface: "light" },
  { file: "seat-mark-dark.svg", label: "Mark · dark", alt: "SEAT mark in cream on green", surface: "dark" },
  { file: "seat-badge.svg", label: "Badge", alt: "SEAT badge: outlined mark on a green disc", surface: "light" },
];

const SWATCHES = [
  { name: "Forest", hex: "#1c3b2e" },
  { name: "Cream", hex: "#fcf6ea" },
  { name: "Gold", hex: "#bb9757" },
] as const;
