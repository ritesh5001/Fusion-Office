/**
 * Background removal for plain backgrounds (a wall, a sheet of paper, a
 * studio backdrop, a flat colour). The background is found by its colour,
 * starting from the picture's edges and spreading inwards, so areas of the
 * same colour *inside* the subject (a white shirt against a white wall is the
 * hard case) are kept as long as the subject's outline separates them.
 *
 * Pure: works on RGBA pixels, no DOM, unit tested.
 */

export interface MatteOptions {
  /** 0–100: how different from the background a pixel must be to be kept. */
  tolerance: number;
  /** Edge softness in pixels (0–4). */
  feather: number;
}

export interface Matte {
  /** One opacity value per pixel: 0 = background, 255 = subject. */
  alpha: Uint8ClampedArray;
  /** The background colour that was detected. */
  background: [number, number, number];
  /** Share of the picture removed, 0–1. */
  removed: number;
}

/** The typical colour along the picture's border (per-channel median). */
export function borderColour(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): [number, number, number] {
  const r: number[] = [];
  const g: number[] = [];
  const b: number[] = [];
  const take = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    if (rgba[i + 3] < 8) return; // already transparent
    r.push(rgba[i]);
    g.push(rgba[i + 1]);
    b.push(rgba[i + 2]);
  };
  const stepX = Math.max(1, Math.floor(width / 400));
  const stepY = Math.max(1, Math.floor(height / 400));
  for (let x = 0; x < width; x += stepX) (take(x, 0), take(x, height - 1));
  for (let y = 0; y < height; y += stepY) (take(0, y), take(width - 1, y));
  if (!r.length) return [255, 255, 255];
  const median = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1];
  return [median(r), median(g), median(b)];
}

export function removeBackground(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number, o: MatteOptions): Matte {
  const n = width * height;
  const bg = borderColour(rgba, width, height);
  const T = 12 + Math.max(0, Math.min(100, o.tolerance)) * 1.1;
  const near = T * T;
  const far = T * 1.8 * (T * 1.8);
  const step = T * 0.14 * (T * 0.14);
  const dBg = (i: number) => {
    const dr = rgba[i] - bg[0];
    const dg = rgba[i + 1] - bg[1];
    const db = rgba[i + 2] - bg[2];
    return dr * dr + dg * dg + db * db;
  };
  const dPix = (i: number, j: number) => {
    const dr = rgba[i] - rgba[j];
    const dg = rgba[i + 1] - rgba[j + 1];
    const db = rgba[i + 2] - rgba[j + 2];
    return dr * dr + dg * dg + db * db;
  };

  // 1 = background. Spread from every border pixel that looks like background.
  const mask = new Uint8Array(n);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const seed = (p: number) => {
    if (!mask[p] && (rgba[p * 4 + 3] < 8 || dBg(p * 4) <= near)) {
      mask[p] = 1;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < width; x++) (seed(x), seed((height - 1) * width + x));
  for (let y = 0; y < height; y++) (seed(y * width), seed(y * width + width - 1));
  while (head < tail) {
    const p = queue[head++];
    const x = p % width;
    const visit = (q: number) => {
      if (mask[q]) return;
      const d = dBg(q * 4);
      // Close to the background colour, or a smooth continuation of it (soft shadows, uneven light).
      if (d <= near || (d <= far && dPix(q * 4, p * 4) <= step)) {
        mask[q] = 1;
        queue[tail++] = q;
      }
    };
    if (x > 0) visit(p - 1);
    if (x < width - 1) visit(p + 1);
    if (p >= width) visit(p - width);
    if (p < n - width) visit(p + width);
  }

  // Edge pixels are a blend of subject and background: fade them by how background-like they are.
  const alpha = new Uint8ClampedArray(n);
  const lo = T * 0.55;
  const span = T * 0.9;
  for (let p = 0; p < n; p++) {
    if (mask[p]) continue;
    const x = p % width;
    const touches = (x > 0 && mask[p - 1]) || (x < width - 1 && mask[p + 1]) || (p >= width && mask[p - width]) || (p < n - width && mask[p + width]);
    alpha[p] = touches ? Math.max(0, Math.min(1, (Math.sqrt(dBg(p * 4)) - lo) / span)) * 255 : 255;
  }

  const r = Math.max(0, Math.min(4, Math.round(o.feather)));
  const out = r ? boxBlur(alpha, width, height, r) : alpha;
  // Keep what was already transparent in the source.
  for (let p = 0; p < n; p++) out[p] = Math.min(out[p], rgba[p * 4 + 3]);
  return { alpha: out, background: bg, removed: tail / n };
}

/** Separable box blur of a single channel. */
export function boxBlur(src: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
  const tmp = new Float32Array(src.length);
  const out = new Uint8ClampedArray(src.length);
  const size = radius * 2 + 1;
  for (let y = 0; y < height; y++) {
    let sum = 0;
    const row = y * width;
    for (let k = -radius; k <= radius; k++) sum += src[row + Math.max(0, Math.min(width - 1, k))];
    for (let x = 0; x < width; x++) {
      tmp[row + x] = sum / size;
      sum += src[row + Math.min(width - 1, x + radius + 1)] - src[row + Math.max(0, x - radius)];
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += tmp[Math.max(0, Math.min(height - 1, k)) * width + x];
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / size;
      sum += tmp[Math.min(height - 1, y + radius + 1) * width + x] - tmp[Math.max(0, y - radius) * width + x];
    }
  }
  return out;
}
