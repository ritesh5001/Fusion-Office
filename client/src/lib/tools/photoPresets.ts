/**
 * Photo, signature and ID-card sizes that Indian application forms ask for,
 * plus the layout maths behind the photo tools. Pure: no DOM, unit tested.
 *
 * The figures come from recent official notices (the same ones the guides on
 * this site describe). Every notice can change them, so the tool shows each
 * value and lets the user edit it.
 */
import { PDFDocument, rgb } from "pdf-lib";
import type { FracRect, Size } from "../image/geometry";

export type DocKind = "photo" | "signature" | "thumb" | "declaration";

export interface PhotoSpec {
  kind: DocKind;
  label: string;
  /** Exact pixels. 0 × 0 means "keep the picture's shape", limited by `maxSide`. */
  width: number;
  height: number;
  maxSide?: number;
  /** Print resolution written into the file. */
  dpi?: number;
  minKB?: number;
  maxKB: number;
  note?: string;
}

export interface ExamPreset {
  id: string;
  label: string;
  group: "Banking" | "Central exams" | "Entrance exams" | "ID & travel";
  items: PhotoSpec[];
  note?: string;
}

const cm = (v: number, dpi: number) => Math.round((v / 2.54) * dpi);

const BANK_ITEMS: PhotoSpec[] = [
  { kind: "photo", label: "Photograph", width: 200, height: 230, minKB: 20, maxKB: 50 },
  { kind: "signature", label: "Signature", width: 140, height: 60, minKB: 10, maxKB: 20 },
  { kind: "thumb", label: "Left thumb impression", width: 240, height: 240, minKB: 20, maxKB: 50 },
  { kind: "declaration", label: "Handwritten declaration", width: 800, height: 400, minKB: 50, maxKB: 100 },
];

export const EXAM_PRESETS: ExamPreset[] = [
  { id: "ibps", label: "IBPS (PO, Clerk, RRB)", group: "Banking", items: BANK_ITEMS, note: "A live photo is also taken during the application." },
  { id: "sbi", label: "SBI (PO, Clerk)", group: "Banking", items: BANK_ITEMS },
  {
    id: "ssc",
    label: "SSC (CGL, CHSL, MTS, GD)",
    group: "Central exams",
    items: [{ kind: "signature", label: "Signature", width: cm(4, 200), height: cm(2, 200), dpi: 200, minKB: 10, maxKB: 20 }],
    note: "SSC now takes the photograph live, so only the signature is uploaded.",
  },
  {
    id: "upsc",
    label: "UPSC (CSE, NDA, CDS)",
    group: "Central exams",
    items: [
      { kind: "photo", label: "Photograph", width: 0, height: 0, maxSide: 1000, minKB: 20, maxKB: 300, note: "Your name and the date the photo was taken should be printed on it." },
      { kind: "signature", label: "Signature sheet (three signatures)", width: 0, height: 0, maxSide: 1000, minKB: 20, maxKB: 300 },
    ],
  },
  {
    id: "rrb",
    label: "RRB (NTPC, Group D, ALP)",
    group: "Central exams",
    items: [{ kind: "signature", label: "Signature", width: 280, height: 120, minKB: 30, maxKB: 49, note: "At least 140 × 60 pixels, in black ink." }],
    note: "Recent RRB applications take the photograph live.",
  },
  {
    id: "neet",
    label: "NEET UG",
    group: "Entrance exams",
    items: [
      { kind: "photo", label: "Passport-size photo", width: cm(3.5, 300), height: cm(4.5, 300), dpi: 300, minKB: 10, maxKB: 200 },
      { kind: "signature", label: "Signature", width: cm(4, 300), height: cm(2, 300), dpi: 300, minKB: 10, maxKB: 30 },
      { kind: "thumb", label: "Fingers and thumb impressions", width: 0, height: 0, maxSide: 1200, minKB: 10, maxKB: 200 },
    ],
  },
  {
    id: "jee",
    label: "JEE Main",
    group: "Entrance exams",
    items: [
      { kind: "photo", label: "Passport-size photo", width: cm(3.5, 300), height: cm(4.5, 300), dpi: 300, minKB: 10, maxKB: 200 },
      { kind: "signature", label: "Signature", width: cm(4, 300), height: cm(2, 300), dpi: 300, minKB: 10, maxKB: 50 },
    ],
  },
  {
    id: "cuet",
    label: "CUET (UG)",
    group: "Entrance exams",
    items: [
      { kind: "photo", label: "Passport-size photo", width: cm(3.5, 300), height: cm(4.5, 300), dpi: 300, minKB: 10, maxKB: 200 },
      { kind: "signature", label: "Signature", width: cm(4, 300), height: cm(2, 300), dpi: 300, minKB: 10, maxKB: 50 },
    ],
  },
  {
    id: "passport",
    label: "Passport-size photo (3.5 × 4.5 cm)",
    group: "ID & travel",
    items: [{ kind: "photo", label: "Photograph", width: 630, height: 810, dpi: 457, maxKB: 250, note: "White background, face about 80% of the frame." }],
  },
  {
    id: "visa-2x2",
    label: "2 × 2 inch photo (US visa, OCI)",
    group: "ID & travel",
    items: [{ kind: "photo", label: "Photograph", width: 600, height: 600, dpi: 300, maxKB: 240 }],
  },
  {
    id: "pan",
    label: "PAN card (Form 49A)",
    group: "ID & travel",
    items: [
      { kind: "photo", label: "Photograph (3.5 × 2.5 cm)", width: cm(2.5, 200), height: cm(3.5, 200), dpi: 200, maxKB: 50 },
      { kind: "signature", label: "Signature (2 × 4.5 cm)", width: cm(4.5, 200), height: cm(2, 200), dpi: 200, maxKB: 50 },
    ],
    note: "Protean (NSDL) and UTIITSL publish slightly different limits. Check the upload page you're using.",
  },
];

export const examById = (id: string) => EXAM_PRESETS.find((e) => e.id === id);

/** Output pixels for a spec and a source picture. */
export function specSize(spec: Pick<PhotoSpec, "width" | "height" | "maxSide">, src: Size): Size {
  if (spec.width > 0 && spec.height > 0) return { width: Math.round(spec.width), height: Math.round(spec.height) };
  const cap = spec.maxSide ?? Math.max(src.width, src.height);
  const scale = Math.min(1, cap / Math.max(src.width, src.height));
  return { width: Math.max(1, Math.round(src.width * scale)), height: Math.max(1, Math.round(src.height * scale)) };
}

/**
 * The part of a picture to keep for a `ratio` (width / height) frame. zoom 1
 * is the largest crop that fits; panX / panY (-1…1) slide it inside the
 * picture. Returned in fractions of the picture.
 */
export function cropFor(src: Size, ratio: number, zoom = 1, panX = 0, panY = 0): FracRect {
  const srcRatio = src.width / src.height;
  const z = Math.max(1, Math.min(6, zoom));
  let w = 1 / z;
  let h = 1 / z;
  if (ratio > srcRatio) h = srcRatio / ratio / z;
  else w = ratio / srcRatio / z;
  const cl = (v: number) => Math.max(-1, Math.min(1, v));
  return { x: ((1 - w) / 2) * (1 + cl(panX)), y: ((1 - h) / 2) * (1 + cl(panY)), w, h };
}

/**
 * Make a JPEG at least `minBytes` long by adding a comment block. Forms that
 * reject files *below* a size (10 KB signatures, for example) check only the
 * byte count; the picture is not changed.
 */
export function padJpeg(bytes: Uint8Array, minBytes: number): Uint8Array {
  if (bytes.length >= minBytes || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  let need = minBytes - bytes.length;
  const blocks: Uint8Array[] = [];
  while (need > 0) {
    // A comment segment is 2 marker bytes + 2 length bytes + up to 65,533 bytes of filler.
    const body = Math.max(1, Math.min(65_533, need - 4));
    const seg = new Uint8Array(body + 4).fill(0x20);
    seg[0] = 0xff;
    seg[1] = 0xfe;
    seg[2] = (body + 2) >> 8;
    seg[3] = (body + 2) & 255;
    blocks.push(seg);
    need -= seg.length;
  }
  // After the header blocks (JFIF / EXIF), which some readers expect right at the start.
  let at = 2;
  while (at + 4 <= bytes.length && bytes[at] === 0xff && bytes[at + 1] >= 0xe0 && bytes[at + 1] <= 0xef) at += 2 + ((bytes[at + 2] << 8) | bytes[at + 3]);
  if (at > bytes.length) at = 2;
  const out = new Uint8Array(bytes.length + blocks.reduce((n, b) => n + b.length, 0));
  out.set(bytes.subarray(0, at), 0);
  let to = at;
  for (const b of blocks) {
    out.set(b, to);
    to += b.length;
  }
  out.set(bytes.subarray(at), to);
  return out;
}

// ─── Print sheets ─────────────────────────────────────────────────

export interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Rows of equal boxes centred on a sheet, at most `max` of them. All values
 * share one unit (points, pixels or millimetres).
 */
export function sheetLayout(sheet: Size, item: Size, gap: number, margin: number, max = Infinity): Slot[] {
  const cols = Math.max(0, Math.floor((sheet.width - 2 * margin + gap) / (item.width + gap)));
  const rows = Math.max(0, Math.floor((sheet.height - 2 * margin + gap) / (item.height + gap)));
  const count = Math.min(cols * rows, max);
  if (!count) return [];
  const usedCols = Math.min(cols, count);
  const usedRows = Math.ceil(count / cols);
  const x0 = (sheet.width - (usedCols * item.width + (usedCols - 1) * gap)) / 2;
  const y0 = (sheet.height - (usedRows * item.height + (usedRows - 1) * gap)) / 2;
  return Array.from({ length: count }, (_, k) => ({ x: x0 + (k % cols) * (item.width + gap), y: y0 + Math.floor(k / cols) * (item.height + gap), w: item.width, h: item.height }));
}

const MM = 72 / 25.4;
const A4 = { width: 595.28, height: 841.89 };

/** A4 page of identical photos at their true printed size, with cut lines. */
export async function photoSheetPdf(jpg: Uint8Array, photoMm: Size, copies: number): Promise<{ bytes: Uint8Array; count: number }> {
  const doc = await PDFDocument.create();
  doc.setCreator("Fusion Office");
  const img = await doc.embedJpg(jpg);
  const page = doc.addPage([A4.width, A4.height]);
  const slots = sheetLayout(A4, { width: photoMm.width * MM, height: photoMm.height * MM }, 3 * MM, 10 * MM, copies);
  if (!slots.length) throw new Error("That photo size doesn't fit on an A4 page.");
  for (const s of slots) {
    const y = A4.height - s.y - s.h;
    page.drawImage(img, { x: s.x, y, width: s.w, height: s.h });
    page.drawRectangle({ x: s.x, y, width: s.w, height: s.h, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.3 });
  }
  return { bytes: await doc.save(), count: slots.length };
}

// ─── ID card on one page ──────────────────────────────────────────

/** Credit-card size (ISO ID-1): Aadhaar PVC, PAN, driving licence, voter ID. */
export const ID_CARD_MM = { width: 85.6, height: 53.98 };

export interface IdCardImage {
  bytes: Uint8Array;
  kind: "jpg" | "png";
}

export interface IdCardOptions {
  /** "card": true card size · "large": 1.6× for readable photocopies. */
  size: "card" | "large";
  border: boolean;
  /** Small line under the cards, e.g. "Self-attested" or what the copy is for. */
  caption: string;
}

/** Front and back of an ID card (or several cards) stacked on one A4 page. */
export async function idCardPdf(images: IdCardImage[], o: IdCardOptions): Promise<Uint8Array> {
  if (!images.length) throw new Error("Add the front of the card.");
  const doc = await PDFDocument.create();
  doc.setCreator("Fusion Office");
  const factor = o.size === "large" ? 1.6 : 1;
  const box = { width: ID_CARD_MM.width * MM * factor, height: ID_CARD_MM.height * MM * factor };
  const gap = 10 * MM;
  const perPage = Math.max(1, Math.floor((A4.height - 30 * MM + gap) / (box.height + gap)));
  for (let start = 0; start < images.length; start += perPage) {
    const group = images.slice(start, start + perPage);
    const page = doc.addPage([A4.width, A4.height]);
    const stack = group.length * box.height + (group.length - 1) * gap;
    const top = Math.max(15 * MM, (A4.height - stack) / 2);
    const slots = group.map((_, k) => ({ y: top + k * (box.height + gap), h: box.height }));
    for (const [k, im] of group.entries()) {
      const img = im.kind === "png" ? await doc.embedPng(im.bytes) : await doc.embedJpg(im.bytes);
      const s = slots[k];
      const x = (A4.width - box.width) / 2;
      const y = A4.height - s.y - s.h;
      // Whole card visible, never stretched.
      const scale = Math.min(box.width / img.width, box.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      page.drawImage(img, { x: x + (box.width - w) / 2, y: y + (box.height - h) / 2, width: w, height: h });
      if (o.border) page.drawRectangle({ x, y, width: box.width, height: box.height, borderColor: rgb(0.65, 0.67, 0.7), borderWidth: 0.5 });
    }
    const caption = o.caption.trim().replace(/[^\x20-\x7e]/g, "?");
    if (caption) {
      const last = slots[group.length - 1];
      page.drawText(caption, { x: (A4.width - box.width) / 2, y: A4.height - last.y - last.h - 16, size: 9, color: rgb(0.25, 0.27, 0.3) });
    }
  }
  return doc.save();
}
