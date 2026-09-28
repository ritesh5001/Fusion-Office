import type { PageViewport } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { getPdfDocument } from "./sources";
import { totalRotation, type EditorPage, type Rect } from "../editor/types";

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
