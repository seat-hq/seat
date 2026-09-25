import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsMarkdown } from "@/components/docs/DocsMarkdown";
import { DocsShell } from "@/components/docs/DocsShell";
import { getAdjacentPages, getDocPage, getDocsPages, getDocsTree } from "@/lib/docs/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return getDocsPages().map((p) => ({ slug: p.slug.split("/") }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string[] };
}): Metadata {
  const page = getDocPage(params.slug.join("/"));
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/docs/${page.slug}` },
    openGraph: {
      type: "article",
      title: page.title,
      description: page.description,
      images: ["/opengraph-image"],
    },
  };
}

export default function DocsPage({ params }: { params: { slug: string[] } }) {
  const slug = params.slug.join("/");
  const page = getDocPage(slug);
  if (!page) notFound();
  const { prev, next } = getAdjacentPages(slug);
  const tree = getDocsTree();

  return (
    <DocsShell page={page} tree={tree} prev={prev} next={next}>
      <DocsMarkdown source={page.body} />
    </DocsShell>
  );
}
