// SEO data integrity: every tool has unique, complete page content, and every
// internal link written into content points at a real page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOLS, CATEGORIES } from "../src/lib/tools/registry.ts";
import { TOOL_CONTENT, missingContent } from "../src/lib/seo/toolContent.ts";
import { CLUSTERS, CATEGORY_CLUSTER } from "../src/lib/seo/clusters.ts";
import { ALL_GUIDES as GUIDES, liveAt } from "../src/lib/seo/guides.ts";

const slugs = new Set(TOOLS.map((t) => t.slug));
const pages = new Set([
  "/",
  "/tools",
  "/guides",
  "/tools/workflows",
  ...CLUSTERS.map((c) => c.path),
  ...TOOLS.map((t) => `/tools/${t.slug}`),
  ...GUIDES.map((g) => `/guides/${g.slug}`),
]);

test("every tool has written content", () => {
  assert.deepEqual(missingContent(), []);
});

test("titles and descriptions are unique and a sensible length", () => {
  const entries = Object.entries(TOOL_CONTENT);
  const titles = new Set(entries.map(([, c]) => c.title));
  const descs = new Set(entries.map(([, c]) => c.description));
  assert.equal(titles.size, entries.length, "duplicate tool titles");
  assert.equal(descs.size, entries.length, "duplicate tool descriptions");
  for (const [slug, c] of entries) {
    assert.ok(c.title.length <= 70, `${slug}: title is ${c.title.length} chars`);
    assert.ok(c.description.length >= 60 && c.description.length <= 170, `${slug}: description is ${c.description.length} chars`);
    assert.ok(c.intent.length >= 1, `${slug}: no search intent recorded`);
  }
  for (const g of GUIDES) assert.ok(g.description.length <= 170, `${g.slug}: description too long`);
});

test("ready tools have instructions, features and uses", () => {
  for (const t of TOOLS.filter((t) => t.status === "ready")) {
    const c = TOOL_CONTENT[t.slug];
    assert.ok(c.steps.length >= 2, `${t.slug}: needs steps`);
    assert.ok(c.features.length >= 1, `${t.slug}: needs features`);
    assert.ok(c.uses.length >= 1, `${t.slug}: needs uses`);
  }
});

test("related tools exist", () => {
  for (const [slug, c] of Object.entries(TOOL_CONTENT)) for (const r of c.related ?? []) assert.ok(slugs.has(r), `${slug} → unknown related tool ${r}`);
});

test("every category belongs to a cluster that lists it", () => {
  for (const c of CATEGORIES) {
    const cluster = CLUSTERS.find((x) => x.id === CATEGORY_CLUSTER[c.id]);
    assert.ok(cluster?.sections.some((s) => s.category === c.id), `${c.id} isn't listed on ${CATEGORY_CLUSTER[c.id]}`);
  }
  for (const cl of CLUSTERS) for (const s of cl.sections) for (const x of s.slugs ?? []) assert.ok(slugs.has(x), `${cl.id} → ${x}`);
});

test("guides only link to real pages and tools", () => {
  const bySlug = new Map(GUIDES.map((g) => [g.slug, g]));
  for (const g of GUIDES) {
    for (const t of g.tools) assert.ok(slugs.has(t), `${g.slug} → unknown tool ${t}`);
    const text = JSON.stringify(g);
    for (const m of text.matchAll(/\]\((\/[^)\s]*)\)/g)) {
      assert.ok(pages.has(m[1]), `${g.slug} links to ${m[1]}, which doesn't exist`);
      // A published guide must never link to one that is still scheduled.
      const target = m[1].startsWith("/guides/") ? bySlug.get(m[1].slice("/guides/".length)) : undefined;
      if (target) assert.ok(liveAt(target) <= liveAt(g), `${g.slug} links to ${target.slug}, which goes live later`);
    }
  }
  for (const c of CLUSTERS) for (const s of c.guides) assert.ok(GUIDES.some((g) => g.slug === s), `${c.id} → unknown guide ${s}`);
});

test("the guide schedule is valid: real dates, at most three a day, unique slugs", () => {
  assert.equal(new Set(GUIDES.map((g) => g.slug)).size, GUIDES.length, "duplicate guide slugs");
  assert.equal(new Set(GUIDES.map((g) => g.title)).size, GUIDES.length, "duplicate guide titles");
  const perDay = new Map<string, number>();
  for (const g of GUIDES) {
    assert.match(g.published, /^\d{4}-\d{2}-\d{2}$/, `${g.slug}: published must be YYYY-MM-DD`);
    if (g.time !== undefined) assert.match(g.time, /^([01]\d|2[0-3]):[0-5]\d$/, `${g.slug}: time must be HH:MM`);
    assert.ok(!Number.isNaN(liveAt(g).getTime()), `${g.slug}: invalid publish date`);
    assert.ok(g.updated >= g.published, `${g.slug}: updated before published`);
    assert.ok(g.title.length <= 70, `${g.slug}: title is ${g.title.length} chars`);
    assert.ok(g.description.length >= 60, `${g.slug}: description too short`);
    assert.ok(g.sections.length >= 2, `${g.slug}: needs at least two sections`);
    perDay.set(g.published, (perDay.get(g.published) ?? 0) + 1);
  }
  // The eleven launch guides went up together; scheduled ones are spread out.
  for (const [day, n] of perDay) if (day > "2026-10-04") assert.ok(n <= 3, `${n} guides on ${day}`);
});
