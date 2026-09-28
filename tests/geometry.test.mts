// Verifies the editor's view-space → PDF user-space mapping against pdf.js's
// own viewport math, for every page rotation and a non-zero page origin.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, degrees } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { viewToUserMatrix, applyMatrix, wrapText } from "../src/lib/pdf/geometry.ts";

for (const rot of [0, 90, 180, 270]) {
  test(`view→user matrix matches pdf.js at rotation ${rot}`, async () => {
    const d = await PDFDocument.create();
    const p = d.addPage([400, 600]);
    p.setMediaBox(10, 20, 300, 500);
    p.setRotation(degrees(rot));
    const pdf = await pdfjs.getDocument({ data: await d.save() }).promise;
    const pg = await pdf.getPage(1);
    const vp = pg.getViewport({ scale: 1, rotation: pg.rotate });
    const [x0, y0, x1, y1] = pg.view;
    const m = viewToUserMatrix(rot, { x: x0, y: y0, width: x1 - x0, height: y1 - y0 });
    for (const [vx, vy] of [[0, 0], [50, 80], [vp.width, vp.height], [vp.width, 0]]) {
      const [ex, ey] = vp.convertToPdfPoint(vx, vy);
      const [ax, ay] = applyMatrix(m, vx, vp.height - vy);
      assert.ok(Math.abs(ex - ax) < 1e-6 && Math.abs(ey - ay) < 1e-6, `(${vx},${vy}) expected ${ex},${ey} got ${ax},${ay}`);
    }
  });
}

test("wrapText wraps words and breaks long words", () => {
  const measure = (s: string) => s.length * 10;
  assert.deepEqual(wrapText("hello world foo", 100, measure), ["hello", "world foo"]);
  assert.deepEqual(wrapText("abcdefghijkl", 50, measure), ["abcde", "fghij", "kl"]);
  assert.deepEqual(wrapText("a\nb", 100, measure), ["a", "b"]);
});
