/**
 * The colour and underline of every letter on a page.
 *
 * pdf.js's text content gives words and fonts, but not colour, and one text
 * item often mixes colours (a sentence with blue links in it). Underlines are
 * not text at all: they are thin lines drawn under it. Both are read here from
 * the page's drawing commands (the pdf.js operator list, which has every
 * colour space already converted to RGB), so an edited line can keep the look
 * of each of its letters.
 */
import type { UserRect } from "./textRemoval";

type Mat = [number, number, number, number, number, number];
const I: Mat = [1, 0, 0, 1, 0, 0];
const mul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];
const apply = (m: Mat, x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

/** A drawn letter: its baseline from start to end in PDF user space. */
export interface InkGlyph {
  str: string;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** null when it isn't a plain colour (a pattern or shading). */
  color: string | null;
}

/** A thin straight bar (a stroked line or a filled sliver): the area it paints, in PDF user space. */
export interface InkRule {
  rect: UserRect;
  color: string | null;
}

export interface PageInk {
  glyphs: InkGlyph[];
  rules: InkRule[];
}

interface FontLike {
  fontMatrix?: ArrayLike<number>;
  vertical?: boolean;
}

interface State {
  ctm: Mat;
  fill: string | null;
  stroke: string | null;
  lw: number;
  font: FontLike | undefined;
  fs: number;
  dir: number;
  tc: number;
  tw: number;
  th: number;
  tl: number;
  rise: number;
  mode: number;
  tm: Mat;
  x: number;
  y: number;
  lx: number;
  ly: number;
}

const freshState = (): State => ({
  ctm: I, fill: "#000000", stroke: "#000000", lw: 1, font: undefined, fs: 0, dir: 1,
  tc: 0, tw: 0, th: 1, tl: 0, rise: 0, mode: 0, tm: I, x: 0, y: 0, lx: 0, ly: 0,
});

const toHex = (a: ArrayLike<unknown>): string | null => {
  if (typeof a[0] === "string") return a[0];
  // The arguments can be a typed array, so copy before mapping to strings.
  const rgb = Array.from(a).slice(0, 3);
  if (rgb.length < 3 || rgb.some((v) => typeof v !== "number")) return null;
  return "#" + (rgb as number[]).map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
};

const asMat = (v: unknown): Mat | null => {
  const m = v as ArrayLike<number> | null | undefined;
  return m && typeof m === "object" && m.length === 6 ? (Array.from(m) as Mat) : null;
};

/**
 * Replay a page's operator list, following the graphics and text state the
 * way pdf.js's renderer does, and collect every visible letter and thin bar.
 */
export function readInk(
  list: { fnArray: ArrayLike<number>; argsArray: ArrayLike<unknown> },
  OPS: Record<string, number>,
  getFont: (name: string) => FontLike | undefined,
): PageInk {
  const glyphs: InkGlyph[] = [];
  const rules: InkRule[] = [];
  let s = freshState();
  const stack: State[] = [];
  /** Sub-paths waiting for their paint operator, as user-space points. */
  let path: { pts: [number, number][]; straight: boolean }[] = [];

  const setFont = (name: unknown, size: unknown) => {
    try {
      s.font = getFont(String(name));
    } catch {
      s.font = undefined; // not loaded; the default glyph scale is right for nearly every font
    }
    const n = Number(size) || 0;
    s.fs = Math.abs(n);
    s.dir = n < 0 ? -1 : 1;
  };
  const moveText = (x: number, y: number) => {
    s.x = s.lx += x;
    s.y = s.ly += y;
  };

  const show = (arr: unknown) => {
    if (!Array.isArray(arr) || s.fs === 0) return;
    const vertical = !!s.font?.vertical;
    const hs = s.th * s.dir;
    const scale = s.fs * (s.font?.fontMatrix?.[0] ?? 0.001);
    const m = mul(s.tm, s.ctm);
    const invisible = s.mode === 3 || s.mode === 7;
    const color = s.mode === 1 || s.mode === 5 ? s.stroke : s.fill;
    let x = 0;
    for (const g of arr as (number | { unicode?: string; width?: number; isSpace?: boolean } | null)[]) {
      if (typeof g === "number") {
        x += ((vertical ? 1 : -1) * g * s.fs) / 1000;
        continue;
      }
      if (!g || typeof g !== "object") continue;
      const spacing = (g.isSpace ? s.tw : 0) + s.tc;
      const w = (g.width ?? 0) * scale;
      if (!vertical && !invisible && w > 0 && typeof g.unicode === "string") {
        const [ax, ay] = apply(m, s.x + x * hs, s.y + s.rise);
        const [bx, by] = apply(m, s.x + (x + w) * hs, s.y + s.rise);
        glyphs.push({ str: g.unicode, ax, ay, bx, by, color });
      }
      x += vertical ? w - spacing * s.dir : w + spacing * s.dir;
    }
    if (vertical) s.y -= x;
    else s.x += x * hs;
  };

  const construct = (ops: unknown, coords: unknown) => {
    if (!ops || !coords || typeof ops !== "object" || typeof coords !== "object") return;
    const o = ops as ArrayLike<number>;
    const c = coords as ArrayLike<number>;
    let k = 0;
    let cur: (typeof path)[number] | null = null;
    const pt = (x: number, y: number) => apply(s.ctm, x, y);
    for (let i = 0; i < o.length; i++) {
      switch (o[i]) {
        case OPS.moveTo:
          cur = { pts: [pt(c[k], c[k + 1])], straight: true };
          path.push(cur);
          k += 2;
          break;
        case OPS.lineTo:
          cur?.pts.push(pt(c[k], c[k + 1]));
          k += 2;
          break;
        case OPS.rectangle: {
          const [x, y, w, h] = [c[k], c[k + 1], c[k + 2], c[k + 3]];
          cur = { pts: [pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h)], straight: true };
          path.push(cur);
          k += 4;
          break;
        }
        case OPS.curveTo:
          if (cur) cur.straight = false;
          k += 6;
          break;
        case OPS.curveTo2:
        case OPS.curveTo3:
          if (cur) cur.straight = false;
          k += 4;
          break;
      }
    }
  };

  const paint = (stroked: boolean, filled: boolean) => {
    const scale = Math.sqrt(Math.abs(s.ctm[0] * s.ctm[3] - s.ctm[1] * s.ctm[2]));
    const half = stroked ? (s.lw * scale) / 2 : 0;
    for (const sub of path) {
      if (!sub.straight || sub.pts.length < 2) continue;
      const xs = sub.pts.map((p) => p[0]);
      const ys = sub.pts.map((p) => p[1]);
      const [x0, y0, x1, y1] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      // A stroke only counts when its path is a single straight line, not an outline.
      if (!filled && Math.min(x1 - x0, y1 - y0) > 0.05) continue;
      const rect: UserRect = [x0 - half, y0 - half, x1 + half, y1 + half];
      const [w, h] = [rect[2] - rect[0], rect[3] - rect[1]];
      if (Math.min(w, h) > 3 || Math.max(w, h) < 2) continue;
      rules.push({ rect, color: filled ? s.fill : s.stroke });
    }
    path = [];
  };

  const { fnArray, argsArray } = list;
  for (let i = 0; i < fnArray.length; i++) {
    const a = (argsArray[i] ?? []) as unknown[];
    switch (fnArray[i]) {
      case OPS.save:
      case OPS.beginGroup:
        stack.push({ ...s });
        break;
      case OPS.restore:
      case OPS.endGroup:
      case OPS.paintFormXObjectEnd:
      case OPS.endAnnotation:
        s = stack.pop() ?? s;
        break;
      case OPS.transform: {
        const m = asMat(a);
        if (m) s.ctm = mul(m, s.ctm);
        break;
      }
      case OPS.paintFormXObjectBegin: {
        stack.push({ ...s });
        const m = asMat(a[0]);
        if (m) s.ctm = mul(m, s.ctm);
        break;
      }
      case OPS.beginAnnotation: {
        stack.push({ ...s });
        s = freshState();
        const t = asMat(a[2]);
        const m = asMat(a[3]);
        if (t) s.ctm = mul(t, s.ctm);
        if (m) s.ctm = mul(m, s.ctm);
        break;
      }
      case OPS.setFillRGBColor:
        s.fill = toHex(a);
        break;
      case OPS.setStrokeRGBColor:
        s.stroke = toHex(a);
        break;
      case OPS.setFillColorN:
      case OPS.setFillColor:
      case OPS.setFillTransparent:
        s.fill = null;
        break;
      case OPS.setStrokeColorN:
      case OPS.setStrokeColor:
      case OPS.setStrokeTransparent:
        s.stroke = null;
        break;
      case OPS.setLineWidth:
        s.lw = Number(a[0]) || 0;
        break;
      case OPS.setGState:
        for (const entry of (Array.isArray(a[0]) ? a[0] : []) as [string, unknown][]) {
          if (entry[0] === "Font" && Array.isArray(entry[1])) setFont(entry[1][0], entry[1][1]);
          else if (entry[0] === "LW") s.lw = Number(entry[1]) || 0;
        }
        break;

      case OPS.beginText:
        s.tm = I;
        s.x = s.lx = s.y = s.ly = 0;
        break;
      case OPS.setCharSpacing:
        s.tc = Number(a[0]) || 0;
        break;
      case OPS.setWordSpacing:
        s.tw = Number(a[0]) || 0;
        break;
      case OPS.setHScale:
        s.th = (Number(a[0]) || 0) / 100;
        break;
      case OPS.setLeading:
        s.tl = -(Number(a[0]) || 0);
        break;
      case OPS.setFont:
        setFont(a[0], a[1]);
        break;
      case OPS.setTextRenderingMode:
        s.mode = Number(a[0]) || 0;
        break;
      case OPS.setTextRise:
        s.rise = Number(a[0]) || 0;
        break;
      case OPS.moveText:
        moveText(Number(a[0]) || 0, Number(a[1]) || 0);
        break;
      case OPS.setLeadingMoveText:
        s.tl = Number(a[1]) || 0;
        moveText(Number(a[0]) || 0, Number(a[1]) || 0);
        break;
      case OPS.setTextMatrix: {
        const m = asMat(a) ?? asMat(a[0]);
        if (m) s.tm = m;
        s.x = s.lx = s.y = s.ly = 0;
        break;
      }
      case OPS.nextLine:
        moveText(0, s.tl);
        break;
      case OPS.showText:
      case OPS.showSpacedText:
        show(a[0]);
        break;
      case OPS.nextLineShowText:
        moveText(0, s.tl);
        show(a[0]);
        break;
      case OPS.nextLineSetSpacingShowText:
        s.tw = Number(a[0]) || 0;
        s.tc = Number(a[1]) || 0;
        moveText(0, s.tl);
        show(a[2]);
        break;

      case OPS.constructPath:
        construct(a[0], a[1]);
        break;
      case OPS.stroke:
      case OPS.closeStroke:
        paint(true, false);
        break;
      case OPS.fill:
      case OPS.eoFill:
        paint(false, true);
        break;
      case OPS.fillStroke:
      case OPS.eoFillStroke:
      case OPS.closeFillStroke:
      case OPS.closeEOFillStroke:
        paint(true, true);
        break;
      case OPS.endPath:
        path = [];
        break;
    }
  }
  return { glyphs, rules };
}

// ─── Per line ───────────────────────────────────────────────────────

/** A letter that reads left to right on screen, in view space (y down). */
interface ViewGlyph {
  str: string;
  x0: number;
  x1: number;
  y: number;
  color: string | null;
}

/** A horizontal bar in view space. */
interface ViewRule {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  source: InkRule;
}

export interface ViewInk {
  /** Letters bucketed by baseline, for quick lookup. */
  rows: Map<number, ViewGlyph[]>;
  rules: ViewRule[];
}

const ROW = 4;

/** Ink as it appears on screen, given the page viewport's user → view conversion. */
export function projectInk(ink: PageInk, toView: (x: number, y: number) => number[]): ViewInk {
  const rows = new Map<number, ViewGlyph[]>();
  for (const g of ink.glyphs) {
    const [x0, y0] = toView(g.ax, g.ay);
    const [x1, y1] = toView(g.bx, g.by);
    if (x1 <= x0 || Math.abs(y1 - y0) > 0.05) continue;
    const k = Math.floor(y0 / ROW);
    const row = rows.get(k);
    const v = { str: g.str, x0, x1, y: y0, color: g.color };
    if (row) row.push(v);
    else rows.set(k, [v]);
  }
  const rules: ViewRule[] = [];
  for (const r of ink.rules) {
    const [ax, ay] = toView(r.rect[0], r.rect[1]);
    const [bx, by] = toView(r.rect[2], r.rect[3]);
    const [x0, y0, x1, y1] = [Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by)];
    if (y1 - y0 > 3 || x1 - x0 < (y1 - y0) * 3) continue; // not horizontal on screen
    rules.push({ x0, y0, x1, y1, source: r });
  }
  return { rows, rules };
}

/** A text item of the line: its string, where that sits in the line's text, and its extent on screen. */
export interface InkSegment {
  str: string;
  start: number;
  x0: number;
  x1: number;
}

export interface CharInk {
  /** undefined when the colour could not be read. */
  color?: string;
  underline: boolean;
}

export interface LineInk {
  /** One entry per character of the line's text. */
  chars: CharInk[];
  /** The bars that underline the line. */
  underlines: { userRect: UserRect; rect: { x: number; y: number; w: number; h: number } }[];
}

const squash = (s: string) => s.normalize("NFKC").replace(/\s+/g, "");

/**
 * Colour and underline of each character of a line. Letters are matched to
 * the drawn glyphs in reading order when both spell the same thing, otherwise
 * by position.
 */
export function lineInk(view: ViewInk, segs: InkSegment[], text: string, base: number, size: number): LineInk {
  type Found = { color: string | null; cx: number; rule: number } | undefined;
  const found: Found[] = Array.from({ length: text.length });

  const tolY = Math.max(0.75, size * 0.15);
  const near: ViewGlyph[] = [];
  for (let k = Math.floor((base - tolY) / ROW); k <= Math.floor((base + tolY) / ROW); k++) {
    for (const g of view.rows.get(k) ?? []) if (Math.abs(g.y - base) <= tolY) near.push(g);
  }
  near.sort((a, b) => a.x0 - b.x0);

  for (const seg of segs) {
    const pad = size * 0.2;
    const gs = near.filter((g) => {
      const c = (g.x0 + g.x1) / 2;
      return c >= seg.x0 - pad && c <= seg.x1 + pad && squash(g.str);
    });
    if (!gs.length) continue;
    // Positions of the letters (whitespace has no glyph of its own to match).
    const letters: number[] = [];
    for (let i = 0; i < seg.str.length; i++) if (seg.str[i].trim()) letters.push(i);
    const spelled = gs.map((g) => squash(g.str));
    if (seg.str.normalize("NFKC").length === seg.str.length && spelled.join("") === squash(seg.str)) {
      let n = 0;
      gs.forEach((g, gi) => {
        for (let j = 0; j < spelled[gi].length && n < letters.length; j++, n++) {
          found[seg.start + letters[n]] = { color: g.color, cx: (g.x0 + g.x1) / 2, rule: -1 };
        }
      });
    } else {
      // Different spelling (reordered or doubled text): take the nearest glyph.
      for (const i of letters) {
        const cx = seg.x0 + ((i + 0.5) / seg.str.length) * (seg.x1 - seg.x0);
        const g = gs.reduce((best, cand) => (Math.abs((cand.x0 + cand.x1) / 2 - cx) < Math.abs((best.x0 + best.x1) / 2 - cx) ? cand : best));
        found[seg.start + i] = { color: g.color, cx, rule: -1 };
      }
    }
  }

  // Underlines: thin bars just below the baseline that stay within the line's own extent.
  const x0 = Math.min(...segs.map((s) => s.x0));
  const x1 = Math.max(...segs.map((s) => s.x1));
  const under = view.rules.filter((r) => {
    const yc = (r.y0 + r.y1) / 2;
    return (
      r.y1 - r.y0 <= Math.max(1.2, size * 0.12) &&
      yc >= base + size * 0.01 &&
      yc <= base + size * 0.4 &&
      r.x1 - r.x0 >= size * 0.3 &&
      r.x0 >= x0 - size * 0.25 &&
      r.x1 <= x1 + size * 0.25
    );
  });
  const used = new Set<number>();
  for (const f of found) {
    if (!f) continue;
    f.rule = under.findIndex((r) => f.cx >= r.x0 - size * 0.1 && f.cx <= r.x1 + size * 0.1);
    if (f.rule >= 0) used.add(f.rule);
  }

  // Spaces take the look of the letters around them.
  const chars: CharInk[] = [];
  for (let i = 0; i < text.length; i++) {
    const f = found[i];
    if (f) {
      chars.push({ color: f.color ?? undefined, underline: f.rule >= 0 });
      continue;
    }
    let p = i - 1;
    while (p >= 0 && !found[p]) p--;
    let n = i + 1;
    while (n < text.length && !found[n]) n++;
    const prev = found[p];
    const next = found[n];
    chars.push({
      color: (prev ?? next)?.color ?? undefined,
      underline: !!prev && !!next && prev.rule >= 0 && prev.rule === next.rule,
    });
  }

  return {
    chars,
    underlines: [...used].map((k) => {
      const r = under[k];
      return { userRect: r.source.rect, rect: { x: r.x0, y: r.y0, w: r.x1 - r.x0, h: r.y1 - r.y0 } };
    }),
  };
}
