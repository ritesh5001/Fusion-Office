/** Size and placement math for the image tools. Pure: no DOM, unit tested. */

export type Unit = "px" | "cm" | "mm" | "in";

export interface Size {
  width: number;
  height: number;
}

/** Rectangle in fractions (0–1) of an image. */
export interface FracRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PER_INCH: Record<Exclude<Unit, "px">, number> = { in: 1, cm: 2.54, mm: 25.4 };

/** A length in `unit` → pixels at `dpi`. */
export function toPixels(value: number, unit: Unit, dpi: number): number {
  return unit === "px" ? Math.round(value) : Math.round((value / PER_INCH[unit]) * dpi);
}

/** Pixels → a length in `unit` at `dpi` (for showing the current print size). */
export function fromPixels(px: number, unit: Unit, dpi: number): number {
  return unit === "px" ? px : (px / dpi) * PER_INCH[unit];
}

export type Fit = "fill" | "contain" | "stretch";

/**
 * Where to draw a `src`-sized image inside a `dst` box.
 * fill: cover the box and crop the overflow (centered) · contain: fit inside, pad the rest · stretch: distort.
 * Returns the source rectangle to read and the destination rectangle to draw into.
 */
export function placeImage(src: Size, dst: Size, fit: Fit) {
  if (fit === "stretch") return { sx: 0, sy: 0, sw: src.width, sh: src.height, dx: 0, dy: 0, dw: dst.width, dh: dst.height };
  const srcRatio = src.width / src.height;
  const dstRatio = dst.width / dst.height;
  if (fit === "fill") {
    // Read the largest centered part of the source with the box's aspect ratio.
    const sw = srcRatio > dstRatio ? src.height * dstRatio : src.width;
    const sh = srcRatio > dstRatio ? src.height : src.width / dstRatio;
    return { sx: (src.width - sw) / 2, sy: (src.height - sh) / 2, sw, sh, dx: 0, dy: 0, dw: dst.width, dh: dst.height };
  }
  const scale = Math.min(dst.width / src.width, dst.height / src.height);
  const dw = src.width * scale;
  const dh = src.height * scale;
  return { sx: 0, sy: 0, sw: src.width, sh: src.height, dx: (dst.width - dw) / 2, dy: (dst.height - dh) / 2, dw, dh };
}

export type ResizeSpec =
  | { mode: "percent"; percent: number }
  | { mode: "pixels"; width: number; height: number; keepRatio: boolean }
  | { mode: "print"; width: number; height: number; unit: Exclude<Unit, "px">; dpi: number; keepRatio: boolean };

const MAX_SIDE = 16_384;

/** Output size for a resize request. With keepRatio, a 0/empty side is derived from the other. */
export function resizeDims(src: Size, spec: ResizeSpec): Size {
  const clamp = (n: number) => Math.min(MAX_SIDE, Math.max(1, Math.round(n)));
  if (spec.mode === "percent") {
    const f = spec.percent / 100;
    return { width: clamp(src.width * f), height: clamp(src.height * f) };
  }
  const w = spec.mode === "pixels" ? spec.width : spec.width ? toPixels(spec.width, spec.unit, spec.dpi) : 0;
  const h = spec.mode === "pixels" ? spec.height : spec.height ? toPixels(spec.height, spec.unit, spec.dpi) : 0;
  if (!w && !h) return { width: src.width, height: src.height };
  if (spec.keepRatio || !w || !h) {
    // Fit inside the given box without distorting.
    const scale = w && h ? Math.min(w / src.width, h / src.height) : w ? w / src.width : h / src.height;
    return { width: clamp(src.width * scale), height: clamp(src.height * scale) };
  }
  return { width: clamp(w), height: clamp(h) };
}

/**
 * Straightening rotates the picture by a small angle inside its own frame.
 * This is the zoom needed so the rotated picture still covers the whole frame
 * (no empty corners).
 */
export function straightenScale(size: Size, degrees: number): number {
  const t = (Math.abs(degrees) * Math.PI) / 180;
  const { width: w, height: h } = size;
  return Math.max((w * Math.cos(t) + h * Math.sin(t)) / w, (w * Math.sin(t) + h * Math.cos(t)) / h);
}

/** Size after a quarter-turn rotation. */
export const turned = (size: Size, quarterTurns: number): Size =>
  quarterTurns % 2 ? { width: size.height, height: size.width } : size;

/**
 * The largest centered crop with aspect `ratio` (width / height) inside an
 * image of `size`, in fractions of the image.
 */
export function centeredCrop(size: Size, ratio: number, fill = 0.9): FracRect {
  const imgRatio = size.width / size.height;
  let w = fill;
  let h = fill;
  if (ratio > imgRatio) h = (fill * imgRatio) / ratio;
  else w = (fill * ratio) / imgRatio;
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

/** Clamp a crop rectangle so it stays inside the image and keeps a minimum size. */
export function clampRect(r: FracRect, min = 0.02): FracRect {
  const w = Math.min(1, Math.max(min, r.w));
  const h = Math.min(1, Math.max(min, r.h));
  return { x: Math.min(Math.max(0, r.x), 1 - w), y: Math.min(Math.max(0, r.y), 1 - h), w, h };
}

/** A crop rectangle after the image turns 90° clockwise. */
export const rotateRectCW = (r: FracRect): FracRect => ({ x: 1 - (r.y + r.h), y: r.x, w: r.h, h: r.w });

/** A crop rectangle after the image is mirrored left–right (or top–bottom). */
export const flipRect = (r: FracRect, horizontal: boolean): FracRect =>
  horizontal ? { ...r, x: 1 - r.x - r.w } : { ...r, y: 1 - r.y - r.h };

/** Pixel rectangle for a fractional crop of an image. */
export function cropPixels(size: Size, r: FracRect) {
  const x = Math.round(r.x * size.width);
  const y = Math.round(r.y * size.height);
  return { x, y, width: Math.max(1, Math.round((r.x + r.w) * size.width) - x), height: Math.max(1, Math.round((r.y + r.h) * size.height) - y) };
}
