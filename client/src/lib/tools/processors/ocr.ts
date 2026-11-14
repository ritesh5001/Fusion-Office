"use client";

import { StandardFonts, type PDFDocument } from "pdf-lib";
import { openPdf, renderToCanvas } from "../pdfjs";
import { loadPdf, pageView } from "./common";
import { concatTransformationMatrix, popGraphicsState, pushGraphicsState } from "pdf-lib";

export interface OcrOptions {
  /** Tesseract language code(s), e.g. "eng". Self-hosted data: eng. */
  language: string;
  /** Leave pages that already have selectable text alone. */
  skipTextPages: boolean;
}

export interface OcrResult {
  bytes: Uint8Array;
  pagesProcessed: number;
  pagesSkipped: number;
  words: number;
}

type Progress = (message: string, fraction: number) => void;

/**
 * Make scanned pages searchable: recognise the words on each page image and
 * add them as an invisible text layer in the right places. The page image is
 * untouched. Runs entirely in the browser (Tesseract.js, self-hosted).
 */
export async function ocrPdf(bytes: Uint8Array, opts: OcrOptions, onProgress?: Progress): Promise<OcrResult> {
  const pdf = await openPdf(bytes);
  const doc = await loadPdf(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  // Hindi and other Devanagari text needs a Unicode font in the text layer.
  const deva = opts.language.includes("hin") ? await devanagariFont(doc) : null;
  const { createWorker } = await import("tesseract.js");
  onProgress?.("Loading the text recognition engine…", 0);
  const worker = await createWorker(opts.language, 1, {
    workerPath: "/tesseract/worker.min.js",
    corePath: "/tesseract/core",
    langPath: "/tesseract/lang",
    gzip: true,
    workerBlobURL: false,
  });
  const SCALE = 2.5; // ≈180 dpi: good accuracy without huge memory use
  let processed = 0;
  let skipped = 0;
  let words = 0;
  try {
    for (let i = 0; i < pdf.numPages; i++) {
      if (opts.skipTextPages) {
        const tc = await (await pdf.getPage(i + 1)).getTextContent();
        if (tc.items.some((it) => "str" in it && it.str.trim())) {
          skipped++;
          continue;
        }
      }
      onProgress?.(`Reading page ${i + 1} of ${pdf.numPages}…`, i / pdf.numPages);
      const canvas = await renderToCanvas(pdf, i, SCALE);
      const { data } = await worker.recognize(canvas, {}, { blocks: true });
      const page = doc.getPage(i);
      const v = pageView(page);
      page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...v.matrix));
      for (const block of data.blocks ?? []) {
        for (const para of block.paragraphs) {
          for (const line of para.lines) {
            for (const word of line.words) {
              const isDeva = /[\u0900-\u097F]/.test(word.text);
              const text = isDeva ? word.text.replace(/[^\u0900-\u097F\u200C\u200D0-9.,-]/g, "").trim() : word.text.replace(/[^\x20-\x7E -ÿ]/g, "").trim();
              if (!text || word.confidence < 30) continue;
              const x = word.bbox.x0 / SCALE;
              const w = (word.bbox.x1 - word.bbox.x0) / SCALE;
              const bottom = line.baseline ? Math.max(line.baseline.y0, line.baseline.y1) / SCALE : word.bbox.y1 / SCALE;
              const h = (word.bbox.y1 - word.bbox.y0) / SCALE;
              if (isDeva) {
                if (!deva) continue;
                const natural = deva.widthOfTextAtSize(text, 10) || 1;
                const size = Math.max(2, Math.min((w / natural) * 10, h * 1.4));
                page.drawText(text, { x, y: v.height - bottom, size, font: deva, opacity: 0 });
              } else {
                // Size the invisible word so it spans the same width as the printed one.
                const natural = font.widthOfTextAtSize(text, 10);
                const size = Math.max(2, Math.min((w / natural) * 10, h * 1.4));
                page.drawText(text, { x, y: v.height - bottom, size, font, opacity: 0 });
              }
              words++;
            }
          }
        }
      }
      page.pushOperators(popGraphicsState());
      processed++;
    }
  } finally {
    await worker.terminate();
    await pdf.destroy();
  }
  onProgress?.("Done", 1);
  return { bytes: await doc.save(), pagesProcessed: processed, pagesSkipped: skipped, words };
}

/** Noto Sans Devanagari (served from /fonts), embedded as a subset. */
async function devanagariFont(doc: PDFDocument) {
  // fontkit's shaper was built expecting this global.
  await import("regenerator-runtime/runtime.js");
  const { default: fontkit } = await import("@pdf-lib/fontkit");
  doc.registerFontkit(fontkit);
  const res = await fetch("/fonts/noto-sans-devanagari.woff");
  if (!res.ok) throw new Error("Couldn't load the Hindi font for the text layer.");
  const font = await doc.embedFont(new Uint8Array(await res.arrayBuffer()), { subset: true });
  // The text layer is invisible, so it is written unshaped: shaping would store vowel signs
  // in visual order (ि before its consonant) and add ◌ placeholders, which breaks copy and search.
  const fk = (font as unknown as { embedder: { font: { layout: (t: string, f?: unknown, script?: string) => unknown } } }).embedder.font;
  const layout = fk.layout.bind(fk);
  fk.layout = (t: string, f?: unknown) => layout(t, f, "latn");
  return font;
}

/** Recognise the text in images (Image to text). */
export async function imagesToText(images: (HTMLCanvasElement | ImageBitmap)[], language: string, onProgress?: Progress): Promise<{ text: string; confidence: number }[]> {
  const { createWorker } = await import("tesseract.js");
  onProgress?.("Loading the text recognition engine…", 0);
  const worker = await createWorker(language, 1, { workerPath: "/tesseract/worker.min.js", corePath: "/tesseract/core", langPath: "/tesseract/lang", gzip: true, workerBlobURL: false });
  try {
    await worker.setParameters({ preserve_interword_spaces: "1" });
    const out: { text: string; confidence: number }[] = [];
    for (const [i, img] of images.entries()) {
      onProgress?.(images.length > 1 ? `Reading image ${i + 1} of ${images.length}…` : "Reading the text…", i / images.length);
      const { data } = await worker.recognize(img as HTMLCanvasElement);
      out.push({ text: data.text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim(), confidence: data.confidence });
    }
    return out;
  } finally {
    await worker.terminate();
  }
}
