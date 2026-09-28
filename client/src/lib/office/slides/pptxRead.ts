/**
 * PPTX → presentation model. Follows PowerPoint's inheritance: a placeholder
 * on a slide takes its position and text style from the layout, then the
 * master; colours come from the theme through the master's colour map.
 * Reads text (runs, bullets, alignment, sizes, colours, fonts), shapes
 * (fill, outline, rotation, flips), pictures (with cropping), tables,
 * groups, backgrounds, master/layout artwork and speaker notes.
 */
import { attr, descendants, emuToPx, isWebImage, kid, kids, mimeOf, num, Package, path, toDataUrl, type XmlParser } from "../ooxml";
import { uid, type BoxEl, type Deck, type El, type JSONContent, type ShapeKind, type Slide, type TableEl, type DeckTheme } from "./model";

/** Crop an image data URL to a rectangle given in fractions (browser only; optional). */
export type CropImage = (src: string, crop: { l: number; t: number; r: number; b: number }) => Promise<string>;

export interface ReadResult {
  deck: Deck;
  warnings: string[];
}

const SHAPES: Record<string, ShapeKind> = {
  rect: "rect", roundRect: "roundRect", snip1Rect: "rect", round1Rect: "roundRect", round2SameRect: "roundRect", ellipse: "ellipse", triangle: "triangle", rtTriangle: "rtTriangle",
  diamond: "diamond", pentagon: "pentagon", homePlate: "pentagon", hexagon: "hexagon", octagon: "octagon", star5: "star5", rightArrow: "rightArrow",
  leftArrow: "leftArrow", upArrow: "upArrow", downArrow: "downArrow", chevron: "chevron", parallelogram: "parallelogram", trapezoid: "trapezoid",
  heart: "heart", line: "line", straightConnector1: "line", flowChartProcess: "rect", flowChartAlternateProcess: "roundRect", flowChartDecision: "diamond",
  flowChartTerminator: "roundRect", plaque: "roundRect", frame: "rect", donut: "ellipse", flowChartConnector: "ellipse",
};

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h / 6, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const f = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [f(p, q, h + 1 / 3) * 255, f(p, q, h) * 255, f(p, q, h - 1 / 3) * 255];
}

/** Apply DrawingML colour modifiers (lumMod, lumOff, tint, shade, alpha). */
function applyMods(hex: string, el: Element): { color: string; alpha: number } {
  let r = parseInt(hex.slice(0, 2), 16);
  let g = parseInt(hex.slice(2, 4), 16);
  let b = parseInt(hex.slice(4, 6), 16);
  let alpha = 1;
  for (const m of kids(el)) {
    const v = num(attr(m, "val")) / 100000;
    const name = m.localName ?? m.nodeName.replace(/^.*:/, "");
    if (name === "alpha") alpha = v;
    else if (name === "lumMod" || name === "lumOff") {
      const hsl = rgbToHsl(r, g, b);
      hsl.l = name === "lumMod" ? hsl.l * v : Math.min(1, hsl.l + v);
      [r, g, b] = hslToRgb(hsl.h, hsl.s, hsl.l);
    } else if (name === "tint") {
      r += (255 - r) * (1 - v);
      g += (255 - g) * (1 - v);
      b += (255 - b) * (1 - v);
    } else if (name === "shade") {
      r *= v;
      g *= v;
      b *= v;
    }
  }
  return { color: `#${hex2(r)}${hex2(g)}${hex2(b)}`, alpha };
}

const NAMED: Record<string, string> = { black: "000000", white: "FFFFFF", red: "FF0000", green: "008000", blue: "0000FF", yellow: "FFFF00", gray: "808080", orange: "FFA500" };

type Collector = (crop?: CropImage) => Promise<El[]>;

function readStructure(bytes: Uint8Array, parse: XmlParser): { deck: Deck; warnings: Set<string>; collectors: Collector[] } {
  const pkg = new Package(bytes, parse);
  const warnings = new Set<string>();
  const presPath = [...pkg.rels("").values()].find((r) => r.type.endsWith("/officeDocument"))?.target ?? "ppt/presentation.xml";
  const pres = pkg.xml(presPath);
  if (!pres) throw new Error("This doesn't look like a PowerPoint presentation.");
  const presRels = pkg.rels(presPath);
  const sz = kid(pres, "sldSz");
  const width = Math.round(emuToPx(num(attr(sz, "cx"), 12192000)));
  const height = Math.round(emuToPx(num(attr(sz, "cy"), 6858000)));

  // Cache per master: theme colours, colour map, fonts.
  interface MasterInfo {
    path: string;
    xml: Element;
    rels: ReturnType<Package["rels"]>;
    colors: Record<string, string>;
    clrMap: Record<string, string>;
    major: string;
    minor: string;
  }
  const masters = new Map<string, MasterInfo>();
  const master = (p: string): MasterInfo => {
    let m = masters.get(p);
    if (m) return m;
    const xml = pkg.xml(p)!;
    const rels = pkg.rels(p);
    const themePath = [...rels.values()].find((r) => r.type.endsWith("/theme"))?.target;
    const theme = themePath ? pkg.xml(themePath) : null;
    const colors: Record<string, string> = {};
    for (const c of kids(path(theme, "themeElements", "clrScheme"))) {
      const v = kid(c, "srgbClr") ? attr(kid(c, "srgbClr"), "val") : attr(kid(c, "sysClr"), "lastClr");
      if (v) colors[c.localName ?? c.nodeName.replace(/^.*:/, "")] = v.toUpperCase();
    }
    const clrMap: Record<string, string> = { bg1: "lt1", tx1: "dk1", bg2: "lt2", tx2: "dk2" };
    const cm = kid(xml, "clrMap");
    if (cm) for (let i = 0; i < cm.attributes.length; i++) clrMap[cm.attributes[i].localName ?? cm.attributes[i].name] = cm.attributes[i].value;
    const fonts = path(theme, "themeElements", "fontScheme");
    m = {
      path: p,
      xml,
      rels,
      colors,
      clrMap,
      major: attr(path(fonts, "majorFont", "latin"), "typeface") ?? "Calibri Light",
      minor: attr(path(fonts, "minorFont", "latin"), "typeface") ?? "Calibri",
    };
    masters.set(p, m);
    return m;
  };

  // <p:sldId id="256" r:id="rId2"/>: the relationship id is the prefixed one.
  const slidePaths = kids(kid(pres, "sldIdLst"), "sldId").map((s) => presRels.get(s.getAttribute("r:id") ?? "")?.target).filter((p): p is string => !!p && pkg.has(p));
  let deckTheme: DeckTheme | null = null;
  const slides: Slide[] = [];
  const collectors: Collector[] = [];

  for (const sp of slidePaths) {
    const sldXml = pkg.xml(sp)!;
    const sldRels = pkg.rels(sp);
    const layoutPath = [...sldRels.values()].find((r) => r.type.endsWith("/slideLayout"))?.target;
    const layoutXml = layoutPath ? pkg.xml(layoutPath) : null;
    const layoutRels = layoutPath ? pkg.rels(layoutPath) : new Map();
    const masterPath = [...layoutRels.values()].find((r: { type: string }) => r.type.endsWith("/slideMaster"))?.target;
    const mi = masterPath ? master(masterPath) : null;

    const colorOf = (holder: Element | null | undefined): { color: string; alpha: number } | null => {
      if (!holder) return null;
      const c = kids(holder)[0];
      if (!c) return null;
      const name = c.localName ?? c.nodeName.replace(/^.*:/, "");
      let hex: string | null = null;
      if (name === "srgbClr") hex = attr(c, "val");
      else if (name === "sysClr") hex = attr(c, "lastClr");
      else if (name === "prstClr") hex = NAMED[attr(c, "val") ?? ""] ?? null;
      else if (name === "scrgbClr") hex = [attr(c, "r"), attr(c, "g"), attr(c, "b")].map((v) => hex2((num(v) / 100000) * 255)).join("");
      else if (name === "schemeClr") {
        const v = attr(c, "val") ?? "tx1";
        hex = mi?.colors[mi.clrMap[v] ?? v] ?? mi?.colors[v] ?? null;
        if (v === "phClr") hex = null;
      }
      if (!hex || !/^[0-9a-f]{6}$/i.test(hex)) return null;
      return applyMods(hex.toUpperCase(), c);
    };
    const fillOf = (spPr: Element | null): { color: string | null; alpha: number } | "none" | null => {
      if (!spPr) return null;
      if (kid(spPr, "noFill")) return "none";
      const solid = kid(spPr, "solidFill");
      if (solid) {
        const c = colorOf(solid);
        return c ? { color: c.color, alpha: c.alpha } : null;
      }
      const grad = kid(spPr, "gradFill");
      if (grad) {
        const stop = descendants(grad, "gs")[0];
        const c = colorOf(stop);
        return c ? { color: c.color, alpha: c.alpha } : null;
      }
      return null;
    };

    if (!deckTheme && mi) {
      const col = (k: string, d: string) => `#${(mi.colors[mi.clrMap[k] ?? k] ?? d).toLowerCase()}`;
      deckTheme = { id: "file", name: "From file", heading: `${mi.major}, Calibri, Arial, sans-serif`, body: `${mi.minor}, Calibri, Arial, sans-serif`, bg: col("bg1", "FFFFFF"), text: col("tx1", "000000"), accent: col("accent1", "4472C4"), muted: col("tx2", "44546A") };
    }

    // ── Background ──
    const bgOf = (root: Element | null): Slide["background"] | null => {
      const bg = path(root, "cSld", "bg");
      if (!bg) return null;
      const pr = kid(bg, "bgPr");
      if (pr) {
        const blip = descendants(pr, "blip")[0];
        if (blip) {
          const relsFor = root === sldXml ? sldRels : root === layoutXml ? layoutRels : mi?.rels;
          const rel = relsFor?.get(attr(blip, "embed") ?? "");
          if (rel && pkg.files[rel.target] && isWebImage(mimeOf(rel.target))) return { image: toDataUrl(pkg.files[rel.target], mimeOf(rel.target)) };
        }
        const f = fillOf(pr);
        if (f && f !== "none" && f.color) return { color: f.color };
      }
      const ref = kid(bg, "bgRef");
      if (ref) {
        const c = colorOf(ref);
        if (c) return { color: c.color };
      }
      return null;
    };
    const background = bgOf(sldXml) ?? bgOf(layoutXml) ?? (mi ? bgOf(mi.xml) : null) ?? { color: deckTheme?.bg ?? "#ffffff" };

    // ── Placeholders on the layout and master, for inheritance ──
    const phOf = (sp: Element) => kid(kid(kid(sp, "nvSpPr") ?? kid(sp, "nvPicPr") ?? kid(sp, "nvGraphicFramePr"), "nvPr"), "ph");
    const findPh = (root: Element | null, type: string, idx: string | null): Element | null => {
      const shapes = descendants(path(root, "cSld", "spTree"), "sp");
      const norm = (t: string) => (t === "ctrTitle" ? "title" : t === "subTitle" || t === "obj" ? "body" : t);
      if (idx !== null) {
        const byIdx = shapes.find((s) => attr(phOf(s), "idx") === idx);
        if (byIdx) return byIdx;
      }
      return shapes.find((s) => phOf(s) && norm(attr(phOf(s), "type") ?? "body") === norm(type)) ?? null;
    };

    // ── Text ──
    interface Level {
      pPr: Element | null;
    }
    const levelProps = (list: Element | null, lvl: number): Level => ({ pPr: kid(list, `lvl${lvl + 1}pPr`) });
    const masterStyle = (kind: "title" | "body" | "other") => path(mi?.xml, "txStyles", `${kind}Style`);

    const readText = (txBody: Element, chain: (Element | null)[], defaults: { scale: number }, rels: ReturnType<Package["rels"]>): JSONContent | null => {
      const paras = kids(txBody, "p");
      if (!paras.length) return null;
      interface Item {
        node: JSONContent;
        bullet: "none" | "bullet" | "number";
        lvl: number;
      }
      const items: Item[] = [];
      for (const p of paras) {
        const pPr = kid(p, "pPr");
        const lvl = num(attr(pPr, "lvl"));
        const levels = chain.map((l) => levelProps(l, lvl).pPr);
        const pick = <T,>(fn: (e: Element) => T | null | undefined): T | undefined => {
          const own = pPr ? fn(pPr) : undefined;
          if (own !== undefined && own !== null) return own;
          for (const l of levels) {
            if (!l) continue;
            const v = fn(l);
            if (v !== undefined && v !== null) return v;
          }
          return undefined;
        };
        const algn = pick((e) => attr(e, "algn"));
        const bullet: Item["bullet"] = pick((e) => (kid(e, "buNone") ? "none" : kid(e, "buAutoNum") ? "number" : kid(e, "buChar") || kid(e, "buBlip") ? "bullet" : null)) ?? "none";
        // Run defaults: level defaults from the chain (lowest priority first).
        const defRPrs = [...levels].reverse().map((l) => kid(l, "defRPr"));
        const content: JSONContent[] = [];
        for (const r of kids(p)) {
          const n = r.localName ?? r.nodeName.replace(/^.*:/, "");
          if (n === "br") {
            content.push({ type: "hardBreak" });
            continue;
          }
          if (n !== "r" && n !== "fld") continue;
          const text = kid(r, "t")?.textContent ?? "";
          if (!text) continue;
          const rPrs = [...defRPrs, kid(r, "rPr")];
          const get = <T,>(fn: (e: Element) => T | null | undefined): T | undefined => {
            let out: T | undefined;
            for (const e of rPrs) {
              if (!e) continue;
              const v = fn(e);
              if (v !== undefined && v !== null) out = v;
            }
            return out;
          };
          const marks: NonNullable<JSONContent["marks"]> = [];
          if (get((e) => (attr(e, "b") === null ? null : attr(e, "b") === "1"))) marks.push({ type: "bold" });
          if (get((e) => (attr(e, "i") === null ? null : attr(e, "i") === "1"))) marks.push({ type: "italic" });
          const u = get((e) => attr(e, "u"));
          if (u && u !== "none") marks.push({ type: "underline" });
          const strike = get((e) => attr(e, "strike"));
          if (strike && strike !== "noStrike") marks.push({ type: "strike" });
          const baseline = num(get((e) => attr(e, "baseline")));
          if (baseline > 0) marks.push({ type: "superscript" });
          else if (baseline < 0) marks.push({ type: "subscript" });
          const ts: Record<string, string> = {};
          const sz = get((e) => attr(e, "sz"));
          if (sz) ts.fontSize = `${Math.round((num(sz) / 100) * defaults.scale * 10) / 10}pt`;
          const color = get((e) => colorOf(kid(e, "solidFill"))?.color);
          if (color) ts.color = color;
          const face = get((e) => attr(kid(e, "latin"), "typeface"));
          if (face) ts.fontFamily = face === "+mj-lt" ? (mi?.major ?? "Calibri Light") : face === "+mn-lt" ? (mi?.minor ?? "Calibri") : face;
          if (Object.keys(ts).length) marks.push({ type: "textStyle", attrs: ts });
          const hl = get((e) => colorOf(kid(e, "highlight"))?.color);
          if (hl) marks.push({ type: "highlight", attrs: { color: hl } });
          const link = rels.get(attr(kid(kid(r, "rPr"), "hlinkClick"), "id") ?? "");
          if (link?.external && /^(https?:|mailto:)/i.test(link.target)) marks.push({ type: "link", attrs: { href: link.target } });
          content.push(marks.length ? { type: "text", text, marks } : { type: "text", text });
        }
        const align = algn === "ctr" ? "center" : algn === "r" ? "right" : algn === "just" || algn === "dist" ? "justify" : undefined;
        const node: JSONContent = { type: "paragraph" };
        if (align) node.attrs = { textAlign: align };
        if (content.length) node.content = content;
        items.push({ node, bullet: content.length || paras.length === 1 ? bullet : "none", lvl });
      }
      // Group bulleted paragraphs into (nested) lists.
      const out: JSONContent[] = [];
      let stack: { list: JSONContent; lvl: number; kind: string }[] = [];
      for (const it of items) {
        if (it.bullet === "none") {
          stack = [];
          out.push(it.node);
          continue;
        }
        const kind = it.bullet === "number" ? "orderedList" : "bulletList";
        while (stack.length && stack[stack.length - 1].lvl > it.lvl) stack.pop();
        let top = stack[stack.length - 1];
        if (top && top.lvl === it.lvl && top.kind !== kind) {
          stack.pop();
          top = stack[stack.length - 1];
        }
        if (!top || top.lvl < it.lvl) {
          const list: JSONContent = { type: kind, content: [] };
          const parentItem = top?.list.content![top.list.content!.length - 1];
          if (parentItem) parentItem.content!.push(list);
          else out.push(list);
          stack.push({ list, lvl: it.lvl, kind });
          top = stack[stack.length - 1];
        }
        top.list.content!.push({ type: "listItem", content: [it.node] });
      }
      return { type: "doc", content: out };
    };

    // ── Shapes ──
    type Xf = (x: number, y: number, w: number, h: number) => { x: number; y: number; w: number; h: number };
    const identity: Xf = (x, y, w, h) => ({ x, y, w, h });

    const xfrmOf = (spPr: Element | null) => {
      const xf = kid(spPr, "xfrm");
      if (!xf) return null;
      const off = kid(xf, "off");
      const ext = kid(xf, "ext");
      return {
        x: emuToPx(num(attr(off, "x"))),
        y: emuToPx(num(attr(off, "y"))),
        w: emuToPx(num(attr(ext, "cx"))),
        h: emuToPx(num(attr(ext, "cy"))),
        rot: num(attr(xf, "rot")) / 60000,
        flipH: attr(xf, "flipH") === "1",
        flipV: attr(xf, "flipV") === "1",
      };
    };

    const readShapes = async (tree: Element | null, rels: ReturnType<Package["rels"]>, source: "slide" | "layout" | "master", xf: Xf, crop?: CropImage): Promise<El[]> => {
      const out: El[] = [];
      for (const node of kids(tree)) {
        const n = node.localName ?? node.nodeName.replace(/^.*:/, "");
        if (n === "grpSp") {
          const g = kid(kid(node, "grpSpPr"), "xfrm");
          const off = kid(g, "off");
          const ext = kid(g, "ext");
          const chOff = kid(g, "chOff");
          const chExt = kid(g, "chExt");
          const [ox, oy, ew, eh] = [num(attr(off, "x")), num(attr(off, "y")), num(attr(ext, "cx"), 1), num(attr(ext, "cy"), 1)].map(emuToPx);
          const [cx, cy, cw, ch] = [num(attr(chOff, "x")), num(attr(chOff, "y")), num(attr(chExt, "cx"), 1), num(attr(chExt, "cy"), 1)].map(emuToPx);
          const sx = cw ? ew / cw : 1;
          const sy = ch ? eh / ch : 1;
          const inner: Xf = (x, y, w, h) => xf(ox + (x - cx) * sx, oy + (y - cy) * sy, w * sx, h * sy);
          out.push(...(await readShapes(node, rels, source, inner, crop)));
          continue;
        }
        if (n !== "sp" && n !== "pic" && n !== "graphicFrame" && n !== "cxnSp") continue;
        const ph = phOf(node);
        // Master/layout placeholders are prompts ("Click to add title"), not artwork.
        if (ph && source !== "slide") continue;
        const phType = ph ? (attr(ph, "type") ?? "body") : null;
        if (ph && ["dt", "ftr", "sldNum"].includes(phType!) && !descendants(node, "t").some((t) => t.textContent)) continue;
        const spPr = kid(node, "spPr") ?? kid(node, "grpSpPr");
        const layoutPh = ph ? findPh(layoutXml, phType!, attr(ph, "idx")) : null;
        const masterPh = ph ? findPh(mi?.xml ?? null, phType!, null) : null;
        const pos = n === "graphicFrame" ? xfrmOf(node) : (xfrmOf(spPr) ?? xfrmOf(kid(layoutPh, "spPr")) ?? xfrmOf(kid(masterPh, "spPr")));
        if (!pos) continue;
        const box = xf(pos.x, pos.y, pos.w, pos.h);
        const base = { id: uid(), x: box.x, y: box.y, w: box.w, h: box.h, rot: pos.rot, flipH: pos.flipH || undefined, flipV: pos.flipV || undefined, locked: source !== "slide" || undefined };

        if (n === "pic") {
          const blip = descendants(kid(node, "blipFill"), "blip")[0];
          const rel = rels.get(attr(blip, "embed") ?? "");
          const bytes = rel && !rel.external ? pkg.files[rel.target] : undefined;
          const mime = rel ? mimeOf(rel.target) : "";
          if (!bytes || !isWebImage(mime)) {
            if (descendants(node, "videoFile").length || descendants(node, "audioFile").length) warnings.add("Video and audio can't be played here; they were left out.");
            else warnings.add("Some pictures use an old Windows format (EMF/WMF) and are shown as placeholders.");
            out.push({ ...base, type: "unsupported", label: "Picture (unsupported format)" });
            continue;
          }
          let src = toDataUrl(bytes, mime);
          const sr = kid(kid(node, "blipFill"), "srcRect");
          if (sr && crop) {
            const c = { l: num(attr(sr, "l")) / 100000, t: num(attr(sr, "t")) / 100000, r: num(attr(sr, "r")) / 100000, b: num(attr(sr, "b")) / 100000 };
            if (c.l || c.t || c.r || c.b) src = await crop(src, c);
          }
          out.push({ ...base, type: "image", src });
          continue;
        }

        if (n === "graphicFrame") {
          const tbl = descendants(node, "tbl")[0];
          if (!tbl) {
            const what = descendants(node, "chart").length ? "Chart" : descendants(node, "relIds").length ? "SmartArt" : "Embedded object";
            warnings.add(`${what}s can't be edited here. They're shown as placeholders and left out when you save.`);
            out.push({ ...base, type: "unsupported", label: what });
            continue;
          }
          const tblPr = kid(tbl, "tblPr");
          const firstRow = attr(tblPr, "firstRow") === "1";
          const band = attr(tblPr, "bandRow") === "1";
          const accent = `#${(mi?.colors[mi.clrMap.accent1 ?? "accent1"] ?? mi?.colors.accent1 ?? "4472C4").toLowerCase()}`;
          const cols = kids(kid(tbl, "tblGrid"), "gridCol").map((g) => emuToPx(num(attr(g, "w"))));
          const rows = kids(tbl, "tr").map((tr, ri) => ({
            h: emuToPx(num(attr(tr, "h"))),
            cells: kids(tr, "tc").map((tc) => {
              const tcPr = kid(tc, "tcPr");
              const f = fillOf(tcPr);
              const firstRun = descendants(tc, "rPr")[0];
              const text = kids(kid(tc, "txBody"), "p").map((p) => descendants(p, "t").map((t) => t.textContent).join("")).join("\n");
              const header = firstRow && ri === 0;
              return {
                text,
                fill: f && f !== "none" ? (f.color ?? undefined) : f === "none" ? undefined : header ? accent : band && ri % 2 === (firstRow ? 1 : 0) ? "#e9edf7" : undefined,
                color: colorOf(kid(firstRun, "solidFill"))?.color ?? (header && !(f && f !== "none") ? "#ffffff" : undefined),
                bold: attr(firstRun, "b") === "1" || header || undefined,
                colspan: num(attr(tc, "gridSpan"), 1) > 1 ? num(attr(tc, "gridSpan")) : undefined,
                rowspan: num(attr(tc, "rowSpan"), 1) > 1 ? num(attr(tc, "rowSpan")) : undefined,
                merged: attr(tc, "hMerge") === "1" || attr(tc, "vMerge") === "1" || undefined,
              };
            }),
          }));
          const firstSz = descendants(tbl, "rPr").map((r) => attr(r, "sz")).find(Boolean);
          const t: TableEl = { ...base, type: "table", cols, rows, border: "#9aa3b2", size: firstSz ? num(firstSz) / 100 : 14 };
          out.push(t);
          continue;
        }

        // sp / cxnSp
        const prst = attr(kid(spPr, "prstGeom"), "prst") ?? (kid(spPr, "custGeom") ? "rect" : n === "cxnSp" ? "line" : "rect");
        const style = kid(node, "style");
        const fillPr = fillOf(spPr);
        let fill: string | null = null;
        let fillAlpha: number | undefined;
        if (fillPr && fillPr !== "none") {
          fill = fillPr.color;
          if (fillPr.alpha < 1) fillAlpha = fillPr.alpha;
        } else if (!fillPr && style && num(attr(kid(style, "fillRef"), "idx")) > 0 && !ph) fill = colorOf(kid(style, "fillRef"))?.color ?? null;
        // Picture fills: treat as a picture.
        const blipFill = kid(spPr, "blipFill");
        if (blipFill) {
          const rel = rels.get(attr(kid(blipFill, "blip"), "embed") ?? "");
          if (rel && pkg.files[rel.target] && isWebImage(mimeOf(rel.target))) {
            out.push({ ...base, type: "image", src: toDataUrl(pkg.files[rel.target], mimeOf(rel.target)) });
            continue;
          }
        }
        const ln = kid(spPr, "ln");
        let stroke: string | null = null;
        let strokeW = 0;
        if (ln && !kid(ln, "noFill")) {
          stroke = colorOf(kid(ln, "solidFill"))?.color ?? (style ? (colorOf(kid(style, "lnRef"))?.color ?? null) : null);
          strokeW = attr(ln, "w") ? Math.max(0.75, emuToPx(num(attr(ln, "w")))) : 1;
        } else if (!ln && style && num(attr(kid(style, "lnRef"), "idx")) > 0 && !ph) {
          stroke = colorOf(kid(style, "lnRef"))?.color ?? null;
          strokeW = 1;
        }
        if (prst === "line" || prst === "straightConnector1" || n === "cxnSp") {
          if (!stroke) {
            stroke = "#000000";
            strokeW = 1;
          }
          out.push({ ...base, type: "box", shape: "line", fill: null, stroke, strokeW, text: null, valign: "middle", pad: [0, 0, 0, 0] });
          continue;
        }

        const txBody = kid(node, "txBody");
        const kind: "title" | "body" | "other" = phType === "title" || phType === "ctrTitle" ? "title" : ph ? "body" : "other";
        const bodyPr = kid(txBody, "bodyPr");
        const bodyChain = [bodyPr, kid(kid(layoutPh, "txBody"), "bodyPr"), kid(kid(masterPh, "txBody"), "bodyPr")];
        const pickBody = (a: string) => bodyChain.map((b) => attr(b, a)).find((v) => v !== null) ?? null;
        const autofit = bodyChain.map((b) => kid(b, "normAutofit")).find(Boolean);
        const scale = autofit && attr(autofit, "fontScale") ? num(attr(autofit, "fontScale")) / 100000 : 1;
        const anchor = pickBody("anchor");
        const inset = (a: string, d: number) => {
          const v = pickBody(a);
          return v === null ? d : emuToPx(num(v));
        };
        const chain = [kid(txBody, "lstStyle"), kid(kid(layoutPh, "txBody"), "lstStyle"), kid(kid(masterPh, "txBody"), "lstStyle"), masterStyle(kind)];
        const text = txBody ? readText(txBody, chain, { scale }, rels) : null;
        const hasText = !!text && JSON.stringify(text).includes('"text"');
        const shapeKind: ShapeKind | "none" = !fill && !stroke ? "none" : (SHAPES[prst] ?? "rect");
        if (shapeKind === "none" && !hasText) continue;
        // Colour the text uses where runs don't set their own.
        let defColor: string | null = null;
        for (const l of chain) {
          const c = colorOf(kid(kid(kid(l, "lvl1pPr"), "defRPr"), "solidFill"));
          if (c) {
            defColor = c.color;
            break;
          }
        }
        const el: BoxEl = {
          ...base,
          type: "box",
          shape: shapeKind,
          fill,
          fillAlpha,
          stroke,
          strokeW,
          text: hasText ? text : null,
          valign: anchor === "ctr" ? "middle" : anchor === "b" ? "bottom" : "top",
          pad: [inset("lIns", 9.6), inset("tIns", 4.8), inset("rIns", 9.6), inset("bIns", 4.8)],
          color: defColor ?? `#${(mi?.colors[mi?.clrMap.tx1 ?? "dk1"] ?? "000000").toLowerCase()}`,
          size: 18,
          font: kind === "title" ? mi?.major : mi?.minor,
        };
        out.push(el);
      }
      return out;
    };

    const showMaster = attr(sldXml, "showMasterSp") !== "0" && attr(layoutXml, "showMasterSp") !== "0";
    const collect = async (crop?: CropImage) => [
      ...(showMaster && mi ? await readShapes(path(mi.xml, "cSld", "spTree"), mi.rels, "master", identity, crop) : []),
      ...(layoutXml && attr(sldXml, "showMasterSp") !== "0" ? await readShapes(path(layoutXml, "cSld", "spTree"), layoutRels, "layout", identity, crop) : []),
      ...(await readShapes(path(sldXml, "cSld", "spTree"), sldRels, "slide", identity, crop)),
    ];

    // Notes: the body placeholder of the notes slide.
    const notesPath = [...sldRels.values()].find((r) => r.type.endsWith("/notesSlide"))?.target;
    const notesXml = notesPath ? pkg.xml(notesPath) : null;
    const notesBody = descendants(path(notesXml, "cSld", "spTree"), "sp").find((s) => attr(phOf(s), "type") === "body");
    const notes = notesBody ? kids(kid(notesBody, "txBody"), "p").map((p) => descendants(p, "t").map((t) => t.textContent).join("")).join("\n").trim() : "";

    slides.push({ id: uid("s"), background, elements: [], notes, hidden: attr(sldXml, "show") === "0" || undefined });
    collectors.push(collect);
  }

  if (!slides.length) throw new Error("This presentation has no slides.");
  const theme = deckTheme ?? { id: "file", name: "From file", heading: "Calibri Light, Calibri, sans-serif", body: "Calibri, sans-serif", bg: "#ffffff", text: "#000000", accent: "#4472c4", muted: "#44546a" };
  return { deck: { width, height, theme, slides }, warnings, collectors };
}

/**
 * Read a .pptx. Shapes are collected asynchronously because pictures may
 * need cropping (a browser canvas job, passed in as `crop`).
 */
export async function readPptx(bytes: Uint8Array, parse: XmlParser, crop?: CropImage): Promise<ReadResult> {
  const { deck, warnings, collectors } = readStructure(bytes, parse);
  for (let i = 0; i < deck.slides.length; i++) deck.slides[i].elements = await collectors[i](crop);
  return { deck, warnings: [...warnings] };
}
