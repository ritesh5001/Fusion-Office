import { ImageManipulator, SaveFormat, type ImageRef } from "expo-image-manipulator";
import { File } from "expo-file-system";
import { fromPixels, placeImage, resizeDims, toPixels, type ResizeSpec, type Size } from "@shared-image/geometry";
import { FORMAT_INFO, encodeToTarget, formatFor, outputName, parseSize, setDpi, type Format } from "@shared-image/encode";
import type { PickedFile } from "./files";
import type { Output } from "./native";

/**
 * Resize Image, with the website's options: percent, exact pixels or a print
 * size (cm, mm, inches at a DPI), presets, keep proportions or crop/stretch to
 * a box, a maximum file size and the output format. The size math and the
 * file-size search are the website's own (client/src/lib/image), so both give
 * the same result.
 */

export type Mode = "percent" | "pixels" | "print";
export type PrintUnit = "cm" | "mm" | "in";
export type OutFormat = "keep" | Format;

/** Options as the runner stores them: numbers typed into fields stay strings until the run. */
export type Raw = Record<string, string | number>;

export interface Resize {
  mode: Mode;
  percent: number;
  width: number;
  height: number;
  keepRatio: boolean;
  fit: "fill" | "stretch";
  unit: PrintUnit;
  dpi: number;
  limit: boolean;
  target: string;
  format: OutFormat;
}

export const RESIZE_DEFAULTS: Raw = { mode: "percent", percent: "50", width: "", height: "", keepRatio: 1, fit: "fill", unit: "cm", dpi: "300", limit: 0, target: "50", format: "keep" };

export const PRINT_PRESETS: { label: string; width: number; height: number; unit: PrintUnit }[] = [
  { label: "Passport photo · 3.5 × 4.5 cm", width: 3.5, height: 4.5, unit: "cm" },
  { label: "Signature · 3.5 × 1.5 cm", width: 3.5, height: 1.5, unit: "cm" },
  { label: "Stamp size · 2 × 2.5 cm", width: 2, height: 2.5, unit: "cm" },
  { label: "US visa · 2 × 2 in", width: 2, height: 2, unit: "in" },
];

export const PIXEL_PRESETS = [
  { label: "Square 1080", width: 1080, height: 1080 },
  { label: "Full HD 1920 × 1080", width: 1920, height: 1080 },
  { label: "HD 1280 × 720", width: 1280, height: 720 },
  { label: "Story 1080 × 1920", width: 1080, height: 1920 },
];

export const PERCENT_PRESETS = [10, 25, 50, 75];
export const TARGET_PRESETS = ["20", "50", "100", "200", "500", "1 MB"];

const num = (v: string | number | undefined) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function readResize(o: Raw): Resize {
  return {
    mode: o.mode as Mode,
    percent: num(o.percent),
    width: num(o.width),
    height: num(o.height),
    keepRatio: !!Number(o.keepRatio),
    fit: o.fit === "stretch" ? "stretch" : "fill",
    unit: o.unit as PrintUnit,
    dpi: num(o.dpi),
    limit: !!Number(o.limit),
    target: String(o.target ?? ""),
    format: o.format as OutFormat,
  };
}

export function resizeSpec(r: Resize): ResizeSpec {
  if (r.mode === "percent") return { mode: "percent", percent: r.percent };
  if (r.mode === "pixels") return { mode: "pixels", width: r.width, height: r.height, keepRatio: r.keepRatio };
  return { mode: "print", width: r.width, height: r.height, unit: r.unit, dpi: r.dpi, keepRatio: r.keepRatio };
}

/** What's wrong with the options, in words for the button, or null when they're ready. */
export function resizeProblem(o: Raw): string | null {
  const r = readResize(o);
  if (r.mode === "percent" && (r.percent < 1 || r.percent > 400)) return "Choose a size between 1% and 400%";
  if (r.mode === "print" && (r.dpi < 72 || r.dpi > 1200)) return "Choose a resolution between 72 and 1200 DPI";
  if (r.mode !== "percent" && !(r.width > 0) && !(r.height > 0)) return "Enter a width or a height";
  if (r.mode !== "percent" && !r.keepRatio && !(r.width > 0 && r.height > 0)) return "Enter both sides, or keep proportions";
  if (r.limit && !parseSize(r.target)) return "Enter a maximum size, like 50 or 1.5 MB";
  return null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** An image side (px) in the unit of a resize mode, as text for a field. */
export const sideIn = (px: number, mode: Mode, unit: PrintUnit, dpi: number) => String(mode === "pixels" ? px : round2(fromPixels(px, unit, dpi)));

/** A length converted between cm, mm and inches, as text for a field. */
export function convertUnit(v: string | number, from: PrintUnit, to: PrintUnit) {
  const n = num(v);
  return n ? String(round2(fromPixels(toPixels(n, from, 1_000_000) / 1_000_000, to, 1))) : String(v);
}

/** The output size for the first image, for the "1200 × 800 → 600 × 400 px" line. */
export const previewSize = (src: Size, o: Raw) => resizeDims(src, resizeSpec(readResize(o)));

const SAVE: Record<Format, SaveFormat> = { jpeg: SaveFormat.JPEG, png: SaveFormat.PNG, webp: SaveFormat.WEBP };

export async function resizeOne(f: PickedFile, o: Raw): Promise<Output> {
  const r = readResize(o);
  const ctx = ImageManipulator.manipulate(f.uri);
  const src = await ctx.renderAsync();
  const size = resizeDims(src, resizeSpec(r));
  // With proportions kept the size already matches the image's shape; an
  // exact box (proportions off) is cropped to fill it, or stretched.
  if (r.mode !== "percent" && !r.keepRatio && r.fit === "fill") {
    const p = placeImage(src, size, "fill");
    const x = Math.max(0, Math.floor(p.sx));
    const y = Math.max(0, Math.floor(p.sy));
    ctx.crop({ originX: x, originY: y, width: Math.min(src.width - x, Math.round(p.sw)), height: Math.min(src.height - y, Math.round(p.sh)) });
  }
  ctx.resize({ width: size.width, height: size.height });
  const image = await ctx.renderAsync();

  const format = r.format === "keep" ? formatFor(f.mimeType) : r.format;
  const sized = new Map<string, ImageRef>([[`${size.width}x${size.height}`, image]]);
  const encode = async (width: number, height: number, quality: number) => {
    const key = `${width}x${height}`;
    let img = sized.get(key);
    if (!img) {
      img = await ImageManipulator.manipulate(image).resize({ width, height }).renderAsync();
      sized.set(key, img);
    }
    const saved = await img.saveAsync({ format: SAVE[format], compress: quality });
    return new File(saved.uri).bytes();
  };

  const maxBytes = r.limit ? parseSize(r.target) : null;
  const bytes = maxBytes ? (await encodeToTarget(size, maxBytes, FORMAT_INFO[format].lossy, encode)).bytes : await encode(size.width, size.height, 0.9);
  return {
    name: outputName(f.name, format, "resized"),
    bytes: r.mode === "print" ? setDpi(bytes, format, r.dpi) : bytes,
    mimeType: FORMAT_INFO[format].mime,
  };
}
