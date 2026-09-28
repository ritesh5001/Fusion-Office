"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { getPdfjs } from "../pdf/pdfjs";
import type { TextRun } from "./text";

/** Open raw PDF bytes with pdf.js (for rendering and text extraction). */
export async function openPdf(bytes: Uint8Array, password?: string): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs();
  try {
    return await pdfjs.getDocument({ data: bytes.slice(), password, isEvalSupported: false }).promise;
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === "PasswordException") throw new Error("This PDF is password-protected. Unlock it first.");
    if (name === "InvalidPDFException") throw new Error("This file is not a valid PDF. Try Repair PDF.");
    throw err;
  }
}

/** Render page `index` (0-based) into a new canvas at `scale` px per point. */
export async function renderToCanvas(doc: PDFDocumentProxy, index: number, scale: number): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(index + 1);
  const vp = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(vp.width));
  canvas.height = Math.max(1, Math.floor(vp.height));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return canvas;
}

export const canvasToBytes = (canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.9) =>
  new Promise<Uint8Array>((resolve, reject) =>
    canvas.toBlob(async (b) => (b ? resolve(new Uint8Array(await b.arrayBuffer())) : reject(new Error("Image encoding failed"))), type, quality),
  );

/**
 * Text runs of a page in top-left "view" coordinates (points, rotation applied),
 * with font size and bold/italic hints. Shared by Markdown, Word, Excel,
 * Compare and Redact.
 */
export async function pageTextRuns(doc: PDFDocumentProxy, index: number): Promise<{ runs: TextRun[]; width: number; height: number }> {
  const page = await doc.getPage(index + 1);
  const vp = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  await page.getOperatorList().catch(() => null); // loads fonts so their names are known
  const runs: TextRun[] = [];
  for (const raw of content.items) {
    if (!("str" in raw)) continue;
    const item = raw as TextItem;
    if (!item.str.trim()) continue;
    const [a, b, c, d, e, f] = item.transform as number[];
    const size = Math.hypot(c, d) || item.height || 10;
    const [x, y] = vp.convertToViewportPoint(e, f);
    const [x2] = vp.convertToViewportPoint(e + (a / (Math.hypot(a, b) || 1)) * item.width, f + (b / (Math.hypot(a, b) || 1)) * item.width);
    let name = "";
    try {
      name = (page.commonObjs.get(item.fontName) as { name?: string } | undefined)?.name ?? "";
    } catch {
      /* font not loaded */
    }
    runs.push({
      str: item.str,
      x: Math.min(x, x2),
      baseline: y,
      width: Math.abs(x2 - x),
      size,
      bold: /bold|black|heavy|semibold|demi/i.test(name),
      italic: /italic|oblique/i.test(name),
      eol: item.hasEOL,
      // PDF user-space origin, needed by tools that edit the original page.
      user: { x: e, y: f, dx: a / (Math.hypot(a, b) || 1), dy: b / (Math.hypot(a, b) || 1), ux: c, uy: d, width: item.width },
    });
  }
  return { runs, width: vp.width, height: vp.height };
}
