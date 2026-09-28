import type { PageViewport } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { getPdfDocument } from "./sources";
import { totalRotation, type EditorPage, type FontFamily, type Rect } from "../editor/types";

/** A run of text on the page with its geometry in PDF user space. */
interface RawItem {
  str: string;
  /** baseline origin */
  ox: number;
  oy: number;
  /** unit vector along the text direction */
  dx: number;
  dy: number;
  /** unit vector "up" (perpendicular), scaled by font height */
  ux: number;
  uy: number;
  width: number;
  hasEOL: boolean;
}

const textCache = new Map<string, Promise<RawItem[]>>();

async function getRawItems(page: EditorPage): Promise<RawItem[]> {
  if (page.source.kind !== "pdf") return [];
  const { sourceId, pageIndex } = page.source;
  const key = `${sourceId}:${pageIndex}`;
  let p = textCache.get(key);
  if (!p) {
    p = (async () => {
      const pdf = await getPdfDocument(sourceId);
      const pdfPage = await pdf.getPage(pageIndex + 1);
      const content = await pdfPage.getTextContent();
      const items: RawItem[] = [];
      for (const it of content.items) {
        if (!("str" in it)) continue;
        const item = it as TextItem;
        const [a, b, c, d, e, f] = item.transform as number[];
        const len = Math.hypot(a, b) || 1;
        const fontH = Math.hypot(c, d) || item.height || 10;
        const uLen = Math.hypot(c, d) || 1;
        items.push({
          str: item.str,
          ox: e,
          oy: f,
          dx: a / len,
          dy: b / len,
          ux: (c / uLen) * fontH,
          uy: (d / uLen) * fontH,
          width: item.width,
          hasEOL: item.hasEOL,
        });
      }
      return items;
    })();
    textCache.set(key, p);
    p.catch(() => textCache.delete(key));
  }
  return p;
}

async function getViewport(page: EditorPage): Promise<PageViewport | null> {
  if (page.source.kind !== "pdf") return null;
  const pdf = await getPdfDocument(page.source.sourceId);
  const pdfPage = await pdf.getPage(page.source.pageIndex + 1);
  return pdfPage.getViewport({ scale: 1, rotation: totalRotation(page) });
}

/** View-space rect covering characters [from, to) of an item. */
function spanRect(item: RawItem, from: number, to: number, vp: PageViewport): Rect {
  const n = Math.max(item.str.length, 1);
  const s = (item.width * from) / n;
  const e = (item.width * to) / n;
  const pts = [
    [s, -0.22],
    [e, -0.22],
    [s, 0.9],
    [e, 0.9],
  ].map(([t, up]) =>
    vp.convertToViewportPoint(item.ox + item.dx * t + item.ux * up, item.oy + item.dy * t + item.uy * up),
  );
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function mergeLineRects(rects: Rect[]): Rect[] {
  // Merge rects that sit on the same line and touch/overlap horizontally.
  const sorted = [...rects].sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2) || a.x - b.x);
  const out: Rect[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (
      last &&
      Math.abs(last.y + last.h / 2 - (r.y + r.h / 2)) < Math.min(last.h, r.h) * 0.5 &&
      r.x <= last.x + last.w + Math.max(last.h, r.h) * 0.6
    ) {
      const x = Math.min(last.x, r.x);
      const y = Math.min(last.y, r.y);
      last.w = Math.max(last.x + last.w, r.x + r.w) - x;
      last.h = Math.max(last.y + last.h, r.y + r.h) - y;
      last.x = x;
      last.y = y;
    } else out.push({ ...r });
  }
  return out;
}

/**
 * Text-flow selection between two points (view space): like dragging a text
 * cursor — first line from the start point, middle lines fully, last line up
 * to the end point. Returns one rect per line. Empty if no text was hit.
 */
export async function textRectsBetween(
  page: EditorPage,
  a: { x: number; y: number },
  b: { x: number; y: number },
): Promise<Rect[]> {
  const [items, vp] = await Promise.all([getRawItems(page), getViewport(page)]);
  if (!vp || items.length === 0) return [];
  const [start, end] = a.y <= b.y ? [a, b] : [b, a];
  const top = start.y;
  const bottom = end.y;

  type Char = { r: Rect; cx: number; cy: number };
  const chars: Char[] = [];
  for (const item of items) {
    if (!item.str.trim()) continue;
    const whole = spanRect(item, 0, item.str.length, vp);
    if (whole.y > bottom || whole.y + whole.h < top) continue;
    for (let i = 0; i < item.str.length; i++) {
      const r = spanRect(item, i, i + 1, vp);
      chars.push({ r, cx: r.x + r.w / 2, cy: r.y + r.h / 2 });
    }
  }
  if (chars.length === 0) return [];

  // Group chars into lines by vertical center.
  chars.sort((p, q) => p.cy - q.cy);
  const lines: Char[][] = [];
  for (const ch of chars) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line[0].cy - ch.cy) < ch.r.h * 0.5) line.push(ch);
    else lines.push([ch]);
  }
  const hit = lines.filter((l) => {
    const cy = l[0].cy;
    const h = l[0].r.h;
    return cy + h / 2 >= top && cy - h / 2 <= bottom;
  });
  const selected: Rect[] = [];
  hit.forEach((line, i) => {
    const single = hit.length === 1;
    const x0 = single ? Math.min(start.x, end.x) : i === 0 ? start.x : -Infinity;
    const x1 = single ? Math.max(start.x, end.x) : i === hit.length - 1 ? end.x : Infinity;
    for (const ch of line) if (ch.cx >= x0 && ch.cx <= x1) selected.push(ch.r);
  });
  return mergeLineRects(selected);
}

export interface SearchHit {
  pageId: string;
  pageNumber: number;
  rects: Rect[];
  snippet: string;
}

/** Case-insensitive search across pages; matches may span text items. */
export async function searchPages(
  pages: EditorPage[],
  query: string,
  onProgress?: (hits: SearchHit[]) => void,
): Promise<SearchHit[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (let p = 0; p < pages.length; p++) {
    const page = pages[p];
    if (page.source.kind !== "pdf") continue;
    const [items, vp] = await Promise.all([getRawItems(page), getViewport(page)]);
    if (!vp) continue;
    // Concatenate item strings, remembering which item each char came from.
    let text = "";
    const map: { item: number; offset: number }[] = [];
    items.forEach((it, idx) => {
      for (let i = 0; i < it.str.length; i++) {
        text += it.str[i];
        map.push({ item: idx, offset: i });
      }
      if (it.hasEOL) {
        text += " ";
        map.push({ item: -1, offset: 0 });
      }
    });
    const lower = text.toLowerCase();
    let from = 0;
    while (true) {
      const at = lower.indexOf(q, from);
      if (at < 0) break;
      from = at + q.length;
      const spans = new Map<number, [number, number]>();
      for (let i = at; i < at + q.length; i++) {
        const m = map[i];
        if (m.item < 0) continue;
        const s = spans.get(m.item);
        spans.set(m.item, s ? [s[0], m.offset + 1] : [m.offset, m.offset + 1]);
      }
      const rects = mergeLineRects([...spans].map(([idx, [s, e]]) => spanRect(items[idx], s, e, vp)));
      const snippet = text.slice(Math.max(0, at - 30), at + q.length + 30).replace(/\s+/g, " ");
      hits.push({ pageId: page.id, pageNumber: p + 1, rects, snippet });
    }
    onProgress?.([...hits]);
  }
  return hits;
}

// ─── Editable lines (for "Edit existing text") ───────────────────────

export interface TextLine {
  text: string;
  /** View-space box around the line's glyphs. */
  rect: Rect;
  /** Same box in the source page's PDF user space [x0, y0, x1, y1]. */
  userRect: [number, number, number, number];
  /** View-space baseline of the first glyph. */
  x: number;
  baseline: number;
  fontSize: number;
  fontFamily: FontFamily;
  bold: boolean;
  italic: boolean;
}

interface StyledItem {
  str: string;
  transform: number[];
  width: number;
  fontName: string;
}

const lineCache = new Map<string, Promise<TextLine[]>>();

function styleOf(realName: string, generic: string, flags: { bold?: boolean; black?: boolean; italic?: boolean }) {
  const name = realName.replace(/^[A-Z]{6}\+/, ""); // strip subset prefix
  const fontFamily: FontFamily = /courier|mono|consol/i.test(name) || generic === "monospace"
    ? "Courier"
    : /times|roman|serif|georgia|garamond|cambria|book|minion|palatino/i.test(name) && !/sans/i.test(name)
      ? "Times"
      : generic === "serif" && !/sans|arial|helvet/i.test(name)
        ? "Times"
        : "Helvetica";
  return {
    fontFamily,
    bold: !!flags.bold || !!flags.black || /bold|black|heavy|semibold|demi/i.test(name),
    italic: !!flags.italic || /italic|oblique/i.test(name),
  };
}

/** Lines of existing text on a page, with style hints, for in-place editing. */
export async function getTextLines(page: EditorPage): Promise<TextLine[]> {
  if (page.source.kind !== "pdf") return [];
  const { sourceId, pageIndex } = page.source;
  const key = `${sourceId}:${pageIndex}:${totalRotation(page)}`;
  let p = lineCache.get(key);
  if (!p) {
    p = (async () => {
      const pdf = await getPdfDocument(sourceId);
      const pdfPage = await pdf.getPage(pageIndex + 1);
      const vp = pdfPage.getViewport({ scale: 1, rotation: totalRotation(page) });
      const content = await pdfPage.getTextContent();
      // Load fonts so their real names (e.g. "TimesNewRomanPS-BoldMT") are known.
      await pdfPage.getOperatorList().catch(() => null);
      const fontStyle = new Map<string, ReturnType<typeof styleOf>>();
      const styleFor = (fontName: string) => {
        let st = fontStyle.get(fontName);
        if (!st) {
          let real = "";
          let flags = {};
          try {
            const f = pdfPage.commonObjs.get(fontName) as { name?: string; bold?: boolean; black?: boolean; italic?: boolean } | undefined;
            real = f?.name ?? "";
            flags = f ?? {};
          } catch {
            /* font not loaded; fall back to generic family */
          }
          st = styleOf(real, content.styles[fontName]?.fontFamily ?? "sans-serif", flags);
          fontStyle.set(fontName, st);
        }
        return st;
      };

      type Seg = { item: StyledItem; x0: number; x1: number; base: number; size: number; user: [number, number, number, number] };
      const segs: Seg[] = [];
      for (const raw of content.items) {
        if (!("str" in raw)) continue;
        const item = raw as unknown as StyledItem;
        // pdf.js bridges gaps with whitespace-only items (sometimes 100+ pt wide);
        // skip them so the real distance between words decides line grouping.
        if (!item.str.trim()) continue;
        const [a, b, c, d, e, f] = item.transform;
        const size = Math.hypot(c, d);
        if (size < 1) continue;
        const len = Math.hypot(a, b) || 1;
        const [dx, dy] = [a / len, b / len];
        const ux = (c / Math.hypot(c, d)) * size;
        const uy = (d / Math.hypot(c, d)) * size;
        // Only text that reads left-to-right on screen can be edited.
        const [sx, sy] = vp.convertToViewportPoint(e, f);
        const [tx, ty] = vp.convertToViewportPoint(e + dx, f + dy);
        if (Math.abs(ty - sy) > 0.05 || tx <= sx) continue;
        const corners = [
          [e - ux * 0.25, f - uy * 0.25],
          [e + dx * item.width - ux * 0.25, f + dy * item.width - uy * 0.25],
          [e + ux * 0.95, f + uy * 0.95],
          [e + dx * item.width + ux * 0.95, f + dy * item.width + uy * 0.95],
        ];
        const xs = corners.map((p) => p[0]);
        const ys = corners.map((p) => p[1]);
        segs.push({
          item,
          x0: sx,
          x1: sx + item.width * (vp.scale ?? 1),
          base: sy,
          size,
          user: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
        });
      }
      segs.sort((p, q) => (Math.abs(p.base - q.base) < p.size * 0.3 ? p.x0 - q.x0 : p.base - q.base));

      const lines: TextLine[] = [];
      let cur: Seg[] = [];
      const flush = () => {
        const visible = cur.filter((s) => s.item.str.trim());
        if (visible.length) {
          let text = "";
          cur.forEach((s, i) => {
            if (i > 0) {
              const gap = s.x0 - cur[i - 1].x1;
              if (gap > s.size * 0.18 && !text.endsWith(" ") && !s.item.str.startsWith(" ")) text += " ";
            }
            text += s.item.str;
          });
          const first = visible[0];
          const size = first.size;
          const x0 = Math.min(...visible.map((s) => s.x0));
          const x1 = Math.max(...visible.map((s) => s.x1));
          const user: [number, number, number, number] = [
            Math.min(...visible.map((s) => s.user[0])),
            Math.min(...visible.map((s) => s.user[1])),
            Math.max(...visible.map((s) => s.user[2])),
            Math.max(...visible.map((s) => s.user[3])),
          ];
          lines.push({
            text: text.trim(),
            rect: { x: x0, y: first.base - size * 0.95, w: x1 - x0, h: size * 1.2 },
            userRect: user,
            x: x0,
            baseline: first.base,
            fontSize: Math.round(size * 10) / 10,
            ...styleFor(first.item.fontName),
          });
        }
        cur = [];
      };
      for (const s of segs) {
        const prev = cur[cur.length - 1];
        const sameLine =
          prev &&
          Math.abs(prev.base - s.base) < s.size * 0.3 &&
          Math.abs(prev.size - s.size) < Math.max(prev.size, s.size) * 0.2 &&
          s.x0 - prev.x1 < s.size * 1.1;
        if (!sameLine) flush();
        cur.push(s);
      }
      flush();
      return lines;
    })();
    lineCache.set(key, p);
    p.catch(() => lineCache.delete(key));
  }
  return p;
}
