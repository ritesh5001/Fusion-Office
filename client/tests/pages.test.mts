// Page tools: mix, n-up, flip, split in half / by size, flatten, metadata,
// restrictions, Bates numbers, headers & footers.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocument, StandardFonts, degrees } from "pdf-lib";
import { PDFDocument as Cantoo } from "@cantoo/pdf-lib";
import {
  alternatePages,
  flattenPdf,
  flipPdf,
  pagesPerSheet,
  readMetadata,
  removeRestrictions,
  splitBySize,
  splitInHalf,
  writeMetadata,
} from "../src/lib/tools/processors/pages.ts";
import { addBatesNumbers, addHeaderFooter } from "../src/lib/tools/processors/stamp.ts";

async function makePdf(labels: string[], size: [number, number] = [300, 400]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const l of labels) doc.addPage(size).drawText(l, { x: 30, y: 350, size: 18, font });
  return doc.save();
}

async function pageTexts(bytes: Uint8Array) {
  const doc = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const out: { text: string; x: number; y: number; w: number; h: number }[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i);
    const vp = p.getViewport({ scale: 1 });
    const items = (await p.getTextContent()).items.filter((it) => "str" in it && it.str.trim()) as { str: string; transform: number[] }[];
    out.push({ text: items.map((it) => it.str).join(" "), x: items[0]?.transform[4] ?? NaN, y: items[0]?.transform[5] ?? NaN, w: vp.width, h: vp.height });
  }
  return out;
}

test("alternate & mix interleaves pages, optionally reversing the second file", async () => {
  const a = await makePdf(["A1", "A2", "A3"]);
  const b = await makePdf(["B1", "B2"]);
  assert.deepEqual((await pageTexts(await alternatePages([a, b], { reverseSecond: false }))).map((p) => p.text), ["A1", "B1", "A2", "B2", "A3"]);
  assert.deepEqual((await pageTexts(await alternatePages([a, b], { reverseSecond: true }))).map((p) => p.text), ["A1", "B2", "A2", "B1", "A3"]);
});

test("pages per sheet puts 4 portrait pages on each A4 sheet in reading order", async () => {
  const bytes = await pagesPerSheet(await makePdf(["P1", "P2", "P3", "P4", "P5"]), { perSheet: 4, sheet: "a4", border: true, order: "rows" });
  const pages = await pageTexts(bytes);
  assert.equal(pages.length, 2);
  assert.ok(Math.abs(pages[0].w - 595.28) < 1 && Math.abs(pages[0].h - 841.89) < 1);
  const doc = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const items = (await (await doc.getPage(1)).getTextContent()).items as { str: string; transform: number[] }[];
  const pos = Object.fromEntries(items.map((i) => [i.str, i.transform.slice(4)]));
  assert.ok(pos.P1[0] < pos.P2[0] && Math.abs(pos.P1[1] - pos.P2[1]) < 1, "P1 left of P2 on the top row");
  assert.ok(pos.P3[1] < pos.P1[1], "P3 on the second row");
});

test("two pages per sheet use a landscape sheet", async () => {
  const [sheet] = await pageTexts(await pagesPerSheet(await makePdf(["L", "R"]), { perSheet: 2, sheet: "a4", border: false, order: "rows" }));
  assert.ok(sheet.w > sheet.h);
});

test("flip mirrors the content horizontally", async () => {
  const [before] = await pageTexts(await makePdf(["Mirror"]));
  const [after] = await pageTexts(await flipPdf(await makePdf(["Mirror"]), "horizontal"));
  assert.equal(after.text, "Mirror");
  assert.ok(Math.abs(after.x - (300 - before.x)) < 1, `${after.x} vs ${300 - before.x}`);
});

test("split in half doubles the pages and halves their width", async () => {
  const pages = await pageTexts(await splitInHalf(await makePdf(["Spread"], [600, 400]), { cut: "vertical", rightFirst: false }));
  assert.equal(pages.length, 2);
  assert.ok(Math.abs(pages[0].w - 300) < 1 && Math.abs(pages[0].h - 400) < 1);
  assert.equal(pages[0].text, "Spread"); // the left half has the text
  assert.equal(pages[1].text, "");
});

test("split in half follows a rotated page as shown", async () => {
  const doc = await PDFDocument.load(await makePdf(["Turned"], [400, 600]));
  doc.getPage(0).setRotation(degrees(90)); // shown 600 wide × 400 high
  const pages = await pageTexts(await splitInHalf(await doc.save(), { cut: "vertical", rightFirst: false }));
  assert.equal(pages.length, 2);
  assert.ok(Math.abs(pages[0].w - 300) < 1 && Math.abs(pages[0].h - 400) < 1, `${pages[0].w}×${pages[0].h}`);
});

test("split by size keeps every part under the limit", async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 12; i++) {
    const p = doc.addPage([300, 300]);
    for (let k = 0; k < 40; k++) p.drawText(`Page ${i} line ${k} ${"x".repeat(60)}`, { x: 5, y: 290 - k * 7, size: 5, font });
  }
  const bytes = await doc.save();
  const limit = Math.ceil(bytes.length / 3);
  const parts = await splitBySize(bytes, limit);
  assert.ok(parts.length >= 3, `${parts.length} parts`);
  for (const p of parts) assert.ok(p.length <= limit, `${p.length} > ${limit}`);
  const counts = await Promise.all(parts.map(async (p) => (await PDFDocument.load(p)).getPageCount()));
  assert.equal(counts.reduce((a, b) => a + b, 0), 12);
});

test("flatten turns form answers into page content", async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 300]);
  const field = doc.getForm().createTextField("vessel");
  field.setText("MV OCEAN STAR");
  field.addToPage(page, { x: 20, y: 200, width: 200, height: 30 });
  const r = await flattenPdf(await doc.save(), { forms: true, annotations: true, scripts: true });
  assert.equal(r.fields, 1);
  const out = await PDFDocument.load(r.bytes);
  assert.equal(out.getForm().getFields().length, 0);
  assert.equal((await pageTexts(r.bytes))[0].text, "MV OCEAN STAR");
});

test("metadata round trip, and empty fields are removed", async () => {
  const bytes = await writeMetadata(await makePdf(["M"]), {
    title: "Service Request",
    author: "Ops Team",
    subject: "",
    keywords: "rina, survey",
    creator: "Fusion Office",
    producer: "",
    created: "2026-10-01",
    modified: "",
  });
  const m = await readMetadata(bytes);
  assert.equal(m.title, "Service Request");
  assert.equal(m.author, "Ops Team");
  assert.equal(m.subject, "");
  assert.equal(m.keywords, "rina survey");
  assert.equal(m.created, "2026-10-01");
});

test("remove restrictions unlocks a form that opens without a password", async () => {
  const src = await Cantoo.create();
  src.addPage([100, 100]);
  src.encrypt({ userPassword: "", ownerPassword: "x", permissions: { modifying: false } });
  const r = await removeRestrictions(await src.save());
  assert.equal(r.wasRestricted, true);
  assert.equal((await PDFDocument.load(r.bytes)).isEncrypted, false);
  const plain = await makePdf(["free"]);
  assert.equal((await removeRestrictions(plain)).wasRestricted, false);
});

test("Bates numbers continue across files", async () => {
  const r = await addBatesNumbers([await makePdf(["a", "b"]), await makePdf(["c"])], {
    prefix: "RINA-",
    suffix: "",
    start: 7,
    digits: 5,
    position: "bottom-right",
    fontSize: 9,
    color: "#000000",
    margin: 20,
  });
  assert.deepEqual(r.ranges, [
    ["RINA-00007", "RINA-00008"],
    ["RINA-00009", "RINA-00009"],
  ]);
  assert.ok((await pageTexts(r.files[1]))[0].text.includes("RINA-00009"));
});

test("headers and footers fill in their tokens", async () => {
  const bytes = await addHeaderFooter(await makePdf(["x", "y"]), {
    header: ["{file}", "", "{date}"],
    footer: ["", "Page {page} of {total}", ""],
    fontSize: 9,
    color: "#333333",
    margin: 24,
    fileName: "form.pdf",
    date: "01 Oct 2026",
    rule: true,
  });
  const pages = await pageTexts(bytes);
  assert.ok(pages[1].text.includes("Page 2 of 2"), pages[1].text);
  assert.ok(pages[0].text.includes("form.pdf") && pages[0].text.includes("01 Oct 2026"));
});
