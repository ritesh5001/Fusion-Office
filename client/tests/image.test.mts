// Image tools: size math, pixel adjustments, "fit under N KB" search and DPI tags.
import { test } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { centeredCrop, clampRect, cropPixels, flipRect, placeImage, resizeDims, rotateRectCW, straightenScale, toPixels } from "../src/lib/image/geometry.ts";
import { applyAdjustments, boxBlur, NO_ADJUSTMENTS } from "../src/lib/image/pixels.ts";
import { crc32, encodeToTarget, outputName, parseSize, setJpegDpi, setPngDpi } from "../src/lib/image/encode.ts";

const photo = { width: 4000, height: 3000 };

test("resize by percent, pixels and print size", () => {
  assert.deepEqual(resizeDims(photo, { mode: "percent", percent: 10 }), { width: 400, height: 300 });
  assert.deepEqual(resizeDims(photo, { mode: "percent", percent: 50 }), { width: 2000, height: 1500 });
  // One side given, ratio kept.
  assert.deepEqual(resizeDims(photo, { mode: "pixels", width: 800, height: 0, keepRatio: true }), { width: 800, height: 600 });
  assert.deepEqual(resizeDims(photo, { mode: "pixels", width: 0, height: 300, keepRatio: true }), { width: 400, height: 300 });
  // Both sides with ratio kept: fits inside the box.
  assert.deepEqual(resizeDims(photo, { mode: "pixels", width: 1000, height: 1000, keepRatio: true }), { width: 1000, height: 750 });
  // Exact box.
  assert.deepEqual(resizeDims(photo, { mode: "pixels", width: 1080, height: 1080, keepRatio: false }), { width: 1080, height: 1080 });
  // Passport photo 3.5 × 4.5 cm at 300 DPI = 413 × 531 px.
  assert.deepEqual(resizeDims(photo, { mode: "print", width: 3.5, height: 4.5, unit: "cm", dpi: 300, keepRatio: false }), { width: 413, height: 531 });
  assert.equal(toPixels(2, "in", 300), 600);
  assert.equal(toPixels(25.4, "mm", 96), 96);
});

test("placeImage: fill crops the overflow, contain pads", () => {
  const fill = placeImage(photo, { width: 1000, height: 1000 }, "fill");
  assert.deepEqual([fill.sx, fill.sy, fill.sw, fill.sh], [500, 0, 3000, 3000]);
  const contain = placeImage(photo, { width: 1000, height: 1000 }, "contain");
  assert.deepEqual([contain.dx, contain.dy, contain.dw, contain.dh], [0, 125, 1000, 750]);
});

test("straightening zooms just enough to hide the corners", () => {
  assert.equal(straightenScale(photo, 0), 1);
  const s = straightenScale({ width: 100, height: 100 }, 45);
  assert.ok(Math.abs(s - Math.SQRT2) < 1e-9);
  assert.ok(straightenScale(photo, 5) > 1 && straightenScale(photo, 5) < 1.2);
});

test("crop rectangles: centered aspect crops, clamping, rotation and flips", () => {
  const sq = centeredCrop(photo, 1, 1);
  const px = cropPixels(photo, sq);
  assert.equal(px.width, px.height);
  assert.equal(px.height, 3000);
  const clamped = clampRect({ x: 0.9, y: -0.2, w: 0.5, h: 0.5 });
  assert.deepEqual(clamped, { x: 0.5, y: 0, w: 0.5, h: 0.5 });
  const r = { x: 0.1, y: 0.2, w: 0.3, h: 0.4 };
  // Four clockwise turns bring a rectangle back.
  const back = rotateRectCW(rotateRectCW(rotateRectCW(rotateRectCW(r))));
  for (const k of ["x", "y", "w", "h"] as const) assert.ok(Math.abs(back[k] - r[k]) < 1e-12);
  assert.deepEqual(rotateRectCW({ x: 0, y: 0, w: 0.5, h: 0.25 }), { x: 0.75, y: 0, w: 0.25, h: 0.5 });
  assert.ok(Math.abs(flipRect(r, true).x - 0.6) < 1e-12);
  assert.ok(Math.abs(flipRect(r, false).y - 0.4) < 1e-12);
});

const pixels = (w: number, h: number, rgb: [number, number, number]) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < d.length; i += 4) d.set([...rgb, 255], i);
  return d;
};

test("adjustments: identity, brightness, B&W filter, saturation", () => {
  const base = pixels(4, 4, [120, 80, 40]);
  const same = base.slice();
  applyAdjustments(same, 4, 4, NO_ADJUSTMENTS, "none");
  assert.deepEqual(same, base);

  const brighter = base.slice();
  applyAdjustments(brighter, 4, 4, { ...NO_ADJUSTMENTS, brightness: 50 });
  assert.ok(brighter[0] > base[0] && brighter[1] > base[1]);

  const bw = base.slice();
  applyAdjustments(bw, 4, 4, NO_ADJUSTMENTS, "bw");
  assert.equal(bw[0], bw[1]);
  assert.equal(bw[1], bw[2]);

  const gray = base.slice();
  applyAdjustments(gray, 4, 4, { ...NO_ADJUSTMENTS, saturation: -100 });
  assert.ok(Math.abs(gray[0] - gray[2]) <= 1);
  // Alpha is never touched.
  assert.equal(bw[3], 255);
});

test("blur keeps a flat colour flat and softens an edge", () => {
  const flat = pixels(8, 8, [10, 200, 90]);
  boxBlur(flat, 8, 8, 2);
  assert.deepEqual([flat[0], flat[1], flat[2]], [10, 200, 90]);

  const edge = new Uint8ClampedArray(8 * 1 * 4);
  for (let x = 0; x < 8; x++) edge.set(x < 4 ? [0, 0, 0, 255] : [255, 255, 255, 255], x * 4);
  boxBlur(edge, 8, 1, 1);
  assert.ok(edge[3 * 4] > 0 && edge[4 * 4] < 255);
});

test("fit under a target size: picks the best quality that fits", async () => {
  // Fake encoder: size grows with quality and pixel count.
  const encode = async (w: number, h: number, q: number) => new Uint8Array(Math.round(w * h * (0.05 + q * 0.5)));
  const r = await encodeToTarget({ width: 400, height: 300 }, 40_000, true, encode);
  assert.ok(r.fits);
  assert.ok(r.bytes.length <= 40_000);
  assert.equal(r.width, 400);
  assert.ok(r.quality > 0.4 && r.quality < 0.95);
  // A bit more quality would not fit.
  assert.ok((await encode(400, 300, r.quality + 0.02)).length > 40_000);
});

test("fit under a target size: shrinks dimensions when quality alone isn't enough", async () => {
  const encode = async (w: number, h: number, q: number) => new Uint8Array(Math.round(w * h * (0.05 + q * 0.5)));
  const r = await encodeToTarget({ width: 4000, height: 3000 }, 50 * 1024, true, encode);
  assert.ok(r.fits);
  assert.ok(r.bytes.length <= 50 * 1024);
  assert.ok(r.width < 4000);
  assert.ok(Math.abs(r.width / r.height - 4 / 3) < 0.01);
  // PNG (lossless) only shrinks.
  const png = await encodeToTarget({ width: 2000, height: 2000 }, 100_000, false, async (w, h) => new Uint8Array(w * h));
  assert.ok(png.fits && png.bytes.length <= 100_000);
});

test("parseSize reads KB and MB like upload forms do", () => {
  assert.equal(parseSize("50"), 50 * 1024);
  assert.equal(parseSize("50 kb"), 50 * 1024);
  assert.equal(parseSize("1.5 MB"), 1.5 * 1024 * 1024);
  assert.equal(parseSize("abc"), null);
  assert.equal(parseSize("0"), null);
  assert.equal(outputName("holiday.photo.PNG", "jpeg", "compressed"), "holiday.photo-compressed.jpg");
});

test("DPI tags: JPEG JFIF density and PNG pHYs", () => {
  // Minimal JFIF header.
  const jfif = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
  const tagged = setJpegDpi(jfif, 300);
  assert.equal(tagged[13], 1);
  assert.equal((tagged[14] << 8) | tagged[15], 300);
  // No JFIF segment: one is inserted after SOI.
  const bare = setJpegDpi(new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0, 2, 0xff, 0xd9]), 200);
  assert.deepEqual([...bare.subarray(2, 4)], [0xff, 0xe0]);
  assert.equal((bare[14] << 8) | bare[15], 200);

  // Build a valid 1×1 PNG, tag it and check the chunk and its CRC.
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length);
    const v = new DataView(out.buffer);
    v.setUint32(0, data.length);
    out.set(new TextEncoder().encode(type), 4);
    out.set(data, 8);
    v.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
  const idat = zlib.deflateSync(Buffer.from([0, 255, 0, 0]));
  const png = new Uint8Array([...[137, 80, 78, 71, 13, 10, 26, 10], ...chunk("IHDR", ihdr), ...chunk("IDAT", idat), ...chunk("IEND", new Uint8Array())]);
  const out = setPngDpi(png, 300);
  const at = 8 + 25; // right after IHDR
  assert.equal(new TextDecoder().decode(out.subarray(at + 4, at + 8)), "pHYs");
  const v = new DataView(out.buffer, out.byteOffset);
  assert.equal(v.getUint32(at + 8), Math.round(300 / 0.0254));
  assert.equal(v.getUint32(at + 17), zlib.crc32(out.subarray(at + 4, at + 17)));
  assert.equal(crc32(new TextEncoder().encode("IEND")), 0xae426082);
});
