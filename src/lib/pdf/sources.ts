import type { PDFDocumentProxy } from "pdfjs-dist";
import { getPdfjs } from "./pdfjs";
import { newId } from "../editor/objects";
import type { EditorPage, SourceMeta } from "../editor/types";

/**
 * Registry of source PDFs. Raw bytes and PDF.js document proxies are large,
 * non-serializable objects, so they live here instead of in the Zustand store.
 * The store only references sources by id.
 */
interface SourceEntry {
  bytes: Uint8Array;
  doc?: Promise<PDFDocumentProxy>;
}

const registry = new Map<string, SourceEntry>();

export class PdfLoadError extends Error {
  constructor(
    message: string,
    public code: "password" | "invalid" | "unknown",
  ) {
    super(message);
  }
}

export function registerSource(id: string, bytes: Uint8Array) {
  registry.set(id, { bytes });
}

export function hasSource(id: string) {
  return registry.has(id);
}

export function getSourceBytes(id: string): Uint8Array {
  const entry = registry.get(id);
  if (!entry) throw new Error(`Unknown source ${id}`);
  return entry.bytes;
}

export function getPdfDocument(id: string): Promise<PDFDocumentProxy> {
  const entry = registry.get(id);
  if (!entry) return Promise.reject(new Error(`Unknown source ${id}`));
  if (!entry.doc) {
    entry.doc = getPdfjs().then(async (pdfjs) => {
      // pdf.js transfers the buffer to its worker, so always hand it a copy.
      const task = pdfjs.getDocument({ data: entry.bytes.slice(), isEvalSupported: false });
      try {
        return await task.promise;
      } catch (err) {
        entry.doc = undefined;
        const name = (err as { name?: string })?.name;
        if (name === "PasswordException")
          throw new PdfLoadError("This PDF is password-protected. Password-protected files are not supported yet.", "password");
        if (name === "InvalidPDFException")
          throw new PdfLoadError("This file is not a valid PDF or is damaged.", "invalid");
        throw new PdfLoadError((err as Error)?.message ?? "Failed to open PDF", "unknown");
      }
    });
  }
  return entry.doc;
}

export function clearSources() {
  for (const entry of registry.values()) entry.doc?.then((d) => d.destroy()).catch(() => {});
  registry.clear();
}

/** Register PDF bytes and build EditorPage entries for every page in it. */
export async function loadPdfSource(
  bytes: Uint8Array,
  name: string,
  sourceId = newId(),
): Promise<{ source: SourceMeta; pages: EditorPage[] }> {
  registerSource(sourceId, bytes);
  let pdf: PDFDocumentProxy;
  try {
    pdf = await getPdfDocument(sourceId);
  } catch (err) {
    registry.delete(sourceId);
    throw err;
  }
  const pages: EditorPage[] = [];
  for (let i = 0; i < pdf.numPages; i++) {
    const page = await pdf.getPage(i + 1);
    const [x0, y0, x1, y1] = page.view;
    pages.push({
      id: newId(),
      source: { kind: "pdf", sourceId, pageIndex: i },
      width: x1 - x0,
      height: y1 - y0,
      baseRotation: page.rotate,
      rotation: 0,
      objects: [],
    });
  }
  return { source: { id: sourceId, name, size: bytes.byteLength }, pages };
}

export async function readFileBytes(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}
