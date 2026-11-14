"use client";

/**
 * Scan clean-up and "fit under a size" tools. They look at each page as a
 * picture (pdf.js) and then change the PDF itself (pdf-lib), so text stays
 * text wherever the tool allows it.
 */
import { PDFDocument, concatTransformationMatrix, popGraphicsState, pushGraphicsState } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { canvasToBytes, openPdf, renderToCanvas } from "../pdfjs";
import { contentBox, encodeTiff, enhancePixels, estimateSkew, fitRaster, groupsBySeparators, isBlankPage, nameFromCode, rotationAbout, toGray, type BlankSensitivity, type EnhanceMode, type Gray, type TiffPage } from "../scanMath";
import { loadPdf, pageView, save } from "./common";
import type { CompressLevel } from "./compress";

type Progress = (message: string, fraction?: number) => void;

/** A page as grey pixels, about `side` px on its long edge. */
async function grayPage(pdf: PDFDocumentProxy, index: number, side: number): Promise<Gray> {
  const page = await pdf.getPage(index + 1);
  const vp = page.getViewport({ scale: 1 });
  const canvas = await renderToCanvas(pdf, index, side / Math.max(vp.width, vp.height));
  const { data } = canvas.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, canvas.width, canvas.height);
  return toGray(data, canvas.width, canvas.height);
}

// ─── Remove blank pages ───────────────────────────────────────────

export async function removeBlankPages(bytes: Uint8Array, sensitivity: BlankSensitivity, progress?: Progress): Promise<{ bytes: Uint8Array; removed: number[]; pages: number }> {
  const pdf = await openPdf(bytes);
  const blank: number[] = [];
  try {
    for (let i = 0; i < pdf.numPages; i++) {
      progress?.(`Checking page ${i + 1} of ${pdf.numPages}…`, i / pdf.numPages);
      if (isBlankPage(await grayPage(pdf, i, 500), sensitivity)) blank.push(i);
    }
  } finally {
    await pdf.destroy();
  }
  const total = pdf.numPages;
  if (!blank.length) return { bytes, removed: [], pages: total };
  if (blank.length === total) throw new Error("Every page looks blank, so nothing was removed. Try the Strict setting.");
  const src = await loadPdf(bytes);
  const gone = new Set(blank);
  const out = await PDFDocument.create();
  (await out.copyPages(src, src.getPageIndices().filter((i) => !gone.has(i)))).forEach((p) => out.addPage(p));
  return { bytes: await save(out), removed: blank, pages: total };
}

// ─── Trim margins ─────────────────────────────────────────────────

export interface TrimOptions {
  /** Space kept around the content, in points. */
  padding: number;
  /** One crop for the whole document (pages keep the same size) or one per page. */
  uniform: boolean;
}

/** Crop every page to its content. Nothing is deleted: the crop box is moved, as in Crop PDF. */
export async function trimMargins(bytes: Uint8Array, o: TrimOptions, progress?: Progress): Promise<{ bytes: Uint8Array; trimmed: number }> {
  const pdf = await openPdf(bytes);
  const boxes: (ReturnType<typeof contentBox>)[] = [];
  try {
    for (let i = 0; i < pdf.numPages; i++) {
      progress?.(`Measuring page ${i + 1} of ${pdf.numPages}…`, i / pdf.numPages);
      boxes.push(contentBox(await grayPage(pdf, i, 700)));
    }
  } finally {
    await pdf.destroy();
  }
  const found = boxes.filter((b): b is NonNullable<typeof b> => !!b);
  if (!found.length) throw new Error("These pages look empty, so there's nothing to trim to.");
  const union = {
    x: Math.min(...found.map((b) => b.x)),
    y: Math.min(...found.map((b) => b.y)),
    r: Math.max(...found.map((b) => b.x + b.w)),
    b: Math.max(...found.map((b) => b.y + b.h)),
  };
  const doc = await loadPdf(bytes);
  let trimmed = 0;
  doc.getPages().forEach((page, i) => {
    const own = boxes[i];
    const box = o.uniform ? { x: union.x, y: union.y, w: union.r - union.x, h: union.b - union.y } : own;
    if (!box) return;
    const v = pageView(page);
    // View space (top-left origin) → the page's own user space, through the same matrix the stamps use.
    const pad = o.padding;
    const x0 = Math.max(0, box.x * v.width - pad);
    const y0 = Math.max(0, box.y * v.height - pad);
    const x1 = Math.min(v.width, (box.x + box.w) * v.width + pad);
    const y1 = Math.min(v.height, (box.y + box.h) * v.height + pad);
    const [a, b, c, d, e, f] = v.matrix;
    const map = (x: number, yUp: number) => [a * x + c * yUp + e, b * x + d * yUp + f];
    const [ux0, uy0] = map(x0, v.height - y1);
    const [ux1, uy1] = map(x1, v.height - y0);
    const rect = { x: Math.min(ux0, ux1), y: Math.min(uy0, uy1), w: Math.abs(ux1 - ux0), h: Math.abs(uy1 - uy0) };
    if (rect.w < 8 || rect.h < 8) return;
    page.setCropBox(rect.x, rect.y, rect.w, rect.h);
    trimmed++;
  });
  return { bytes: await save(doc), trimmed };
}

// ─── Straighten (deskew) ──────────────────────────────────────────

/** Turn tilted scans upright. Pages tilted less than `minAngle` are left alone. */
export async function deskewPdf(bytes: Uint8Array, minAngle = 0.3, progress?: Progress): Promise<{ bytes: Uint8Array; angles: number[]; fixed: number }> {
  const pdf = await openPdf(bytes);
  const angles: number[] = [];
  try {
    for (let i = 0; i < pdf.numPages; i++) {
      progress?.(`Measuring page ${i + 1} of ${pdf.numPages}…`, i / pdf.numPages);
      angles.push(estimateSkew(await grayPage(pdf, i, 900)));
    }
  } finally {
    await pdf.destroy();
  }
  const doc = await loadPdf(bytes);
  let fixed = 0;
  doc.getPages().forEach((page, i) => {
    const angle = angles[i];
    if (Math.abs(angle) < minAngle) return;
    // A page tilted clockwise is turned back counter-clockwise by the same amount.
    const m = rotationAbout(angle, page.getCropBox());
    const start = doc.context.register(doc.context.contentStream([pushGraphicsState(), concatTransformationMatrix(...m)]));
    const end = doc.context.register(doc.context.contentStream([popGraphicsState()]));
    page.node.wrapContentStreams(start, end);
    fixed++;
  });
  return { bytes: fixed ? await save(doc) : bytes, angles, fixed };
}

// ─── Compress to a target size ────────────────────────────────────

export interface TargetResult {
  bytes: Uint8Array;
  before: number;
  after: number;
  fits: boolean;
  /** "text": images re-encoded, text kept · "pages": every page became a picture. */
  method: "original" | "text" | "pages";
  dpi?: number;
}

/**
 * Make a PDF no bigger than `target` bytes. First the gentle way (images
 * re-encoded, text kept sharp and selectable); if that isn't enough, pages
 * become pictures at the highest resolution that fits.
 */
export async function compressPdfToSize(bytes: Uint8Array, target: number, opts: { grayscale: boolean; allowPages: boolean }, progress?: Progress): Promise<TargetResult> {
  const before = bytes.length;
  if (before <= target) return { bytes, before, after: before, fits: true, method: "original" };
  const { compressPdf } = await import("./compress");
  let smallest = bytes;
  for (const [k, level] of (["low", "recommended", "extreme"] as CompressLevel[]).entries()) {
    progress?.("Compressing images…", 0.05 + k * 0.1);
    const r = await compressPdf(bytes, { level, grayscale: opts.grayscale, stripMetadata: true });
    if (r.bytes.length < smallest.length) smallest = r.bytes;
    if (r.bytes.length <= target) return { bytes: r.bytes, before, after: r.bytes.length, fits: true, method: "text" };
  }
  if (!opts.allowPages) return { bytes: smallest, before, after: smallest.length, fits: false, method: smallest === bytes ? "original" : "text" };

  const pdf = await openPdf(bytes);
  try {
    const n = pdf.numPages;
    const sizes: { width: number; height: number }[] = [];
    for (let i = 0; i < n; i++) {
      const vp = (await pdf.getPage(i + 1)).getViewport({ scale: 1 });
      sizes.push({ width: vp.width, height: vp.height });
    }
    // Room for the PDF's own structure around the images.
    const budget = target - (1200 + 260 * n);
    if (budget < 2000 * n) return { bytes: smallest, before, after: smallest.length, fits: false, method: smallest === bytes ? "original" : "text" };
    let cacheDpi = 0;
    let canvases: HTMLCanvasElement[] = [];
    let tries = 0;
    const encodeAll = async (dpi: number, quality: number) => {
      if (dpi !== cacheDpi) {
        canvases = [];
        cacheDpi = dpi;
        for (let i = 0; i < n; i++) {
          progress?.(`Rendering page ${i + 1} of ${n} at ${dpi} DPI…`, 0.35 + 0.5 * Math.min(1, tries / 8));
          const c = await renderToCanvas(pdf, i, dpi / 72);
          if (opts.grayscale) {
            const ctx = c.getContext("2d", { willReadFrequently: true })!;
            const img = ctx.getImageData(0, 0, c.width, c.height);
            for (let p = 0; p < img.data.length; p += 4) img.data[p] = img.data[p + 1] = img.data[p + 2] = 0.299 * img.data[p] + 0.587 * img.data[p + 1] + 0.114 * img.data[p + 2];
            ctx.putImageData(img, 0, 0);
          }
          canvases.push(c);
        }
      }
      tries++;
      const out: Uint8Array[] = [];
      for (const c of canvases) out.push(await canvasToBytes(c, "image/jpeg", quality));
      return out;
    };
    const pick = await fitRaster(budget, async (dpi, q) => (await encodeAll(dpi, q)).reduce((sum, b) => sum + b.length, 0));
    progress?.("Building the PDF…", 0.92);
    const images = await encodeAll(pick.dpi, pick.quality);
    const out = await PDFDocument.create();
    for (const [i, jpg] of images.entries()) {
      const img = await out.embedJpg(jpg);
      out.addPage([sizes[i].width, sizes[i].height]).drawImage(img, { x: 0, y: 0, width: sizes[i].width, height: sizes[i].height });
    }
    const made = await out.save({ useObjectStreams: true });
    // Keep whichever attempt came closest when nothing fits.
    const best = made.length <= target || made.length < smallest.length ? made : smallest;
    return { bytes: best, before, after: best.length, fits: best.length <= target, method: best === made ? "pages" : "text", dpi: best === made ? pick.dpi : undefined };
  } finally {
    await pdf.destroy();
  }
}

// ─── Improve scan quality ─────────────────────────────────────────

/** Re-render every page and clean it up: white paper, darker ink, optional grey or black and white. */
export async function enhanceScanPdf(bytes: Uint8Array, o: { mode: EnhanceMode; dpi: number }, progress?: Progress): Promise<Uint8Array> {
  const pdf = await openPdf(bytes);
  const out = await PDFDocument.create();
  try {
    for (let i = 0; i < pdf.numPages; i++) {
      progress?.(`Cleaning page ${i + 1} of ${pdf.numPages}…`, i / pdf.numPages);
      const vp = (await pdf.getPage(i + 1)).getViewport({ scale: 1 });
      const canvas = await renderToCanvas(pdf, i, o.dpi / 72);
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      enhancePixels(img.data, canvas.width, canvas.height, o.mode);
      ctx.putImageData(img, 0, 0);
      // Black and white compresses best as PNG; photos and grey as JPEG.
      const png = o.mode === "bw";
      const data = await canvasToBytes(canvas, png ? "image/png" : "image/jpeg", 0.82);
      const embedded = png ? await out.embedPng(data) : await out.embedJpg(data);
      out.addPage([vp.width, vp.height]).drawImage(embedded, { x: 0, y: 0, width: vp.width, height: vp.height });
    }
  } finally {
    await pdf.destroy();
  }
  return out.save({ useObjectStreams: true });
}

// ─── Split at separator pages ─────────────────────────────────────

export type SeparatorMode = "blank" | "qr";

/** Find separator sheets (blank pages, or pages with a QR code) and split the PDF there. */
export async function splitAtSeparators(
  bytes: Uint8Array,
  o: { mode: SeparatorMode; keep: boolean; match: string; sensitivity: BlankSensitivity },
  progress?: Progress,
): Promise<{ parts: { name: string; bytes: Uint8Array; pages: number[] }[]; separators: number[] }> {
  const pdf = await openPdf(bytes);
  const separators: number[] = [];
  const codes = new Map<number, string>();
  const jsQR = o.mode === "qr" ? (await import("jsqr")).default : null;
  try {
    for (let i = 0; i < pdf.numPages; i++) {
      progress?.(`Checking page ${i + 1} of ${pdf.numPages}…`, (i / pdf.numPages) * 0.85);
      if (o.mode === "blank") {
        if (isBlankPage(await grayPage(pdf, i, 500), o.sensitivity)) separators.push(i);
        continue;
      }
      // QR codes: a sharp render, then a smaller one (big, blurry codes read better scaled down).
      const page = await pdf.getPage(i + 1);
      const vp = page.getViewport({ scale: 1 });
      let code: string | null = null;
      for (const side of [1600, 900]) {
        const canvas = await renderToCanvas(pdf, i, side / Math.max(vp.width, vp.height));
        const img = canvas.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR!(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
        if (found?.data) {
          code = found.data;
          break;
        }
      }
      if (code !== null && (!o.match.trim() || code.toLowerCase().includes(o.match.trim().toLowerCase()))) {
        separators.push(i);
        codes.set(i, code);
      }
    }
  } finally {
    await pdf.destroy();
  }
  if (!separators.length) throw new Error(o.mode === "blank" ? "No blank separator pages were found." : o.match.trim() ? `No QR code containing “${o.match.trim()}” was found.` : "No QR codes were found on any page.");
  const groups = groupsBySeparators(pdf.numPages, separators, o.keep);
  if (!groups.length) throw new Error("Every page is a separator, so there's nothing to split.");
  progress?.("Writing the parts…", 0.9);
  const src = await loadPdf(bytes);
  const parts: { name: string; bytes: Uint8Array; pages: number[] }[] = [];
  const used = new Set<string>();
  for (const [k, g] of groups.entries()) {
    const out = await PDFDocument.create();
    (await out.copyPages(src, g)).forEach((p) => out.addPage(p));
    // A part named after the QR code that started it.
    const sepBefore = o.keep ? g[0] : Math.max(-1, ...separators.filter((s) => s < g[0]));
    let name = codes.has(sepBefore) ? nameFromCode(codes.get(sepBefore)!, `part-${k + 1}`) : `part-${k + 1}`;
    for (let n = 2; used.has(name); n++) name = `${name}-${n}`;
    used.add(name);
    parts.push({ name, bytes: await save(out), pages: g });
  }
  return { parts, separators };
}

// ─── PDF → TIFF ───────────────────────────────────────────────────

/** Pages as a multi-page TIFF (or one file per page), deflate-compressed. */
export async function pdfToTiff(bytes: Uint8Array, o: { dpi: number; gray: boolean; pages: number[]; together: boolean }, progress?: Progress): Promise<Uint8Array[]> {
  const { zlibSync } = await import("fflate");
  const pdf = await openPdf(bytes);
  const pages: TiffPage[] = [];
  try {
    for (const [k, i] of o.pages.entries()) {
      progress?.(`Rendering page ${i + 1}…`, k / o.pages.length);
      const canvas = await renderToCanvas(pdf, i, o.dpi / 72);
      const { data, width, height } = canvas.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, canvas.width, canvas.height);
      const channels = o.gray ? 1 : 3;
      const pixels = new Uint8Array(width * height * channels);
      for (let p = 0, j = 0; p < width * height; p++, j += 4) {
        if (o.gray) pixels[p] = (data[j] * 299 + data[j + 1] * 587 + data[j + 2] * 114) / 1000;
        else (pixels[p * 3] = data[j]), (pixels[p * 3 + 1] = data[j + 1]), (pixels[p * 3 + 2] = data[j + 2]);
      }
      pages.push({ width, height, pixels, channels: channels as 1 | 3, dpi: o.dpi });
    }
  } finally {
    await pdf.destroy();
  }
  const deflate = (d: Uint8Array) => zlibSync(d, { level: 6 });
  return o.together ? [encodeTiff(pages, deflate)] : pages.map((p) => encodeTiff([p], deflate));
}
