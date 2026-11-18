// The document viewer: which files it opens, and how links are checked.
import { test } from "node:test";
import assert from "node:assert/strict";
import { viewKind, safeDocUrl, nameFromUrl, VIEWER_ACCEPT } from "../src/lib/viewer/detect.ts";
import { TOOLS, toolBySlug } from "../src/lib/tools/registry.ts";
import { VIEWER_PRESETS } from "../src/lib/viewer/presets.ts";
import { TOOL_CONTENT } from "../src/lib/seo/toolContent.ts";

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
  assert.equal(viewKind("program.exe"), null);
  assert.equal(viewKind("program", "application/octet-stream"), null);
});

test("ZIP, email, EPUB, JSON and TIFF files have their own views", () => {
  assert.equal(viewKind("archive.zip", "application/zip"), "zip");
  assert.equal(viewKind("download", "application/x-zip-compressed"), "zip");
  assert.equal(viewKind("mail.eml"), "email");
  assert.equal(viewKind("Outlook Message.MSG"), "email");
  assert.equal(viewKind("forwarded", "message/rfc822"), "email");
  assert.equal(viewKind("book.epub"), "epub");
  assert.equal(viewKind("data.json"), "json");
  assert.equal(viewKind("api", "application/json"), "json");
  assert.equal(viewKind("fax.TIF"), "tiff");
  assert.equal(viewKind("scan", "image/tiff"), "tiff");
  assert.equal(viewKind("feed.xml"), "text");
  assert.equal(viewKind("script.py"), "text");
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

test("every viewer preset is a Viewers tool that opens /viewer?v=<slug>, with page content", () => {
  for (const slug of Object.keys(VIEWER_PRESETS)) {
    const tool = toolBySlug(slug);
    assert.ok(tool, slug);
    assert.equal(tool.category, "view", slug);
    assert.equal(tool.href, `/viewer?v=${slug}`, slug);
    assert.ok(TOOL_CONTENT[slug]?.faq?.length, `${slug} has FAQ content`);
  }
  // And every Viewers tool other than the general one has a preset.
  for (const t of TOOLS.filter((t) => t.category === "view" && t.slug !== "document-viewer")) assert.ok(VIEWER_PRESETS[t.slug], t.slug);
});

test("each viewer's sample files open in the viewer", () => {
  const samples: Record<string, string> = {
    "pdf-viewer": "a.pdf", "word-viewer": "a.docx", "excel-viewer": "a.xlsx", "csv-viewer": "a.csv", "powerpoint-viewer": "a.pptx",
    "image-viewer": "a.webp", "heic-viewer": "a.heic", "tiff-viewer": "a.tiff", "json-viewer": "a.json", "xml-viewer": "a.xml",
    "email-viewer": "a.msg", "zip-viewer": "a.zip", "epub-viewer": "a.epub", "markdown-viewer": "a.md", "text-viewer": "a.log",
  };
  for (const [slug, name] of Object.entries(samples)) {
    assert.ok(viewKind(name), name);
    const ext = name.slice(name.lastIndexOf("."));
    assert.ok(toolBySlug(slug)!.accept.split(",").includes(ext) || toolBySlug(slug)!.accept.includes("image/*"), `${slug} accepts ${ext}`);
  }
});

test("broken JSON reports where it breaks; valid JSON reports nothing", async () => {
  const { jsonErrorAt } = await import("../src/lib/viewer/text.ts");
  assert.equal(jsonErrorAt('{"a": 1, "b": [1, 2,, 3]}'), 20);
  assert.equal(jsonErrorAt('{"a": 1,}'), 8);
  assert.equal(jsonErrorAt('{"a": tru}'), 6);
  assert.equal(jsonErrorAt('{"a": 1} x'), 9);
  assert.equal(jsonErrorAt('{"a": [1, {"b": null}], "c": "x\\"y", "d": -1.5e3}'), -1);
  assert.equal(jsonErrorAt("[]"), -1);
});

test("minified XML is indented one element per line", async () => {
  const { formatXml } = await import("../src/lib/viewer/text.ts");
  assert.equal(formatXml('<?xml version="1.0"?><a><b>x</b><c/><d><e>y</e></d></a>'), '<?xml version="1.0"?>\n<a>\n  <b>x</b>\n  <c/>\n  <d>\n    <e>y</e>\n  </d>\n</a>');
});
