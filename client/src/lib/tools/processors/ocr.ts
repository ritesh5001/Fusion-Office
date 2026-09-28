"use client";

import { StandardFonts } from "pdf-lib";
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
              const text = word.text.replace(/[^\x20-\x7E -ÿ]/g, "").trim();
              if (!text || word.confidence < 30) continue;
              const x = word.bbox.x0 / SCALE;
              const w = (word.bbox.x1 - word.bbox.x0) / SCALE;
              const bottom = line.baseline ? Math.max(line.baseline.y0, line.baseline.y1) / SCALE : word.bbox.y1 / SCALE;
              const h = (word.bbox.y1 - word.bbox.y0) / SCALE;
              // Size the invisible word so it spans the same width as the printed one.
              const natural = font.widthOfTextAtSize(text, 10);
              const size = Math.max(2, Math.min((w / natural) * 10, h * 1.4));
              page.drawText(text, { x, y: v.height - bottom, size, font, opacity: 0 });
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
