import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReadingLayout } from "@/components/reading/ReadingLayout";
import { getArticle, getArticles } from "@/lib/content";
import { siteUrl } from "@/lib/links";

export const dynamicParams = false;

export function generateStaticParams() {
  return getArticles().map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const a = getArticle(params.slug);
  if (!a) return {};
  return {
    title: a.title,
    description: a.description,
    keywords: [...a.tags],
    authors: [{ name: a.author }],
    alternates: { canonical: `/articles/${a.slug}` },
    openGraph: {
      type: "article",
      title: a.title,
      description: a.description,
      publishedTime: a.date || undefined,
      authors: [a.author],
      tags: [...a.tags],
      images: ["/opengraph-image"],
    },
  };
}

const formatDate = (d: string): string =>
  d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "—";

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const a = getArticle(params.slug);
  if (!a) notFound();
  const others = getArticles().filter((o) => o.slug !== a.slug);
  const related = [...others.filter((o) => o.tags.some((t) => a.tags.includes(t))), ...others]
    .filter((o, i, arr) => arr.findIndex((x) => x.slug === o.slug) === i)
    .slice(0, 3)
    .map((o) => ({ href: `/articles/${o.slug}`, title: o.title, kicker: o.category }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    datePublished: a.date || undefined,
    author: { "@type": "Organization", name: a.author },
    mainEntityOfPage: `${siteUrl}/articles/${a.slug}`,
    keywords: a.tags.join(", "),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ReadingLayout
        back={{ href: "/articles", label: "All articles" }}
        kicker={`Articles · ${a.category}`}
        title={a.title}
        description={a.description}
        meta={[
          { k: "Published", v: formatDate(a.date) },
          { k: "Author", v: a.author },
          { k: "Reading time", v: `${a.minutes} min` },
        ]}
        headings={a.headings}
        body={a.body}
        related={related}
      />
    </>
  );
}
