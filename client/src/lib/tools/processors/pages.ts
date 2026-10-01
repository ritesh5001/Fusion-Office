/**
 * Page tools built on pdf-lib (they run in the browser and in tests):
 * alternate & mix, pages per sheet, flip, split in half / by size, flatten,
 * metadata.
 */
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRef,
  PDFStream,
  concatTransformationMatrix,
  degrees,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFEmbeddedPage,
  type PDFPage,
} from "pdf-lib";
import { loadPdf, save } from "./common";

// ─── Alternate & mix ──────────────────────────────────────────────

export interface MixOptions {
  /** Take the second file's pages last-to-first (back sides of a one-sided scan). */
  reverseSecond: boolean;
}

/** One page from each file in turn: A1, B1, A2, B2… Longer files carry on alone. */
export async function alternatePages(inputs: Uint8Array[], opts: MixOptions): Promise<Uint8Array> {
  const docs = await Promise.all(inputs.map(loadPdf));
  const out = await PDFDocument.create();
  const orders = docs.map((d, i) => {
    const idx = d.getPageIndices();
    return i === 1 && opts.reverseSecond ? idx.reverse() : idx;
  });
  const longest = Math.max(...orders.map((o) => o.length));
  for (let k = 0; k < longest; k++) {
    for (const [i, d] of docs.entries()) {
      const at = orders[i][k];
      if (at === undefined) continue;
      const [page] = await out.copyPages(d, [at]);
      out.addPage(page);
    }
  }
  return save(out);
}

// ─── Pages per sheet (n-up) ───────────────────────────────────────

export type SheetSize = "a4" | "letter" | "source";
export interface NupOptions {
  perSheet: 2 | 4 | 6 | 9 | 16;
  sheet: SheetSize;
  border: boolean;
  /** Fill rows first (left→right) or columns first. */
  order: "rows" | "columns";
}

const SHEETS = { a4: [595.28, 841.89], letter: [612, 792] } as const;
const GRID: Record<NupOptions["perSheet"], [number, number]> = { 2: [2, 1], 4: [2, 2], 6: [3, 2], 9: [3, 3], 16: [4, 4] };

/** Size of a page as it is displayed (after /Rotate). */
const shown = (p: PDFPage) => {
  const { width, height } = p.getSize();
  const r = ((p.getRotation().angle % 360) + 360) % 360;
  return r === 90 || r === 270 ? { width: height, height: width, rotation: r } : { width, height, rotation: r };
};

/** Draw an embedded page into a box, scaled to fit, keeping its displayed orientation. */
function drawFitted(sheet: PDFPage, emb: PDFEmbeddedPage, rotation: number, box: { x: number; y: number; w: number; h: number }) {
  const turned = rotation === 90 || rotation === 270;
  const w = turned ? emb.height : emb.width;
  const h = turned ? emb.width : emb.height;
  const s = Math.min(box.w / w, box.h / h);
  const dw = w * s;
  const dh = h * s;
  const x0 = box.x + (box.w - dw) / 2;
  const y0 = box.y + (box.h - dh) / 2;
  // /Rotate turns the page clockwise; drawPage rotates counter-clockwise around (x, y).
  const at =
    rotation === 90 ? { x: x0, y: y0 + dh } : rotation === 180 ? { x: x0 + dw, y: y0 + dh } : rotation === 270 ? { x: x0 + dw, y: y0 } : { x: x0, y: y0 };
  sheet.drawPage(emb, { ...at, xScale: s, yScale: s, rotate: degrees(-rotation) });
  return { x: x0, y: y0, w: dw, h: dh };
}

export async function pagesPerSheet(bytes: Uint8Array, opts: NupOptions): Promise<Uint8Array> {
  const src = await loadPdf(bytes);
  const out = await PDFDocument.create();
  const pages = src.getPages();
  const embedded = await out.embedPages(pages);
  const first = shown(pages[0]);
  let [cols, rows] = GRID[opts.perSheet];
  // Sheet orientation follows the page shape: 2 portrait pages sit side by side on a landscape sheet.
  let [sw, sh] = opts.sheet === "source" ? [first.width, first.height] : SHEETS[opts.sheet];
  const portraitPages = first.height >= first.width;
  const landscapeSheet = cols > rows === portraitPages;
  if (landscapeSheet !== sw > sh) [sw, sh] = [sh, sw];
  if (!portraitPages && cols > rows) [cols, rows] = [rows, cols];
  const margin = 18;
  const gap = 10;
  const cw = (sw - 2 * margin - gap * (cols - 1)) / cols;
  const ch = (sh - 2 * margin - gap * (rows - 1)) / rows;
  const per = cols * rows;
  for (let start = 0; start < pages.length; start += per) {
    const sheet = out.addPage([sw, sh]);
    for (let k = 0; k < per && start + k < pages.length; k++) {
      const col = opts.order === "rows" ? k % cols : Math.floor(k / rows);
      const row = opts.order === "rows" ? Math.floor(k / cols) : k % rows;
      const box = { x: margin + col * (cw + gap), y: sh - margin - (row + 1) * ch - row * gap, w: cw, h: ch };
      const drawn = drawFitted(sheet, embedded[start + k], shown(pages[start + k]).rotation, box);
      if (opts.border) sheet.drawRectangle({ x: drawn.x, y: drawn.y, width: drawn.w, height: drawn.h, borderColor: rgb(0.7, 0.72, 0.76), borderWidth: 0.6 });
    }
  }
  return save(out);
}

// ─── Flip / mirror ────────────────────────────────────────────────

export type FlipMode = "horizontal" | "vertical" | "both";

/** Mirror page contents (like a reflection), for printing on transparencies or reversed scans. */
export async function flipPdf(bytes: Uint8Array, mode: FlipMode, pages?: number[]): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  for (const i of pages ?? doc.getPageIndices()) {
    const page = doc.getPage(i);
    const { x, y, width, height } = page.getMediaBox();
    const fx = mode !== "vertical";
    const fy = mode !== "horizontal";
    // Mirror about the centre of the page box: x' = (2x0 + w) - x.
    const m: [number, number, number, number, number, number] = [fx ? -1 : 1, 0, 0, fy ? -1 : 1, fx ? 2 * x + width : 0, fy ? 2 * y + height : 0];
    const start = doc.context.register(doc.context.contentStream([pushGraphicsState(), concatTransformationMatrix(...m)]));
    const end = doc.context.register(doc.context.contentStream([popGraphicsState()]));
    page.node.wrapContentStreams(start, end);
  }
  return save(doc);
}

// ─── Split in half ────────────────────────────────────────────────

export interface HalfOptions {
  /** Cut down the middle (left | right) or across (top / bottom), as the page is shown. */
  cut: "vertical" | "horizontal";
  /** Right half first, for right-to-left books. */
  rightFirst: boolean;
}

/** Every page becomes two (book scans with two pages per sheet). */
export async function splitInHalf(bytes: Uint8Array, opts: HalfOptions): Promise<Uint8Array> {
  const src = await loadPdf(bytes);
  const out = await PDFDocument.create();
  for (const i of src.getPageIndices()) {
    const [a, b] = await out.copyPages(src, [i, i]);
    const { x, y, width, height } = a.getCropBox();
    const r = ((a.getRotation().angle % 360) + 360) % 360;
    // A cut that is vertical on screen runs along the other axis of a turned page.
    const vertical = (opts.cut === "vertical") !== (r === 90 || r === 270);
    let halves: [number, number, number, number][] = vertical
      ? [
          [x, y, width / 2, height],
          [x + width / 2, y, width / 2, height],
        ]
      : [
          [x, y + height / 2, width, height / 2],
          [x, y, width, height / 2],
        ];
    // Reading order on screen: flip when the page is turned so the "first" half is the far one.
    if (r === 180 || (vertical && r === 90) || (!vertical && r === 270)) halves = [halves[1], halves[0]];
    if (opts.rightFirst) halves = [halves[1], halves[0]];
    [a, b].forEach((p, k) => {
      const [bx, by, bw, bh] = halves[k];
      p.setMediaBox(bx, by, bw, bh);
      p.setCropBox(bx, by, bw, bh);
      out.addPage(p);
    });
  }
  return save(out);
}

// ─── Split by size ────────────────────────────────────────────────

/**
 * Split into parts that each stay under `maxBytes`, keeping pages in order.
 * A single page bigger than the limit becomes a part of its own.
 */
export async function splitBySize(bytes: Uint8Array, maxBytes: number, onProgress?: (done: number, total: number) => void): Promise<Uint8Array[]> {
  const src = await loadPdf(bytes);
  const n = src.getPageCount();
  const parts: Uint8Array[] = [];
  const build = async (from: number, to: number) => {
    const d = await PDFDocument.create();
    const pages = await d.copyPages(src, Array.from({ length: to - from }, (_, k) => from + k));
    pages.forEach((p) => d.addPage(p));
    return save(d);
  };
  let start = 0;
  while (start < n) {
    // Grow the part a page at a time; keep the last size that fitted.
    let end = start + 1;
    let best = await build(start, end);
    while (end < n) {
      const next = await build(start, end + 1);
      if (next.length > maxBytes) break;
      best = next;
      end++;
      onProgress?.(end, n);
    }
    parts.push(best);
    start = end;
    onProgress?.(start, n);
  }
  return parts;
}

// ─── Flatten ──────────────────────────────────────────────────────

export interface FlattenOptions {
  forms: boolean;
  annotations: boolean;
  scripts: boolean;
}
export interface FlattenResult {
  bytes: Uint8Array;
  fields: number;
  annotations: number;
}

/**
 * Make a PDF non-editable: form answers and annotations (stamps, notes,
 * highlights, drawings) are drawn into the page itself, and scripts removed.
 * Links keep working.
 */
export async function flattenPdf(bytes: Uint8Array, opts: FlattenOptions): Promise<FlattenResult> {
  const doc = await loadPdf(bytes);
  let fields = 0;
  if (opts.forms) {
    try {
      const form = doc.getForm();
      fields = form.getFields().length;
      if (fields) form.flatten({ updateFieldAppearances: true });
    } catch {
      /* no usable form */
    }
  }
  let annotations = 0;
  if (opts.annotations) {
    for (const page of doc.getPages()) {
      const annots = page.node.Annots();
      if (!annots) continue;
      const keep: PDFRef[] = [];
      const draw: string[] = [];
      for (let k = 0; k < annots.size(); k++) {
        const ref = annots.get(k);
        const a = doc.context.lookup(ref);
        if (!(a instanceof PDFDict)) continue;
        const subtype = (a.lookup(PDFName.of("Subtype")) as PDFName | undefined)?.decodeText();
        if (subtype === "Link" || subtype === "Popup") {
          if (subtype === "Link" && ref instanceof PDFRef) keep.push(ref);
          continue;
        }
        const flags = (a.lookup(PDFName.of("F")) as PDFNumber | undefined)?.asNumber() ?? 0;
        const hidden = (flags & 2) !== 0;
        const ap = a.lookup(PDFName.of("AP"));
        let normal = ap instanceof PDFDict ? ap.lookup(PDFName.of("N")) : undefined;
        // Appearances with states (checkboxes): pick the current one.
        if (normal instanceof PDFDict && !(normal instanceof PDFStream)) {
          const as = a.lookup(PDFName.of("AS"));
          normal = as instanceof PDFName ? normal.lookup(as) : undefined;
        }
        const rect = a.lookup(PDFName.of("Rect"));
        if (!hidden && normal instanceof PDFStream && rect instanceof PDFArray) {
          const [x1, y1, x2, y2] = rect.asArray().map((v) => (v as PDFNumber).asNumber());
          const bbox = normal.dict.lookup(PDFName.of("BBox"));
          const [bx1, by1, bx2, by2] = bbox instanceof PDFArray ? bbox.asArray().map((v) => (v as PDFNumber).asNumber()) : [0, 0, x2 - x1, y2 - y1];
          normal.dict.set(PDFName.of("Type"), PDFName.of("XObject"));
          normal.dict.set(PDFName.of("Subtype"), PDFName.of("Form"));
          const name = page.node.newXObject("Flat", doc.context.getObjectRef(normal) ?? doc.context.register(normal));
          // Map the appearance box onto the annotation rectangle (PDF 12.5.5, without its own matrix).
          const sx = (Math.min(x1, x2) - Math.max(x1, x2)) / (bx1 - bx2 || 1);
          const sy = (Math.min(y1, y2) - Math.max(y1, y2)) / (by1 - by2 || 1);
          draw.push(`q ${sx} 0 0 ${sy} ${Math.min(x1, x2) - bx1 * sx} ${Math.min(y1, y2) - by1 * sy} cm /${name.decodeText()} Do Q`);
        }
        annotations++;
      }
      if (draw.length) {
        const stream = doc.context.flateStream(draw.join("\n"));
        page.node.addContentStream(doc.context.register(stream));
      }
      if (keep.length) page.node.set(PDFName.of("Annots"), doc.context.obj(keep));
      else page.node.delete(PDFName.of("Annots"));
    }
  }
  if (opts.scripts) {
    const cat = doc.catalog;
    cat.delete(PDFName.of("OpenAction"));
    cat.delete(PDFName.of("AA"));
    const names = cat.lookup(PDFName.of("Names"));
    if (names instanceof PDFDict) names.delete(PDFName.of("JavaScript"));
    for (const page of doc.getPages()) page.node.delete(PDFName.of("AA"));
  }
  return { bytes: await save(doc), fields, annotations };
}

// ─── Metadata ─────────────────────────────────────────────────────

export interface PdfMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  created: string;
  modified: string;
}

const isoDay = (d?: Date) => (d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "");

export async function readMetadata(bytes: Uint8Array): Promise<PdfMetadata> {
  const doc = await loadPdf(bytes);
  return {
    title: doc.getTitle() ?? "",
    author: doc.getAuthor() ?? "",
    subject: doc.getSubject() ?? "",
    keywords: doc.getKeywords() ?? "",
    creator: doc.getCreator() ?? "",
    producer: doc.getProducer() ?? "",
    created: isoDay(doc.getCreationDate()),
    modified: isoDay(doc.getModificationDate()),
  };
}

/** Write metadata; empty fields are removed. XMP is dropped so readers don't show stale values. */
export async function writeMetadata(bytes: Uint8Array, m: PdfMetadata): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const infoRef = doc.context.trailerInfo.Info;
  const info = (infoRef ? doc.context.lookup(infoRef) : undefined) as PDFDict | undefined;
  if (!info) {
    // No info dictionary yet: setting a field creates it.
    doc.setTitle(m.title.trim());
  }
  const drop = (key: string) => {
    const ref = doc.context.trailerInfo.Info;
    const dict = ref ? doc.context.lookup(ref) : undefined;
    if (dict instanceof PDFDict) dict.delete(PDFName.of(key));
  };
  const setOrDrop = (key: string, value: string, set: () => void) => (value.trim() ? set() : drop(key));
  setOrDrop("Title", m.title, () => doc.setTitle(m.title.trim()));
  setOrDrop("Author", m.author, () => doc.setAuthor(m.author.trim()));
  setOrDrop("Subject", m.subject, () => doc.setSubject(m.subject.trim()));
  setOrDrop("Keywords", m.keywords, () => doc.setKeywords(m.keywords.split(",").map((k) => k.trim()).filter(Boolean)));
  setOrDrop("Creator", m.creator, () => doc.setCreator(m.creator.trim()));
  setOrDrop("Producer", m.producer, () => doc.setProducer(m.producer.trim()));
  const date = (s: string) => (/^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00Z`) : null);
  const c = date(m.created);
  const mo = date(m.modified);
  if (c) doc.setCreationDate(c);
  else drop("CreationDate");
  if (mo) doc.setModificationDate(mo);
  else drop("ModDate");
  doc.catalog.delete(PDFName.of("Metadata"));
  return save(doc);
}

// ─── Restrictions ─────────────────────────────────────────────────

/** Remove printing / copying / editing restrictions from a PDF that opens without a password. */
export async function removeRestrictions(bytes: Uint8Array): Promise<{ bytes: Uint8Array; wasRestricted: boolean }> {
  const probe = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  if (!probe.isEncrypted) return { bytes, wasRestricted: false };
  const { unlockPdf } = await import("./security");
  try {
    return { bytes: await unlockPdf(bytes, ""), wasRestricted: true };
  } catch {
    throw new Error("This PDF needs a password to open. Use Unlock PDF with the password instead.");
  }
}
