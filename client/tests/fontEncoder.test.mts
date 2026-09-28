// Edited PDF text is written back with the document's own fonts: the encoder
// turns letters into the font's codes, and refuses letters a subset lacks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  PDFHexString,
  StandardFonts,
  beginText,
  endText,
  setFontAndSize,
  setTextMatrix,
  showText,
} from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { removeTextInRects } from "../src/lib/pdf/textRemoval.ts";
import { encodeRun, encoderFor, parseToUnicode } from "../src/lib/pdf/fontEncoder.ts";

const require = createRequire(import.meta.url);
const fontFile = (name: string) => readFileSync(require.resolve(`pdfjs-dist/standard_fonts/${name}`));

async function text(bytes: Uint8Array) {
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const content = await (await pdf.getPage(1)).getTextContent();
  return content.items.map((i) => ("str" in i ? i.str : "")).join("|");
}

/** A page with an embedded (subset) regular line and a bold line, like a real document. */
async function embeddedDoc() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(fontFile("LiberationSans-Regular.ttf"), { subset: true });
  const bold = await doc.embedFont(fontFile("LiberationSans-Bold.ttf"), { subset: true });
  const page = doc.addPage([400, 400]);
  page.drawText("Hello world, meet the team", { x: 50, y: 300, size: 14, font: regular });
  page.drawText("Project Plan", { x: 50, y: 250, size: 20, font: bold });
  return PDFDocument.load(await doc.save());
}

test("parses bfchar and bfrange entries of a ToUnicode map", () => {
  const map = parseToUnicode(`
    2 beginbfchar
    <0003> <0020>
    <0010> <00660069>
    endbfchar
    1 beginbfrange
    <0024> <0026> <0041>
    endbfrange
    1 beginbfrange
    <0030> <0031> [<0078> <0079>]
    endbfrange`);
  assert.equal(map.get(" "), 3);
  assert.equal(map.get("A"), 0x24);
  assert.equal(map.get("C"), 0x26);
  assert.equal(map.get("x"), 0x30);
  assert.equal(map.get("y"), 0x31);
  assert.equal(map.has("fi"), false); // ligatures can't be typed back letter by letter
});

test("reports the fonts under removed text and reuses them, bold included", async () => {
  const doc = await embeddedDoc();
  const page = doc.getPage(0);
  const res = removeTextInRects(page, [
    [45, 295, 380, 315],
    [45, 245, 380, 272],
  ]);
  assert.ok(res.removed[0] > 0 && res.removed[1] > 0);
  const [regularName] = res.fonts![0];
  const [boldName] = res.fonts![1];
  assert.notEqual(regularName, boldName);

  const regular = encoderFor(doc, page, regularName)!;
  const bold = encoderFor(doc, page, boldName)!;
  assert.ok(regular && bold);
  assert.equal(regular.bold, false);
  assert.equal(bold.bold, true);
  assert.equal(regular.codeLength, 2);

  // Letters already in the subset can be written; others fall back.
  assert.ok(encodeRun(regular, "the meet", 14));
  assert.equal(regular.code("Z"), undefined);
  assert.equal(encodeRun(regular, "Zebra", 14), null);
  assert.ok(encodeRun(bold, "Plan", 20));
  assert.equal(encodeRun(bold, "Hello", 20), null); // "H" was never used in bold

  // New wording written with the old font reads back as that wording.
  const run = encodeRun(regular, "the team meet", 14)!;
  assert.ok(run.width > 50 && run.width < 150, `width ${run.width}`);
  page.pushOperators(beginText(), setFontAndSize(regularName, 14), setTextMatrix(1, 0, 0, 1, 50, 300), showText(PDFHexString.of(run.hex)), endText());
  const out = await text(await doc.save());
  assert.ok(out.includes("the team meet"), out);
  assert.ok(!out.includes("Hello"), out);
  assert.ok(out.includes("Project Plan") === false, out);
});

test("standard Helvetica is reused through WinAnsi", async () => {
  const src = await PDFDocument.create();
  const font = await src.embedFont(StandardFonts.HelveticaBold);
  src.addPage([300, 300]).drawText("Total: 42", { x: 20, y: 200, size: 12, font });
  const doc = await PDFDocument.load(await src.save());
  const page = doc.getPage(0);
  const res = removeTextInRects(page, [[15, 195, 200, 215]]);
  const enc = encoderFor(doc, page, res.fonts![0][0])!;
  assert.ok(enc);
  assert.equal(enc.bold, true);
  assert.equal(enc.codeLength, 1);
  // Not a subset: every WinAnsi letter works, with Helvetica-Bold's widths.
  const run = encodeRun(enc, "Grand total: €99", 12)!;
  assert.ok(run);
  // (Summed per letter: pdf-lib's widthOfTextAtSize adds kerning its drawn text doesn't use.)
  const expected = [..."Grand total: €99"].reduce((w, ch) => w + font.widthOfTextAtSize(ch, 12), 0);
  assert.ok(Math.abs(run.width - expected) < 0.01, `${run.width} vs ${expected}`);
});
