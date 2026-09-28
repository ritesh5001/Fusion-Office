/**
 * Glyph-level removal of existing text from a PDF page.
 *
 * Used when the user edits text that is already in the PDF: the original
 * glyphs inside the edited line are deleted from the page's content stream,
 * and replaced by an equivalent horizontal displacement, so every other glyph
 * on the page keeps its exact position.
 *
 * How: tokenize the content stream, replay the graphics/text state (CTM, text
 * matrix, font, spacing) to find the user-space position of every glyph, then
 * rewrite each text-showing operator that has glyphs inside a target rect as a
 * TJ array without them. Anything we can't measure safely (Type3 fonts,
 * unknown encodings, text inside form XObjects) is left untouched and reported,
 * so the caller can fall back to covering it.
 */
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFPage,
  PDFRawStream,
  PDFRef,
  PDFStream,
  decodePDFRawStream,
} from "pdf-lib";
import { Encodings, Font, type IFontNames } from "@pdf-lib/standard-fonts";

/** [x0, y0, x1, y1] in PDF user space. */
export type UserRect = [number, number, number, number];

export interface RemovalResult {
  /** Glyphs removed per rect. */
  removed: number[];
  /** Text we could not measure whose origin lies inside the rect. */
  unsafe: boolean[];
  /** Font resource names of the removed glyphs, per rect, most used first. */
  fonts?: string[][];
}

export type Mat = [number, number, number, number, number, number];
export const I: Mat = [1, 0, 0, 1, 0, 0];
export const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];
export const apply = (m: Mat, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

// ─── Lexer ─────────────────────────────────────────────────────────

export type Operand = number | string | Uint8Array | boolean | null | Operand[] | { dict: true };

export interface Op {
  op: string;
  args: Operand[];
  start: number;
  end: number;
}

const isWhite = (c: number) => c === 0 || c === 9 || c === 10 || c === 12 || c === 13 || c === 32;
const isDelim = (c: number) => c === 40 || c === 41 || c === 60 || c === 62 || c === 91 || c === 93 || c === 123 || c === 125 || c === 47 || c === 37;

/** Parse a content stream into operators with their byte ranges. */
export function parseContent(bytes: Uint8Array): Op[] {
  const ops: Op[] = [];
  let i = 0;
  const n = bytes.length;
  // Operand stack of the current op; arrays nest.
  let stack: Operand[] = [];
  const arrays: Operand[][] = [];
  let opStart = -1;

  const push = (v: Operand) => {
    if (arrays.length) arrays[arrays.length - 1].push(v);
    else stack.push(v);
  };

  while (i < n) {
    const c = bytes[i];
    if (isWhite(c)) {
      i++;
      continue;
    }
    if (c === 37) {
      // comment
      while (i < n && bytes[i] !== 10 && bytes[i] !== 13) i++;
      continue;
    }
    const tokStart = i;
    if (opStart < 0) opStart = tokStart;

    if (c === 40) {
      // literal string
      const out: number[] = [];
      let depth = 1;
      i++;
      while (i < n && depth > 0) {
        const ch = bytes[i];
        if (ch === 92) {
          const nx = bytes[i + 1];
          i += 2;
          if (nx === 110) out.push(10);
          else if (nx === 114) out.push(13);
          else if (nx === 116) out.push(9);
          else if (nx === 98) out.push(8);
          else if (nx === 102) out.push(12);
          else if (nx === 13) {
            if (bytes[i] === 10) i++;
          } else if (nx === 10) {
            /* line continuation */
          } else if (nx >= 48 && nx <= 55) {
            let v = nx - 48;
            for (let k = 0; k < 2 && bytes[i] >= 48 && bytes[i] <= 55; k++) v = v * 8 + (bytes[i++] - 48);
            out.push(v & 255);
          } else out.push(nx);
          continue;
        }
        if (ch === 40) depth++;
        if (ch === 41) {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
        out.push(ch);
        i++;
      }
      push(new Uint8Array(out));
      continue;
    }
    if (c === 60 && bytes[i + 1] === 60) {
      // inline dict (only in BI or marked content); skip to matching >>
      let depth = 0;
      while (i < n) {
        if (bytes[i] === 60 && bytes[i + 1] === 60) {
          depth++;
          i += 2;
        } else if (bytes[i] === 62 && bytes[i + 1] === 62) {
          depth--;
          i += 2;
          if (depth === 0) break;
        } else i++;
      }
      push({ dict: true });
      continue;
    }
    if (c === 60) {
      // hex string
      i++;
      let hex = "";
      while (i < n && bytes[i] !== 62) {
        if (!isWhite(bytes[i])) hex += String.fromCharCode(bytes[i]);
        i++;
      }
      i++;
      if (hex.length % 2) hex += "0";
      const out = new Uint8Array(hex.length / 2);
      for (let k = 0; k < out.length; k++) out[k] = parseInt(hex.substr(k * 2, 2), 16);
      push(out);
      continue;
    }
    if (c === 91) {
      arrays.push([]);
      i++;
      continue;
    }
    if (c === 93) {
      const arr = arrays.pop() ?? [];
      i++;
      push(arr);
      continue;
    }
    if (c === 47) {
      i++;
      let name = "";
      while (i < n && !isWhite(bytes[i]) && !isDelim(bytes[i])) name += String.fromCharCode(bytes[i++]);
      push("/" + name);
      continue;
    }
    if (c === 62 || c === 41 || c === 123 || c === 125) {
      i++; // stray delimiter; ignore
      continue;
    }
    // regular token: number, keyword or operator
    let tok = "";
    while (i < n && !isWhite(bytes[i]) && !isDelim(bytes[i])) tok += String.fromCharCode(bytes[i++]);
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(tok)) {
      push(parseFloat(tok));
      continue;
    }
    if (tok === "true" || tok === "false") {
      push(tok === "true");
      continue;
    }
    if (tok === "null") {
      push(null);
      continue;
    }
    // operator
    if (tok === "ID") {
      // inline image data: skip binary up to whitespace + EI + whitespace/end
      i++;
      while (i < n) {
        if (isWhite(bytes[i - 1]) && bytes[i] === 69 && bytes[i + 1] === 73 && (i + 2 >= n || isWhite(bytes[i + 2]))) {
          i += 2;
          break;
        }
        i++;
      }
      ops.push({ op: "EI", args: [], start: opStart, end: i });
    } else {
      ops.push({ op: tok, args: stack, start: opStart, end: i });
    }
    stack = [];
    arrays.length = 0;
    opStart = -1;
  }
  return ops;
}

// ─── Fonts ──────────────────────────────────────────────────────────

export interface FontInfo {
  codeLength: 1 | 2;
  /** Glyph width in 1/1000 text-space units, or undefined if unknown. */
  width: (code: number) => number | undefined;
}

const STANDARD: Record<string, IFontNames> = {
  Helvetica: "Helvetica" as IFontNames,
  "Helvetica-Bold": "Helvetica-Bold" as IFontNames,
  "Helvetica-Oblique": "Helvetica-Oblique" as IFontNames,
  "Helvetica-BoldOblique": "Helvetica-BoldOblique" as IFontNames,
  "Times-Roman": "Times-Roman" as IFontNames,
  "Times-Bold": "Times-Bold" as IFontNames,
  "Times-Italic": "Times-Italic" as IFontNames,
  "Times-BoldItalic": "Times-BoldItalic" as IFontNames,
  Courier: "Courier" as IFontNames,
  "Courier-Bold": "Courier-Bold" as IFontNames,
  "Courier-Oblique": "Courier-Oblique" as IFontNames,
  "Courier-BoldOblique": "Courier-BoldOblique" as IFontNames,
  Symbol: "Symbol" as IFontNames,
  ZapfDingbats: "ZapfDingbats" as IFontNames,
};

let winAnsiNames: Map<number, string> | null = null;
function winAnsiGlyphName(code: number): string | undefined {
  if (!winAnsiNames) {
    winAnsiNames = new Map();
    const mappings = (Encodings.WinAnsi as unknown as { unicodeMappings: Record<number, [number, string]> }).unicodeMappings;
    for (const [c, name] of Object.values(mappings)) winAnsiNames.set(c, name);
  }
  return winAnsiNames.get(code);
}

const num = (o: unknown): number | undefined => (o instanceof PDFNumber ? o.asNumber() : undefined);

export function fontInfoFor(doc: PDFDocument, fontDict: PDFDict): FontInfo | null {
  const lookup = (d: PDFDict, key: string) => d.lookup(PDFName.of(key));
  const subtype = lookup(fontDict, "Subtype");
  const sub = subtype instanceof PDFName ? subtype.decodeText() : "";

  if (sub === "Type0") {
    const enc = lookup(fontDict, "Encoding");
    if (!(enc instanceof PDFName) || enc.decodeText() !== "Identity-H") return null; // vertical or custom CMaps
    const descs = lookup(fontDict, "DescendantFonts");
    const desc = descs instanceof PDFArray ? descs.lookup(0) : null;
    if (!(desc instanceof PDFDict)) return null;
    const dw = num(lookup(desc, "DW")) ?? 1000;
    const widths = new Map<number, number>();
    const w = lookup(desc, "W");
    if (w instanceof PDFArray) {
      const items = w.asArray().map((x) => doc.context.lookup(x));
      for (let k = 0; k < items.length; ) {
        const first = num(items[k]);
        const next = items[k + 1];
        if (first === undefined) break;
        if (next instanceof PDFArray) {
          next.asArray().forEach((v, j) => {
            const wv = num(doc.context.lookup(v));
            if (wv !== undefined) widths.set(first + j, wv);
          });
          k += 2;
        } else {
          const last = num(next);
          const wv = num(items[k + 2]);
          if (last === undefined || wv === undefined) break;
          for (let cid = first; cid <= last; cid++) widths.set(cid, wv);
          k += 3;
        }
      }
    }
    return { codeLength: 2, width: (code) => widths.get(code) ?? dw };
  }

  if (sub === "Type1" || sub === "TrueType" || sub === "MMType1") {
    const firstChar = num(lookup(fontDict, "FirstChar"));
    const widthsArr = lookup(fontDict, "Widths");
    const descriptor = lookup(fontDict, "FontDescriptor");
    const missing = descriptor instanceof PDFDict ? num(lookup(descriptor, "MissingWidth")) : undefined;
    if (firstChar !== undefined && widthsArr instanceof PDFArray) {
      const widths = widthsArr.asArray().map((x) => num(doc.context.lookup(x)));
      return { codeLength: 1, width: (code) => widths[code - firstChar] ?? missing ?? 0 };
    }
    const base = lookup(fontDict, "BaseFont");
    const baseName = base instanceof PDFName ? base.decodeText() : "";
    const std = STANDARD[baseName];
    if (std) {
      const metrics = Font.load(std);
      return {
        codeLength: 1,
        width: (code) => {
          const glyph = winAnsiGlyphName(code);
          return glyph ? ((metrics.getWidthOfGlyph(glyph) as number | undefined) ?? undefined) : undefined;
        },
      };
    }
  }
  return null; // Type3 and anything unusual
}

// ─── Content access ─────────────────────────────────────────────────

export function streamBytes(stream: PDFStream): Uint8Array | null {
  if (stream instanceof PDFRawStream) return decodePDFRawStream(stream).decode();
  const maybe = stream as unknown as { getUnencodedContents?: () => Uint8Array };
  return maybe.getUnencodedContents ? maybe.getUnencodedContents() : null;
}

/** The page's content streams, decoded and joined into one byte array. */
export function pageContent(page: PDFPage): Uint8Array | null {
  const contents = page.node.Contents();
  if (!contents) return null;
  const streams: PDFStream[] = [];
  if (contents instanceof PDFArray) {
    for (const ref of contents.asArray()) {
      const s = page.doc.context.lookup(ref);
      if (s instanceof PDFStream) streams.push(s);
    }
  } else if (contents instanceof PDFStream) streams.push(contents);
  const parts: Uint8Array[] = [];
  for (const s of streams) {
    const b = streamBytes(s);
    if (!b) return null;
    parts.push(b);
  }
  const total = parts.reduce((a, p) => a + p.length + 1, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
    out[off++] = 10; // keep tokens from separate streams apart
  }
  return out;
}

// ─── Removal ────────────────────────────────────────────────────────

const inside = (r: UserRect, x: number, y: number) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
const fmt = (v: number) => (Math.abs(v) < 1e-6 ? "0" : String(Math.round(v * 1000) / 1000));
const hex = (bytes: number[]) => "<" + bytes.map((b) => b.toString(16).padStart(2, "0")).join("") + ">";

/**
 * Remove every glyph whose center lies inside one of `rects` from the page's
 * own content stream. Returns per-rect counts; `unsafe` flags rects that
 * contain text we could not measure (caller should cover those).
 */
export function removeTextInRects(page: PDFPage, rects: UserRect[]): RemovalResult {
  const result: RemovalResult = { removed: rects.map(() => 0), unsafe: rects.map(() => false) };
  const fontUse = rects.map(() => new Map<string, number>());
  if (!rects.length) return result;
  const content = pageContent(page);
  if (!content) {
    result.unsafe = rects.map(() => true);
    return result;
  }
  const doc = page.doc;
  const resources = page.node.Resources();
  const fontsDict = resources?.lookup(PDFName.of("Font"));
  const fontCache = new Map<string, FontInfo | null>();
  const fontInfo = (name: string): FontInfo | null => {
    if (fontCache.has(name)) return fontCache.get(name)!;
    const dict = fontsDict instanceof PDFDict ? fontsDict.lookup(PDFName.of(name.replace(/^\//, ""))) : undefined;
    const info = dict instanceof PDFDict ? fontInfoFor(doc, dict) : null;
    fontCache.set(name, info);
    return info;
  };

  const ops = parseContent(content);
  const replacements: { start: number; end: number; text: string }[] = [];

  // graphics + text state
  let ctm: Mat = I;
  const gstack: { ctm: Mat; font: string; fs: number; tc: number; tw: number; th: number; tl: number }[] = [];
  let tm: Mat = I;
  let tlm: Mat = I;
  let font = "";
  let fs = 0;
  let tc = 0;
  let tw = 0;
  let th = 1;
  let tl = 0;

  const nextLine = () => {
    tlm = mul([1, 0, 0, 1, 0, -tl], tlm);
    tm = tlm;
  };

  const show = (op: Op, elements: Operand[], prefix: string) => {
    const info = fontInfo(font);
    const m = () => mul(tm, ctm);
    if (!info || fs === 0 || th === 0) {
      const [ox, oy] = apply(m(), 0, 0);
      rects.forEach((r, k) => {
        if (inside(r, ox, oy)) result.unsafe[k] = true;
      });
      return; // cannot advance; later positions in this BT stay approximate
    }
    type Piece = { kind: "glyph"; bytes: number[]; adv: number; drop: boolean } | { kind: "num"; value: number };
    const pieces: Piece[] = [];
    let t = 0; // advance in text space
    const full = m();
    let dropped = 0;
    for (const el of elements) {
      if (typeof el === "number") {
        pieces.push({ kind: "num", value: el });
        t += (-el / 1000) * fs * th;
        continue;
      }
      if (!(el instanceof Uint8Array)) continue;
      for (let k = 0; k + info.codeLength <= el.length; k += info.codeLength) {
        const code = info.codeLength === 2 ? (el[k] << 8) | el[k + 1] : el[k];
        const w = info.width(code);
        if (w === undefined) {
          // unknown glyph width: give up on this op, keep it as-is
          const [ox, oy] = apply(full, t, 0);
          rects.forEach((r, j) => {
            if (inside(r, ox, oy)) result.unsafe[j] = true;
          });
          return;
        }
        const adv = ((w / 1000) * fs + tc + (info.codeLength === 1 && code === 32 ? tw : 0)) * th;
        const [cx, cy] = apply(full, t + adv / 2, fs * 0.3);
        const hit = rects.findIndex((r) => inside(r, cx, cy));
        if (hit >= 0 && w > 0) {
          result.removed[hit]++;
          dropped++;
          fontUse[hit].set(font, (fontUse[hit].get(font) ?? 0) + 1);
        }
        pieces.push({ kind: "glyph", bytes: Array.from(el.subarray(k, k + info.codeLength)), adv, drop: hit >= 0 });
        t += adv;
      }
    }
    tm = mul([1, 0, 0, 1, t, 0], tm);
    if (!dropped) return;

    // Rebuild as a TJ array: kept glyphs as hex strings, dropped ones as the
    // same displacement, so everything after them stays in place.
    const parts: string[] = [];
    let run: number[] = [];
    let pending = 0;
    const flushRun = () => {
      if (run.length) parts.push(hex(run));
      run = [];
    };
    const flushNum = () => {
      if (Math.abs(pending) > 1e-9) parts.push(fmt(pending));
      pending = 0;
    };
    for (const p of pieces) {
      if (p.kind === "num") {
        flushRun();
        pending += p.value;
      } else if (p.drop) {
        flushRun();
        pending += (-p.adv * 1000) / (fs * th);
      } else {
        flushNum();
        run.push(...p.bytes);
      }
    }
    flushRun();
    flushNum();
    if (!parts.length) parts.push("()");
    replacements.push({ start: op.start, end: op.end, text: `${prefix}[${parts.join(" ")}] TJ` });
  };

  for (const op of ops) {
    const a = op.args;
    switch (op.op) {
      case "q":
        gstack.push({ ctm, font, fs, tc, tw, th, tl });
        break;
      case "Q": {
        const s = gstack.pop();
        if (s) ({ ctm, font, fs, tc, tw, th, tl } = s);
        break;
      }
      case "cm":
        if (a.length === 6) ctm = mul(a as Mat, ctm);
        break;
      case "BT":
        tm = tlm = I;
        break;
      case "Tf":
        font = String(a[0] ?? "");
        fs = Number(a[1] ?? 0);
        break;
      case "Tc":
        tc = Number(a[0] ?? 0);
        break;
      case "Tw":
        tw = Number(a[0] ?? 0);
        break;
      case "Tz":
        th = Number(a[0] ?? 100) / 100;
        break;
      case "TL":
        tl = Number(a[0] ?? 0);
        break;
      case "Td":
        tlm = mul([1, 0, 0, 1, Number(a[0]), Number(a[1])], tlm);
        tm = tlm;
        break;
      case "TD":
        tl = -Number(a[1]);
        tlm = mul([1, 0, 0, 1, Number(a[0]), Number(a[1])], tlm);
        tm = tlm;
        break;
      case "Tm":
        if (a.length === 6) tm = tlm = a as Mat;
        break;
      case "T*":
        nextLine();
        break;
      case "Tj":
        show(op, [a[0]], "");
        break;
      case "TJ":
        show(op, Array.isArray(a[0]) ? (a[0] as Operand[]) : [], "");
        break;
      case "'":
        nextLine();
        show(op, [a[0]], "T* ");
        break;
      case '"':
        tw = Number(a[0]);
        tc = Number(a[1]);
        nextLine();
        show(op, [a[2]], `${fmt(tw)} Tw ${fmt(tc)} Tc T* `);
        break;
    }
  }

  result.fonts = fontUse.map((m) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f.replace(/^\//, "")));
  if (!replacements.length) return result;

  // Splice the rewritten operators into the stream and store it.
  const chunks: Uint8Array[] = [];
  const enc = new TextEncoder();
  let pos = 0;
  for (const r of replacements.sort((x, y) => x.start - y.start)) {
    chunks.push(content.subarray(pos, r.start), enc.encode(r.text));
    pos = r.end;
  }
  chunks.push(content.subarray(pos));
  const size = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  const stream = doc.context.flateStream(out);
  page.node.set(PDFName.of("Contents"), doc.context.register(stream) as PDFRef);
  return result;
}
