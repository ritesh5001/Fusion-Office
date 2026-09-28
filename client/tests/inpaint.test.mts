// Image watermark removal: inpainting fills holes from their surroundings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dilate, inpaint, maskCount, refineByColor } from "../src/lib/image/inpaint.ts";

function image(w: number, h: number, fn: (x: number, y: number) => [number, number, number]) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fn(x, y);
      d.set([r, g, b, 255], (y * w + x) * 4);
    }
  return d;
}

test("a flat colour is restored exactly", () => {
  const w = 40;
  const h = 30;
  const d = image(w, h, () => [30, 120, 200]);
  const mask = new Uint8Array(w * h);
  for (let y = 10; y < 20; y++) for (let x = 12; x < 28; x++) {
    mask[y * w + x] = 1;
    d.set([255, 255, 255, 255], (y * w + x) * 4); // the "watermark"
  }
  const n = inpaint(d, w, h, mask);
  assert.equal(n, 160);
  for (let i = 0; i < w * h; i++) assert.deepEqual([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]], [30, 120, 200]);
});

test("a smooth gradient is continued through the hole", () => {
  const w = 100;
  const h = 60;
  const truth = (x: number, y: number): [number, number, number] => [x * 2, 60 + y * 2, 255 - x];
  const d = image(w, h, truth);
  const mask = new Uint8Array(w * h);
  for (let y = 22; y < 38; y++) for (let x = 40; x < 60; x++) {
    mask[y * w + x] = 1;
    d.set([0, 0, 0, 255], (y * w + x) * 4);
  }
  inpaint(d, w, h, mask, { radius: 6 });
  let err = 0;
  let cnt = 0;
  for (let y = 22; y < 38; y++)
    for (let x = 40; x < 60; x++) {
      const t = truth(x, y);
      for (let c = 0; c < 3; c++) err += Math.abs(d[(y * w + x) * 4 + c] - t[c]);
      cnt += 3;
    }
  assert.ok(err / cnt < 6, `mean error ${(err / cnt).toFixed(2)}`);
});

test("thin text strokes picked by colour vanish from a textured background", () => {
  const w = 120;
  const h = 60;
  // Checker-ish texture with a thin grey "WATERMARK" line pattern on top.
  const bg = (x: number, y: number): [number, number, number] => (((x >> 2) + (y >> 2)) % 2 ? [200, 170, 120] : [190, 160, 110]);
  const d = image(w, h, bg);
  const painted = new Uint8Array(w * h);
  for (let y = 20; y < 40; y++) for (let x = 10; x < 110; x++) painted[y * w + x] = 1; // rough brush over the area
  for (let x = 10; x < 110; x++) if (x % 6 < 2) for (let y = 24; y < 36; y++) d.set([128, 128, 128, 255], (y * w + x) * 4); // strokes
  const mask = refineByColor(d, w, h, painted, [128, 128, 128], 12, 0);
  // Only the stroke pixels are selected, not the whole painted box.
  assert.equal(maskCount(mask), 34 * 12);
  inpaint(d, w, h, mask, { radius: 3 });
  for (let x = 10; x < 110; x++)
    for (let y = 24; y < 36; y++) {
      const k = (y * w + x) * 4;
      assert.ok(d[k] > 175 && d[k + 2] > 95, `pixel ${x},${y} still grey: ${d[k]},${d[k + 1]},${d[k + 2]}`);
    }
});

test("dilate grows a mask and grain stays within range", () => {
  const w = 10;
  const h = 10;
  const m = new Uint8Array(w * h);
  m[55] = 1;
  assert.equal(maskCount(dilate(m, w, h, 1)), 9);
  assert.equal(maskCount(dilate(m, w, h, 2)), 25);
  const d = image(w, h, (x) => [x * 20, x * 20, x * 20]);
  inpaint(d, w, h, dilate(m, w, h, 1), { grain: 1, seed: 7 });
  for (let i = 0; i < d.length; i++) assert.ok(d[i] >= 0 && d[i] <= 255);
});

test("patch fill keeps a sharp edge straight across a big hole", async () => {
  const { patchInpaint } = await import("../src/lib/image/inpaint.ts");
  const w = 160;
  const h = 100;
  let s = 1;
  const noise = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5) * 16;
  const make = () => image(w, h, (_x, y) => (y < 50 ? [90 + noise(), 150 + noise(), 230 + noise()] : [70 + noise(), 130 + noise(), 50 + noise()]));
  const d = make();
  const mask = new Uint8Array(w * h);
  for (let y = 25; y < 75; y++) for (let x = 55; x < 105; x++) {
    mask[y * w + x] = 1;
    d.set([255, 255, 255, 255], (y * w + x) * 4);
  }
  const t0 = Date.now();
  patchInpaint(d, w, h, mask, { seed: 3 });
  const ms = Date.now() - t0;
  let wrong = 0;
  for (let y = 25; y < 75; y++)
    for (let x = 55; x < 105; x++) {
      if (Math.abs(y - 49.5) < 3) continue; // right at the edge
      const k = (y * w + x) * 4;
      const sky = d[k + 2] > d[k + 1];
      if (sky !== y < 50) wrong++;
    }
  assert.ok(wrong < 50, `${wrong} pixels on the wrong side of the edge`);
  assert.ok(ms < 5000, `took ${ms}ms`);
});
