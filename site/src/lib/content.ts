import fs from "node:fs";
import path from "node:path";
import { links } from "./links";

export interface Heading {
  readonly depth: 2 | 3;
  readonly text: string;
  readonly id: string;
}

export interface Doc {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly group: "Protocol" | "Runbooks" | "Legal";
  readonly body: string;
  readonly headings: readonly Heading[];
  readonly minutes: number;
  readonly sourcePath: string;
}

export interface Article extends Omit<Doc, "group" | "sourcePath"> {
  readonly category: string;
  readonly date: string;
  readonly author: string;
  readonly tags: readonly string[];
}

const DOCS_DIR = path.join(process.cwd(), "..", "docs");
const ARTICLES_DIR = path.join(process.cwd(), "content", "articles");

/** Public docs, in reading order. Internal notes and deploy-day runbooks are excluded. */
const CURATED: readonly { slug: string; group: Doc["group"]; description: string }[] = [
  { slug: "litepaper", group: "Protocol", description: "What SEAT is, how desks work, accounting, sessions and components." },
  { slug: "risk", group: "Protocol", description: "Fail-closed rules, market, copy-trading, contract and operational risk." },
  { slug: "allowlist", group: "Protocol", description: "How assets are verified and enabled before any desk may hold them." },
  { slug: "phase-1", group: "Runbooks", description: "Testnet desks on Robinhood Chain 46630: deploy, deposit, redeem." },
  { slug: "phase-1-live", group: "Runbooks", description: "Cited 4663 facts: Stock Tokens, feeds, SwapRouter02 and the $50k cap." },
  { slug: "phase-2", group: "Runbooks", description: "Open desks, the fixed-supply $SEAT token, 70 / 20 / 10 fees, stake-to-list." },
  { slug: "not-affiliated", group: "Legal", description: "SEAT is independent and not affiliated with Robinhood Markets." },
];

/** Files referenced from docs that are not published in the repo. */
const UNPUBLISHED = new Set(["Idea.md", "project_structure.md"]);

export const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");

const plain = (s: string): string =>
  s
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();

function extractHeadings(body: string): Heading[] {
  const out: Heading[] = [];
  let fence = false;
  for (const line of body.split("\n")) {
    if (/^```/.test(line)) fence = !fence;
    if (fence) continue;
    const m = /^(##|###)\s+(.+)$/.exec(line);
    if (m && m[1] && m[2]) {
      const text = plain(m[2]);
      out.push({ depth: m[1].length as 2 | 3, text, id: slugify(text) });
    }
  }
  return out;
}

const minutesOf = (body: string): number => Math.max(1, Math.round(body.split(/\s+/).length / 220));

function splitTitle(raw: string): { title: string; body: string } {
  const m = /^#\s+(.+)\n/.exec(raw);
  if (!m || !m[1]) return { title: "Untitled", body: raw };
  return { title: plain(m[1]), body: raw.slice(m[0].length) };
}

export function getDocs(): Doc[] {
  return CURATED.flatMap((c) => {
    const file = path.join(DOCS_DIR, `${c.slug}.md`);
    if (!fs.existsSync(file)) return [];
    const { title, body } = splitTitle(fs.readFileSync(file, "utf8"));
    return [
      {
        slug: c.slug,
        title,
        description: c.description,
        group: c.group,
        body,
        headings: extractHeadings(body),
        minutes: minutesOf(body),
        sourcePath: `docs/${c.slug}.md`,
      },
    ];
  });
}

export function getDoc(slug: string): Doc | undefined {
  return getDocs().find((d) => d.slug === slug);
}

/** Rewrites relative links inside repo docs to site routes or GitHub. `null` means render as text. */
export function resolveDocHref(href: string): string | null {
  if (/^(https?:|mailto:|#|\/)/.test(href)) return href;
  const clean = href.replace(/^\.\//, "");
  const [file, hash] = clean.split("#");
  if (!file) return href;
  if (UNPUBLISHED.has(file)) return null;
  const slug = file.replace(/\.md$/, "");
  if (file.endsWith(".md") && CURATED.some((c) => c.slug === slug)) {
    return `/docs/${slug}${hash ? `#${hash}` : ""}`;
  }
  const repoPath = file.startsWith("../") ? file.slice(3) : `docs/${file}`;
  return `${links.github.href}/blob/main/${repoPath}${hash ? `#${hash}` : ""}`;
}

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(raw);
  if (!m || !m[1]) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, "");
  }
  return { data, body: raw.slice(m[0].length) };
}

export function getArticles(): Article[] {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { data, body } = parseFrontmatter(fs.readFileSync(path.join(ARTICLES_DIR, f), "utf8"));
      return {
        slug: f.replace(/\.md$/, ""),
        title: data.title ?? "Untitled",
        description: data.description ?? "",
        category: data.category ?? "Notes",
        date: data.date ?? "",
        author: data.author ?? "SEAT contributors",
        tags: (data.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
        body,
        headings: extractHeadings(body),
        minutes: minutesOf(body),
      };
    })
    .sort((a, b) => (Number(a.date < b.date) - Number(a.date > b.date)) || a.title.localeCompare(b.title));
}

export function getArticle(slug: string): Article | undefined {
  return getArticles().find((a) => a.slug === slug);
}
