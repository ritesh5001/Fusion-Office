// Browser-independent tool processors, checked with pdf.js like a real reader.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts, degrees } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { mergePdfs, splitPdf, rotatePdf, assemblePages } from "../src/lib/tools/processors/organize.ts";
import { watermarkPdf, addPageNumbers } from "../src/lib/tools/processors/stamp.ts";
import { cropPdf } from "../src/lib/tools/processors/crop.ts";
import { listFields, fillForm } from "../src/lib/tools/processors/forms.ts";
import { protectPdf, unlockPdf, isEncrypted } from "../src/lib/tools/processors/security.ts";
import { repairPdf } from "../src/lib/tools/processors/repair.ts";
import { parseRanges, selectPages } from "../src/lib/tools/files.ts";

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

async function open(bytes: Uint8Array, password?: string) {
  return pdfjs.getDocument({ data: bytes.slice(), password, verbosity: 0 }).promise;
}
async function pageTexts(bytes: Uint8Array) {
  const doc = await open(bytes);
  const out: { text: string; items: { str: string; x: number; y: number }[]; w: number; h: number; rotate: number }[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const items = tc.items
      .filter((it): it is { str: string; transform: number[] } => "str" in it && !!(it as { str: string }).str.trim())
      .map((it) => {
        const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
        return { str: it.str, x, y };
      });
    out.push({ text: items.map((i) => i.str).join(" "), items, w: vp.width, h: vp.height, rotate: page.rotate });
  }
  return out;
}

test("merge keeps file order and all pages", async () => {
  const out = await mergePdfs([await makePdf(["A1", "A2"]), await makePdf(["B1"])]);
  assert.deepEqual((await pageTexts(out)).map((p) => p.text), ["A1", "A2", "B1"]);
});

test("split produces one file per range", async () => {
  const src = await makePdf(["P1", "P2", "P3", "P4"]);
  const parts = await splitPdf(src, parseRanges("1-2, 4", 4));
  assert.equal(parts.length, 2);
  assert.deepEqual((await pageTexts(parts[0])).map((p) => p.text), ["P1", "P2"]);
  assert.deepEqual((await pageTexts(parts[1])).map((p) => p.text), ["P4"]);
  assert.deepEqual(selectPages("all", 3), [0, 1, 2]);
  assert.throws(() => parseRanges("2-9", 4), /outside/);
});

test("rotate adds to existing rotation on selected pages only", async () => {
  const out = await rotatePdf(await makePdf(["R1", "R2"], { rotate: 90 }), 90, [1]);
  assert.deepEqual((await pageTexts(out)).map((p) => p.rotate), [90, 180]);
});

test("organize assembles pages from two files with a blank page and rotation", async () => {
  const out = await assemblePages(
    [await makePdf(["X1", "X2"]), await makePdf(["Y1"])],
    [
      { kind: "page", file: 1, page: 0, rotate: 0 },
      { kind: "blank", width: 300, height: 400 },
      { kind: "page", file: 0, page: 1, rotate: 270 },
    ],
  );
  const pages = await pageTexts(out);
  assert.deepEqual(pages.map((p) => p.text), ["Y1", "", "X2"]);
  assert.equal(pages[2].rotate, 270);
});

test("watermark lands inside the visible page, even when the page is rotated", async () => {
  for (const rotate of [0, 90]) {
    const out = await watermarkPdf(
      await makePdf(["Body"], { rotate }),
      { kind: "text", text: "CONFIDENTIAL", font: "Helvetica", fontSize: 30, color: "#ff0000", opacity: 0.3, rotation: 0, position: "center", mosaic: false },
    );
    const [page] = await pageTexts(out);
    const mark = page.items.find((i) => i.str === "CONFIDENTIAL")!;
    assert.ok(mark, `watermark text missing at rotation ${rotate}`);
    // Horizontal on screen, roughly centred.
    assert.ok(mark.x > 0 && mark.x < page.w / 2, `x ${mark.x} of ${page.w}`);
    assert.ok(Math.abs(mark.y - page.h / 2) < 20, `rotation ${rotate}: y ${mark.y} vs centre ${page.h / 2}`);
  }
});

test("page numbers follow the format and sit at the bottom as displayed", async () => {
  const out = await addPageNumbers(await makePdf(["a", "b", "c"], { rotate: 90 }), {
    position: "bottom-center",
    format: "Page {n} of {total}",
    start: 1,
    fontSize: 10,
    color: "#000000",
    margin: 24,
  });
  const pages = await pageTexts(out);
  pages.forEach((p, i) => {
    const label = p.items.find((it) => it.str.startsWith("Page"))!;
    assert.equal(label.str, `Page ${i + 1} of 3`);
    assert.ok(p.h - label.y < 40, `label should be near the bottom: y=${label.y}, h=${p.h}`);
    assert.ok(Math.abs(label.x + 25 - p.w / 2) < 20, `label should be centred: x=${label.x}, w=${p.w}`);
  });
});

test("crop sets the visible area", async () => {
  const out = await cropPdf(await makePdf(["C"]), { x: 0.1, y: 0.25, w: 0.5, h: 0.5 });
  const doc = await open(out);
  const page = await doc.getPage(1);
  const [x0, y0, x1, y1] = page.view;
  assert.deepEqual([x0, y0, x1 - x0, y1 - y0].map((v) => Math.round(v)), [30, 100, 150, 200]);
});

test("forms: detect, fill and flatten", async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 300]);
  const form = doc.getForm();
  form.createTextField("name").addToPage(page, { x: 20, y: 220, width: 200, height: 24 });
  form.createCheckBox("agree").addToPage(page, { x: 20, y: 180, width: 16, height: 16 });
  const dd = form.createDropdown("country");
  dd.addOptions(["India", "Nepal"]);
  dd.addToPage(page, { x: 20, y: 130, width: 120, height: 24 });
  const bytes = await doc.save();

  const fields = await listFields(bytes);
  assert.deepEqual(fields.map((f) => `${f.kind}:${f.name}`), ["text:name", "checkbox:agree", "dropdown:country"]);
  const filled = await fillForm(bytes, { name: "Ritesh", agree: true, country: "India" }, true);
  assert.equal((await listFields(filled)).length, 0, "flattened form has no fields left");
  assert.match((await pageTexts(filled))[0].text, /Ritesh/);
  assert.match((await pageTexts(filled))[0].text, /India/);
});

test("protect needs the password; unlock removes it", async () => {
  const src = await makePdf(["Secret page"]);
  const locked = await protectPdf(src, { userPassword: "open-sesame", allowPrinting: true, allowCopying: false, allowEditing: false });
  assert.equal(await isEncrypted(locked), true);
  await assert.rejects(open(locked), (e: { name?: string }) => e.name === "PasswordException");
  assert.match((await pageTexts(await unlockPdf(locked, "open-sesame")))[0].text, /Secret page/);
  await assert.rejects(unlockPdf(locked, "wrong"), /not correct/);
  assert.equal(await isEncrypted(await unlockPdf(locked, "open-sesame")), false);
});

test("repair recovers a file with junk in front and a missing ending", async () => {
  const good = await makePdf(["Keep 1", "Keep 2"]);
  const text = new TextDecoder("latin1").decode(good);
  const cut = text.lastIndexOf("xref") > 0 ? text.lastIndexOf("xref") : text.length - 200;
  const damaged = new Uint8Array([...new TextEncoder().encode("GARBAGE-HEADER\n"), ...good.subarray(0, cut)]);
  const res = await repairPdf(damaged);
  assert.equal(res.pages, 2);
  assert.ok(res.notes.some((n) => /junk/.test(n)));
  assert.deepEqual((await pageTexts(res.bytes)).map((p) => p.text), ["Keep 1", "Keep 2"]);
});
