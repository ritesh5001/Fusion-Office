import { concatTransformationMatrix, popGraphicsState, pushGraphicsState, rgb, PDFDocument } from "pdf-lib";
import { removeTextInRects, type UserRect } from "../../pdf/textRemoval";
import type { TextRun } from "../text";
import { loadPdf, save } from "./common";

export interface RedactOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
}

export interface RedactReport {
  bytes: Uint8Array;
  /** Matches found per page (0-based page index → count). */
  matches: Record<number, number>;
  /** Pages where some matched text could not be removed from the file safely. */
  unsafePages: number[];
  /** User-space boxes per page, e.g. to rasterize unsafe pages. */
  boxes: Record<number, UserRect[]>;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** User-space box of characters [from, to) of a run. */
function spanBox(run: TextRun, from: number, to: number): UserRect | null {
  const u = run.user;
  if (!u) return null;
  const n = Math.max(run.str.length, 1);
  // Character positions are estimated from the run's width (letters differ in
  // width), so reach half a character further each way: a glyph is removed
  // when its centre is inside, and the first/last ones must not survive.
  const s = (u.width * Math.max(0, from - 0.5)) / n;
  const e = (u.width * Math.min(n, to + 0.5)) / n;
  const pts = [
    [s, -0.25],
    [e, -0.25],
    [s, 0.95],
    [e, 0.95],
  ].map(([t, up]) => [u.x + u.dx * t + u.ux * up, u.y + u.dy * t + u.uy * up]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** Find the terms in each page's text runs and return boxes to redact. */
export function findMatches(pages: TextRun[][], terms: string[], opts: RedactOptions): UserRect[][] {
  const clean = terms.map((t) => t.trim()).filter(Boolean);
  if (!clean.length) return pages.map(() => []);
  const source = clean.map((t) => (opts.wholeWord ? `(?<![\\p{L}\\p{N}])${escapeRe(t)}(?![\\p{L}\\p{N}])` : escapeRe(t))).join("|");
  const re = new RegExp(source, opts.caseSensitive ? "gu" : "giu");
  return pages.map((runs) => {
    let text = "";
    const map: { run: number; offset: number }[] = [];
    runs.forEach((r, i) => {
      for (let k = 0; k < r.str.length; k++) {
        text += r.str[k];
        map.push({ run: i, offset: k });
      }
      text += " "; // runs are separate words/cells unless adjacent
      map.push({ run: -1, offset: 0 });
    });
    const boxes: UserRect[] = [];
    for (const m of text.matchAll(re)) {
      const spans = new Map<number, [number, number]>();
      for (let i = m.index!; i < m.index! + m[0].length; i++) {
        const c = map[i];
        if (!c || c.run < 0) continue;
        const s = spans.get(c.run);
        spans.set(c.run, s ? [s[0], c.offset + 1] : [c.offset, c.offset + 1]);
      }
      for (const [run, [a, b]] of spans) {
        const box = spanBox(runs[run], a, b);
        if (box) boxes.push(box);
      }
    }
    return boxes;
  });
}

/**
 * Remove matched text from the page content (not just cover it) and paint
 * black boxes over the spots.
 */
export async function redactPdf(bytes: Uint8Array, pages: TextRun[][], terms: string[], opts: RedactOptions): Promise<RedactReport> {
  const doc: PDFDocument = await loadPdf(bytes);
  const found = findMatches(pages, terms, opts);
  const report: RedactReport = { bytes, matches: {}, unsafePages: [], boxes: {} };
  for (const [i, boxes] of found.entries()) {
    if (!boxes.length) continue;
    report.matches[i] = boxes.length;
    report.boxes[i] = boxes;
    const page = doc.getPage(i);
    const pad = 0.6;
    const rects = boxes.map((b) => [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad] as UserRect);
    const res = removeTextInRects(page, rects);
    if (res.unsafe.some(Boolean) || res.removed.some((n) => n === 0)) report.unsafePages.push(i);
    // Black boxes drawn in raw user space, isolated from the page's own state.
    const start = doc.context.register(doc.context.contentStream([pushGraphicsState()]));
    const end = doc.context.register(doc.context.contentStream([popGraphicsState()]));
    page.node.wrapContentStreams(start, end);
    page.pushOperators(pushGraphicsState(), concatTransformationMatrix(1, 0, 0, 1, 0, 0));
    for (const r of rects) page.drawRectangle({ x: r[0], y: r[1], width: r[2] - r[0], height: r[3] - r[1], color: rgb(0, 0, 0) });
    page.pushOperators(popGraphicsState());
  }
  report.bytes = await save(doc);
  return report;
}
