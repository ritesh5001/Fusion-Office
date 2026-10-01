// Document converters: CSV parsing, Markdown/CSV/text → HTML, EPUB round trip.
import { test } from "node:test";
import assert from "node:assert/strict";
import { unzipSync, strFromU8 } from "fflate";
import { csvToHtml, epubToHtml, markdownToEpub, markdownToHtml, parseCsv, rowsToCsv, textToHtml } from "../src/lib/tools/documents.ts";

test("CSV with quotes, commas and newlines inside cells", () => {
  const rows = parseCsv('name,amount,note\r\n"Smith, J",1200,"says ""hi""\nthere"\nLee,30,\n');
  assert.deepEqual(rows, [
    ["name", "amount", "note"],
    ["Smith, J", "1200", 'says "hi"\nthere'],
    ["Lee", "30", ""],
  ]);
  assert.deepEqual(parseCsv(rowsToCsv(rows)), rows);
  assert.deepEqual(parseCsv("a;b\n1;2"), [["a", "b"], ["1", "2"]]);
});

test("CSV → HTML table escapes content and right-aligns numbers", () => {
  const html = csvToHtml([["Item", "Qty"], ["<b>bolt</b>", "12"]], { header: true, title: "Stock" });
  assert.ok(html.includes("<th>Item</th>"));
  assert.ok(html.includes("&lt;b&gt;bolt&lt;/b&gt;"));
  assert.ok(html.includes('<td class="num">12</td>'));
});

test("Markdown → HTML keeps tables and code", () => {
  const html = markdownToHtml("# Title\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```\ncode\n```");
  assert.ok(html.includes("<h1>Title</h1>"));
  assert.ok(html.includes("<table>"));
  assert.ok(html.includes("<pre><code>code"));
});

test("plain text becomes paragraphs", () => {
  const html = textToHtml("One\nline\n\nTwo", "Notes");
  assert.ok(html.includes("<p>One<br>line</p><p>Two</p>"));
});

test("PDF markdown → EPUB → HTML round trip", () => {
  const epub = markdownToEpub("# Chapter one\n\nHello.\n\n---\n\n# Chapter two\n\nWorld.", "My Book", "Ravi");
  const files = unzipSync(epub);
  assert.equal(strFromU8(files.mimetype), "application/epub+zip");
  assert.ok(strFromU8(files["OEBPS/content.opf"]).includes("<dc:creator>Ravi</dc:creator>"));
  const back = epubToHtml(epub, "fallback");
  assert.equal(back.title, "My Book");
  assert.equal(back.chapters, 2);
  assert.ok(back.html.includes("Chapter one") && back.html.includes("World."));
});

test("images from the internet become their caption; embedded images stay", async () => {
  const { htmlDocument } = await import("../src/lib/tools/documents.ts");
  const html = htmlDocument("t", '<img src="https://x.com/a.png" alt="Logo"><img src="http://y/b.png"><img src="data:image/png;base64,AAAA">');
  assert.ok(html.includes('<em class="img-alt">[Logo]</em>'));
  assert.ok(!html.includes("x.com") && !html.includes("http://y"));
  assert.ok(html.includes("data:image/png;base64,AAAA"));
});
