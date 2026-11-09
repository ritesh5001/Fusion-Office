// The document viewer: which files it opens, and how links are checked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { viewKind, safeDocUrl, nameFromUrl, VIEWER_ACCEPT } from "../src/lib/viewer/detect.ts";
import { toolBySlug } from "../src/lib/tools/registry.ts";

test("files are shown by extension first, then by type", () => {
  assert.equal(viewKind("report.PDF"), "pdf");
  assert.equal(viewKind("letter.docx"), "docx");
  assert.equal(viewKind("old.doc"), "docx");
  assert.equal(viewKind("budget.xlsx"), "xlsx");
  assert.equal(viewKind("data.csv"), "csv");
  assert.equal(viewKind("deck.pptx"), "pptx");
  assert.equal(viewKind("notes.md"), "markdown");
  assert.equal(viewKind("photo.heic"), "image");
  assert.equal(viewKind("download", "application/pdf"), "pdf");
  assert.equal(viewKind("scan", "image/png"), "image");
  assert.equal(viewKind("readme", "text/plain; charset=utf-8"), "text");
  assert.equal(viewKind("archive.zip", "application/zip"), null);
  assert.equal(viewKind("program.exe"), null);
});

test("the picker filter and the tool entry cover the main formats", () => {
  for (const ext of [".pdf", ".docx", ".xlsx", ".pptx", ".csv", ".txt", ".png"]) assert.ok(VIEWER_ACCEPT.split(",").includes(ext), ext);
  const tool = toolBySlug("document-viewer");
  assert.equal(tool?.href, "/viewer");
});

test("only http(s) links can be opened", () => {
  assert.equal(safeDocUrl("https://example.com/a.pdf"), "https://example.com/a.pdf");
  assert.equal(safeDocUrl("javascript:alert(1)"), null);
  assert.equal(safeDocUrl("file:///etc/passwd"), null);
  assert.equal(safeDocUrl("not a url"), null);
  assert.equal(nameFromUrl("https://example.com/files/My%20Report.pdf?x=1"), "My Report.pdf");
  assert.equal(nameFromUrl("https://example.com/"), "document");
});
