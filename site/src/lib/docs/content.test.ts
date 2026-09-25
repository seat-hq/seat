/**
 * Documentation content quality gates.
 *
 * These tests are the "no broken docs" contract: every page parses, every
 * slug is unique, every internal /docs link resolves to a real page, every
 * repo runbook loads, and directive fences are balanced. Run with the site
 * test script; the build also exercises this code path via SSG.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getDocsPages,
  getDocsTree,
  getAdjacentPages,
  getSearchIndex,
  resolveDocsHref,
} from "./content";
import { DOCS_SECTIONS } from "./config";

const pages = getDocsPages();
const slugs = new Set(pages.map((p) => p.slug));

test("every configured section has at least one page", () => {
  const tree = getDocsTree();
  for (const section of DOCS_SECTIONS) {
    const found = tree.find((s) => s.slug === section.slug);
    assert.ok(
      found && found.pages.length > 0,
      `section "${section.slug}" has no pages`,
    );
  }
});

test("slugs are unique", () => {
  assert.equal(slugs.size, pages.length, "duplicate page slugs found");
});

test("every page has a title, description, and body", () => {
  for (const p of pages) {
    assert.ok(p.title.length > 0, `${p.slug}: missing title`);
    assert.ok(p.description.length > 0, `${p.slug}: missing description`);
    assert.ok(p.body.length > 0, `${p.slug}: empty body`);
  }
});

test("authored pages declare a numeric order", () => {
  for (const p of pages.filter((p) => !p.fromRepo)) {
    assert.notEqual(p.order, 100, `${p.slug}: missing frontmatter order`);
  }
});

test("internal /docs links resolve to real pages", () => {
  const linkRe = /\]\((\/docs[^)\s]*)\)/g;
  const offenders: string[] = [];
  for (const p of pages) {
    for (const m of p.body.matchAll(linkRe)) {
      const href = (m[1] ?? "").split("#")[0]?.replace(/\/$/, "") ?? "";
      if (href === "/docs") continue;
      const target = href.replace(/^\/docs\//, "");
      if (!slugs.has(target)) offenders.push(`${p.slug} -> ${href}`);
    }
  }
  assert.deepEqual(offenders, [], "unresolved /docs links");
});

test("heading anchor ids are unique within each page", () => {
  for (const p of pages) {
    const ids = p.headings.map((h) => h.id);
    assert.equal(
      new Set(ids).size,
      ids.length,
      `${p.slug}: duplicate heading anchors`,
    );
  }
});

test("directive fences are balanced", () => {
  for (const p of pages) {
    let fence = false;
    let depth = 0;
    for (const line of p.body.split("\n")) {
      if (/^```/.test(line)) fence = !fence;
      if (fence) continue;
      if (/^:::/.test(line)) {
        if (/^:::\s*$/.test(line)) depth -= 1;
        else depth += 1;
        assert.ok(depth >= 0, `${p.slug}: closing fence without opener`);
      }
    }
    assert.equal(depth, 0, `${p.slug}: unbalanced ::: directives`);
  }
});

test("all eight repo runbooks load", () => {
  const runbooks = pages.filter((p) => p.section === "runbooks");
  assert.equal(runbooks.length, 8);
  for (const name of [
    "litepaper",
    "phase-1",
    "phase-1-live",
    "phase-2",
    "mainnet-day",
    "risk",
    "allowlist",
    "not-affiliated",
  ]) {
    assert.ok(slugs.has(`runbooks/${name}`), `runbooks/${name} missing`);
  }
});

test("repo runbook .md links resolve or are intentionally unpublished", () => {
  for (const p of pages.filter((p) => p.fromRepo)) {
    const linkRe = /\]\(([^)\s]+\.md(?:#[^)]+)?)\)/g;
    for (const m of p.body.matchAll(linkRe)) {
      const href = m[1] ?? "";
      if (/^(https?:|\/)/.test(href)) continue;
      const resolved = resolveDocsHref(href, "https://github.com/seat-hq/seat");
      // null is acceptable only for the intentionally unpublished files
      if (resolved === null) {
        assert.match(
          href,
          /Idea\.md|project_structure\.md/,
          `${p.slug}: unresolvable repo link ${href}`,
        );
      }
    }
  }
});

test("prev/next chain covers every page exactly once at the ends", () => {
  const first = pages[0];
  const last = pages[pages.length - 1];
  assert.ok(first && last);
  assert.equal(getAdjacentPages(first.slug).prev, null);
  assert.equal(getAdjacentPages(last.slug).next, null);
  const mid = pages[Math.floor(pages.length / 2)];
  assert.ok(mid);
  assert.ok(getAdjacentPages(mid.slug).prev);
  assert.ok(getAdjacentPages(mid.slug).next);
});

test("search index covers all pages with text", () => {
  const index = getSearchIndex();
  assert.equal(index.length, pages.length);
  for (const entry of index) {
    assert.ok(entry.text.length > 0, `${entry.slug}: empty search text`);
  }
});
