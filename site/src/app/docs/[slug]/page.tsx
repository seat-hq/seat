import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReadingLayout } from "@/components/reading/ReadingLayout";
import { getDoc, getDocs } from "@/lib/content";
import { links } from "@/lib/links";
import styles from "@/components/reading/Reading.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return getDocs().map((d) => ({ slug: d.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const doc = getDoc(params.slug);
  if (!doc) return {};
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: `/docs/${doc.slug}` },
    openGraph: { type: "article", title: doc.title, description: doc.description, images: ["/opengraph-image"] },
  };
}

export default function DocPage({ params }: { params: { slug: string } }) {
  const doc = getDoc(params.slug);
  if (!doc) notFound();
  const all = getDocs();
  const i = all.findIndex((d) => d.slug === doc.slug);
  const related = [all[i + 1], all[i - 1]]
    .filter((d): d is NonNullable<typeof d> => Boolean(d))
    .map((d) => ({ href: `/docs/${d.slug}`, title: d.title, kicker: d.group }));
  const source = links.github.href ? `${links.github.href}/blob/main/${doc.sourcePath}` : null;

  return (
    <ReadingLayout
      back={{ href: "/docs", label: "All docs" }}
      kicker={`Docs · ${doc.group}`}
      title={doc.title}
      description={doc.description}
      meta={[
        { k: "Source", v: source ? <a href={source} target="_blank" rel="noopener noreferrer">{doc.sourcePath}</a> : doc.sourcePath },
        { k: "Reading time", v: `${doc.minutes} min` },
        { k: "Status", v: "Rendered from the repo at build time" },
      ]}
      headings={doc.headings}
      body={doc.body}
      related={related}
      footer={
        source ? (
          <p className={styles.desc} style={{ marginTop: "3rem", fontSize: "0.95rem" }}>
            Spotted something wrong?{" "}
            <a href={source} target="_blank" rel="noopener noreferrer" style={{ color: "var(--desk)" }}>
              Edit or discuss this file on GitHub
            </a>
            .
          </p>
        ) : null
      }
    />
  );
}
