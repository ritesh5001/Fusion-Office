// Editing a line keeps the colour and underline of each of its letters, and
// export deletes the old underline strokes along with the old words.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, PDFName, StandardFonts, rgb } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { lineInk, projectInk, readInk, type InkSegment } from "../src/lib/pdf/ink.ts";
import { removeTextInRects } from "../src/lib/pdf/textRemoval.ts";
import { encoderFor } from "../src/lib/pdf/fontEncoder.ts";
import { fontNameStyle } from "../src/lib/pdf/fontNames.ts";

const BLUE = rgb(0, 90 / 255, 220 / 255);
const SIZE = 12;

/**
 * "Read the docs today" with "docs" as a blue underlined link, under a heading
 * with a full-width divider: the usual look of a résumé or report.
 */
async function sample() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([400, 400]);
  page.drawText("Links", { x: 50, y: 330, size: 16, font });
  page.drawLine({ start: { x: 50, y: 326 }, end: { x: 350, y: 326 }, thickness: 0.5 }); // divider, not an underline
  let x = 50;
  const put = (s: string, color = rgb(0, 0, 0)) => {
    page.drawText(s, { x, y: 300, size: SIZE, font, color });
    const from = x;
    x += font.widthOfTextAtSize(s, SIZE);
    return [from, x] as const;
  };
  put("Read the ");
  const [l0, l1] = put("docs", BLUE);
  put(" today");
  page.drawLine({ start: { x: l0, y: 298 }, end: { x: l1, y: 298 }, thickness: 0.4, color: BLUE });
  page.drawText("Next line stays", { x: 50, y: 280, size: SIZE, font });
  return doc.save();
}

async function read(bytes: Uint8Array) {
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const page = await pdf.getPage(1);
  const vp = page.getViewport({ scale: 1 });
  const ink = readInk(await page.getOperatorList(), pdfjs.OPS as unknown as Record<string, number>, (n) => page.commonObjs.get(n));
  const view = projectInk(ink, (x, y) => vp.convertToViewportPoint(x, y));
  const content = await page.getTextContent();
  const items = content.items
    .filter((i): i is { str: string; transform: number[]; width: number } & typeof i => "str" in i && !!i.str.trim())
    .map((i) => {
      const [x, y] = vp.convertToViewportPoint(i.transform[4], i.transform[5]);
      return { str: i.str, x0: x, x1: x + i.width, base: y };
    });
  /** The line at PDF height `y`, as the editor sees it. */
  const line = (y: number) => {
    const on = items.filter((i) => Math.abs(i.base - (400 - y)) < 1).sort((a, b) => a.x0 - b.x0);
    let text = "";
    const segs: InkSegment[] = on.map((i, k) => {
      // Like the editor: a gap between two items is a space.
      if (k > 0 && i.x0 - on[k - 1].x1 > SIZE * 0.18 && !text.endsWith(" ") && !i.str.startsWith(" ")) text += " ";
      const seg = { str: i.str, start: text.length, x0: i.x0, x1: i.x1 };
      text += i.str;
      return seg;
    });
    return { text, ...lineInk(view, segs, text, 400 - y, SIZE) };
  };
  return { ink, line, text: items.map((i) => i.str).join("|") };
}

/** Runs of equal look, e.g. "#000000:Read the |#005adc_:docs". */
function runs(text: string, chars: { color?: string; underline: boolean }[]) {
  const out: string[] = [];
  let prev = "";
  chars.forEach((c, i) => {
    const key = `${c.color}${c.underline ? "_" : ""}`;
    if (key !== prev) out.push(`${key}:`);
    out[out.length - 1] += text[i];
    prev = key;
  });
  return out.join("|");
}

test("each word of a line keeps its own colour and underline", async () => {
  const { line } = await read(await sample());
  const l = line(300);
  assert.equal(l.text, "Read the docs today");
  // The space before the link belongs to the black words, the one after it to the link's colour but not its underline.
  assert.equal(runs(l.text, l.chars), "#000000:Read the |#005adc_:docs|#005adc: |#000000:today");
  assert.equal(l.underlines.length, 1);
});

test("a divider under a heading is not an underline", async () => {
  const { line, ink } = await read(await sample());
  assert.equal(ink.rules.length, 2); // both strokes are seen…
  const heading = line(330);
  assert.equal(heading.text, "Links");
  assert.equal(heading.underlines.length, 0); // …but the wide one doesn't belong to the heading
  assert.ok(heading.chars.every((c) => !c.underline && c.color === "#000000"));
  assert.equal(line(280).underlines.length, 0);
});

test("removing a line deletes its underline stroke and nothing else", async () => {
  const bytes = await sample();
  const { line } = await read(bytes);
  const underline = line(300).underlines[0].userRect;

  const doc = await PDFDocument.load(bytes);
  const res = removeTextInRects(doc.getPage(0), [[45, 296, 380, 312]], [underline]);
  assert.ok(res.removed[0] > 0);
  assert.deepEqual(res.underlines, [true]);

  const after = await read(await doc.save());
  assert.ok(!after.text.includes("docs"), after.text);
  assert.ok(after.text.includes("Links") && after.text.includes("Next line stays"), after.text);
  assert.equal(after.ink.rules.length, 1); // the divider is still there
  assert.ok(after.ink.rules[0].rect[2] - after.ink.rules[0].rect[0] > 250);
});

test("an underline that isn't in the page content is reported, not guessed at", async () => {
  const doc = await PDFDocument.load(await sample());
  const res = removeTextInRects(doc.getPage(0), [[45, 296, 380, 312]], [[200, 100, 240, 100.4]]);
  assert.deepEqual(res.underlines, [false]);
  assert.equal((await read(await doc.save())).ink.rules.length, 2);
});

test("TeX font names say which face is bold, italic or typewriter", () => {
  assert.deepEqual(fontNameStyle("PRQGEY+CMR10"), { family: "Times", bold: false, italic: false });
  assert.deepEqual(fontNameStyle("BFZJJP+CMBX10"), { family: "Times", bold: true, italic: false });
  assert.deepEqual(fontNameStyle("JXJYPK+CMTI9"), { family: "Times", bold: false, italic: true });
  assert.deepEqual(fontNameStyle("CMTT10"), { family: "Courier", bold: false, italic: false });
  assert.deepEqual(fontNameStyle("CMSSBX10"), { family: "Helvetica", bold: true, italic: false });
  assert.deepEqual(fontNameStyle("Arial-BoldItalicMT"), { family: undefined, bold: true, italic: true });
});

test("a font that names a space but never draws it does not write zero-width spaces", async () => {
  // TeX fonts map a code to the space character yet give it no width: words are placed apart instead.
  const doc = await PDFDocument.create();
  const page = doc.addPage([200, 200]);
  const toUnicode = doc.context.flateStream("1 beginbfchar\n<A0> <0020>\nendbfchar\n1 beginbfrange\n<41> <5A> <0041>\nendbfrange");
  const font = doc.context.obj({
    Type: "Font",
    Subtype: "Type1",
    BaseFont: "ABCDEF+CMBX10",
    FirstChar: 65,
    LastChar: 90,
    Widths: Array.from({ length: 26 }, () => 600),
    ToUnicode: doc.context.register(toUnicode),
  });
  page.node.setFontDictionary(PDFName.of("F1"), doc.context.register(font));
  const enc = encoderFor(doc, page, "F1")!;
  assert.ok(enc);
  assert.equal(enc.bold, true);
  assert.equal(enc.code("A"), 0x41);
  assert.equal(enc.code(" "), undefined); // the caller writes the space with a standard font instead
});
