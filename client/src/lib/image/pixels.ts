/**
 * Photo adjustments and filters on raw RGBA pixels. Pure (works on any
 * Uint8ClampedArray), so the editor preview and the full-size export run the
 * exact same code, and it is unit tested in Node.
 */

export interface Adjustments {
  /** All -100…100, 0 = unchanged. */
  exposure: number;
  brightness: number;
  contrast: number;
  highlights: number;
  shadows: number;
  saturation: number;
  warmth: number;
  /** 0…100 */
  vignette: number;
  sharpen: number;
  blur: number;
}

export const NO_ADJUSTMENTS: Adjustments = { exposure: 0, brightness: 0, contrast: 0, highlights: 0, shadows: 0, saturation: 0, warmth: 0, vignette: 0, sharpen: 0, blur: 0 };

/** Tone effects only filters use. */
interface Tone {
  grayscale?: number; // 0…1
  sepia?: number; // 0…1
  fade?: number; // 0…100, lifts the blacks
}

export interface FilterDef {
  id: string;
  label: string;
  adjust?: Partial<Adjustments>;
  tone?: Tone;
}

export const FILTERS: FilterDef[] = [
  { id: "none", label: "Original" },
  { id: "vivid", label: "Vivid", adjust: { saturation: 35, contrast: 15 } },
  { id: "warm", label: "Warm", adjust: { warmth: 35, saturation: 10 } },
  { id: "cool", label: "Cool", adjust: { warmth: -35, contrast: 5 } },
  { id: "bw", label: "B&W", adjust: { contrast: 15 }, tone: { grayscale: 1 } },
  { id: "noir", label: "Noir", adjust: { contrast: 45, brightness: -5, vignette: 30 }, tone: { grayscale: 1 } },
  { id: "sepia", label: "Sepia", tone: { sepia: 1 } },
  { id: "fade", label: "Fade", adjust: { contrast: -15, saturation: -20 }, tone: { fade: 25 } },
  { id: "vintage", label: "Vintage", adjust: { warmth: 15, vignette: 35 }, tone: { sepia: 0.35, fade: 18 } },
  { id: "dramatic", label: "Dramatic", adjust: { contrast: 35, saturation: -15, shadows: -15, vignette: 45 } },
];

export const filterById = (id: string) => FILTERS.find((f) => f.id === id) ?? FILTERS[0];

const clamp100 = (v: number) => Math.max(-100, Math.min(100, v));

/** User adjustments plus the chosen filter's adjustments. */
export function combine(adjust: Adjustments, filterId: string): { adjust: Adjustments; tone: Tone } {
  const f = filterById(filterId);
  const out = { ...adjust };
  for (const [k, v] of Object.entries(f.adjust ?? {}) as [keyof Adjustments, number][]) out[k] = clamp100(out[k] + v);
  return { adjust: out, tone: f.tone ?? {} };
}

export const isIdentity = (a: Adjustments, filterId: string) => filterId === "none" && Object.values(a).every((v) => v === 0);

/**
 * Apply adjustments + filter to `data` (RGBA, `width`×`height`) in place.
 * Blur and vignette are sized relative to the image, so the small preview
 * and the full-size export look the same.
 */
export function applyAdjustments(data: Uint8ClampedArray, width: number, height: number, adjust: Adjustments, filterId = "none") {
  if (isIdentity(adjust, filterId)) return;
  const { adjust: a, tone } = combine(adjust, filterId);

  if (a.blur > 0) boxBlur(data, width, height, Math.max(1, Math.round((a.blur / 100) * Math.min(width, height) * 0.02)));
  if (a.sharpen > 0) sharpen(data, width, height, a.sharpen / 100);

  // Per-channel curve: exposure → brightness → contrast (a lookup table).
  const gain = 2 ** (a.exposure / 100);
  const bright = a.brightness * 0.8;
  const k = a.contrast >= 0 ? 1 + (a.contrast / 100) * 1.5 : 1 + a.contrast / 100;
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) lut[v] = Math.round((v * gain + bright - 128) * k + 128);

  const warm = a.warmth * 0.3;
  const sat = 1 + a.saturation / 100;
  const hl = a.highlights * 0.6;
  const sh = a.shadows * 0.6;
  const gray = tone.grayscale ?? 0;
  const sepia = tone.sepia ?? 0;
  const fade = (tone.fade ?? 0) * 0.6;
  const vig = a.vignette / 100;
  const cx = width / 2;
  const cy = height / 2;
  const maxD = Math.hypot(cx, cy);

  for (let y = 0, i = 0; y < height; y++) {
    const dy = (y - cy) / maxD;
    for (let x = 0; x < width; x++, i += 4) {
      let r = lut[data[i]];
      let g = lut[data[i + 1]];
      let b = lut[data[i + 2]];
      if (warm) {
        r += warm;
        b -= warm;
      }
      if (hl || sh) {
        const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const d = l > 0.5 ? hl * (2 * l - 1) ** 2 : sh * (1 - 2 * l) ** 2;
        r += d;
        g += d;
        b += d;
      }
      if (sat !== 1) {
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = l + (r - l) * sat;
        g = l + (g - l) * sat;
        b = l + (b - l) * sat;
      }
      if (gray) {
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r += (l - r) * gray;
        g += (l - g) * gray;
        b += (l - b) * gray;
      }
      if (sepia) {
        const sr = 0.393 * r + 0.769 * g + 0.189 * b;
        const sg = 0.349 * r + 0.686 * g + 0.168 * b;
        const sb = 0.272 * r + 0.534 * g + 0.131 * b;
        r += (sr - r) * sepia;
        g += (sg - g) * sepia;
        b += (sb - b) * sepia;
      }
      if (fade) {
        r = fade + (r * (255 - fade)) / 255;
        g = fade + (g * (255 - fade)) / 255;
        b = fade + (b * (255 - fade)) / 255;
      }
      if (vig) {
        const dx = (x - cx) / maxD;
        const f = 1 - vig * Math.min(1, (dx * dx + dy * dy) * 1.6);
        r *= f;
        g *= f;
        b *= f;
      }
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }
}

/** Three passes of a separable box blur (close to a Gaussian). */
export function boxBlur(data: Uint8ClampedArray, width: number, height: number, radius: number) {
  const tmp = new Float32Array(width * height * 4);
  const buf = new Float32Array(data);
  for (let pass = 0; pass < 3; pass++) {
    blur1d(buf, tmp, width, height, radius, true);
    blur1d(tmp, buf, width, height, radius, false);
  }
  for (let i = 0; i < data.length; i++) if ((i & 3) !== 3) data[i] = buf[i];
}

function blur1d(src: Float32Array, dst: Float32Array, width: number, height: number, r: number, horizontal: boolean) {
  const lines = horizontal ? height : width;
  const len = horizontal ? width : height;
  const step = horizontal ? 4 : width * 4;
  const norm = 1 / (2 * r + 1);
  for (let line = 0; line < lines; line++) {
    const base = horizontal ? line * width * 4 : line * 4;
    for (let c = 0; c < 3; c++) {
      // Running sum with edge pixels repeated.
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += src[base + Math.min(len - 1, Math.max(0, k)) * step + c];
      for (let p = 0; p < len; p++) {
        dst[base + p * step + c] = sum * norm;
        sum += src[base + Math.min(len - 1, p + r + 1) * step + c] - src[base + Math.max(0, p - r) * step + c];
      }
    }
    for (let p = 0; p < len; p++) dst[base + p * step + 3] = src[base + p * step + 3];
  }
}

/** Unsharp mask with a 3×3 box blur. `amount` 0…1. */
export function sharpen(data: Uint8ClampedArray, width: number, height: number, amount: number) {
  const src = new Uint8ClampedArray(data);
  const k = amount * 1.5;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = Math.min(height - 1, Math.max(0, y + dy));
          for (let dx = -1; dx <= 1; dx++) sum += src[(yy * width + Math.min(width - 1, Math.max(0, x + dx))) * 4 + c];
        }
        data[i + c] = src[i + c] + (src[i + c] - sum / 9) * k;
      }
    }
  }
}
