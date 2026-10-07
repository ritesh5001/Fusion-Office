/**
 * Image → vector tracing (imagetracerjs, public domain). Turns a photo, logo or
 * scan into filled SVG shapes that CorelDRAW, Illustrator, Inkscape and Figma
 * open as editable vectors. The tracing itself runs in trace.worker.ts.
 */

export type TraceMode = "logo" | "detailed" | "lineart";
export type TraceDetail = "smooth" | "precise";

export interface TraceJob {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  mode: TraceMode;
  detail: TraceDetail;
  /** Drop the white (or near-white) background shapes, for logos. */
  dropWhite: boolean;
}

/** Longest side we trace at: more pixels mean more shapes and a slower trace, not a better vector. */
export const TRACE_MAX_SIDE: Record<TraceMode, number> = { logo: 1200, lineart: 1600, detailed: 900 };

/** imagetracerjs options per mode. */
export function traceOptions(mode: TraceMode, detail: TraceDetail): Record<string, number | boolean> {
  const precise = detail === "precise";
  const base = { viewbox: true, roundcoords: 1, strokewidth: 0, linefilter: !precise, ltres: precise ? 0.5 : 1, qtres: precise ? 0.5 : 1 };
  if (mode === "lineart") return { ...base, colorsampling: 0, numberofcolors: 2, colorquantcycles: 1, pathomit: precise ? 4 : 10 };
  if (mode === "detailed") return { ...base, colorsampling: 2, numberofcolors: precise ? 48 : 24, colorquantcycles: 3, pathomit: precise ? 2 : 6, blurradius: precise ? 0 : 1 };
  return { ...base, colorsampling: 2, numberofcolors: precise ? 12 : 8, colorquantcycles: 3, pathomit: precise ? 4 : 10, blurradius: precise ? 0 : 2, blurdelta: 30 };
}

/** Line art: every pixel becomes pure black or white first, so the trace is clean. */
export function threshold(data: Uint8ClampedArray, cutoff = 160) {
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    // Transparent counts as white.
    const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) * a + 255 * (1 - a);
    const v = lum < cutoff ? 0 : 255;
    data[i] = data[i + 1] = data[i + 2] = v;
    data[i + 3] = 255;
  }
}

/**
 * Tidy the traced SVG: real width/height next to the viewBox (so it opens at
 * the right size), no tracer credit, and optionally no white background shapes.
 */
export function finishSvg(svg: string, width: number, height: number, dropWhite: boolean): string {
  let out = svg.replace(/\sdesc="[^"]*"/, "").replace(/<svg /, `<svg width="${width}" height="${height}" `);
  if (dropWhite) out = out.replace(/<path[^>]*fill="rgb\((\d+),(\d+),(\d+)\)"[^>]*\/>/g, (m, r, g, b) => (+r >= 235 && +g >= 235 && +b >= 235 ? "" : m));
  // Fully transparent shapes add nothing.
  out = out.replace(/<path[^>]*opacity="0"[^>]*\/>/g, "");
  return `<?xml version="1.0" encoding="UTF-8"?>\n${out}`;
}

/** Number of filled shapes in a traced SVG. */
export const shapeCount = (svg: string) => (svg.match(/<path/g) ?? []).length;
