/**
 * Find and remove watermarks in a PDF, for real (the objects are deleted from
 * the page, not covered up):
 *  - content marked as a watermark (Acrobat, Fusion Office and most tools tag
 *    it `/Artifact <</Subtype /Watermark>>`, or put it on a "Watermark" layer)
 *  - watermark annotations (and, if chosen, stamp annotations)
 *  - text drawn rotated, see-through, or large and light grey (DRAFT, COPY…)
 *  - the same image or drawing placed on many pages (logos, "SAMPLE" images)
 * Pure pdf-lib; runs in the browser and in tests.
 */
import { PDFArray, PDFDict, PDFName, PDFNumber, PDFRef, PDFStream, PDFString, PDFHexString, type PDFDocument, type PDFPage } from "pdf-lib";
import { apply, I, mul, pageContent, parseContent, removeTextInRects, type Mat, type Op, type Operand, type UserRect } from "../../pdf/textRemoval";
import { loadPdf, save } from "./common";

export type MarkKind = "artifact" | "layer" | "annotation" | "stamp" | "text" | "xobject";

export interface WatermarkCandidate {
  id: string;
  kind: MarkKind;
  /** Short description for the list. */
  label: string;
  /** Why it looks like a watermark. */
  reason: string;
  /** 0-based pages it appears on. */
  pages: number[];
  /** Times it is drawn in total. */
  count: number;
  /** Pre-ticked: very likely a watermark. */
  likely: boolean;
  /** Where to look for a preview: page and a user-space box. */
  preview: { page: number; box: UserRect } | null;
}

/** One deletable thing in a page's content: a byte range and what to put instead. */
interface Hit {
  start: number;
  end: number;
  replace: string;
}

interface PageScan {
  hits: Map<string, Hit[]>;
}

export interface Analysis {
  candidates: WatermarkCandidate[];
  pageCount: number;
  /** Per page, per candidate id: the edits that remove it. */
  scans: PageScan[];
}

const latin1 = (b: Uint8Array) => {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
};

const nameOf = (o: Operand | undefined) => (typeof o === "string" && o.startsWith("/") ? o.slice(1) : null);

function numberOf(o: unknown): number | undefined {
  return o instanceof PDFNumber ? o.asNumber() : undefined;
}

function textOfPdfString(o: unknown): string {
  if (o instanceof PDFString || o instanceof PDFHexString) return o.decodeText();
  if (o instanceof PDFName) return o.decodeText();
  return "";
}

/** Readable text from the bytes of a text-showing operator (simple 1-byte fonts); "" if not readable. */
function readable(args: Operand[]): string {
  const parts: string[] = [];
  const walk = (a: Operand) => {
    if (a instanceof Uint8Array) parts.push(latin1(a));
    else if (Array.isArray(a)) a.forEach(walk);
  };
  args.forEach(walk);
  const s = parts.join("");
  // Two-byte (Identity-H) fonts give control characters: not readable.
  return /^[\x20-\x7e -ÿ]+$/.test(s) && s.trim() ? s.trim() : "";
}

const glyphCount = (args: Operand[]): number => {
  let n = 0;
  const walk = (a: Operand) => {
    if (a instanceof Uint8Array) n += a.length;
    else if (Array.isArray(a)) a.forEach(walk);
  };
  args.forEach(walk);
  return n;
};

const bytesKey = (args: Operand[]): string => {
  const parts: string[] = [];
  const walk = (a: Operand) => {
    if (a instanceof Uint8Array) parts.push(latin1(a));
    else if (Array.isArray(a)) a.forEach(walk);
  };
  args.forEach(walk);
  return parts.join("");
};

function boxOf(m: Mat, w: number, h: number, ox = 0, oy = 0): UserRect {
  const pts = [apply(m, ox, oy), apply(m, ox + w, oy), apply(m, ox, oy + h), apply(m, ox + w, oy + h)];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

const angleOf = (m: Mat) => (((Math.atan2(m[1], m[0]) * 180) / Math.PI) % 360 + 360) % 360;
const angleDiff = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

interface Occurrence {
  key: string;
  kind: MarkKind;
  label: string;
  reason: string;
  likely: boolean;
  hit: Hit;
  box: UserRect | null;
}

interface TextShow {
  /** The operator, with `args` narrowed to the shown strings. */
  op: Op;
  /** The operator as written (for `"`: word and character spacing). */
  orig: Op;
  angle: number;
  size: number;
  alpha: number;
  light: boolean;
  glyphs: number;
  box: UserRect;
  font: string;
  lastInBT: boolean;
  tr: number;
}

/** Scan one page's content for watermark-like objects. */
function scanPage(doc: PDFDocument, page: PDFPage): Occurrence[] {
  const content = pageContent(page);
  if (!content) return [];
  const ops = parseContent(content);
  const res = page.node.Resources();
  const sub = (key: string) => {
    const d = res?.lookup(PDFName.of(key));
    return d instanceof PDFDict ? d : null;
  };
  const fonts = sub("Font");
  // Resource names differ from page to page ("/F1", "/Helvetica-8123"); group by the font's real name.
  const fontName = (res: string) => {
    const f = fonts?.lookup(PDFName.of(res.replace(/^\//, "")));
    const base = f instanceof PDFDict ? f.lookup(PDFName.of("BaseFont")) : undefined;
    return base instanceof PDFName ? base.decodeText().replace(/^[A-Z]{6}\+/, "") : res;
  };
  const xobjects = sub("XObject");
  const extg = sub("ExtGState");
  const props = sub("Properties");
  const out: Occurrence[] = [];

  // ── Marked content: /Artifact <</Subtype /Watermark>> or a "watermark" layer ──
  const stack: { op: Op; watermark: string | null }[] = [];
  for (const op of ops) {
    if (op.op === "BMC" || op.op === "BDC") {
      let wm: string | null = null;
      if (op.op === "BDC") {
        const raw = latin1(content.subarray(op.start, op.end));
        if (nameOf(op.args[0]) === "Artifact" && /\/Subtype\s*\/Watermark|\/Watermark\b/.test(raw)) wm = "artifact";
        else if (nameOf(op.args[0]) === "OC") {
          const propName = nameOf(op.args[1]);
          const ocg = propName && props ? props.lookup(PDFName.of(propName)) : null;
          const ocgName = ocg instanceof PDFDict ? textOfPdfString(ocg.lookup(PDFName.of("Name"))) : "";
          if (/watermark|draft|confidential/i.test(ocgName)) wm = `layer:${ocgName}`;
        }
      }
      stack.push({ op, watermark: wm });
    } else if (op.op === "EMC") {
      const open = stack.pop();
      if (open?.watermark && !stack.some((s) => s.watermark)) {
        const isLayer = open.watermark.startsWith("layer:");
        out.push({
          key: isLayer ? open.watermark : "artifact",
          kind: isLayer ? "layer" : "artifact",
          label: isLayer ? `“${open.watermark.slice(6)}” layer` : "Marked watermark",
          reason: isLayer ? "Content on a layer named as a watermark" : "Tagged as a watermark by the software that added it",
          likely: true,
          hit: { start: open.op.start, end: op.end, replace: "" },
          box: null,
        });
      }
    }
  }
  const insideWatermarkBlock = (pos: number) => out.some((o) => (o.kind === "artifact" || o.kind === "layer") && pos >= o.hit.start && pos < o.hit.end);

  // ── Replay graphics state for text and XObjects ──
  let ctm: Mat = I;
  let alpha = 1;
  let fill: number[] = [0];
  let tm: Mat = I;
  let tlm: Mat = I;
  let font = "";
  let fs = 0;
  let tl = 0;
  let tr = 0;
  const gstack: { ctm: Mat; alpha: number; fill: number[]; font: string; fs: number; tl: number; tr: number }[] = [];
  const texts: TextShow[] = [];
  let btShows: TextShow[] = [];

  for (const op of ops) {
    const a = op.args;
    switch (op.op) {
      case "q":
        gstack.push({ ctm, alpha, fill, font, fs, tl, tr });
        break;
      case "Q": {
        const s = gstack.pop();
        if (s) ({ ctm, alpha, fill, font, fs, tl, tr } = s);
        break;
      }
      case "cm":
        if (a.length === 6) ctm = mul(a as Mat, ctm);
        break;
      case "gs": {
        const g = extg?.lookup(PDFName.of(nameOf(a[0]) ?? ""));
        if (g instanceof PDFDict) {
          const ca = numberOf(g.lookup(PDFName.of("ca")));
          if (ca !== undefined) alpha = ca;
        }
        break;
      }
      case "g":
      case "rg":
      case "k":
      case "sc":
      case "scn":
        if (a.every((x) => typeof x === "number")) fill = a as number[];
        break;
      case "BT":
        tm = tlm = I;
        btShows = [];
        break;
      case "ET":
        if (btShows.length) btShows[btShows.length - 1].lastInBT = true;
        break;
      case "Tf":
        font = String(a[0] ?? "");
        fs = Number(a[1] ?? 0);
        break;
      case "TL":
        tl = Number(a[0] ?? 0);
        break;
      case "Tr":
        tr = Number(a[0] ?? 0);
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
      case "'":
      case '"':
        tlm = mul([1, 0, 0, 1, 0, -tl], tlm);
        tm = tlm;
        if (op.op === "T*") break;
      // falls through
      case "Tj":
      case "TJ": {
        if (tr === 3) break; // already invisible (e.g. OCR text layers)
        const show = op.op === "TJ" ? (Array.isArray(a[0]) ? (a[0] as Operand[]) : []) : op.op === '"' ? [a[2]] : [a[0]];
        const m = mul(tm, ctm);
        const scale = Math.hypot(m[0], m[1]);
        const glyphs = glyphCount(show);
        const size = fs * scale;
        // Rough box: average glyph ~0.55 em wide.
        const w = glyphs * fs * 0.55;
        const box = boxOf(m, w, fs * 0.8, 0, -fs * 0.1);
        const light = fill.length === 1 ? fill[0] > 0.55 : fill.length === 3 ? Math.min(...fill) > 0.55 : fill.length === 4 ? Math.max(...fill) < 0.4 : false;
        const t: TextShow = { op: { ...op, args: show }, orig: op, angle: angleOf(m), size, alpha, light, glyphs, box, font, lastInBT: false, tr };
        // The advance of this text isn't tracked precisely; boxes are for previews only.
        tm = mul([1, 0, 0, 1, w, 0], tm);
        btShows.push(t);
        texts.push(t);
        break;
      }
      case "Do": {
        if (insideWatermarkBlock(op.start)) break;
        const name = nameOf(a[0]) ?? "";
        const ref = xobjects?.get(PDFName.of(name));
        const obj = ref instanceof PDFRef ? doc.context.lookup(ref) : ref;
        if (!(obj instanceof PDFStream)) break;
        const dict = obj.dict;
        const subtype = (dict.lookup(PDFName.of("Subtype")) as PDFName | undefined)?.decodeText();
        let box: UserRect;
        if (subtype === "Form") {
          const bb = dict.lookup(PDFName.of("BBox"));
          const fm = dict.lookup(PDFName.of("Matrix"));
          const b = bb instanceof PDFArray ? bb.asArray().map((x) => numberOf(doc.context.lookup(x)) ?? 0) : [0, 0, 0, 0];
          const mat = fm instanceof PDFArray ? (fm.asArray().map((x) => numberOf(doc.context.lookup(x)) ?? 0) as Mat) : I;
          box = boxOf(mul(mat, ctm), b[2] - b[0], b[3] - b[1], b[0], b[1]);
        } else box = boxOf(ctm, 1, 1);
        const rotated = angleDiff(angleOf(ctm), 0) > 3 && angleDiff(angleOf(ctm), 90) > 3 && angleDiff(angleOf(ctm), 180) > 3 && angleDiff(angleOf(ctm), 270) > 3;
        out.push({
          key: `x:${ref instanceof PDFRef ? `${ref.objectNumber}.${ref.generationNumber}` : name}`,
          kind: "xobject",
          label: subtype === "Image" ? "Picture repeated on pages" : "Drawing repeated on pages",
          reason: [alpha < 0.95 && "see-through", rotated && "rotated", subtype === "Image" && dict.lookup(PDFName.of("SMask")) && "has transparency"].filter(Boolean).join(", ") || "same object on many pages",
          likely: alpha < 0.95 || rotated,
          hit: { start: op.start, end: op.end, replace: "" },
          box,
        });
        break;
      }
    }
  }

  // ── Text: compare with the page's usual text direction ──
  const weights = new Map<number, number>();
  for (const t of texts) {
    const k = Math.round(t.angle / 5) * 5;
    weights.set(k, (weights.get(k) ?? 0) + t.glyphs);
  }
  const bodyAngle = [...weights.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? 0;
  const bodySizes = texts.map((t) => t.size).sort((x, y) => x - y);
  const bodySize = bodySizes[Math.floor(bodySizes.length / 2)] ?? 12;
  for (const t of texts) {
    if (insideWatermarkBlock(t.op.start)) continue;
    const rotated = angleDiff(t.angle, bodyAngle) > 8;
    const seeThrough = t.alpha < 0.95;
    const bigLight = t.light && t.size >= Math.max(24, bodySize * 2);
    if (!rotated && !seeThrough && !bigLight) continue;
    const text = readable(t.op.args);
    // Delete the operator when nothing after it in the text block depends on
    // its width; otherwise make it invisible (keeps later text in place).
    const invisible = `3 Tr ${latin1(content.subarray(t.op.start, t.op.end))} ${t.tr} Tr`;
    // ' and " also move to the next line (and " sets spacing), so keep that part.
    const keep = t.op.op === "'" ? "T*" : t.op.op === '"' ? `${Number(t.orig.args[0]) || 0} Tw ${Number(t.orig.args[1]) || 0} Tc T*` : "";
    const replace = t.lastInBT ? keep : invisible;
    out.push({
      key: `t:${fontName(t.font)}|${Math.round(t.size)}|${Math.round(t.angle / 5) * 5}|${bytesKey(t.op.args)}`,
      kind: "text",
      label: text ? `“${text.length > 40 ? `${text.slice(0, 40)}…` : text}”` : "Text",
      reason: [rotated && "rotated", seeThrough && "see-through", bigLight && "large and light"].filter(Boolean).join(", "),
      likely: true,
      hit: { start: t.op.start, end: t.op.end, replace },
      box: t.box,
    });
  }
  return out;
}

/** Look through every page and list what looks like a watermark. */
export async function analyzeWatermarks(bytes: Uint8Array): Promise<Analysis> {
  const doc = await loadPdf(bytes);
  const pages = doc.getPages();
  const groups = new Map<string, { occ: Occurrence; pages: Set<number>; count: number; first: { page: number; box: UserRect | null } }>();
  const scans: PageScan[] = pages.map(() => ({ hits: new Map() }));

  pages.forEach((page, pi) => {
    for (const occ of scanPage(doc, page)) {
      const g = groups.get(occ.key) ?? { occ, pages: new Set<number>(), count: 0, first: { page: pi, box: occ.box } };
      g.pages.add(pi);
      g.count++;
      groups.set(occ.key, g);
      const list = scans[pi].hits.get(occ.key) ?? [];
      list.push(occ.hit);
      scans[pi].hits.set(occ.key, list);
    }
    // Annotations.
    const annots = page.node.Annots();
    if (annots) {
      for (const ref of annots.asArray()) {
        const a = doc.context.lookup(ref);
        if (!(a instanceof PDFDict)) continue;
        const st = (a.lookup(PDFName.of("Subtype")) as PDFName | undefined)?.decodeText();
        if (st !== "Watermark" && st !== "Stamp") continue;
        const key = st === "Watermark" ? "a:watermark" : "a:stamp";
        const rect = a.lookup(PDFName.of("Rect"));
        const box = rect instanceof PDFArray ? (rect.asArray().map((x) => numberOf(doc.context.lookup(x)) ?? 0) as UserRect) : null;
        const g = groups.get(key) ?? {
          occ: { key, kind: st === "Watermark" ? "annotation" : "stamp", label: st === "Watermark" ? "Watermark annotation" : "Stamp", reason: st === "Watermark" ? "A watermark added as an annotation" : "Stamps like “Approved” or “Draft” added in a PDF viewer", likely: st === "Watermark", hit: { start: 0, end: 0, replace: "" }, box },
          pages: new Set<number>(),
          count: 0,
          first: { page: pi, box },
        };
        g.pages.add(pi);
        g.count++;
        groups.set(key, g);
      }
    }
  });

  const n = pages.length;
  const candidates: WatermarkCandidate[] = [];
  for (const [id, g] of groups) {
    const share = g.pages.size / n;
    const kind = g.occ.kind;
    // Repeated objects only count when they're on many pages or tiled on a page.
    if (kind === "xobject" && !(g.pages.size >= 2 && share >= 0.5) && !(g.count >= 3 && g.count >= g.pages.size * 3) && !(n === 1 && g.occ.likely)) continue;
    const likely = kind === "text" ? share >= 0.5 || n <= 2 || g.count >= 3 : g.occ.likely;
    candidates.push({
      id,
      kind,
      label: g.occ.label,
      reason: g.occ.reason,
      pages: [...g.pages].sort((a, b) => a - b),
      count: g.count,
      likely,
      preview: g.first.box ? { page: g.first.page, box: g.first.box } : null,
    });
  }
  const order: MarkKind[] = ["artifact", "layer", "annotation", "text", "xobject", "stamp"];
  candidates.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || b.pages.length - a.pages.length);
  return { candidates, pageCount: n, scans };
}

export interface RemoveOptions {
  /** Candidate ids to remove. */
  ids: string[];
  /** Extra words or phrases to remove wherever they appear, with their boxes per page (from text extraction). */
  textBoxes?: UserRect[][];
}

export interface RemoveReport {
  bytes: Uint8Array;
  removed: number;
  /** Pages where some of the typed text couldn't be removed (special fonts, text inside drawings). */
  textMissed: number[];
}

/** Remove the chosen watermarks (see analyzeWatermarks) from the PDF. */
export async function removeWatermarks(bytes: Uint8Array, analysis: Analysis, opts: RemoveOptions): Promise<RemoveReport> {
  const doc = await loadPdf(bytes);
  const chosen = new Set(opts.ids);
  let removed = 0;
  const textMissed: number[] = [];

  doc.getPages().forEach((page, pi) => {
    // Annotations first (they're outside the content stream).
    const annots = page.node.Annots();
    if (annots && (chosen.has("a:watermark") || chosen.has("a:stamp"))) {
      const keep = annots.asArray().filter((ref) => {
        const a = doc.context.lookup(ref);
        const st = a instanceof PDFDict ? (a.lookup(PDFName.of("Subtype")) as PDFName | undefined)?.decodeText() : undefined;
        const drop = (st === "Watermark" && chosen.has("a:watermark")) || (st === "Stamp" && chosen.has("a:stamp"));
        if (drop) removed++;
        return !drop;
      });
      page.node.set(PDFName.of("Annots"), doc.context.obj(keep));
    }

    // Content edits for this page, applied from the end so offsets stay valid.
    const hits: Hit[] = [];
    for (const [id, list] of analysis.scans[pi]?.hits ?? []) if (chosen.has(id)) hits.push(...list);
    if (hits.length) {
      const content = pageContent(page);
      if (content) {
        // Drop edits nested inside a bigger removed block.
        hits.sort((x, y) => x.start - y.start || y.end - x.end);
        const flat: Hit[] = [];
        for (const h of hits) if (!flat.length || h.start >= flat[flat.length - 1].end) flat.push(h);
        const enc = new TextEncoder();
        const chunks: Uint8Array[] = [];
        let pos = 0;
        for (const h of flat) {
          chunks.push(content.subarray(pos, h.start), enc.encode(` ${h.replace} `));
          pos = h.end;
        }
        chunks.push(content.subarray(pos));
        const out = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
        let off = 0;
        for (const c of chunks) {
          out.set(c, off);
          off += c.length;
        }
        page.node.set(PDFName.of("Contents"), doc.context.register(doc.context.flateStream(out)));
        removed += flat.length;
      }
    }

    // Typed text: glyph-level removal inside the given boxes.
    const boxes = opts.textBoxes?.[pi] ?? [];
    if (boxes.length) {
      const pad = 0.6;
      const r = removeTextInRects(page, boxes.map((b) => [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad] as UserRect));
      removed += r.removed.reduce((a, b) => a + (b > 0 ? 1 : 0), 0);
      if (r.unsafe.some(Boolean) || r.removed.some((x) => x === 0)) textMissed.push(pi);
    }
  });

  // Watermark layers: also drop them from the layer list so viewers don't show an empty layer.
  const layerNames = new Set(opts.ids.filter((i) => i.startsWith("layer:")).map((i) => i.slice(6)));
  if (layerNames.size) {
    const ocp = doc.catalog.lookup(PDFName.of("OCProperties"));
    const ocgs = ocp instanceof PDFDict ? ocp.lookup(PDFName.of("OCGs")) : null;
    if (ocgs instanceof PDFArray) {
      const keep = ocgs.asArray().filter((ref) => {
        const o = doc.context.lookup(ref);
        return !(o instanceof PDFDict && layerNames.has(textOfPdfString(o.lookup(PDFName.of("Name")))));
      });
      (ocp as PDFDict).set(PDFName.of("OCGs"), doc.context.obj(keep));
    }
  }
  return { bytes: await save(doc), removed, textMissed };
}

