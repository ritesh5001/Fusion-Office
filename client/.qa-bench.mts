import { patchInpaint, inpaint } from "./src/lib/image/inpaint.ts";
const W = 600, H = 400;
let s = 7; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff - 0.5);
function scene() {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = (y * W + x) * 4; const n = rnd() * 14;
    const horizon = 220 + Math.sin(x / 60) * 6;
    const c = process.env.SCENE === "stripes" ? (((x + y) >> 4) % 2 ? [180, 90, 60] : [230, 200, 150]) : y < horizon ? [124 + (y / H) * 90, 183 + (y / H) * 50, 232 + (y / H) * 10] : [111 - (y - horizon) * 0.2, 143 - (y - horizon) * 0.25, 78 - (y - horizon) * 0.15];
    d[k] = c[0] + n; d[k + 1] = c[1] + n; d[k + 2] = c[2] + n; d[k + 3] = 255;
  }
  return d;
}
const clean = scene();
const mask = new Uint8Array(W * H);
for (let y = 170; y < 250; y++) for (let x = 40; x < 560; x++) mask[y * W + x] = 1;
function score(d: Uint8ClampedArray) {
  let e = 0, n = 0, mean = 0, meanC = 0, sd = 0, sdC = 0;
  for (let y = 170; y < 250; y++) for (let x = 40; x < 560; x++) {
    const k = (y * W + x) * 4; e += (Math.abs(d[k] - clean[k]) + Math.abs(d[k + 1] - clean[k + 1]) + Math.abs(d[k + 2] - clean[k + 2])) / 3; n++;
  }
  // grain: local std dev of luminance in a sky patch inside vs outside the hole
  const std = (arr: Uint8ClampedArray, y0: number) => { const v: number[] = []; for (let y = y0; y < y0 + 10; y++) for (let x = 200; x < 260; x++) { const k = (y * W + x) * 4; v.push(arr[k + 1]); } const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); };
  return `mean err ${(e / n).toFixed(2)}  grain in hole ${std(d, 185).toFixed(1)} vs clean ${std(clean, 185).toFixed(1)}`;
}
for (const [name, fn] of [
  ["smooth", (d: Uint8ClampedArray) => inpaint(d, W, H, mask, { radius: 6 })],
  ["p r3 12/5s", (d: Uint8ClampedArray) => patchInpaint(d, W, H, mask, { seed: 1, radius: 3, iterations: [12, 5], sharpFinish: true })],
  ["p r4 12/5s", (d: Uint8ClampedArray) => patchInpaint(d, W, H, mask, { seed: 1, radius: 4, iterations: [12, 5], sharpFinish: true })],
  ["p r4 12/5", (d: Uint8ClampedArray) => patchInpaint(d, W, H, mask, { seed: 1, radius: 4, iterations: [12, 5] })],
  ["p r5 12/5s", (d: Uint8ClampedArray) => patchInpaint(d, W, H, mask, { seed: 1, radius: 5, iterations: [12, 5], sharpFinish: true })],
] as const) {
  const d = clean.slice(); for (let i = 0; i < mask.length; i++) if (mask[i]) d.set([255, 255, 255, 255], i * 4);
  const t = Date.now(); fn(d); console.log(name.padEnd(7), score(d), `${Date.now() - t}ms`);
}
