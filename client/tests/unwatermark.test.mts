// Watermark removal: finds watermark-like objects and removes them from the file.
import { test } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { PDFDocument, PDFName, StandardFonts, degrees, rgb } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { watermarkPdf } from "../src/lib/tools/processors/stamp.ts";
import { analyzeWatermarks, removeWatermarks } from "../src/lib/tools/processors/unwatermark.ts";

async function texts(bytes: Uint8Array): Promise<string[]> {
  const doc = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    out.push(tc.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  return out;
}

/** Operators the page actually draws (to prove removal, not just invisibility). */
async function opCount(bytes: Uint8Array, page = 1) {
  const doc = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const list = await (await doc.getPage(page)).getOperatorList();
  return list.fnArray.length;
}

async function body(pages = 3) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const p = doc.addPage([400, 500]);
    p.drawText(`Invoice page ${i + 1}`, { x: 40, y: 440, size: 16, font });
    p.drawText("Total due: 42,000", { x: 40, y: 400, size: 12, font });
  }
  return { doc, font };
}

function png(): Uint8Array {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(zlib.crc32(td));
    return Buffer.concat([len, td, c]);
  };
  // 1×1 RGBA (has transparency → SMask)
  return new Uint8Array(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0])), chunk("IDAT", zlib.deflateSync(Buffer.from([0, 255, 0, 0, 128]))), chunk("IEND", Buffer.alloc(0))]));
}

test("a watermark added by the Watermark tool is found as a tagged watermark and removed", async () => {
  const { doc } = await body();
  const marked = await watermarkPdf(await doc.save(), { kind: "text", text: "CONFIDENTIAL", font: "Helvetica", fontSize: 48, color: "#999999", opacity: 0.3, rotation: 45, position: "center", mosaic: false });
  assert.ok((await texts(marked)).every((t) => t.includes("CONFIDENTIAL")));
  const a = await analyzeWatermarks(marked);
  const tagged = a.candidates.find((c) => c.kind === "artifact");
  assert.ok(tagged, "tagged watermark found");
  assert.equal(tagged.pages.length, 3);
  assert.ok(tagged.likely);
  const { bytes, removed } = await removeWatermarks(marked, a, { ids: [tagged.id] });
  assert.equal(removed, 3);
  const after = await texts(bytes);
  assert.ok(after.every((t) => !t.includes("CONFIDENTIAL")), "watermark text gone");
  assert.ok(after.every((t) => t.includes("Total due: 42,000")), "body text kept");
});

test("untagged rotated, see-through text is detected by how it's drawn and removed", async () => {
  const { doc, font } = await body();
  for (const p of doc.getPages()) p.drawText("DRAFT", { x: 90, y: 150, size: 60, font, color: rgb(0.7, 0.7, 0.7), rotate: degrees(40), opacity: 0.4 });
  const bytes = await doc.save();
  const a = await analyzeWatermarks(bytes);
  const draft = a.candidates.find((c) => c.kind === "text" && c.label.includes("DRAFT"));
  assert.ok(draft, `DRAFT found among ${a.candidates.map((c) => c.label).join(", ")}`);
  assert.ok(draft.likely);
  assert.match(draft.reason, /rotated/);
  assert.equal(draft.pages.length, 3);
  assert.ok(draft.preview && draft.preview.box[2] > draft.preview.box[0]);
  // Body text isn't a candidate.
  assert.ok(!a.candidates.some((c) => c.label.includes("Invoice") || c.label.includes("Total")));
  const before = await opCount(bytes);
  const out = await removeWatermarks(bytes, a, { ids: [draft.id] });
  const after = await texts(out.bytes);
  assert.ok(after.every((t) => !t.includes("DRAFT") && t.includes("Invoice page")));
  assert.ok((await opCount(out.bytes)) < before, "the drawing operations were deleted");
});

test("a see-through logo on every page is found as a repeated picture and removed", async () => {
  const { doc } = await body(4);
  const img = await doc.embedPng(png());
  for (const p of doc.getPages()) p.drawImage(img, { x: 100, y: 150, width: 200, height: 200, opacity: 0.25 });
  const bytes = await doc.save();
  const a = await analyzeWatermarks(bytes);
  const logo = a.candidates.find((c) => c.kind === "xobject");
  assert.ok(logo, "repeated picture found");
  assert.equal(logo.pages.length, 4);
  assert.ok(logo.likely);
  assert.deepEqual(logo.preview?.box.map(Math.round), [100, 150, 300, 350]);
  const out = await removeWatermarks(bytes, a, { ids: [logo.id] });
  const reread = await PDFDocument.load(out.bytes);
  // The picture is no longer drawn (it may stay in resources, unused).
  const raw = new TextDecoder().decode(zlib.inflateSync(Buffer.from((reread.getPage(0).node.Contents() as unknown as { contents: Uint8Array }).contents ?? [])));
  assert.doesNotMatch(raw, / Do\b/);
});

test("watermark annotations and typed text are removed; stamps only when chosen", async () => {
  const { doc } = await body(2);
  for (const p of doc.getPages()) {
    const wm = doc.context.obj({ Type: "Annot", Subtype: "Watermark", Rect: [50, 50, 350, 450] });
    const stamp = doc.context.obj({ Type: "Annot", Subtype: "Stamp", Rect: [300, 20, 380, 60], Name: "Approved" });
    p.node.set(PDFName.of("Annots"), doc.context.obj([doc.context.register(wm), doc.context.register(stamp)]));
  }
  const bytes = await doc.save();
  const a = await analyzeWatermarks(bytes);
  const wm = a.candidates.find((c) => c.kind === "annotation")!;
  const st = a.candidates.find((c) => c.kind === "stamp")!;
  assert.ok(wm.likely);
  assert.ok(!st.likely, "stamps aren't pre-ticked");
  // Typed text: remove "42,000" on page 1 using its box.
  const box: [number, number, number, number] = [95, 395, 150, 415];
  const out = await removeWatermarks(bytes, a, { ids: [wm.id], textBoxes: [[box], []] });
  const reread = await PDFDocument.load(out.bytes);
  const subtypes = reread.getPage(0).node.Annots()!.asArray().map((r) => (reread.context.lookup(r) as unknown as { get: (n: PDFName) => { decodeText: () => string } }).get(PDFName.of("Subtype")).decodeText());
  assert.deepEqual(subtypes, ["Stamp"]);
  const t = await texts(out.bytes);
  assert.ok(!t[0].includes("42,000") && t[0].includes("Total due"));
  assert.ok(t[1].includes("42,000"));
});
