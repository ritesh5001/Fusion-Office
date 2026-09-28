"use client";

import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from "pdf-lib";
import { canvasToBytes, openPdf, renderToCanvas } from "../pdfjs";
import { derived, type ToolFile } from "../files";
import { loadPdf } from "./common";

export interface PdfToImagesOptions {
  format: "jpg" | "png";
  dpi: number;
  pages?: number[];
}

/** Render pages to image files. */
export async function pdfToImages(file: ToolFile, opts: PdfToImagesOptions, onProgress?: (d: number, t: number) => void): Promise<ToolFile[]> {
  const doc = await openPdf(file.bytes);
  const pages = opts.pages ?? [...Array(doc.numPages).keys()];
  const out: ToolFile[] = [];
  for (const [k, i] of pages.entries()) {
    onProgress?.(k, pages.length);
    const canvas = await renderToCanvas(doc, i, opts.dpi / 72);
    const type = opts.format === "png" ? "image/png" : "image/jpeg";
    out.push({ name: derived(file.name, `page-${i + 1}`, opts.format), bytes: await canvasToBytes(canvas, type, 0.92), type });
  }
  onProgress?.(pages.length, pages.length);
  await doc.destroy();
  return out;
}

/** Pull out embedded JPEG photos exactly as stored (no re-encoding). */
export async function extractImages(file: ToolFile): Promise<ToolFile[]> {
  const doc = await loadPdf(file.bytes);
  const out: ToolFile[] = [];
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const d = obj.dict;
    if (d.get(PDFName.of("Subtype"))?.toString() !== "/Image") continue;
    const filter = d.get(PDFName.of("Filter"))?.toString();
    const w = (d.get(PDFName.of("Width")) as PDFNumber | undefined)?.asNumber() ?? 0;
    if (filter === "/DCTDecode" && w >= 32) {
      out.push({ name: derived(file.name, `image-${out.length + 1}`, "jpg"), bytes: obj.contents, type: "image/jpeg" });
    }
  }
  return out;
}

export type PageSize = "fit" | "a4" | "letter";
export interface ImagesToPdfOptions {
  pageSize: PageSize;
  orientation: "auto" | "portrait" | "landscape";
  /** Margin in points. */
  margin: number;
}

const SIZES = { a4: [595.28, 841.89], letter: [612, 792] } as const;

/** Decode any browser-readable image to PNG/JPEG bytes pdf-lib can embed. */
async function normalize(file: ToolFile): Promise<{ bytes: Uint8Array; kind: "png" | "jpg" }> {
  if (file.type === "image/jpeg") return { bytes: file.bytes, kind: "jpg" };
  if (file.type === "image/png") return { bytes: file.bytes, kind: "png" };
  const bmp = await createImageBitmap(new Blob([file.bytes as BlobPart], { type: file.type }));
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext("2d")!.drawImage(bmp, 0, 0);
  return { bytes: await canvasToBytes(c, "image/png"), kind: "png" };
}

/** One image per page. */
export async function imagesToPdf(files: ToolFile[], opts: ImagesToPdfOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const f of files) {
    const { bytes, kind } = await normalize(f);
    const img = kind === "png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const landscapeImg = img.width > img.height;
    let W: number;
    let H: number;
    if (opts.pageSize === "fit") {
      // 1 px = 0.75 pt (96 dpi), capped so huge photos make sensible pages.
      const scale = Math.min(0.75, 1600 / Math.max(img.width, img.height));
      W = img.width * scale + opts.margin * 2;
      H = img.height * scale + opts.margin * 2;
    } else {
      const [a, b] = SIZES[opts.pageSize];
      const landscape = opts.orientation === "landscape" || (opts.orientation === "auto" && landscapeImg);
      [W, H] = landscape ? [b, a] : [a, b];
    }
    const page = doc.addPage([W, H]);
    const boxW = W - opts.margin * 2;
    const boxH = H - opts.margin * 2;
    const s = Math.min(boxW / img.width, boxH / img.height);
    const w = img.width * s;
    const h = img.height * s;
    page.drawImage(img, { x: (W - w) / 2, y: (H - h) / 2, width: w, height: h });
  }
  return doc.save();
}
