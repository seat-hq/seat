import type { MetadataRoute } from "next";
import { getArticles, getDocs } from "@/lib/content";
import { siteUrl } from "@/lib/links";

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, lastModified?: string): MetadataRoute.Sitemap[number] => ({
    url: `${siteUrl}${path}`,
    priority,
    ...(lastModified ? { lastModified } : {}),
  });
  return [
    page("/", 1),
    page("/docs", 0.8),
    page("/articles", 0.7),
    page("/community", 0.5),
    ...getDocs().map((d) => page(`/docs/${d.slug}`, 0.6)),
    ...getArticles().map((a) => page(`/articles/${a.slug}`, 0.6, a.date || undefined)),
  ];
}
