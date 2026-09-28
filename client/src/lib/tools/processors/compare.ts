"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { openPdf, pageTextRuns, renderToCanvas } from "../pdfjs";
import { diffLines, groupLines, type DiffOp } from "../text";

export interface TextComparison {
  ops: DiffOp[];
  added: number;
  removed: number;
}

async function allLines(doc: PDFDocumentProxy): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < doc.numPages; i++) out.push(...groupLines((await pageTextRuns(doc, i)).runs).map((l) => l.text));
  return out;
}

export async function compareText(a: Uint8Array, b: Uint8Array): Promise<TextComparison> {
  const [da, db] = await Promise.all([openPdf(a), openPdf(b)]);
  try {
    const ops = diffLines(await allLines(da), await allLines(db));
    return { ops, added: ops.filter((o) => o.op === "add").length, removed: ops.filter((o) => o.op === "del").length };
  } finally {
    await Promise.all([da.destroy(), db.destroy()]);
  }
}

export interface VisualPage {
  a: string | null;
  b: string | null;
  overlay: string | null;
  /** Share of pixels that differ (0..1). */
  changed: number;
}

/** Render both versions of every page and highlight pixels that differ. */
export async function compareVisual(a: Uint8Array, b: Uint8Array, onProgress?: (d: number, t: number) => void): Promise<VisualPage[]> {
  const [da, db] = await Promise.all([openPdf(a), openPdf(b)]);
  const n = Math.max(da.numPages, db.numPages);
  const out: VisualPage[] = [];
  try {
    for (let i = 0; i < n; i++) {
      onProgress?.(i, n);
      const ca = i < da.numPages ? await renderToCanvas(da, i, 1.2) : null;
      const cb = i < db.numPages ? await renderToCanvas(db, i, 1.2) : null;
      let overlay: string | null = null;
      let changed = 1;
      if (ca && cb) {
        const w = Math.max(ca.width, cb.width);
        const h = Math.max(ca.height, cb.height);
        const pa = pixels(ca, w, h);
        const pb = pixels(cb, w, h);
        const o = document.createElement("canvas");
        o.width = w;
        o.height = h;
        const octx = o.getContext("2d")!;
        octx.drawImage(cb, 0, 0);
        const img = octx.getImageData(0, 0, w, h);
        let diff = 0;
        for (let p = 0; p < w * h * 4; p += 4) {
          const d = Math.abs(pa[p] - pb[p]) + Math.abs(pa[p + 1] - pb[p + 1]) + Math.abs(pa[p + 2] - pb[p + 2]);
          if (d > 60) {
            diff++;
            // New version tinted, changes painted red.
            img.data[p] = 230;
            img.data[p + 1] = 40;
            img.data[p + 2] = 40;
            img.data[p + 3] = 255;
          } else {
            img.data[p + 3] = 70; // fade unchanged content
          }
        }
        octx.putImageData(img, 0, 0);
        overlay = o.toDataURL("image/png");
        changed = diff / (w * h);
      }
      out.push({ a: ca?.toDataURL("image/jpeg", 0.8) ?? null, b: cb?.toDataURL("image/jpeg", 0.8) ?? null, overlay, changed });
    }
    onProgress?.(n, n);
    return out;
  } finally {
    await Promise.all([da.destroy(), db.destroy()]);
  }
}

function pixels(c: HTMLCanvasElement, w: number, h: number): Uint8ClampedArray {
  const t = document.createElement("canvas");
  t.width = w;
  t.height = h;
  const ctx = t.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(c, 0, 0);
  return ctx.getImageData(0, 0, w, h).data;
}
