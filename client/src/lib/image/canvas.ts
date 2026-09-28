"use client";

/**
 * Browser side of the image tools: decode files, run the edit pipeline on
 * canvases and encode the result. Math lives in geometry.ts / pixels.ts /
 * encode.ts (pure and tested).
 */
import type { ToolFile } from "../tools/files";
import { cropPixels, flipRect, placeImage, rotateRectCW, straightenScale, turned, type Fit, type FracRect, type Size } from "./geometry";
import { applyAdjustments, isIdentity, NO_ADJUSTMENTS, type Adjustments } from "./pixels";
import { encodeToTarget, FORMAT_INFO, setDpi, type Format, type TargetResult } from "./encode";

export interface Decoded extends Size {
  source: CanvasImageSource;
  close: () => void;
}

/** Decode an image file (JPG, PNG, WEBP, GIF, BMP, AVIF, SVG; HEIC where the browser supports it). */
export async function decodeImage(file: Pick<ToolFile, "bytes" | "type" | "name">): Promise<Decoded> {
  const blob = new Blob([file.bytes as BlobPart], { type: file.type });
  try {
    const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
  } catch {
    // SVG and a few others only decode through an <img>.
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      const width = img.naturalWidth || 1024;
      const height = img.naturalHeight || 1024;
      return { source: img, width, height, close: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      const heic = /\.(heic|heif)$/i.test(file.name) || /hei[cf]/.test(file.type);
      throw new Error(
        heic
          ? `${file.name}: this browser can't open HEIC photos. Open it in Safari, or set your iPhone camera to "Most Compatible" (JPG).`
          : `${file.name} isn't an image this browser can open.`,
      );
    }
  }
}

export function newCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
}

const ctx2d = (c: HTMLCanvasElement) => c.getContext("2d", { willReadFrequently: true })!;

/**
 * Draw `source` scaled into a new canvas. Large reductions go in halving
 * steps, which keeps fine detail smooth instead of aliased.
 */
export function resample(source: CanvasImageSource, src: { sx: number; sy: number; sw: number; sh: number }, width: number, height: number): HTMLCanvasElement {
  let cur: CanvasImageSource = source;
  let { sx, sy, sw, sh } = src;
  while (sw / 2 >= width && sh / 2 >= height && sw > 2 && sh > 2) {
    const half = newCanvas(sw / 2, sh / 2);
    const c = ctx2d(half);
    c.imageSmoothingQuality = "high";
    c.drawImage(cur, sx, sy, sw, sh, 0, 0, half.width, half.height);
    cur = half;
    sx = 0;
    sy = 0;
    sw = half.width;
    sh = half.height;
  }
  const out = newCanvas(width, height);
  const c = ctx2d(out);
  c.imageSmoothingQuality = "high";
  c.drawImage(cur, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out;
}

// ─── Edit state ─────────────────────────────────────────────────────

export interface Transform {
  /** Quarter turns clockwise. */
  quarter: 0 | 1 | 2 | 3;
  flipH: boolean;
  flipV: boolean;
  /** Fine rotation in degrees, -45…45. */
  straighten: number;
  /** Crop in fractions of the rotated image; null = whole image. */
  crop: FracRect | null;
}

export const NO_TRANSFORM: Transform = { quarter: 0, flipH: false, flipV: false, straighten: 0, crop: null };

/** Turn a quarter clockwise (or counter-clockwise), carrying the crop along. */
export function rotateTransform(t: Transform, clockwise: boolean): Transform {
  let crop = t.crop;
  for (let i = 0; i < (clockwise ? 1 : 3); i++) crop = crop && rotateRectCW(crop);
  return { ...t, quarter: (((t.quarter + (clockwise ? 1 : 3)) % 4) as Transform["quarter"]), crop };
}

/** Mirror as seen on screen (after any quarter turns), carrying the crop along. */
export function flipTransform(t: Transform, horizontal: boolean): Transform {
  // Flips apply to the unrotated image, so a sideways image swaps the axes.
  const imageAxisH = t.quarter % 2 ? !horizontal : horizontal;
  return {
    ...t,
    flipH: imageAxisH ? !t.flipH : t.flipH,
    flipV: imageAxisH ? t.flipV : !t.flipV,
    // A mirrored image straightens the other way.
    straighten: -t.straighten,
    crop: t.crop && flipRect(t.crop, horizontal),
  };
}

export const FONTS = [
  { id: "sans", label: "Sans", css: "system-ui, 'Helvetica Neue', Arial, sans-serif" },
  { id: "serif", label: "Serif", css: "Georgia, 'Times New Roman', serif" },
  { id: "mono", label: "Mono", css: "ui-monospace, 'SF Mono', Menlo, 'Courier New', monospace" },
  { id: "impact", label: "Impact", css: "Impact, 'Arial Black', 'Helvetica Neue', sans-serif" },
  { id: "script", label: "Script", css: "'Brush Script MT', 'Segoe Script', 'Snell Roundhand', cursive" },
] as const;
export type FontId = (typeof FONTS)[number]["id"];

export interface TextLayer {
  id: string;
  text: string;
  /** Center of the text block, in fractions of the image. */
  x: number;
  y: number;
  /** Font size as a fraction of the image height. */
  size: number;
  color: string;
  font: FontId;
  bold: boolean;
  italic: boolean;
  align: "left" | "center" | "right";
  outline: boolean;
  shadow: boolean;
  /** Box behind the text, or null. */
  background: string | null;
}

export interface EditState {
  transform: Transform;
  adjust: Adjustments;
  filter: string;
  texts: TextLayer[];
}

export const EMPTY_EDIT: EditState = { transform: NO_TRANSFORM, adjust: NO_ADJUSTMENTS, filter: "none", texts: [] };

/**
 * The rotated / flipped / straightened image, at `scale` of its full size.
 * Straightening zooms in just enough that no empty corners show.
 */
export function orient(img: Decoded, t: Transform, scale = 1): HTMLCanvasElement {
  const out = turned({ width: img.width * scale, height: img.height * scale }, t.quarter);
  // Pre-shrink big sources for previews, so the transform below draws from a smaller bitmap.
  let source: CanvasImageSource = img.source;
  let sw = img.width;
  let sh = img.height;
  if (scale < 0.5) {
    const small = resample(img.source, { sx: 0, sy: 0, sw: img.width, sh: img.height }, img.width * scale, img.height * scale);
    source = small;
    sw = small.width;
    sh = small.height;
  }
  const canvas = newCanvas(out.width, out.height);
  if (!t.quarter && !t.flipH && !t.flipV && !t.straighten && source !== img.source) return source as HTMLCanvasElement;
  const c = ctx2d(canvas);
  c.imageSmoothingQuality = "high";
  const zoom = t.straighten ? straightenScale({ width: canvas.width, height: canvas.height }, t.straighten) : 1;
  c.translate(canvas.width / 2, canvas.height / 2);
  c.rotate(((t.quarter * 90 + t.straighten) * Math.PI) / 180);
  c.scale((t.flipH ? -1 : 1) * zoom, (t.flipV ? -1 : 1) * zoom);
  // After a quarter turn the drawn image keeps its own (unturned) size.
  const dw = img.width * scale;
  const dh = img.height * scale;
  c.drawImage(source, 0, 0, sw, sh, -dw / 2, -dh / 2, dw, dh);
  return canvas;
}

/** Crop a canvas to a fractional rectangle. */
export function crop(canvas: HTMLCanvasElement, r: FracRect | null): HTMLCanvasElement {
  if (!r || (r.x <= 0 && r.y <= 0 && r.w >= 1 && r.h >= 1)) return canvas;
  const p = cropPixels({ width: canvas.width, height: canvas.height }, r);
  const out = newCanvas(p.width, p.height);
  ctx2d(out).drawImage(canvas, p.x, p.y, p.width, p.height, 0, 0, p.width, p.height);
  return out;
}

/** Resize to exactly `size` (fill = crop overflow, contain = pad with `background`, stretch). */
export function resize(canvas: HTMLCanvasElement, size: Size, fit: Fit = "stretch", background = "#ffffff"): HTMLCanvasElement {
  if (size.width === canvas.width && size.height === canvas.height) return canvas;
  const p = placeImage({ width: canvas.width, height: canvas.height }, size, fit);
  const scaled = resample(canvas, p, p.dw, p.dh);
  if (p.dx === 0 && p.dy === 0 && scaled.width === size.width && scaled.height === size.height) return scaled;
  const out = newCanvas(size.width, size.height);
  const c = ctx2d(out);
  c.fillStyle = background;
  c.fillRect(0, 0, out.width, out.height);
  c.drawImage(scaled, Math.round(p.dx), Math.round(p.dy));
  return out;
}

/** Apply adjustments and a filter in place. */
export function adjust(canvas: HTMLCanvasElement, a: Adjustments, filter: string) {
  if (isIdentity(a, filter)) return canvas;
  const c = ctx2d(canvas);
  const data = c.getImageData(0, 0, canvas.width, canvas.height);
  applyAdjustments(data.data, canvas.width, canvas.height, a, filter);
  c.putImageData(data, 0, 0);
  return canvas;
}

export const fontCss = (t: Pick<TextLayer, "font" | "bold" | "italic">, px: number) =>
  `${t.italic ? "italic " : ""}${t.bold ? 700 : 400} ${px}px ${FONTS.find((f) => f.id === t.font)?.css ?? FONTS[0].css}`;

/** Draw text layers onto a canvas (positions and sizes are relative, so any output size works). */
export function drawTexts(canvas: HTMLCanvasElement, texts: TextLayer[]) {
  const c = ctx2d(canvas);
  const W = canvas.width;
  const H = canvas.height;
  for (const t of texts) {
    if (!t.text.trim()) continue;
    const px = Math.max(4, t.size * H);
    c.save();
    c.font = fontCss(t, px);
    c.textBaseline = "middle";
    const lines = t.text.split("\n");
    const lh = px * 1.2;
    const widths = lines.map((l) => c.measureText(l).width);
    const bw = Math.max(...widths);
    const bh = lh * lines.length;
    const cx = t.x * W;
    const top = t.y * H - bh / 2;
    const left = cx - bw / 2;
    if (t.background) {
      const pad = px * 0.3;
      c.fillStyle = t.background;
      c.globalAlpha = 0.85;
      c.beginPath();
      c.roundRect(left - pad, top - pad * 0.6, bw + pad * 2, bh + pad * 1.2, pad * 0.6);
      c.fill();
      c.globalAlpha = 1;
    }
    if (t.shadow) {
      c.shadowColor = "rgba(0,0,0,0.55)";
      c.shadowBlur = px * 0.18;
      c.shadowOffsetY = px * 0.05;
    }
    lines.forEach((line, i) => {
      const x = t.align === "left" ? left : t.align === "right" ? left + bw - widths[i] : cx - widths[i] / 2;
      const y = top + lh * (i + 0.5);
      if (t.outline) {
        c.lineWidth = Math.max(1, px * 0.12);
        c.lineJoin = "round";
        c.strokeStyle = t.color.toLowerCase() === "#000000" ? "#ffffff" : "#000000";
        c.strokeText(line, x, y);
        c.shadowColor = "transparent";
      }
      c.fillStyle = t.color;
      c.fillText(line, x, y);
    });
    c.restore();
  }
  return canvas;
}

/**
 * The whole edit at full resolution (or `maxSide` for previews):
 * orient → crop → resize → adjust → text.
 */
export function render(img: Decoded, state: EditState, opts: { size?: Size; fit?: Fit; background?: string; maxSide?: number } = {}): HTMLCanvasElement {
  const scale = opts.maxSide ? Math.min(1, opts.maxSide / Math.max(img.width, img.height)) : 1;
  let canvas = crop(orient(img, state.transform, scale), state.transform.crop);
  if (opts.size) canvas = resize(canvas, opts.size, opts.fit ?? "stretch", opts.background);
  adjust(canvas, state.adjust, state.filter);
  drawTexts(canvas, state.texts);
  return canvas;
}

/** Size of the edited image before any resize (for size fields and presets). */
export function editedSize(img: Size, t: Transform): Size {
  const s = turned(img, t.quarter);
  if (!t.crop) return s;
  const p = cropPixels(s, t.crop);
  return { width: p.width, height: p.height };
}

// ─── Encoding ───────────────────────────────────────────────────────

/** Paint transparent areas (JPG has no transparency). */
export function flatten(canvas: HTMLCanvasElement, color = "#ffffff"): HTMLCanvasElement {
  const out = newCanvas(canvas.width, canvas.height);
  const c = ctx2d(out);
  c.fillStyle = color;
  c.fillRect(0, 0, out.width, out.height);
  c.drawImage(canvas, 0, 0);
  return out;
}

export async function encodeCanvas(canvas: HTMLCanvasElement, format: Format, quality = 0.9): Promise<Uint8Array> {
  const { mime, label } = FORMAT_INFO[format];
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, mime, quality));
  if (!blob) throw new Error("The image couldn't be encoded. It may be too large for this browser.");
  // Some browsers silently fall back to PNG for formats they can't write.
  if (blob.type !== mime) throw new Error(`This browser can't save ${label} images. Choose JPG or PNG.`);
  return new Uint8Array(await blob.arrayBuffer());
}

export interface ExportOptions {
  format: Format;
  /** 0.05–1 for JPG / WEBP. */
  quality: number;
  /** Largest file size in bytes; overrides quality. */
  maxBytes?: number | null;
  /** Print resolution to record in the file. */
  dpi?: number | null;
  /** Fill for transparent areas when saving as JPG. */
  background?: string;
}

export interface Exported extends ToolFile {
  width: number;
  height: number;
  quality: number;
  fits: boolean;
}

/** Encode a finished canvas to a file, optionally searching for the best quality under `maxBytes`. */
export async function exportCanvas(canvas: HTMLCanvasElement, name: string, o: ExportOptions): Promise<Exported> {
  const info = FORMAT_INFO[o.format];
  const base = o.format === "jpeg" ? flatten(canvas, o.background) : canvas;
  let r: TargetResult;
  if (o.maxBytes) {
    const cache = new Map<string, HTMLCanvasElement>();
    r = await encodeToTarget({ width: base.width, height: base.height }, o.maxBytes, info.lossy, async (w, h, q) => {
      const key = `${w}x${h}`;
      let c = cache.get(key);
      if (!c) {
        c = w === base.width && h === base.height ? base : resample(base, { sx: 0, sy: 0, sw: base.width, sh: base.height }, w, h);
        cache.clear();
        cache.set(key, c);
      }
      return encodeCanvas(c, o.format, q);
    });
  } else {
    r = { bytes: await encodeCanvas(base, o.format, o.quality), width: base.width, height: base.height, quality: o.quality, fits: true };
  }
  const bytes = o.dpi ? setDpi(r.bytes, o.format, o.dpi) : r.bytes;
  return { name, bytes, type: info.mime, width: r.width, height: r.height, quality: r.quality, fits: r.fits };
}
