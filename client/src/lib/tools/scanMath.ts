/**
 * Page-image analysis for the scan clean-up tools: is a page blank, where is
 * its content, and how far is it tilted. Pure functions over 8-bit grey
 * pixels (0 = black, 255 = white), so they are unit tested without a browser.
 */

export interface Gray {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
}

/** RGBA pixels → luminance. */
export function toGray(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): Gray {
  const data = new Uint8Array(width * height);
  for (let i = 0, j = 0; i < data.length; i++, j += 4) data[i] = (rgba[j] * 299 + rgba[j + 1] * 587 + rgba[j + 2] * 114) / 1000;
  return { data, width, height };
}

/**
 * The paper's own brightness (the most common light value), so "dark" is
 * judged against grey or yellowed paper rather than pure white.
 */
export function paperLevel(g: Gray): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < g.data.length; i += 3) hist[g.data[i]]++;
  let best = 255;
  for (let v = 128; v < 256; v++) if (hist[v] > hist[best]) best = v;
  return best;
}

/** Pixels clearly darker than the paper count as ink. */
const inkThreshold = (g: Gray) => Math.max(60, paperLevel(g) - 60);

/** Share of the page (ignoring a border strip) covered by ink, 0–1. */
export function inkRatio(g: Gray, border = 0.03): number {
  const t = inkThreshold(g);
  const x0 = Math.floor(g.width * border);
  const y0 = Math.floor(g.height * border);
  const x1 = g.width - x0;
  const y1 = g.height - y0;
  let ink = 0;
  for (let y = y0; y < y1; y++) for (let x = x0, i = y * g.width + x0; x < x1; x++, i++) if (g.data[i] < t) ink++;
  return ink / Math.max(1, (x1 - x0) * (y1 - y0));
}

/** How much ink a page may carry and still count as blank, by sensitivity. */
export const BLANK_LIMIT = { strict: 0.0005, normal: 0.002, loose: 0.006 } as const;
export type BlankSensitivity = keyof typeof BLANK_LIMIT;

export const isBlankPage = (g: Gray, sensitivity: BlankSensitivity = "normal") => inkRatio(g) < BLANK_LIMIT[sensitivity];

/**
 * The box around a page's content, in fractions of the page (0–1), or null
 * for an empty page. Rows and columns with only a speck of ink are treated
 * as empty, so scanner dust doesn't stretch the box.
 */
export function contentBox(g: Gray): { x: number; y: number; w: number; h: number } | null {
  const t = inkThreshold(g);
  const cols = new Uint32Array(g.width);
  const rows = new Uint32Array(g.height);
  for (let y = 0, i = 0; y < g.height; y++) {
    for (let x = 0; x < g.width; x++, i++) {
      if (g.data[i] < t) {
        cols[x]++;
        rows[y]++;
      }
    }
  }
  const minRow = Math.max(2, Math.round(g.width * 0.002));
  const minCol = Math.max(2, Math.round(g.height * 0.002));
  let top = 0;
  while (top < g.height && rows[top] < minRow) top++;
  if (top === g.height) return null;
  let bottom = g.height - 1;
  while (bottom > top && rows[bottom] < minRow) bottom--;
  let left = 0;
  while (left < g.width && cols[left] < minCol) left++;
  if (left === g.width) return null;
  let right = g.width - 1;
  while (right > left && cols[right] < minCol) right--;
  return { x: left / g.width, y: top / g.height, w: (right - left + 1) / g.width, h: (bottom - top + 1) / g.height };
}

/**
 * Tilt of a scanned page in degrees, positive when the text runs downhill to
 * the right (the page is turned clockwise). Text lines make a sharp pattern
 * of dark and light rows only when viewed along their own direction, so the
 * angle with the most uneven row profile is the tilt.
 */
export function estimateSkew(g: Gray, maxAngle = 12): number {
  const t = inkThreshold(g);
  // Ink pixels, thinned out so big pages stay fast.
  const stride = Math.max(1, Math.round(Math.sqrt((g.width * g.height) / 250_000)));
  const xs: number[] = [];
  const ys: number[] = [];
  for (let y = 0; y < g.height; y += stride) for (let x = 0; x < g.width; x += stride) if (g.data[y * g.width + x] < t) (xs.push(x), ys.push(y));
  if (xs.length < 200) return 0;
  const bins = new Float64Array(Math.ceil((g.height + g.width) / stride) + 4);
  const score = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    const sin = Math.sin(a);
    const cos = Math.cos(a);
    bins.fill(0);
    const offset = g.width * Math.abs(sin);
    for (let i = 0; i < xs.length; i++) bins[Math.floor((ys[i] * cos - xs[i] * sin + offset) / stride)]++;
    let sum = 0;
    for (let i = 0; i < bins.length; i++) sum += bins[i] * bins[i];
    return sum;
  };
  let best = 0;
  let bestScore = -1;
  for (let d = -maxAngle; d <= maxAngle + 1e-9; d += 0.5) {
    const s = score(d);
    if (s > bestScore) (bestScore = s), (best = d);
  }
  const coarse = best;
  for (let d = coarse - 0.5; d <= coarse + 0.5 + 1e-9; d += 0.05) {
    const s = score(d);
    if (s > bestScore) (bestScore = s), (best = d);
  }
  // No real improvement over "straight" means there is nothing to fix.
  return bestScore < score(0) * 1.02 ? 0 : Math.round(best * 100) / 100;
}

/**
 * The matrix that turns a page's content by `degrees` counter-clockwise (as
 * seen on screen) around the centre of its box, for a PDF content stream.
 */
export function rotationAbout(degrees: number, box: { x: number; y: number; width: number; height: number }): [number, number, number, number, number, number] {
  const a = (degrees * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return [cos, sin, -sin, cos, cx - cx * cos + cy * sin, cy - cx * sin - cy * cos];
}

// ─── Fit a file under a size ──────────────────────────────────────

export interface RasterTry {
  dpi: number;
  quality: number;
  /** Total bytes of all page images at this setting. */
  size: number;
}

/**
 * Find the sharpest page-image setting whose total size fits `budget` bytes:
 * the highest resolution on the ladder that fits at the lowest acceptable
 * quality, then the best quality at that resolution. `measure` encodes every
 * page at a setting and returns the total size.
 */
export async function fitRaster(
  budget: number,
  measure: (dpi: number, quality: number) => Promise<number>,
  { ladder = [150, 120, 100, 85, 72, 60, 50, 40], minQuality = 0.35, maxQuality = 0.85 } = {},
): Promise<RasterTry & { fits: boolean }> {
  let last: RasterTry | null = null;
  for (const dpi of ladder) {
    const low = await measure(dpi, minQuality);
    last = { dpi, quality: minQuality, size: low };
    if (low > budget) continue;
    let best: RasterTry = last;
    const high = await measure(dpi, maxQuality);
    if (high <= budget) return { dpi, quality: maxQuality, size: high, fits: true };
    let lo = minQuality;
    let hi = maxQuality;
    for (let i = 0; i < 4; i++) {
      const q = (lo + hi) / 2;
      const size = await measure(dpi, q);
      if (size <= budget) {
        best = { dpi, quality: q, size };
        lo = q;
      } else hi = q;
    }
    return { ...best, fits: true };
  }
  return { ...last!, fits: false };
}

// ─── Scan enhancement ─────────────────────────────────────────────

/**
 * Even out the paper: estimate the background brightness around every pixel
 * (the brightest value in its neighbourhood, smoothed) and divide by it. Shadows,
 * yellowed paper and uneven phone-camera light become plain white; ink stays.
 * Works in place on RGBA pixels.
 */
export function whitenBackground(rgba: Uint8ClampedArray, width: number, height: number, block = 24) {
  const bw = Math.ceil(width / block);
  const bh = Math.ceil(height / block);
  const bg = new Float32Array(bw * bh);
  for (let by = 0; by < bh; by++)
    for (let bx = 0; bx < bw; bx++) {
      // A high percentile rather than the maximum, so one bright speck doesn't count as paper.
      const hist = new Uint32Array(256);
      let n = 0;
      for (let y = by * block; y < Math.min(height, (by + 1) * block); y += 2)
        for (let x = bx * block; x < Math.min(width, (bx + 1) * block); x += 2) {
          const i = (y * width + x) * 4;
          hist[(rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000 | 0]++;
          n++;
        }
      let acc = 0;
      let v = 255;
      for (; v > 0; v--) if ((acc += hist[v]) >= n * 0.1) break;
      bg[by * bw + bx] = Math.max(v, 40);
    }
  // A block that is mostly ink (a photo, a heading in bold) reads much darker than its paper:
  // borrow the median of its neighbours there. Ordinary blocks keep their own level, so
  // smooth shadows are followed exactly.
  const lifted = new Float32Array(bg.length);
  for (let by = 0; by < bh; by++)
    for (let bx = 0; bx < bw; bx++) {
      const own = bg[by * bw + bx];
      const near: number[] = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = by + dy;
        const xx = bx + dx;
        if ((dx || dy) && yy >= 0 && yy < bh && xx >= 0 && xx < bw) near.push(bg[yy * bw + xx]);
      }
      near.sort((p, q) => p - q);
      const median = near.length ? near[near.length >> 1] : own;
      lifted[by * bw + bx] = own < median * 0.75 ? median : own;
    }
  for (let y = 0; y < height; y++) {
    // Bilinear between block centres, so there are no visible tiles.
    const fy = Math.min(bh - 1, Math.max(0, (y + 0.5) / block - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(bh - 1, y0 + 1);
    const wy = fy - y0;
    for (let x = 0; x < width; x++) {
      const fx = Math.min(bw - 1, Math.max(0, (x + 0.5) / block - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(bw - 1, x0 + 1);
      const wx = fx - x0;
      const b = (lifted[y0 * bw + x0] * (1 - wx) + lifted[y0 * bw + x1] * wx) * (1 - wy) + (lifted[y1 * bw + x0] * (1 - wx) + lifted[y1 * bw + x1] * wx) * wy;
      const k = 255 / b;
      const i = (y * width + x) * 4;
      rgba[i] = rgba[i] * k;
      rgba[i + 1] = rgba[i + 1] * k;
      rgba[i + 2] = rgba[i + 2] * k;
    }
  }
}

/** Stretch contrast so the darkest 0.5% become black and the lightest 0.5% white. In place. */
export function autoContrast(rgba: Uint8ClampedArray, gamma = 1) {
  const hist = new Uint32Array(256);
  const n = rgba.length / 4;
  for (let i = 0; i < rgba.length; i += 4) hist[(rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000 | 0]++;
  let lo = 0;
  let hi = 255;
  for (let acc = 0; lo < 255 && (acc += hist[lo]) < n * 0.005; lo++);
  for (let acc = 0; hi > 0 && (acc += hist[hi]) < n * 0.005; hi--);
  if (hi - lo < 10) return;
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = 255 * Math.pow(Math.min(1, Math.max(0, (v - lo) / (hi - lo))), gamma);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = lut[rgba[i]];
    rgba[i + 1] = lut[rgba[i + 1]];
    rgba[i + 2] = lut[rgba[i + 2]];
  }
}

export function toGrayscale(rgba: Uint8ClampedArray) {
  for (let i = 0; i < rgba.length; i += 4) rgba[i] = rgba[i + 1] = rgba[i + 2] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
}

/**
 * Black and white with a local threshold (Bradley–Roth): a pixel is ink when
 * it's clearly darker than its surroundings, so faint text survives and
 * shadows don't turn into black blotches. In place.
 */
export function adaptiveThreshold(rgba: Uint8ClampedArray, width: number, height: number, sensitivity = 0.15) {
  const gray = new Uint8Array(width * height);
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) gray[p] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
  const sum = new Float64Array((width + 1) * (height + 1));
  for (let y = 1; y <= height; y++) {
    let row = 0;
    for (let x = 1; x <= width; x++) {
      row += gray[(y - 1) * width + (x - 1)];
      sum[y * (width + 1) + x] = sum[(y - 1) * (width + 1) + x] + row;
    }
  }
  const r = Math.max(4, Math.round(Math.min(width, height) / 32));
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(height, y + r + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(width, x + r + 1);
      const area = (x1 - x0) * (y1 - y0);
      const total = sum[y1 * (width + 1) + x1] - sum[y0 * (width + 1) + x1] - sum[y1 * (width + 1) + x0] + sum[y0 * (width + 1) + x0];
      const v = gray[y * width + x] * area < total * (1 - sensitivity) ? 0 : 255;
      const i = (y * width + x) * 4;
      rgba[i] = rgba[i + 1] = rgba[i + 2] = v;
    }
  }
}

export type EnhanceMode = "auto" | "gray" | "bw" | "contrast";

/** One scan clean-up pass over a page's pixels. In place. */
export function enhancePixels(rgba: Uint8ClampedArray, width: number, height: number, mode: EnhanceMode) {
  if (mode !== "contrast") whitenBackground(rgba, width, height, Math.max(16, Math.round(Math.min(width, height) / 40)));
  if (mode === "gray") toGrayscale(rgba);
  if (mode === "bw") return adaptiveThreshold(rgba, width, height);
  autoContrast(rgba, mode === "contrast" ? 1 : 1.15);
}

// ─── Splitting at separator pages ─────────────────────────────────

/** Page groups from a list of separator pages; separators are dropped unless `keep`, in which case each starts a group. */
export function groupsBySeparators(pageCount: number, separators: number[], keep: boolean): number[][] {
  const sep = new Set(separators);
  const groups: number[][] = [];
  let cur: number[] = [];
  for (let i = 0; i < pageCount; i++) {
    if (sep.has(i)) {
      if (cur.length) groups.push(cur);
      cur = keep ? [i] : [];
    } else cur.push(i);
  }
  if (cur.length) groups.push(cur);
  return groups;
}

/** A file name from a QR code's text (an invoice number, a URL's last part). */
export function nameFromCode(text: string, fallback: string) {
  const last = text.trim().replace(/\/+$/, "").split(/[/?#=]/).filter(Boolean).pop() ?? "";
  const clean = (last.length >= 3 ? last : text).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 80);
  return clean || fallback;
}

// ─── TIFF ─────────────────────────────────────────────────────────

export interface TiffPage {
  width: number;
  height: number;
  /** RGB (3 bytes a pixel) or grey (1 byte a pixel), rows top to bottom. */
  pixels: Uint8Array;
  channels: 1 | 3;
  dpi: number;
}

/**
 * A baseline TIFF with one image per page (little-endian, one strip each).
 * `compress` deflates each strip (TIFF compression 8, read by Windows,
 * macOS Preview, Photoshop and libtiff); pass the zlib function to use it.
 */
export function encodeTiff(pages: TiffPage[], compress?: (data: Uint8Array) => Uint8Array): Uint8Array {
  const strips = pages.map((p) => (compress ? compress(p.pixels) : p.pixels));
  const ENTRIES = 13;
  const ifdSize = 2 + ENTRIES * 12 + 4;
  const extra = 6 + 8 + 8; // bits-per-sample values (3 shorts) + two resolution rationals
  let offset = 8;
  const ifdAt: number[] = [];
  const extraAt: number[] = [];
  const dataAt: number[] = [];
  for (let k = 0; k < pages.length; k++) {
    ifdAt.push(offset);
    offset += ifdSize;
    extraAt.push(offset);
    offset += extra;
    dataAt.push(offset);
    offset += strips[k].length;
    offset += offset & 1; // keep the next IFD on a word boundary
  }
  const out = new Uint8Array(offset);
  const v = new DataView(out.buffer);
  out.set([0x49, 0x49], 0);
  v.setUint16(2, 42, true);
  v.setUint32(4, 8, true);
  pages.forEach((p, k) => {
    let at = ifdAt[k];
    v.setUint16(at, ENTRIES, true);
    at += 2;
    const entry = (tag: number, type: number, count: number, value: number) => {
      v.setUint16(at, tag, true);
      v.setUint16(at + 2, type, true);
      v.setUint32(at + 4, count, true);
      if (type === 3 && count === 1) v.setUint16(at + 8, value, true);
      else v.setUint32(at + 8, value, true);
      at += 12;
    };
    const rgb = p.channels === 3;
    const x = extraAt[k];
    v.setUint16(x, 8, true);
    v.setUint16(x + 2, 8, true);
    v.setUint16(x + 4, 8, true);
    v.setUint32(x + 6, Math.round(p.dpi), true);
    v.setUint32(x + 10, 1, true);
    v.setUint32(x + 14, Math.round(p.dpi), true);
    v.setUint32(x + 18, 1, true);
    entry(254, 4, 1, 0); // NewSubfileType: full image
    entry(256, 4, 1, p.width);
    entry(257, 4, 1, p.height);
    entry(258, 3, rgb ? 3 : 1, rgb ? x : 8);
    entry(259, 3, 1, compress ? 8 : 1);
    entry(262, 3, 1, rgb ? 2 : 1);
    entry(273, 4, 1, dataAt[k]);
    entry(277, 3, 1, p.channels);
    entry(278, 4, 1, p.height);
    entry(279, 4, 1, strips[k].length);
    entry(282, 5, 1, x + 6);
    entry(283, 5, 1, x + 14);
    entry(296, 3, 1, 2); // inches
    v.setUint32(at, k + 1 < pages.length ? ifdAt[k + 1] : 0, true);
    out.set(strips[k], dataAt[k]);
  });
  return out;
}
