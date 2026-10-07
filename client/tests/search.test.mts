import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOLS } from "../src/lib/tools/registry.ts";
import { queryWords, searchTools } from "../src/lib/tools/search.ts";

const top = (q: string, n = 1) => searchTools(TOOLS, q).slice(0, n).map((t) => t.slug);

test("the exact or leading name comes first", () => {
  assert.deepEqual(top("compress pdf"), ["compress-pdf"]);
  assert.deepEqual(top("jpg to pdf"), ["jpg-to-pdf"]);
  assert.deepEqual(top("pdf to jpg"), ["pdf-to-jpg"]);
  assert.deepEqual(top("merge"), ["merge-pdf"]);
});

test("filler words don't stop a search", () => {
  assert.deepEqual(queryWords("convert my JPG to PDF"), ["jpg", "pdf"]);
  assert.ok(top("convert my word file to pdf", 3).includes("word-to-pdf"));
});

test("a one-letter typo still finds the tool", () => {
  assert.ok(top("compres pdf", 3).includes("compress-pdf"));
  assert.ok(top("mearge", 3).includes("merge-pdf"));
  assert.ok(top("resise image", 3).includes("resize-image"));
});

test("synonyms still work, and nonsense finds nothing", () => {
  assert.ok(top("shrink pdf", 3).includes("compress-pdf"));
  assert.deepEqual(searchTools(TOOLS, "zzqx"), []);
});
