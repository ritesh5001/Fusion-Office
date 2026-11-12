/**
 * More page tools built on pdf-lib (they run in the browser and in tests):
 * delete / extract / reverse pages, blank pages, page size, annotations,
 * booklet and poster layouts, rubber stamps, QR codes, attachments and
 * bookmarks.
 */
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNull,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  PDFString,
  StandardFonts,
  concatTransformationMatrix,
  decodePDFRawStream,
  popGraphicsState,
  pushGraphicsState,
  rgb,
} from "pdf-lib";
import qrcode from "qrcode-generator";
import { hexToRgb01, objectMatrix } from "../../pdf/geometry";
import { loadPdf, save } from "./common";
import { drawFitted, embedAll, shown } from "./pages";
import { inView, place, type Position } from "./stamp";

const copyTo = async (src: PDFDocument, order: number[]) => {
  const out = await PDFDocument.create();
  (await out.copyPages(src, order)).forEach((p) => out.addPage(p));
  return save(out);
};

// ─── Delete / extract / reverse ───────────────────────────────────

/**
 * Remove pages (0-based). The result is a new file that holds only the pages
 * kept, so the deleted pages can't be recovered from it.
 */
export async function deletePages(bytes: Uint8Array, remove: number[]): Promise<{ bytes: Uint8Array; removed: number; kept: number }> {
  const src = await loadPdf(bytes);
  const gone = new Set(remove);
  const keep = src.getPageIndices().filter((i) => !gone.has(i));
  if (!keep.length) throw new Error("That would delete every page. Leave at least one.");
  return { bytes: await copyTo(src, keep), removed: src.getPageCount() - keep.length, kept: keep.length };
}

/** The chosen pages as one new PDF, in the order given. */
export async function extractPages(bytes: Uint8Array, pages: number[]): Promise<Uint8Array> {
  if (!pages.length) throw new Error("Choose at least one page.");
  return copyTo(await loadPdf(bytes), pages);
}

/** Last page first. */
export async function reversePages(bytes: Uint8Array): Promise<Uint8Array> {
  const src = await loadPdf(bytes);
  return copyTo(src, src.getPageIndices().reverse());
}

// ─── Blank pages ──────────────────────────────────────────────────

export interface BlankOptions {
  /** Where the blank pages go. "after" uses `page` (1-based); "every" adds one after each page. */
  where: "start" | "end" | "after" | "every";
  page: number;
  count: number;
}

/** Insert blank pages, each the size of the page next to it. */
export async function insertBlankPages(bytes: Uint8Array, o: BlankOptions): Promise<{ bytes: Uint8Array; added: number }> {
  const doc = await loadPdf(bytes);
  const n = doc.getPageCount();
  const count = Math.max(1, Math.min(200, Math.floor(o.count)));
  const sizeOf = (i: number): [number, number] => {
    const s = shown(doc.getPage(Math.max(0, Math.min(doc.getPageCount() - 1, i))));
    return [s.width, s.height];
  };
  let added = 0;
  if (o.where === "every") {
    // Back to front, so earlier indexes stay valid.
    for (let i = n - 1; i >= 0; i--) {
      const size = sizeOf(i);
      for (let k = 0; k < count; k++) doc.insertPage(i + 1, size);
      added += count;
    }
  } else {
    const at = o.where === "start" ? 0 : o.where === "end" ? n : Math.max(1, Math.min(n, Math.floor(o.page)));
    const size = sizeOf(at === 0 ? 0 : at - 1);
    for (let k = 0; k < count; k++) doc.insertPage(at, size);
    added = count;
  }
  return { bytes: await save(doc), added };
}

// ─── Page size ────────────────────────────────────────────────────

export const PAPER = {
  a3: [841.89, 1190.55],
  a4: [595.28, 841.89],
  a5: [419.53, 595.28],
  letter: [612, 792],
  legal: [612, 1008],
} as const;
export type Paper = keyof typeof PAPER;

export interface ResizeOptions {
  paper: Paper;
  /** "auto" keeps each page's own orientation. */
  orientation: "auto" | "portrait" | "landscape";
  /** Space left around the page, in points. */
  margin: number;
}

/** Put every page on the chosen paper size, scaled to fit and centred. */
export async function resizePages(bytes: Uint8Array, o: ResizeOptions, pages?: number[]): Promise<Uint8Array> {
  const src = await loadPdf(bytes);
  const out = await PDFDocument.create();
  const all = src.getPages();
  const only = pages ? new Set(pages) : null;
  for (const [i, page] of all.entries()) {
    if (only && !only.has(i)) {
      const [copy] = await out.copyPages(src, [i]);
      out.addPage(copy);
      continue;
    }
    const view = shown(page);
    const [a, b] = PAPER[o.paper];
    const landscape = o.orientation === "landscape" || (o.orientation === "auto" && view.width > view.height);
    const [W, H] = landscape ? [b, a] : [a, b];
    const sheet = out.addPage([W, H]);
    const [emb] = await embedAll(out, [page]);
    const m = Math.max(0, Math.min(o.margin, Math.min(W, H) / 3));
    if (emb) drawFitted(sheet, emb, view.rotation, { x: m, y: m, w: W - 2 * m, h: H - 2 * m });
  }
  return save(out);
}

// ─── Annotations ──────────────────────────────────────────────────

export interface RemoveAnnotationsOptions {
  keepLinks: boolean;
  keepFormFields: boolean;
}

/** Delete comments, highlights, stamps and drawings (and, optionally, links and form fields). */
export async function removeAnnotations(bytes: Uint8Array, o: RemoveAnnotationsOptions, pages?: number[]): Promise<{ bytes: Uint8Array; removed: number }> {
  const doc = await loadPdf(bytes);
  let removed = 0;
  for (const i of pages ?? doc.getPageIndices()) {
    const page = doc.getPage(i);
    const annots = page.node.Annots();
    if (!annots) continue;
    const keep: PDFRef[] = [];
    for (let k = 0; k < annots.size(); k++) {
      const ref = annots.get(k);
      const a = doc.context.lookup(ref);
      const subtype = a instanceof PDFDict ? (a.lookup(PDFName.of("Subtype")) as PDFName | undefined)?.decodeText() : undefined;
      const stays = (subtype === "Link" && o.keepLinks) || (subtype === "Widget" && o.keepFormFields);
      if (stays && ref instanceof PDFRef) keep.push(ref);
      else {
        removed++;
        // Drop the object itself, so the comment's text isn't left in the file.
        if (ref instanceof PDFRef) doc.context.delete(ref);
      }
    }
    if (keep.length) page.node.set(PDFName.of("Annots"), doc.context.obj(keep));
    else page.node.delete(PDFName.of("Annots"));
  }
  return { bytes: await save(doc), removed };
}

// ─── Booklet ──────────────────────────────────────────────────────

export interface BookletOptions {
  paper: "a4" | "letter" | "a3";
  /** Right-to-left books (Urdu, Arabic, Hebrew) bind on the right. */
  rightToLeft: boolean;
}

/**
 * The order pages are printed in for a folded booklet of `n` pages (a
 * multiple of 4): pairs of [left, right] for the front and back of each
 * sheet. -1 is a blank side.
 */
export function bookletOrder(pageCount: number): [number, number][] {
  const n = Math.ceil(pageCount / 4) * 4;
  const at = (i: number) => (i < pageCount ? i : -1);
  const sides: [number, number][] = [];
  for (let s = 0; s < n / 4; s++) {
    sides.push([at(n - 1 - 2 * s), at(2 * s)]); // front
    sides.push([at(2 * s + 1), at(n - 2 - 2 * s)]); // back
  }
  return sides;
}

/** Arrange pages two to a sheet so that printing double-sided and folding in half makes a booklet. */
export async function bookletPdf(bytes: Uint8Array, o: BookletOptions): Promise<{ bytes: Uint8Array; sheets: number }> {
  const src = await loadPdf(bytes);
  const out = await PDFDocument.create();
  const pages = src.getPages();
  const embedded = await embedAll(out, pages);
  const [a, b] = PAPER[o.paper];
  const [W, H] = [Math.max(a, b), Math.min(a, b)];
  const sides = bookletOrder(pages.length);
  for (const pair of sides) {
    const sheet = out.addPage([W, H]);
    (o.rightToLeft ? [pair[1], pair[0]] : pair).forEach((p, k) => {
      const emb = p < 0 ? null : embedded[p];
      if (emb) drawFitted(sheet, emb, shown(pages[p]).rotation, { x: k * (W / 2), y: 0, w: W / 2, h: H });
    });
  }
  return { bytes: await save(out), sheets: sides.length / 2 };
}

// ─── Poster (tile) ────────────────────────────────────────────────

export interface PosterOptions {
  cols: number;
  rows: number;
  paper: Paper;
  /** Extra strip repeated on neighbouring sheets, for gluing, in points. */
  overlap: number;
}

/** Enlarge each page across cols × rows sheets that tape together into a poster. */
export async function posterPdf(bytes: Uint8Array, o: PosterOptions, pages?: number[]): Promise<{ bytes: Uint8Array; sheets: number }> {
  const src = await loadPdf(bytes);
  const out = await PDFDocument.create();
  const cols = Math.max(1, Math.min(10, Math.floor(o.cols)));
  const rows = Math.max(1, Math.min(10, Math.floor(o.rows)));
  let sheets = 0;
  for (const i of pages ?? src.getPageIndices()) {
    const page = src.getPage(i);
    const view = shown(page);
    const [emb] = await embedAll(out, [page]);
    // Sheets turn to match the shape of one tile.
    const [a, b] = PAPER[o.paper];
    const tileLandscape = view.width / cols > view.height / rows;
    const [SW, SH] = tileLandscape ? [Math.max(a, b), Math.min(a, b)] : [Math.min(a, b), Math.max(a, b)];
    const ov = Math.max(0, Math.min(o.overlap, Math.min(SW, SH) / 4));
    // Each sheet shows its tile plus the overlap strip; the whole poster keeps the page's shape.
    const stepW = SW - ov;
    const stepH = SH - ov;
    const s = Math.min((stepW * cols + ov) / view.width, (stepH * rows + ov) / view.height);
    const posterW = view.width * s;
    const posterH = view.height * s;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sheet = out.addPage([SW, SH]);
        // Poster's top-left tile is r = 0, c = 0; PDF's origin is bottom-left.
        const x = -c * stepW;
        const y = SH - posterH + r * stepH;
        if (emb) drawFitted(sheet, emb, view.rotation, { x, y, w: posterW, h: posterH });
        sheets++;
      }
    }
  }
  return { bytes: await save(out), sheets };
}

// ─── Rubber stamps ────────────────────────────────────────────────

export const STAMP_PRESETS = [
  { id: "paid", text: "PAID", color: "#15803d" },
  { id: "approved", text: "APPROVED", color: "#15803d" },
  { id: "received", text: "RECEIVED", color: "#1d4ed8" },
  { id: "verified", text: "VERIFIED", color: "#1d4ed8" },
  { id: "original", text: "ORIGINAL", color: "#1d4ed8" },
  { id: "copy", text: "COPY", color: "#1d4ed8" },
  { id: "draft", text: "DRAFT", color: "#6b7280" },
  { id: "confidential", text: "CONFIDENTIAL", color: "#b91c1c" },
  { id: "rejected", text: "REJECTED", color: "#b91c1c" },
  { id: "cancelled", text: "CANCELLED", color: "#b91c1c" },
  { id: "urgent", text: "URGENT", color: "#b91c1c" },
] as const;

export interface StampOptions {
  text: string;
  /** Smaller second line, e.g. a date or a name. */
  subtext: string;
  color: string;
  position: Position;
  /** Width of the stamp as a fraction of the page width. */
  scale: number;
  rotation: number;
  opacity: number;
  margin: number;
}

/** A rubber-stamp mark (double border, bold capitals) on the chosen pages. */
export async function stampPdf(bytes: Uint8Array, o: StampOptions, pages?: number[]): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const safe = (s: string) =>
    [...s]
      .map((ch) => {
        try {
          font.encodeText(ch);
          return ch;
        } catch {
          return "?";
        }
      })
      .join("");
  const text = safe(o.text.trim().toUpperCase());
  const sub = safe(o.subtext.trim());
  if (!text) throw new Error("Type the stamp text.");
  const [r, g, b] = hexToRgb01(o.color);
  const ink = rgb(r, g, b);
  for (const i of pages ?? doc.getPageIndices()) {
    const page = doc.getPage(i);
    inView(page, (VH, VW) => {
      const w = Math.max(60, VW * o.scale);
      const padX = w * 0.09;
      // Fit the main line to the stamp's width.
      const size = Math.min(w * 0.3, ((w - 2 * padX) / font.widthOfTextAtSize(text, 100)) * 100);
      const subSize = sub ? Math.min(size * 0.38, ((w - 2 * padX) / Math.max(1, font.widthOfTextAtSize(sub, 100))) * 100) : 0;
      const h = size * 1.5 + (sub ? subSize * 1.5 : 0);
      const { cx, cy } = place(o.position, VW, VH, w, h, o.margin);
      const line = Math.max(1, size * 0.07);
      page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...objectMatrix(cx, VH - cy, -o.rotation)));
      page.drawRectangle({ x: -w / 2, y: -h / 2, width: w, height: h, borderColor: ink, borderWidth: line, borderOpacity: o.opacity });
      const inset = line * 2.2;
      page.drawRectangle({ x: -w / 2 + inset, y: -h / 2 + inset, width: w - 2 * inset, height: h - 2 * inset, borderColor: ink, borderWidth: line * 0.45, borderOpacity: o.opacity });
      const tw = font.widthOfTextAtSize(text, size);
      const top = h / 2 - size * 1.12;
      page.drawText(text, { x: -tw / 2, y: sub ? top : -size * 0.36, size, font, color: ink, opacity: o.opacity });
      if (sub) {
        const sw = font.widthOfTextAtSize(sub, subSize);
        page.drawText(sub, { x: -sw / 2, y: top - subSize * 1.35, size: subSize, font, color: ink, opacity: o.opacity });
      }
      page.pushOperators(popGraphicsState());
    });
  }
  return save(doc);
}

// ─── QR codes ─────────────────────────────────────────────────────

/** The dark/light squares of a QR code for `text`. */
export function qrMatrix(text: string, level: "L" | "M" | "Q" | "H" = "M"): boolean[][] {
  const data = text.trim();
  if (!data) throw new Error("Type the link or text for the QR code.");
  const qr = qrcode(0, level);
  // Encode as UTF-8 bytes, so Hindi and other scripts scan correctly.
  qr.addData(String.fromCharCode(...new TextEncoder().encode(data)), "Byte");
  try {
    qr.make();
  } catch {
    throw new Error("That's too much text for one QR code. Use a shorter link.");
  }
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

export interface QrOptions {
  text: string;
  position: Position;
  /** Side of the code in points (72 = 1 inch). */
  size: number;
  margin: number;
  /** Small caption under the code. */
  label: string;
}

/** Print a QR code on the chosen pages (a link to the original, a UPI ID, a document number…). */
export async function qrStampPdf(bytes: Uint8Array, o: QrOptions, pages?: number[]): Promise<Uint8Array> {
  const cells = qrMatrix(o.text);
  const doc = await loadPdf(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const n = cells.length;
  const quiet = 2; // light border, in modules
  const label = [...o.label.trim()].filter((ch) => font.getCharacterSet().includes(ch.codePointAt(0)!)).join("");
  for (const i of pages ?? doc.getPageIndices()) {
    const page = doc.getPage(i);
    inView(page, (VH, VW) => {
      const side = Math.max(36, Math.min(o.size, Math.min(VW, VH) - 2 * o.margin));
      const labelSize = label ? Math.max(5, Math.min(8, side * 0.09)) : 0;
      const h = side + (label ? labelSize * 1.6 : 0);
      const { cx, cy } = place(o.position, VW, VH, side, h, o.margin);
      const x0 = cx - side / 2;
      const yTop = VH - cy + h / 2;
      page.drawRectangle({ x: x0, y: yTop - h, width: side, height: h, color: rgb(1, 1, 1) });
      const m = side / (n + 2 * quiet);
      for (let r = 0; r < n; r++) {
        // Join neighbouring dark squares into one bar: smaller file, no hairline gaps.
        for (let c = 0; c < n; c++) {
          if (!cells[r][c]) continue;
          let end = c;
          while (end + 1 < n && cells[r][end + 1]) end++;
          page.drawRectangle({ x: x0 + (quiet + c) * m, y: yTop - (quiet + r + 1) * m, width: (end - c + 1) * m, height: m, color: rgb(0, 0, 0) });
          c = end;
        }
      }
      if (label) {
        const w = font.widthOfTextAtSize(label, labelSize);
        page.drawText(label, { x: cx - Math.min(w, side) / 2, y: yTop - side - labelSize * 1.05, size: labelSize, font, color: rgb(0.1, 0.1, 0.1), maxWidth: side });
      }
    });
  }
  return save(doc);
}

// ─── Attachments ──────────────────────────────────────────────────

export interface Attachment {
  name: string;
  bytes: Uint8Array;
  type: string;
}

/** Embed files inside a PDF (they show in the reader's attachments panel). */
export async function addAttachments(bytes: Uint8Array, files: Attachment[]): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  for (const f of files) await doc.attach(f.bytes, f.name, { mimeType: f.type || "application/octet-stream", creationDate: new Date(), modificationDate: new Date() });
  return save(doc);
}

const textOf = (o: unknown) => (o instanceof PDFString || o instanceof PDFHexString ? o.decodeText() : undefined);

/** Walk a name tree, collecting its values. */
function nameTreeValues(doc: PDFDocument, node: PDFDict, out: PDFDict[], depth = 0) {
  if (depth > 32) return;
  const names = node.lookup(PDFName.of("Names"));
  if (names instanceof PDFArray) {
    for (let i = 1; i < names.size(); i += 2) {
      const v = doc.context.lookup(names.get(i));
      if (v instanceof PDFDict) out.push(v);
    }
  }
  const kids = node.lookup(PDFName.of("Kids"));
  if (kids instanceof PDFArray) {
    for (let i = 0; i < kids.size(); i++) {
      const k = doc.context.lookup(kids.get(i));
      if (k instanceof PDFDict) nameTreeValues(doc, k, out, depth + 1);
    }
  }
}

function fileFromSpec(doc: PDFDocument, spec: PDFDict, fallback: string): Attachment | null {
  const ef = spec.lookup(PDFName.of("EF"));
  if (!(ef instanceof PDFDict)) return null;
  const stream = ef.lookup(PDFName.of("UF")) ?? ef.lookup(PDFName.of("F"));
  if (!(stream instanceof PDFRawStream)) return null;
  const name = (textOf(spec.lookup(PDFName.of("UF"))) ?? textOf(spec.lookup(PDFName.of("F"))) ?? fallback).split(/[\\/]/).pop() || fallback;
  const subtype = stream.dict.lookup(PDFName.of("Subtype"));
  let data: Uint8Array;
  try {
    data = decodePDFRawStream(stream).decode();
  } catch {
    return null;
  }
  return { name, bytes: data, type: subtype instanceof PDFName ? subtype.decodeText() : "application/octet-stream" };
}

/** Files embedded in a PDF: the document's attachments and any paperclip annotations on pages. */
export async function listAttachments(bytes: Uint8Array): Promise<Attachment[]> {
  const doc = await loadPdf(bytes);
  const specs: PDFDict[] = [];
  const names = doc.catalog.lookup(PDFName.of("Names"));
  const tree = names instanceof PDFDict ? names.lookup(PDFName.of("EmbeddedFiles")) : undefined;
  if (tree instanceof PDFDict) nameTreeValues(doc, tree, specs);
  for (const page of doc.getPages()) {
    const annots = page.node.Annots();
    for (let k = 0; annots && k < annots.size(); k++) {
      const a = doc.context.lookup(annots.get(k));
      if (!(a instanceof PDFDict)) continue;
      if ((a.lookup(PDFName.of("Subtype")) as PDFName | undefined)?.decodeText() !== "FileAttachment") continue;
      const fs = a.lookup(PDFName.of("FS"));
      if (fs instanceof PDFDict) specs.push(fs);
    }
  }
  const out: Attachment[] = [];
  const seen = new Set<PDFDict>();
  for (const s of specs) {
    if (seen.has(s)) continue;
    seen.add(s);
    const f = fileFromSpec(doc, s, `attachment-${out.length + 1}`);
    if (f) out.push(f);
  }
  return out;
}

/** Remove every embedded file. */
export async function removeAttachments(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const names = doc.catalog.lookup(PDFName.of("Names"));
  if (names instanceof PDFDict) names.delete(PDFName.of("EmbeddedFiles"));
  doc.catalog.delete(PDFName.of("AF"));
  for (const page of doc.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    const keep: PDFRef[] = [];
    for (let k = 0; k < annots.size(); k++) {
      const ref = annots.get(k);
      const a = doc.context.lookup(ref);
      const isFile = a instanceof PDFDict && (a.lookup(PDFName.of("Subtype")) as PDFName | undefined)?.decodeText() === "FileAttachment";
      if (!isFile && ref instanceof PDFRef) keep.push(ref);
    }
    if (keep.length) page.node.set(PDFName.of("Annots"), doc.context.obj(keep));
    else page.node.delete(PDFName.of("Annots"));
  }
  // Rebuild from the pages, so the embedded data itself is gone from the file.
  const out = await PDFDocument.create();
  (await out.copyPages(doc, doc.getPageIndices())).forEach((p) => out.addPage(p));
  return save(out);
}

// ─── Bookmarks ────────────────────────────────────────────────────

export interface Bookmark {
  title: string;
  /** 1-based page number. */
  page: number;
  /** 0 = top level; each level nests under the bookmark above it. */
  level: number;
}

/**
 * Bookmarks as editable text: one per line, the page number first, indented
 * two spaces per level.
 *
 *     1 Introduction
 *     4 Chapter 1
 *       6 Background
 */
export const bookmarksToText = (list: Bookmark[]) => list.map((b) => `${"  ".repeat(b.level)}${b.page} ${b.title}`).join("\n");

export function parseBookmarks(text: string, pageCount: number): Bookmark[] {
  const out: Bookmark[] = [];
  for (const [n, raw] of text.split("\n").entries()) {
    if (!raw.trim()) continue;
    const m = raw.replace(/\t/g, "  ").match(/^(\s*)(\d+)[\s.:)-]+(.+)$/);
    if (!m) throw new Error(`Line ${n + 1}: start each bookmark with its page number, like "4 Chapter 1".`);
    const page = Number(m[2]);
    if (page < 1 || page > pageCount) throw new Error(`Line ${n + 1}: page ${page} is outside 1–${pageCount}.`);
    // A bookmark can only be one level deeper than the one before it.
    const level = Math.min(Math.floor(m[1].length / 2), out.length ? out[out.length - 1].level + 1 : 0);
    out.push({ title: m[3].trim(), page, level });
  }
  return out;
}

/** Replace a PDF's bookmarks (its outline). An empty list removes them. */
export async function writeBookmarks(bytes: Uint8Array, list: Bookmark[]): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const ctx = doc.context;
  if (!list.length) {
    doc.catalog.delete(PDFName.of("Outlines"));
    return save(doc);
  }
  const pages = doc.getPages();
  const rootRef = ctx.nextRef();
  type Node = { ref: PDFRef; b: Bookmark; children: Node[] };
  const top: Node[] = [];
  const stack: Node[] = [];
  for (const b of list) {
    const node: Node = { ref: ctx.nextRef(), b, children: [] };
    while (stack.length > b.level) stack.pop();
    (stack.length ? stack[stack.length - 1].children : top).push(node);
    stack.push(node);
  }
  const countOf = (n: Node): number => n.children.reduce((sum, c) => sum + 1 + countOf(c), 0);
  const emit = (nodes: Node[], parent: PDFRef) => {
    nodes.forEach((n, i) => {
      const page = pages[n.b.page - 1];
      const dict = ctx.obj({}) as PDFDict;
      dict.set(PDFName.of("Title"), PDFHexString.fromText(n.b.title));
      dict.set(PDFName.of("Parent"), parent);
      if (i > 0) dict.set(PDFName.of("Prev"), nodes[i - 1].ref);
      if (i < nodes.length - 1) dict.set(PDFName.of("Next"), nodes[i + 1].ref);
      // Top of the page, keeping the reader's zoom.
      dict.set(PDFName.of("Dest"), ctx.obj([page.ref, PDFName.of("XYZ"), PDFNull, PDFNumber.of(page.getHeight()), PDFNull]));
      if (n.children.length) {
        dict.set(PDFName.of("First"), n.children[0].ref);
        dict.set(PDFName.of("Last"), n.children[n.children.length - 1].ref);
        dict.set(PDFName.of("Count"), PDFNumber.of(countOf(n)));
        emit(n.children, n.ref);
      }
      ctx.assign(n.ref, dict);
    });
  };
  emit(top, rootRef);
  const root = ctx.obj({}) as PDFDict;
  root.set(PDFName.of("Type"), PDFName.of("Outlines"));
  root.set(PDFName.of("First"), top[0].ref);
  root.set(PDFName.of("Last"), top[top.length - 1].ref);
  root.set(PDFName.of("Count"), PDFNumber.of(top.reduce((sum, n) => sum + 1 + countOf(n), 0)));
  ctx.assign(rootRef, root);
  doc.catalog.set(PDFName.of("Outlines"), rootRef);
  // Open with the bookmarks panel showing.
  doc.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
  return save(doc);
}
