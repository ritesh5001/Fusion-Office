// Page tools added in the third wave, checked with pdf.js like a real reader.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts, degrees } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  addAttachments, bookletOrder, bookletPdf, bookmarksToText, deletePages, extractPages, insertBlankPages, listAttachments, parseBookmarks, posterPdf, qrMatrix,
  qrStampPdf, removeAnnotations, removeAttachments, resizePages, reversePages, stampPdf, writeBookmarks,
} from "../src/lib/tools/processors/pageOps.ts";

async function makePdf(labels: string[], opts: { rotate?: number; size?: [number, number] } = {}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const label of labels) {
    const p = doc.addPage(opts.size ?? [300, 400]);
    p.drawText(label, { x: 40, y: 300, size: 18, font });
    if (opts.rotate) p.setRotation(degrees(opts.rotate));
  }
  return doc.save();
}
const open = (bytes: Uint8Array) => pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
async function texts(bytes: Uint8Array) {
  const doc = await open(bytes);
  const out: { text: string; w: number; h: number }[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    out.push({ text: tc.items.map((it) => ("str" in it ? it.str : "")).join(" ").replace(/\s+/g, " ").trim(), w: Math.round(vp.width), h: Math.round(vp.height) });
  }
  return out;
}

test("delete pages keeps the rest in order", async () => {
  const src = await makePdf(["KEEP-A", "SECRET-B", "KEEP-C"]);
  const r = await deletePages(src, [1]);
  assert.deepEqual((await texts(r.bytes)).map((p) => p.text), ["KEEP-A", "KEEP-C"]);
  assert.equal(r.removed, 1);
  await assert.rejects(() => deletePages(src, [0, 1, 2]), /every page/);
});

test("extract and reverse", async () => {
  const src = await makePdf(["P1", "P2", "P3", "P4"]);
  assert.deepEqual((await texts(await extractPages(src, [3, 0]))).map((p) => p.text), ["P4", "P1"]);
  assert.deepEqual((await texts(await reversePages(src))).map((p) => p.text), ["P4", "P3", "P2", "P1"]);
});

test("blank pages go where asked and match their neighbour's size", async () => {
  const src = await makePdf(["P1", "P2"], { size: [200, 500] });
  const after = await insertBlankPages(src, { where: "after", page: 1, count: 2 });
  assert.deepEqual((await texts(after.bytes)).map((p) => p.text), ["P1", "", "", "P2"]);
  assert.deepEqual((await texts(after.bytes)).map((p) => [p.w, p.h]), Array(4).fill([200, 500]));
  const every = await insertBlankPages(src, { where: "every", page: 0, count: 1 });
  assert.deepEqual((await texts(every.bytes)).map((p) => p.text), ["P1", "", "P2", ""]);
  const start = await insertBlankPages(src, { where: "start", page: 0, count: 1 });
  assert.deepEqual((await texts(start.bytes)).map((p) => p.text), ["", "P1", "P2"]);
});

test("resize puts pages on the chosen paper, keeping orientation and text", async () => {
  const src = await makePdf(["Tall"], { size: [300, 400] });
  const wide = await makePdf(["Wide"], { size: [400, 300] });
  const a = await texts(await resizePages(src, { paper: "a4", orientation: "auto", margin: 0 }));
  assert.deepEqual([a[0].w, a[0].h, a[0].text], [595, 842, "Tall"]);
  const b = await texts(await resizePages(wide, { paper: "letter", orientation: "auto", margin: 10 }));
  assert.deepEqual([b[0].w, b[0].h, b[0].text], [792, 612, "Wide"]);
  // A page turned with /Rotate is laid out the way it is shown.
  const turned = await texts(await resizePages(await makePdf(["R"], { rotate: 90 }), { paper: "a4", orientation: "auto", margin: 0 }));
  assert.deepEqual([turned[0].w, turned[0].h], [842, 595]);
});

test("remove annotations deletes comments but can keep links", async () => {
  const doc = await PDFDocument.load(await makePdf(["Page"]));
  const page = doc.getPage(0);
  const note = doc.context.register(doc.context.obj({ Type: "Annot", Subtype: "Text", Rect: [10, 10, 30, 30], Contents: doc.context.obj("TOPSECRETNOTE") }));
  const link = doc.context.register(doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: [10, 40, 90, 60] }));
  page.node.set(doc.context.obj("Annots") as never, doc.context.obj([note, link]));
  const src = await doc.save({ useObjectStreams: false });
  assert.ok(Buffer.from(src).includes("TOPSECRETNOTE"));
  const r = await removeAnnotations(src, { keepLinks: true, keepFormFields: true });
  assert.equal(r.removed, 1);
  const annots = await (await (await open(r.bytes)).getPage(1)).getAnnotations();
  assert.deepEqual(annots.map((a) => a.subtype), ["Link"]);
  const all = await removeAnnotations(src, { keepLinks: false, keepFormFields: false });
  assert.equal(all.removed, 2);
  const plain = await PDFDocument.load(all.bytes);
  assert.ok(!Buffer.from(await plain.save({ useObjectStreams: false })).includes("TOPSECRETNOTE"), "comment text must not stay in the file");
});

test("booklet order: outer sheet carries the last and first pages", async () => {
  assert.deepEqual(bookletOrder(8), [[7, 0], [1, 6], [5, 2], [3, 4]]);
  assert.deepEqual(bookletOrder(5), [[-1, 0], [1, -1], [-1, 2], [3, 4]]);
  const r = await bookletPdf(await makePdf(["1", "2", "3", "4", "5", "6", "7", "8"]), { paper: "a4", rightToLeft: false });
  assert.equal(r.sheets, 2);
  const t = await texts(r.bytes);
  assert.deepEqual(t.map((p) => p.text), ["8 1", "2 7", "6 3", "4 5"]);
  assert.deepEqual([t[0].w, t[0].h], [842, 595]);
});

test("a completely empty page doesn't break sheet layouts", async () => {
  const doc = await PDFDocument.load(await makePdf(["A", "B", "C"]));
  doc.insertPage(1, [300, 400]); // no content stream at all
  const src = await doc.save();
  assert.deepEqual((await texts(await resizePages(src, { paper: "a4", orientation: "auto", margin: 0 }))).map((p) => p.text), ["A", "", "B", "C"]);
  assert.deepEqual((await texts((await bookletPdf(src, { paper: "a4", rightToLeft: false })).bytes)).map((p) => p.text), ["C A", "B"]);
  assert.equal((await posterPdf(src, { cols: 2, rows: 1, paper: "a4", overlap: 0 }, [1])).sheets, 2);
  const { pagesPerSheet } = await import("../src/lib/tools/processors/pages.ts");
  assert.deepEqual((await texts(await pagesPerSheet(src, { perSheet: 2, sheet: "a4", border: true, order: "rows" }))).map((p) => p.text), ["A", "B C"]);
});

test("poster splits one page over cols × rows sheets", async () => {
  const r = await posterPdf(await makePdf(["Big"], { size: [300, 400] }), { cols: 2, rows: 2, paper: "a4", overlap: 0 });
  assert.equal(r.sheets, 4);
  const t = await texts(r.bytes);
  assert.equal(t.length, 4);
  assert.deepEqual([t[0].w, t[0].h], [595, 842]);
});

test("stamps and QR codes are drawn without disturbing the page", async () => {
  const src = await makePdf(["Invoice 42"]);
  const stamped = await stampPdf(src, { text: "paid", subtext: "12 Nov 2026", color: "#15803d", position: "top-right", scale: 0.35, rotation: -12, opacity: 0.85, margin: 24 });
  assert.match((await texts(stamped))[0].text, /Invoice 42/);
  assert.match((await texts(stamped))[0].text, /PAID/);
  await assert.rejects(() => stampPdf(src, { text: " ", subtext: "", color: "#000", position: "center", scale: 0.3, rotation: 0, opacity: 1, margin: 24 }), /stamp text/);
  const m = qrMatrix("https://fusionoffice.online/तथ्य");
  assert.equal(m.length, m[0].length);
  // Finder pattern: the top-left 7×7 has a dark border.
  assert.ok(m[0].slice(0, 7).every(Boolean) && m[6].slice(0, 7).every(Boolean));
  assert.throws(() => qrMatrix("  "), /QR code/);
  assert.throws(() => qrMatrix("x".repeat(5000)), /too much/);
  const qr = await qrStampPdf(src, { text: "upi://pay?pa=test@upi", position: "bottom-right", size: 72, margin: 18, label: "Scan to pay" }, [0]);
  assert.match((await texts(qr))[0].text, /Scan to pay/);
});

test("attachments: add, list with their bytes, remove", async () => {
  const data = new TextEncoder().encode("name,amount\nA,10\n");
  const withFile = await addAttachments(await makePdf(["Report"]), [{ name: "data.csv", bytes: data, type: "text/csv" }]);
  const found = await listAttachments(withFile);
  assert.equal(found.length, 1);
  assert.equal(found[0].name, "data.csv");
  assert.deepEqual([...found[0].bytes], [...data]);
  const viaReader = await (await open(withFile)).getAttachments();
  assert.deepEqual(Object.keys(viaReader ?? {}), ["data.csv"]);
  const cleared = await removeAttachments(withFile);
  assert.deepEqual(await listAttachments(cleared), []);
  assert.equal((await texts(cleared))[0].text, "Report");
});

test("bookmarks: parse the outline text, write it, read it back nested", async () => {
  const list = parseBookmarks("1 Introduction\n2 Chapter 1\n  3 Background\n    3 Detail\n4. Chapter 2", 4);
  assert.deepEqual(list.map((b) => [b.page, b.level, b.title]), [[1, 0, "Introduction"], [2, 0, "Chapter 1"], [3, 1, "Background"], [3, 2, "Detail"], [4, 0, "Chapter 2"]]);
  assert.equal(parseBookmarks(bookmarksToText(list), 4).length, 5);
  assert.throws(() => parseBookmarks("9 Too far", 4), /outside/);
  assert.throws(() => parseBookmarks("Chapter without page", 4), /page number/);
  // Indenting twice at once can only nest one level.
  assert.equal(parseBookmarks("1 A\n      2 B", 4)[1].level, 1);
  const out = await writeBookmarks(await makePdf(["a", "b", "c", "d"]), list);
  const doc = await open(out);
  const outline = (await doc.getOutline())!;
  assert.deepEqual(outline.map((o) => o.title), ["Introduction", "Chapter 1", "Chapter 2"]);
  assert.deepEqual(outline[1].items.map((o) => o.title), ["Background"]);
  assert.deepEqual(outline[1].items[0].items.map((o) => o.title), ["Detail"]);
  assert.equal(await doc.getPageIndex(outline[2].dest![0] as never), 3);
  const none = await writeBookmarks(out, []);
  assert.equal(await (await open(none)).getOutline(), null);
});
