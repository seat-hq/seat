import type { Metadata } from "next";
import { getArticles } from "@/lib/content";
import { ArticleIndex } from "./ArticleIndex";
import styles from "@/components/reading/Reading.module.css";

export const metadata: Metadata = {
  title: "Articles",
  description: "Explainers on SEAT desks: custody, sizing, risk and the idea of a copy desk instead of a sniper bot.",
  alternates: { canonical: "/articles" },
};

export default function ArticlesPage() {
  const articles = getArticles().map((a) => ({
    slug: a.slug,
    title: a.title,
    description: a.description,
    category: a.category,
    minutes: a.minutes,
    tags: a.tags,
    text: `${a.title} ${a.description} ${a.tags.join(" ")} ${a.body}`.toLowerCase(),
  }));

  return (
    <div className={styles.page}>
      <div className="wrap">
        <header className={styles.indexHead}>
          <p className="eyebrow">Articles</p>
          <h1 className={`display ${styles.indexTitle}`}>
            Notes from the <em>desk.</em>
          </h1>
          <p className="lede">
            Plain-language explainers built only from what the protocol repository says. Every worked number is an example,
            not a live desk.
          </p>
        </header>
        <ArticleIndex articles={articles} />
      </div>
    </div>
  );
}
