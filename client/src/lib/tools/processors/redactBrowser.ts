"use client";

import { PDFDocument } from "pdf-lib";
import { canvasToBytes, openPdf, pageTextRuns } from "../pdfjs";
import { redactPdf, type RedactOptions } from "./redact";
import type { TextRun } from "../text";

export interface BrowserRedactResult {
  bytes: Uint8Array;
  totalMatches: number;
  pagesWithMatches: number;
  /** Pages rebuilt as images because their text couldn't be rewritten safely. */
  flattenedPages: number[];
}

/**
 * Find & redact in the browser. Matches are deleted from the content stream;
 * any page where that can't be done safely is rasterized with black boxes,
 * so no redacted text survives either way.
 */
export async function redactInBrowser(
  bytes: Uint8Array,
  terms: string[],
  opts: RedactOptions,
  progress?: (message: string, fraction?: number) => void,
): Promise<BrowserRedactResult> {
  const pdf = await openPdf(bytes);
  try {
    const pages: TextRun[][] = [];
    for (let i = 0; i < pdf.numPages; i++) {
      progress?.(`Searching page ${i + 1} of ${pdf.numPages}…`, i / pdf.numPages);
      pages.push((await pageTextRuns(pdf, i)).runs);
    }
    const report = await redactPdf(bytes, pages, terms, opts);
    const counts = Object.values(report.matches);
    let out = report.bytes;
    if (report.unsafePages.length) {
      progress?.("Flattening pages that need it…", 0.9);
      const doc = await PDFDocument.load(out);
      for (const i of report.unsafePages) {
        const page = await pdf.getPage(i + 1);
        const scale = 200 / 72;
        const vp = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        ctx.fillStyle = "#000";
        for (const [x0, y0, x1, y1] of report.boxes[i] ?? []) {
          const pts = [vp.convertToViewportPoint(x0, y0), vp.convertToViewportPoint(x1, y1)];
          const xs = pts.map((p) => p[0]);
          const ys = pts.map((p) => p[1]);
          ctx.fillRect(Math.min(...xs) - 2, Math.min(...ys) - 2, Math.abs(xs[1] - xs[0]) + 4, Math.abs(ys[1] - ys[0]) + 4);
        }
        const img = await doc.embedJpg(await canvasToBytes(canvas, "image/jpeg", 0.92));
        const W = vp.width / scale;
        const H = vp.height / scale;
        const fresh = doc.insertPage(i, [W, H]);
        fresh.drawImage(img, { x: 0, y: 0, width: W, height: H });
        doc.removePage(i + 1);
      }
      out = await doc.save();
    }
    progress?.("Done", 1);
    return {
      bytes: out,
      totalMatches: counts.reduce((a, b) => a + b, 0),
      pagesWithMatches: counts.length,
      flattenedPages: report.unsafePages,
    };
  } finally {
    await pdf.destroy();
  }
}
