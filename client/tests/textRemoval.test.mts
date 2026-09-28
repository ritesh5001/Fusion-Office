// Glyph-level text removal: removed text is gone from the file, everything
// else stays byte-for-byte in the same place.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, PDFName, StandardFonts } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { removeTextInRects, parseContent, type UserRect } from "../src/lib/pdf/textRemoval.ts";

async function items(bytes: Uint8Array) {
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  return content.items
    .filter((i): i is { str: string; transform: number[] } => "str" in i && !!(i as { str: string }).str.trim())
    .map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5] }));
}

async function makeDoc(draw: (p: import("pdf-lib").PDFPage, f: import("pdf-lib").PDFFont) => void) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([400, 400]);
  draw(page, font);
  return { bytes: await doc.save(), font };
}

test("removes a whole line and keeps its neighbour", async () => {
  const { bytes, font } = await makeDoc((p, f) => {
    p.drawText("Hello World", { x: 50, y: 300, size: 20, font: f });
    p.drawText("Keep me", { x: 50, y: 250, size: 20, font: f });
  });
  const doc = await PDFDocument.load(bytes);
  const w = font.widthOfTextAtSize("Hello World", 20);
  const res = removeTextInRects(doc.getPage(0), [[48, 295, 52 + w, 318]]);
  assert.equal(res.removed[0], 11); // every glyph including the space
  const text = (await items(await doc.save())).map((i) => i.str).join("|");
  assert.ok(!text.includes("Hello"), text);
  assert.ok(text.includes("Keep me"), text);
});

test("removes a word mid-line without moving the words after it", async () => {
  const size = 18;
  const { bytes, font } = await makeDoc((p, f) => p.drawText("AAA BBB CCC", { x: 40, y: 200, size, font: f }));
  const before = font.widthOfTextAtSize("AAA ", size);
  const bbb = font.widthOfTextAtSize("BBB", size);
  const doc = await PDFDocument.load(bytes);
  const rect: UserRect = [40 + before - 1, 195, 40 + before + bbb + 1, 215];
  const res = removeTextInRects(doc.getPage(0), [rect]);
  assert.equal(res.removed[0], 3);
  const after = await items(await doc.save());
  const joined = after.map((i) => i.str).join("");
  assert.ok(!joined.includes("BBB"), joined);
  assert.ok(joined.includes("AAA"), joined);
  const ccc = after.find((i) => i.str.includes("CCC"))!;
  const expectedX = 40 + font.widthOfTextAtSize("AAA BBB ", size);
  // pdf.js reports the item start; CCC may be its own item or trail spaces.
  const cccX = ccc.str.startsWith("CCC") ? ccc.x : ccc.x + font.widthOfTextAtSize(ccc.str.slice(0, ccc.str.indexOf("CCC")), size);
  assert.ok(Math.abs(cccX - expectedX) < 0.05, `CCC moved: ${cccX} vs ${expectedX}`);
});

test("second pass finds nothing left to remove (rewritten stream is valid)", async () => {
  const { bytes, font } = await makeDoc((p, f) => p.drawText("Remove this", { x: 10, y: 100, size: 12, font: f }));
  const doc = await PDFDocument.load(bytes);
  const rect: UserRect = [8, 95, 14 + font.widthOfTextAtSize("Remove this", 12), 112];
  removeTextInRects(doc.getPage(0), [rect]);
  const again = await PDFDocument.load(await doc.save());
  const res = removeTextInRects(again.getPage(0), [rect]);
  assert.equal(res.removed[0], 0);
  assert.equal(res.unsafe[0], false);
});

test("handles composite (Type0 / Identity-H) fonts with 2-byte codes", async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 200]);
  const ctx = doc.context;
  const cid = ctx.obj({ Type: "Font", Subtype: "CIDFontType2", BaseFont: "Fake", W: [1, [500, 600, 700]], DW: 1000 });
  const font = ctx.obj({ Type: "Font", Subtype: "Type0", BaseFont: "Fake", Encoding: "Identity-H", DescendantFonts: [ctx.register(cid)] });
  page.node.setFontDictionary(PDFName.of("F9"), ctx.register(font));
  // Glyphs 1,2,3 at size 10: widths 5, 6, 7 → positions 20, 25, 31.
  const content = new TextEncoder().encode("BT /F9 10 Tf 20 100 Td <000100020003> Tj ET");
  page.node.set(PDFName.of("Contents"), ctx.register(ctx.flateStream(content)));
  const saved = await PDFDocument.load(await doc.save());
  // Remove only the middle glyph (x 25..31).
  const res = removeTextInRects(saved.getPage(0), [[25.5, 95, 30.5, 110]]);
  assert.equal(res.removed[0], 1);
  const out = await PDFDocument.load(await saved.save());
  const raw = out.getPage(0).node.Contents();
  assert.ok(raw);
  const { decodePDFRawStream, PDFRawStream } = await import("pdf-lib");
  const bytes = decodePDFRawStream(raw as InstanceType<typeof PDFRawStream>).decode();
  const tj = parseContent(bytes).find((o) => o.op === "TJ")!;
  const arr = tj.args[0] as (Uint8Array | number)[];
  // [<0001> -600 <0003>]: glyph 2 replaced by its exact advance.
  assert.deepEqual(Array.from(arr[0] as Uint8Array), [0, 1]);
  assert.equal(arr[1], -600);
  assert.deepEqual(Array.from(arr[2] as Uint8Array), [0, 3]);
});

test("reports text it cannot measure as unsafe instead of guessing", async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([200, 200]);
  const ctx = doc.context;
  const t3 = ctx.obj({ Type: "Font", Subtype: "Type3" });
  page.node.setFontDictionary(PDFName.of("T3"), ctx.register(t3));
  page.node.set(PDFName.of("Contents"), ctx.register(ctx.flateStream(new TextEncoder().encode("BT /T3 12 Tf 50 50 Td (abc) Tj ET"))));
  const res = removeTextInRects(doc.getPage(0), [[45, 45, 90, 70]]);
  assert.deepEqual(res, { removed: [0], unsafe: [true], fonts: [[]] });
});
