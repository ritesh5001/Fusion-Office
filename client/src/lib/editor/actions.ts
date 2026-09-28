"use client";

import { useEditor } from "./store";
import { createImage, newId } from "./objects";
import { readImageFile, downloadBytes, printBytes } from "./images";
import { toast } from "./events";
import type { DocumentState, EditorPage } from "./types";
import { clearSources, loadPdfSource, readFileBytes, registerSource } from "../pdf/sources";
import { exportPdf, imageToPdfBytes, type ExportOptions } from "../pdf/exporter";
import { loadDocumentLocal, saveDocumentLocal, saveSourceLocal } from "../storage/local";

export const MAX_FILE_MB = Number(process.env.NEXT_PUBLIC_MAX_FILE_MB ?? 200);

const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const isImage = (f: File) => /^image\/(png|jpe?g|webp|gif|bmp)$/.test(f.type);

function checkSize(file: File) {
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new Error(`File is larger than ${MAX_FILE_MB} MB.`);
  }
}

async function sourceFromFile(file: File) {
  checkSize(file);
  if (isPdf(file)) {
    const bytes = await readFileBytes(file);
    return { bytes, ...(await loadPdfSource(bytes, file.name)) };
  }
  if (isImage(file)) {
    const img = await readImageFile(file);
    const bytes = await imageToPdfBytes(img.src, img.width, img.height);
    return { bytes, ...(await loadPdfSource(bytes, file.name)) };
  }
  throw new Error("Unsupported file type. Please choose a PDF or an image.");
}

/** Open a PDF (or an image, converted to a 1-page PDF) as a new document. */
export async function openFile(file: File): Promise<void> {
  clearSources();
  const { bytes, source, pages } = await sourceFromFile(file);
  const doc: DocumentState = {
    id: newId(),
    name: isPdf(file) ? file.name : file.name.replace(/\.[^.]+$/, "") + ".pdf",
    sources: [source],
    pages,
  };
  useEditor.getState().loadDocument(doc);
  saveSourceLocal(source.id, bytes).catch(() => {});
  saveDocumentLocal(doc).catch(() => {});
}

export function newBlankDocument() {
  clearSources();
  const doc: DocumentState = {
    id: newId(),
    name: "Untitled.pdf",
    sources: [],
    pages: [{ id: newId(), source: { kind: "blank" }, width: 595.28, height: 841.89, baseRotation: 0, rotation: 0, objects: [] }],
  };
  useEditor.getState().loadDocument(doc);
  saveDocumentLocal(doc).catch(() => {});
}

/** Open a document previously saved in this browser. */
export async function openRecent(id: string): Promise<void> {
  const stored = await loadDocumentLocal(id);
  if (!stored) throw new Error("This document is no longer available on this device.");
  clearSources();
  for (const src of stored.state.sources) {
    const bytes = stored.sources.get(src.id);
    if (!bytes) throw new Error(`Original file "${src.name}" is missing from local storage.`);
    registerSource(src.id, bytes);
  }
  useEditor.getState().loadDocument(stored.state, { cloudId: stored.cloudId });
}

/** Open a document from raw state + source bytes (used by cloud open). */
export function openFromState(state: DocumentState, sources: Map<string, Uint8Array>, cloudId: string | null) {
  clearSources();
  for (const [id, bytes] of sources) {
    registerSource(id, bytes);
    saveSourceLocal(id, bytes).catch(() => {});
  }
  useEditor.getState().loadDocument(state, { cloudId });
  saveDocumentLocal(state, cloudId).catch(() => {});
}

/** Insert every page of another PDF (or an image as a page). */
export async function insertFile(file: File, atIndex?: number) {
  const st = useEditor.getState();
  if (!st.doc) return;
  const { bytes, source, pages } = await sourceFromFile(file);
  st.addSource(source);
  const idx = atIndex ?? currentIndex() + 1;
  st.insertPages(pages, idx);
  saveSourceLocal(source.id, bytes).catch(() => {});
  toast(`Inserted ${pages.length} page${pages.length > 1 ? "s" : ""} from ${file.name}`, "success");
}

export function currentIndex() {
  const { doc, currentPageId } = useEditor.getState();
  if (!doc) return 0;
  return Math.max(0, doc.pages.findIndex((p) => p.id === currentPageId));
}

export function currentPage(): EditorPage | undefined {
  const { doc } = useEditor.getState();
  return doc?.pages[currentIndex()];
}

/** Place an image object on the current page. */
export async function insertImageObject(file: File, opts: { isSignature?: boolean } = {}) {
  const page = currentPage();
  if (!page) return;
  const img = await readImageFile(file);
  placeImage(img.src, img.width, img.height, opts);
}

export function placeImage(src: string, width: number, height: number, opts: { isSignature?: boolean } = {}) {
  const page = currentPage();
  if (!page) return;
  const obj = createImage(page, src, width, height, { maxFrac: opts.isSignature ? 0.3 : 0.5, isSignature: opts.isSignature });
  const st = useEditor.getState();
  st.addObject(page.id, obj);
  st.setTool("select");
}

const baseName = () => (useEditor.getState().doc?.name ?? "document.pdf").replace(/\.pdf$/i, "");

export async function exportDocument(opts: ExportOptions = {}): Promise<Uint8Array> {
  const { doc } = useEditor.getState();
  if (!doc) throw new Error("No document open");
  return exportPdf(doc, opts);
}

export async function downloadDocument(opts: ExportOptions = {}) {
  const bytes = await exportDocument(opts);
  downloadBytes(bytes, `${baseName()}${opts.flatten ? "-flattened" : ""}.pdf`);
}

export async function extractPages(pageIds: string[]) {
  const { doc } = useEditor.getState();
  if (!doc || pageIds.length === 0) return;
  const bytes = await exportPdf(doc, { pageIds });
  const nums = doc.pages
    .map((p, i) => (pageIds.includes(p.id) ? i + 1 : 0))
    .filter(Boolean)
    .join("-");
  downloadBytes(bytes, `${baseName()}-pages-${nums.length > 40 ? "selection" : nums}.pdf`);
}

/** Split into several files. `groups` are lists of 0-based page indexes. */
export async function splitDocument(groups: number[][]) {
  const { doc } = useEditor.getState();
  if (!doc) return;
  for (const [n, group] of groups.entries()) {
    const ids = group.map((i) => doc.pages[i]?.id).filter(Boolean) as string[];
    if (!ids.length) continue;
    const bytes = await exportPdf(doc, { pageIds: ids });
    downloadBytes(bytes, `${baseName()}-part-${n + 1}.pdf`);
    // Browsers throttle rapid multiple downloads; space them out slightly.
    await new Promise((r) => setTimeout(r, 350));
  }
}

export async function printDocument() {
  const bytes = await exportDocument({ includeComments: false });
  printBytes(bytes);
}

/** Parse "1-3, 5, 8-10" into groups of 0-based indexes, validated against pageCount. */
export function parseRanges(input: string, pageCount: number): number[][] {
  const groups: number[][] = [];
  for (const part of input.split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!m) throw new Error(`"${part}" is not a valid page range`);
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b > pageCount || a > b) throw new Error(`Range "${part}" is outside 1–${pageCount}`);
    groups.push(Array.from({ length: b - a + 1 }, (_, i) => a - 1 + i));
  }
  return groups;
}
