import { PDFDocument, degrees } from "pdf-lib";
import { loadPdf, save } from "./common";

/** Combine PDFs in the given order. */
export async function mergePdfs(inputs: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const bytes of inputs) {
    const src = await loadPdf(bytes);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return save(out);
}

/** One output PDF per group of 0-based page indexes. */
export async function splitPdf(bytes: Uint8Array, groups: number[][]): Promise<Uint8Array[]> {
  const src = await loadPdf(bytes);
  const outs: Uint8Array[] = [];
  for (const group of groups) {
    const out = await PDFDocument.create();
    const pages = await out.copyPages(src, group);
    pages.forEach((p) => out.addPage(p));
    outs.push(await save(out));
  }
  return outs;
}

/** Add `delta` degrees (multiple of 90) to the selected pages (default: all). */
export async function rotatePdf(bytes: Uint8Array, delta: number, pages?: number[]): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const targets = pages ?? doc.getPageIndices();
  for (const i of targets) {
    const page = doc.getPage(i);
    page.setRotation(degrees((((page.getRotation().angle + delta) % 360) + 360) % 360));
  }
  return save(doc);
}

export type PagePlanItem =
  | { kind: "page"; file: number; page: number; rotate: number }
  | { kind: "blank"; width: number; height: number };

/** Build a new PDF from pages of one or more files (Organize PDF). */
export async function assemblePages(files: Uint8Array[], plan: PagePlanItem[]): Promise<Uint8Array> {
  const srcs = await Promise.all(files.map(loadPdf));
  const out = await PDFDocument.create();
  for (const item of plan) {
    if (item.kind === "blank") {
      out.addPage([item.width, item.height]);
      continue;
    }
    const [copy] = await out.copyPages(srcs[item.file], [item.page]);
    const page = out.addPage(copy);
    if (item.rotate) page.setRotation(degrees((((page.getRotation().angle + item.rotate) % 360) + 360) % 360));
  }
  return save(out);
}

export async function pageCount(bytes: Uint8Array): Promise<number> {
  return (await loadPdf(bytes)).getPageCount();
}
