import { test } from "node:test";
import assert from "node:assert/strict";
import ImageTracer from "imagetracerjs";
import { finishSvg, shapeCount, threshold, traceOptions } from "../src/lib/image/trace.ts";

/** A red disc on white, like a simple logo. */
function logo(size = 80) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const inside = (x - size / 2) ** 2 + (y - size / 2) ** 2 < (size / 3) ** 2;
      data.set(inside ? [220, 30, 40, 255] : [255, 255, 255, 255], i);
    }
  return { width: size, height: size, data };
}

test("a logo traces to a red shape, and the white background can be dropped", () => {
  const img = logo();
  const raw = ImageTracer.imagedataToSVG(img, traceOptions("logo", "smooth"));
  const kept = finishSvg(raw, 80, 80, false);
  const clean = finishSvg(raw, 80, 80, true);
  assert.match(kept, /^<\?xml/);
  assert.match(clean, /<svg width="80" height="80" /);
  assert.match(clean, /viewBox="0 0 80 80"/);
  assert.doesNotMatch(clean, /desc=/);
  assert.match(clean, /fill="rgb\(2[0-2]\d,\s?[23]\d,\s?[34]\d\)"/);
  assert.doesNotMatch(clean, /fill="rgb\(255,255,255\)"/);
  assert.ok(shapeCount(clean) >= 1 && shapeCount(clean) < shapeCount(kept));
});

test("line art becomes pure black and white before tracing", () => {
  const data = new Uint8ClampedArray([30, 30, 30, 255, 200, 200, 200, 255, 0, 0, 0, 0]);
  threshold(data);
  assert.deepEqual([...data], [0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255]);
});
