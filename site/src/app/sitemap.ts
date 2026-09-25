import type { MetadataRoute } from "next";
import { getDocsPages } from "@/lib/docs/content";
import { siteUrl } from "@/lib/links";

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${siteUrl}${path}`,
    priority,
  });
  return [
    page("/", 1),
    page("/docs", 0.9),
    ...getDocsPages().map((d) => page(`/docs/${d.slug}`, 0.6)),
  ];
}
