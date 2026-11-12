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
