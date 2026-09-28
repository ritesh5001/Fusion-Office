/**
 * Write new text with a font that is already in the PDF, so edited lines keep
 * the document's own typeface. Works when the font says which letter each of
 * its codes is (a ToUnicode map, or a standard encoding) and has a width for
 * it. Embedded fonts are often subsets, so only letters the document already
 * uses are available; callers fall back to a standard font for the rest.
 */
import { Encodings } from "@pdf-lib/standard-fonts";
import { PDFArray, PDFDict, PDFName, PDFNumber, PDFStream, type PDFDocument, type PDFPage } from "pdf-lib";
import { fontInfoFor, streamBytes } from "./textRemoval";

export interface FontEncoder {
  /** Font resource name on the page (without the slash). */
  resource: string;
  baseFont: string;
  bold: boolean;
  italic: boolean;
  codeLength: 1 | 2;
  /** Code for a character, or undefined when the font can't show it. */
  code: (ch: string) => number | undefined;
  /** Advance width in 1/1000 em. */
  width: (code: number) => number | undefined;
}

/** UTF-16BE hex (as in ToUnicode maps) → string. */
const hexToString = (hex: string) => {
  if (hex.length <= 2) return hex ? String.fromCharCode(parseInt(hex, 16)) : "";
  const units: number[] = [];
  for (let i = 0; i < hex.length; i += 4) units.push(parseInt(hex.slice(i, i + 4).padEnd(4, "0"), 16));
  return String.fromCharCode(...units);
};

/** Parse a ToUnicode CMap into character → code (first, lowest code wins). */
export function parseToUnicode(text: string): Map<string, number> {
  const out = new Map<string, number>();
  const add = (code: number, str: string) => {
    // Only single characters: ligatures ("fi") can't be typed back letter by letter.
    if ([...str].length !== 1) return;
    if (!out.has(str)) out.set(str, code);
  };
  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) add(parseInt(m[1], 16), hexToString(m[2]));
  }
  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<[0-9a-fA-F]*>|\[[^\]]*\])/g)) {
      const lo = parseInt(m[1], 16);
      const hi = parseInt(m[2], 16);
      if (hi - lo > 0xffff) continue;
      if (m[3].startsWith("[")) {
        const dsts = [...m[3].matchAll(/<([0-9a-fA-F]*)>/g)].map((d) => d[1]);
        dsts.forEach((d, i) => add(lo + i, hexToString(d)));
      } else {
        const base = m[3].slice(1, -1);
        const first = parseInt(base.slice(-4), 16);
        const prefix = base.slice(0, -4);
        for (let c = lo; c <= hi; c++) add(c, hexToString(prefix + (first + c - lo).toString(16).padStart(4, "0")));
      }
    }
  }
  return out;
}

/** An encoder for font resource `name` on `page`, or null if the font can't be reused safely. */
export function encoderFor(doc: PDFDocument, page: PDFPage, name: string): FontEncoder | null {
  const fonts = page.node.Resources()?.lookup(PDFName.of("Font"));
  if (!(fonts instanceof PDFDict)) return null;
  const dict = fonts.lookup(PDFName.of(name));
  if (!(dict instanceof PDFDict)) return null;
  const info = fontInfoFor(doc, dict);
  if (!info) return null;
  const subtype = (dict.lookup(PDFName.of("Subtype")) as PDFName | undefined)?.decodeText();
  const baseFont = ((dict.lookup(PDFName.of("BaseFont")) as PDFName | undefined)?.decodeText() ?? "").replace(/^[A-Z]{6}\+/, "");

  let map: Map<string, number> | null = null;
  const tu = dict.lookup(PDFName.of("ToUnicode"));
  if (tu instanceof PDFStream) {
    const bytes = streamBytes(tu);
    if (bytes) map = parseToUnicode(new TextDecoder("latin1").decode(bytes));
  }
  if (!map && subtype !== "Type0") {
    // Simple font without ToUnicode: only a plain standard encoding is safe.
    const enc = dict.lookup(PDFName.of("Encoding"));
    const encName = enc instanceof PDFName ? enc.decodeText() : enc === undefined ? "StandardEncoding" : null;
    if (encName === "WinAnsiEncoding" || (encName === "StandardEncoding" && /^(Helvetica|Times|Courier|Arial)/.test(baseFont))) {
      map = new Map();
      for (let cp = 32; cp < 0x2200; cp++) {
        const ch = String.fromCodePoint(cp);
        try {
          const e = Encodings.WinAnsi.encodeUnicodeCodePoint(cp);
          if (!map.has(ch)) map.set(ch, e.code);
        } catch {
          /* not in WinAnsi */
        }
      }
    }
  }
  if (!map || !map.size) return null;

  const desc = subtype === "Type0" ? (() => {
    const d = dict.lookup(PDFName.of("DescendantFonts"));
    const f = d instanceof PDFArray ? d.lookup(0) : null;
    return f instanceof PDFDict ? f.lookup(PDFName.of("FontDescriptor")) : null;
  })() : dict.lookup(PDFName.of("FontDescriptor"));
  const flags = desc instanceof PDFDict ? ((desc.lookup(PDFName.of("Flags")) as PDFNumber | undefined)?.asNumber() ?? 0) : 0;
  const bold = /bold|black|heavy|semibold|demi/i.test(baseFont) || !!(flags & (1 << 18));
  const italic = /italic|oblique/i.test(baseFont) || !!(flags & (1 << 6));
  const m = map;
  return {
    resource: name,
    baseFont,
    bold,
    italic,
    codeLength: info.codeLength,
    code: (ch) => {
      const c = m.get(ch);
      if (c === undefined) return undefined;
      // A zero or missing width usually means the glyph isn't in the (subset) font.
      const w = info.width(c);
      return w !== undefined && (w > 0 || ch === " ") ? c : undefined;
    },
    width: info.width,
  };
}

/** Hex string of codes for `text`, and its width at `size`; null if any letter is missing. */
export function encodeRun(enc: FontEncoder, text: string, size: number, charSpacing = 0): { hex: string; width: number } | null {
  let hex = "";
  let width = 0;
  const chars = [...text];
  for (const ch of chars) {
    const c = enc.code(ch);
    if (c === undefined) return null;
    const w = enc.width(c);
    if (w === undefined) return null;
    hex += c.toString(16).padStart(enc.codeLength * 2, "0");
    width += (w / 1000) * size;
  }
  width += charSpacing * Math.max(0, chars.length - 1);
  return { hex, width };
}

