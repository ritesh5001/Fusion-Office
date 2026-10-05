import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOLS } from "../src/lib/tools/registry.ts";
import { contentFor } from "../src/lib/seo/toolContent.ts";
import { alternateNames, brandFaq, brandedName, searchName } from "../src/lib/seo/brand.ts";

const ready = TOOLS.filter((t) => t.status === "ready");

test("every tool's title contains the name people search for", () => {
  const missing = ready.filter((t) => !contentFor(t).title.toLowerCase().includes(searchName(t).toLowerCase())).map((t) => `${t.slug}: ${searchName(t)}`);
  assert.deepEqual(missing, []);
});

test("branded names read naturally", () => {
  const by = (slug: string) => ready.find((t) => t.slug === slug)!;
  assert.equal(brandedName(by("edit-pdf")), "Fusion Office PDF Editor");
  assert.equal(brandedName(by("pdf-to-jpg")), "Fusion Office PDF to JPG");
  assert.equal(brandedName(by("jpg-to-pdf")), "Fusion Office JPG to PDF");
  assert.equal(brandedName(by("compress-image")), "Fusion Office Compress Image");
  assert.ok(alternateNames(by("edit-pdf")).includes("Fusion Office Edit PDF"));
});

test("every tool answers the branded question, without doubled words", () => {
  for (const t of ready) {
    const [q, a] = brandFaq(t, contentFor(t));
    assert.equal(q, `What is ${brandedName(t)}?`);
    assert.doesNotMatch(a, /\.\./, t.slug);
    // The description must survive the de-duplication: never jump straight to the privacy line.
    assert.doesNotMatch(a, /from Fusion Office\.\s+(It runs|Files are|Your file)/, t.slug);
    assert.ok(a.length < 600, t.slug);
  }
});
