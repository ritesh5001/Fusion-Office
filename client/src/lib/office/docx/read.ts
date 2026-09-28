/**
 * DOCX → editor document. Reads the text with its formatting (fonts, sizes,
 * colours, highlight, bold/italic/underline/strike, super/subscript),
 * headings, alignment, bulleted and numbered lists (nested), tables (merged
 * cells, shading, column widths), images, links, page breaks and page size.
 */
import { attr, descendants, flag, isWebImage, kid, kids, mimeOf, num, Package, path, toDataUrl, type XmlParser } from "../ooxml";
import { DEFAULT_META, HIGHLIGHT_HEX, type DocMeta, type JSONContent, type WordDoc } from "./model";

interface RunProps {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  size?: number;
  font?: string;
  highlight?: string;
  vert?: "superscript" | "subscript";
}

interface StyleDef {
  id: string;
  name: string;
  type: string;
  basedOn?: string;
  pPr: Element | null;
  rPr: Element | null;
  isDefault: boolean;
}

interface ListRef {
  numId: string;
  ilvl: number;
  ordered: boolean;
  start: number;
}

type Item = { node: JSONContent; list?: ListRef };

export interface ReadResult {
  doc: WordDoc;
  warnings: string[];
}

export function readDocx(bytes: Uint8Array, parse: XmlParser): ReadResult {
  const pkg = new Package(bytes, parse);
  const rootRels = pkg.rels("");
  const main = [...rootRels.values()].find((r) => r.type.endsWith("/officeDocument"))?.target ?? "word/document.xml";
  const docXml = pkg.xml(main);
  const body = kid(docXml, "body");
  if (!body) throw new Error("This doesn't look like a Word document.");
  const rels = pkg.rels(main);
  const relOf = (type: string) => [...rels.values()].find((r) => r.type.endsWith(`/${type}`))?.target;
  const warnings = new Set<string>();

  // Theme fonts (Calibri, Calibri Light… when the text says "use the theme font").
  const theme = relOf("theme") ? pkg.xml(relOf("theme")!) : null;
  const themeFont = (which: "major" | "minor") => attr(path(theme, "themeElements", "fontScheme", `${which}Font`, "latin"), "typeface") ?? undefined;

  // ── Styles ──
  const styles = new Map<string, StyleDef>();
  const stylesXml = relOf("styles") ? pkg.xml(relOf("styles")!) : null;
  for (const s of kids(stylesXml, "style")) {
    const id = attr(s, "styleId") ?? "";
    styles.set(id, {
      id,
      name: attr(kid(s, "name"), "val") ?? id,
      type: attr(s, "type") ?? "paragraph",
      basedOn: attr(kid(s, "basedOn"), "val") ?? undefined,
      pPr: kid(s, "pPr"),
      rPr: kid(s, "rPr"),
      isDefault: attr(s, "default") === "1",
    });
  }

  const readRPr = (rPr: Element | null): RunProps => {
    if (!rPr) return {};
    const p: RunProps = {};
    const b = flag(kid(rPr, "b"));
    if (b !== undefined) p.bold = b;
    const i = flag(kid(rPr, "i"));
    if (i !== undefined) p.italic = i;
    const u = kid(rPr, "u");
    if (u) p.underline = (attr(u, "val") ?? "single") !== "none";
    const st = flag(kid(rPr, "strike")) ?? flag(kid(rPr, "dstrike"));
    if (st !== undefined) p.strike = st;
    const color = attr(kid(rPr, "color"), "val");
    if (color && color !== "auto" && /^[0-9a-f]{6}$/i.test(color)) p.color = `#${color.toLowerCase()}`;
    const sz = attr(kid(rPr, "sz"), "val");
    if (sz) p.size = num(sz) / 2;
    const fonts = kid(rPr, "rFonts");
    if (fonts) {
      const theme = attr(fonts, "asciiTheme") ?? attr(fonts, "hAnsiTheme");
      const f = attr(fonts, "ascii") ?? attr(fonts, "hAnsi") ?? (theme ? themeFont(theme.startsWith("major") ? "major" : "minor") : undefined);
      if (f) p.font = f;
    }
    const hl = attr(kid(rPr, "highlight"), "val");
    if (hl && hl !== "none" && HIGHLIGHT_HEX[hl]) p.highlight = HIGHLIGHT_HEX[hl];
    const shd = attr(kid(rPr, "shd"), "fill");
    if (!p.highlight && shd && shd !== "auto" && /^[0-9a-f]{6}$/i.test(shd) && shd.toUpperCase() !== "FFFFFF") p.highlight = `#${shd.toLowerCase()}`;
    const va = attr(kid(rPr, "vertAlign"), "val");
    if (va === "superscript" || va === "subscript") p.vert = va;
    return p;
  };

  /** Run properties a style gives, following its "based on" chain. */
  const styleRun = (id: string | undefined, depth = 0): RunProps => {
    const s = id ? styles.get(id) : undefined;
    if (!s || depth > 10) return {};
    return { ...styleRun(s.basedOn, depth + 1), ...readRPr(s.rPr) };
  };
  const stylePara = (id: string | undefined, name: "jc" | "numPr" | "outlineLvl", depth = 0): Element | null => {
    const s = id ? styles.get(id) : undefined;
    if (!s || depth > 10) return null;
    return kid(s.pPr, name) ?? stylePara(s.basedOn, name, depth + 1);
  };

  // Document defaults (docDefaults + the default paragraph style) become the
  // body font and size, instead of being repeated on every piece of text.
  const defaultPara = [...styles.values()].find((s) => s.type === "paragraph" && s.isDefault);
  const base: RunProps = { ...readRPr(path(stylesXml, "docDefaults", "rPrDefault", "rPr")), ...styleRun(defaultPara?.id) };
  const meta: DocMeta = { ...DEFAULT_META, font: base.font ?? themeFont("minor") ?? DEFAULT_META.font, fontSize: base.size ?? DEFAULT_META.fontSize };

  // ── Numbering (lists) ──
  const numbering = new Map<string, Map<number, { ordered: boolean; start: number }>>();
  const numXml = relOf("numbering") ? pkg.xml(relOf("numbering")!) : null;
  const abstracts = new Map<string, Map<number, { ordered: boolean; start: number }>>();
  for (const a of kids(numXml, "abstractNum")) {
    const levels = new Map<number, { ordered: boolean; start: number }>();
    for (const l of kids(a, "lvl")) {
      const fmt = attr(kid(l, "numFmt"), "val") ?? "decimal";
      levels.set(num(attr(l, "ilvl")), { ordered: fmt !== "bullet" && fmt !== "none", start: num(attr(kid(l, "start"), "val"), 1) });
    }
    abstracts.set(attr(a, "abstractNumId") ?? "", levels);
  }
  for (const n of kids(numXml, "num")) numbering.set(attr(n, "numId") ?? "", abstracts.get(attr(kid(n, "abstractNumId"), "val") ?? "") ?? new Map());

  // ── Page setup ──
  const sect = kid(body, "sectPr");
  const pgSz = kid(sect, "pgSz");
  const pgMar = kid(sect, "pgMar");
  if (pgSz) {
    const tw = (v: string | null, d: number) => (v ? num(v) / 20 : d);
    meta.page = {
      width: tw(attr(pgSz, "w"), meta.page.width),
      height: tw(attr(pgSz, "h"), meta.page.height),
      margin: {
        top: tw(attr(pgMar, "top"), 72),
        right: tw(attr(pgMar, "right"), 72),
        bottom: tw(attr(pgMar, "bottom"), 72),
        left: tw(attr(pgMar, "left"), 72),
      },
    };
  }
  if (kids(sect, "headerReference").length || kids(sect, "footerReference").length) warnings.add("Headers and footers aren't shown in the editor and won't be in the saved file.");
  if (relOf("footnotes") && descendants(body, "footnoteReference").length) warnings.add("Footnotes aren't supported yet and were left out.");
  if (descendants(body, "commentReference").length) warnings.add("Comments were left out.");
  if (descendants(body, "ins").length || descendants(body, "del").length) warnings.add("Tracked changes were accepted.");

  // ── Text runs ──
  const marksFor = (p: RunProps): JSONContent["marks"] => {
    const marks: NonNullable<JSONContent["marks"]> = [];
    if (p.bold) marks.push({ type: "bold" });
    if (p.italic) marks.push({ type: "italic" });
    if (p.underline) marks.push({ type: "underline" });
    if (p.strike) marks.push({ type: "strike" });
    if (p.vert) marks.push({ type: p.vert });
    const ts: Record<string, string> = {};
    if (p.color && p.color !== "#000000") ts.color = p.color;
    if (p.font && p.font !== meta.font) ts.fontFamily = p.font;
    if (p.size && p.size !== meta.fontSize) ts.fontSize = `${p.size}pt`;
    if (Object.keys(ts).length) marks.push({ type: "textStyle", attrs: ts });
    if (p.highlight) marks.push({ type: "highlight", attrs: { color: p.highlight } });
    return marks.length ? marks : undefined;
  };

  const imageNode = (embedId: string | null, cx: number, cy: number, alt?: string | null): JSONContent | null => {
    const rel = embedId ? rels.get(embedId) : undefined;
    if (!rel || rel.external) return null;
    const bytes = pkg.files[rel.target];
    const mime = mimeOf(rel.target);
    if (!bytes || !isWebImage(mime)) {
      warnings.add("Some images use an old Windows format (EMF/WMF) the browser can't show; they were left out.");
      return null;
    }
    const attrs: Record<string, unknown> = { src: toDataUrl(bytes, mime) };
    if (cx > 0) attrs.width = Math.round((cx / 914400) * 96);
    if (cy > 0) attrs.height = Math.round((cy / 914400) * 96);
    if (alt) attrs.alt = alt;
    return { type: "image", attrs };
  };

  /** Read paragraph `p`; page breaks inside it split it into several blocks. */
  const readParagraph = (p: Element, extra: Item[]): Item[] => {
    const pPr = kid(p, "pPr");
    const styleId = attr(kid(pPr, "pStyle"), "val") ?? defaultPara?.id;
    const style = styleId ? styles.get(styleId) : undefined;
    const sRun = style && !style.isDefault ? styleRun(style.id) : {};

    // Heading level from the style name ("heading 2"), "Title", or an outline level.
    let level = 0;
    const m = style?.name.match(/^heading\s*(\d)$/i);
    if (m) level = Math.min(6, Number(m[1]));
    else if (/^title$/i.test(style?.name ?? "")) level = 1;
    else if (/^subtitle$/i.test(style?.name ?? "")) level = 2;
    else {
      const ol = attr(kid(pPr, "outlineLvl") ?? stylePara(styleId, "outlineLvl"), "val");
      if (ol !== null && num(ol) < 6) level = num(ol) + 1;
    }

    const jc = attr(kid(pPr, "jc") ?? stylePara(styleId, "jc"), "val");
    const align = jc === "center" ? "center" : jc === "right" || jc === "end" ? "right" : jc === "both" || jc === "distribute" ? "justify" : null;

    const numPr = kid(pPr, "numPr") ?? stylePara(styleId, "numPr");
    let list: ListRef | undefined;
    const numId = attr(kid(numPr, "numId"), "val");
    if (numId && numId !== "0") {
      const ilvl = num(attr(kid(numPr, "ilvl"), "val"));
      const lvl = numbering.get(numId)?.get(ilvl);
      list = { numId, ilvl, ordered: lvl?.ordered ?? false, start: lvl?.start ?? 1 };
    }

    const out: Item[] = [];
    let inline: JSONContent[] = [];
    const flush = () => {
      const attrs: Record<string, unknown> = {};
      if (align) attrs.textAlign = align;
      const node: JSONContent = level && !list ? { type: "heading", attrs: { ...attrs, level }, content: inline } : { type: "paragraph", attrs, content: inline };
      if (!inline.length) delete node.content;
      if (!Object.keys(node.attrs!).length) delete node.attrs;
      out.push({ node, list });
      inline = [];
    };
    if (flag(kid(pPr, "pageBreakBefore"))) out.push({ node: { type: "pageBreak" } });

    const text = (t: string, props: RunProps) => {
      if (!t) return;
      const marks = marksFor(props);
      inline.push(marks ? { type: "text", text: t, marks } : { type: "text", text: t });
    };

    // Complex fields: show the result, hide the instruction.
    let fieldDepth = 0;
    let showingResult = false;

    const readRun = (r: Element, link?: string) => {
      const props: RunProps = { ...sRun, ...styleRun(attr(kid(kid(r, "rPr"), "rStyle"), "val") ?? undefined), ...readRPr(kid(r, "rPr")) };
      const push = (t: string) => {
        if (fieldDepth > 0 && !showingResult) return;
        if (!link) return text(t, props);
        const marks = [...(marksFor(props) ?? []), { type: "link", attrs: { href: link } }];
        inline.push({ type: "text", text: t, marks });
      };
      for (const c of kids(r)) {
        const n = c.localName ?? c.nodeName.replace(/^.*:/, "");
        if (n === "t") push(c.textContent ?? "");
        else if (n === "tab" || n === "ptab") push("\t");
        else if (n === "noBreakHyphen") push("‑");
        else if (n === "sym") {
          const code = parseInt(attr(c, "char") ?? "", 16);
          if (code) push(String.fromCharCode(code >= 0xf000 ? code - 0xf000 : code));
        } else if (n === "br") {
          if (attr(c, "type") === "page") {
            flush();
            out.push({ node: { type: "pageBreak" } });
          } else if (fieldDepth === 0 || showingResult) inline.push({ type: "hardBreak" });
        } else if (n === "cr") inline.push({ type: "hardBreak" });
        else if (n === "fldChar") {
          const t = attr(c, "fldCharType");
          if (t === "begin") {
            fieldDepth++;
            showingResult = false;
          } else if (t === "separate") showingResult = true;
          else if (t === "end") {
            fieldDepth = Math.max(0, fieldDepth - 1);
            showingResult = fieldDepth > 0;
          }
        } else if (n === "drawing") {
          const holder = kid(c, "inline") ?? kid(c, "anchor");
          const ext = kid(holder, "extent");
          const blip = descendants(holder, "blip")[0];
          if (blip) {
            const img = imageNode(attr(blip, "embed"), num(attr(ext, "cx")), num(attr(ext, "cy")), attr(kid(holder, "docPr"), "descr"));
            if (img) inline.push(img);
          } else if (descendants(holder, "chart").length) warnings.add("Charts can't be edited here and were left out.");
          // Text boxes: keep their text, placed after this paragraph.
          for (const box of descendants(holder, "txbxContent")) extra.push(...readBlocks(box));
          if (descendants(holder, "txbxContent").length) warnings.add("Text in floating text boxes was moved into the main text.");
        } else if (n === "pict" || n === "object") {
          const im = descendants(c, "imagedata")[0];
          if (im) {
            const img = imageNode(attr(im, "id"), 0, 0);
            if (img) inline.push(img);
          }
        }
      }
    };

    const readInline = (el: Element, link?: string) => {
      for (const c of kids(el)) {
        const n = c.localName ?? c.nodeName.replace(/^.*:/, "");
        if (n === "r") readRun(c, link);
        else if (n === "hyperlink") {
          const rel = rels.get(attr(c, "id") ?? "");
          const href = rel?.external && /^(https?:|mailto:)/i.test(rel.target) ? rel.target : undefined;
          readInline(c, href ?? link);
        } else if (n === "ins" || n === "smartTag" || n === "customXml" || n === "fldSimple" || n === "moveTo") readInline(c, link);
        else if (n === "sdt") readInline(kid(c, "sdtContent") ?? c, link);
        else if (n === "oMath" || n === "oMathPara") text(c.textContent ?? "", {});
      }
    };
    readInline(p);
    flush();
    return out;
  };

  const readTable = (tbl: Element): JSONContent => {
    const grid = kids(kid(tbl, "tblGrid"), "gridCol").map((g) => Math.round(num(attr(g, "w")) / 15));
    const rows: JSONContent[] = [];
    // Cells that started a vertical merge, by grid column.
    const openMerges = new Map<number, JSONContent>();
    for (const tr of kids(tbl, "tr")) {
      const cells: JSONContent[] = [];
      let col = 0;
      for (const tc of kids(tr, "tc")) {
        const tcPr = kid(tc, "tcPr");
        const span = Math.max(1, num(attr(kid(tcPr, "gridSpan"), "val"), 1));
        const vm = kid(tcPr, "vMerge");
        const vmVal = vm ? (attr(vm, "val") ?? "continue") : null;
        if (vmVal === "continue" && openMerges.has(col)) {
          const top = openMerges.get(col)!;
          top.attrs!.rowspan = (top.attrs!.rowspan as number) + 1;
          col += span;
          continue;
        }
        const fill = attr(kid(tcPr, "shd"), "fill");
        const widths = grid.slice(col, col + span);
        const content = readBlocks(tc).map((i) => i.node);
        const cell: JSONContent = {
          type: "tableCell",
          attrs: {
            colspan: span,
            rowspan: 1,
            colwidth: widths.length === span && widths.every((w) => w > 0) ? widths : null,
            ...(fill && fill !== "auto" && /^[0-9a-f]{6}$/i.test(fill) ? { backgroundColor: `#${fill.toLowerCase()}` } : {}),
          },
          content: content.length ? content : [{ type: "paragraph" }],
        };
        if (vmVal === "restart") openMerges.set(col, cell);
        else openMerges.delete(col);
        cells.push(cell);
        col += span;
      }
      if (cells.length) rows.push({ type: "tableRow", content: cells });
    }
    return { type: "table", content: rows };
  };

  /** Block-level content of the body, a table cell or a text box. */
  function readBlocks(parent: Element): Item[] {
    const items: Item[] = [];
    for (const c of kids(parent)) {
      const n = c.localName ?? c.nodeName.replace(/^.*:/, "");
      if (n === "p") {
        const extra: Item[] = [];
        items.push(...readParagraph(c, extra), ...extra);
      } else if (n === "tbl") items.push({ node: readTable(c) });
      else if (n === "sdt") items.push(...readBlocks(kid(c, "sdtContent") ?? c));
      else if (n === "customXml" || n === "ins") items.push(...readBlocks(c));
    }
    return groupLists(items);
  }

  const content = readBlocks(body).map((i) => i.node);
  return { doc: { meta, content: { type: "doc", content: content.length ? content : [{ type: "paragraph" }] } }, warnings: [...warnings] };
}

/** Turn list paragraphs into (nested) bullet and numbered lists. */
function groupLists(items: Item[]): Item[] {
  const out: Item[] = [];
  type Open = { list: JSONContent; ilvl: number; key: string };
  let stack: Open[] = [];
  for (const item of items) {
    if (!item.list) {
      stack = [];
      out.push(item);
      continue;
    }
    const { ilvl, ordered, numId, start } = item.list;
    const key = `${numId}:${ordered}`;
    while (stack.length && stack[stack.length - 1].ilvl > ilvl) stack.pop();
    let top = stack[stack.length - 1];
    if (top && top.ilvl === ilvl && top.key !== key) {
      stack.pop();
      top = stack[stack.length - 1];
    }
    if (!top || top.ilvl < ilvl) {
      const list: JSONContent = ordered ? { type: "orderedList", attrs: { start }, content: [] } : { type: "bulletList", content: [] };
      const parentItem = top?.list.content![top.list.content!.length - 1];
      if (parentItem) parentItem.content!.push(list);
      else out.push({ node: list });
      stack.push({ list, ilvl, key });
      top = stack[stack.length - 1];
    }
    // List items hold paragraphs, not headings.
    const para = item.node.type === "heading" ? { ...item.node, type: "paragraph", attrs: item.node.attrs?.textAlign ? { textAlign: item.node.attrs.textAlign } : undefined } : item.node;
    top.list.content!.push({ type: "listItem", content: [para] });
  }
  return out;
}
