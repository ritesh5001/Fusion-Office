/**
 * Presentation model → PPTX (pptxgenjs). Text keeps its runs (bold, italic,
 * underline, strike, colour, size, font, highlight, links, super/subscript),
 * alignment and bullets; shapes keep fill, outline, rotation and flips;
 * pictures, tables, backgrounds and speaker notes are written too.
 */
import type PptxGenJSType from "pptxgenjs";
import { hex6 } from "../ooxml";
import { toPoints } from "../docx/write";
import { plainText, type BoxEl, type Deck, type JSONContent } from "./model";

type Pptx = PptxGenJSType;
type TextRun = PptxGenJSType.TextProps;

const inch = (px: number) => px / 96;
const pt = (px: number) => px * 0.75;
const firstFont = (css: string | undefined) => css?.split(",")[0].replace(/["']/g, "").trim() || undefined;

const SHAPE_NAMES: Record<string, string> = {
  rect: "rect", roundRect: "roundRect", ellipse: "ellipse", triangle: "triangle", rtTriangle: "rtTriangle", diamond: "diamond", pentagon: "pentagon",
  hexagon: "hexagon", octagon: "octagon", star5: "star5", rightArrow: "rightArrow", leftArrow: "leftArrow", upArrow: "upArrow", downArrow: "downArrow",
  chevron: "chevron", parallelogram: "parallelogram", trapezoid: "trapezoid", heart: "heart", line: "line",
};

/** Rich text → pptxgenjs runs; each paragraph's last run ends the line. */
export function textRuns(doc: JSONContent, base: { color?: string; size?: number; font?: string }): TextRun[] {
  const runs: TextRun[] = [];
  const para = (p: JSONContent, bullet: false | "bullet" | "number", level: number) => {
    const align = (p.attrs?.textAlign as string | undefined) ?? undefined;
    const paraOpts: Record<string, unknown> = {};
    if (align && align !== "left") paraOpts.align = align;
    if (bullet) paraOpts.bullet = bullet === "number" ? { type: "number" } : true;
    if (level) paraOpts.indentLevel = level;
    const parts: TextRun[] = [];
    for (const n of p.content ?? []) {
      if (n.type === "hardBreak") {
        parts.push({ text: "", options: { ...(parts.length ? {} : paraOpts), softBreakBefore: true } as TextRun["options"] });
        continue;
      }
      if (n.type !== "text") continue;
      // Paragraph options go on the paragraph's first run only; pptxgenjs
      // starts a new paragraph for every run that carries them.
      const o: Record<string, unknown> = parts.length ? {} : { ...paraOpts };
      for (const m of n.marks ?? []) {
        if (m.type === "bold") o.bold = true;
        else if (m.type === "italic") o.italic = true;
        else if (m.type === "underline") o.underline = { style: "sng" };
        else if (m.type === "strike") o.strike = "sngStrike";
        else if (m.type === "superscript") o.superscript = true;
        else if (m.type === "subscript") o.subscript = true;
        else if (m.type === "highlight") o.highlight = hex6(m.attrs?.color as string) ?? "FFFF00";
        else if (m.type === "link" && m.attrs?.href) o.hyperlink = { url: String(m.attrs.href) };
        else if (m.type === "textStyle") {
          const c = hex6(m.attrs?.color as string);
          if (c) o.color = c;
          const size = toPoints(m.attrs?.fontSize, base.size ?? 18);
          if (size) o.fontSize = size;
          const f = firstFont(m.attrs?.fontFamily as string);
          if (f) o.fontFace = f;
        }
      }
      parts.push({ text: n.text ?? "", options: o as TextRun["options"] });
    }
    if (!parts.length) parts.push({ text: "", options: { ...paraOpts } as TextRun["options"] });
    parts[parts.length - 1].options = { ...parts[parts.length - 1].options, breakLine: true };
    runs.push(...parts);
  };
  const walk = (nodes: JSONContent[] | undefined, bullet: false | "bullet" | "number", level: number) => {
    for (const n of nodes ?? []) {
      if (n.type === "paragraph" || n.type === "heading") para(n, bullet, level);
      else if (n.type === "bulletList" || n.type === "orderedList") {
        for (const item of n.content ?? []) {
          let first = true;
          for (const c of item.content ?? []) {
            if (c.type === "bulletList" || c.type === "orderedList") walk([c], bullet, level + (bullet ? 1 : 0));
            else {
              para(c, first ? (n.type === "orderedList" ? "number" : "bullet") : false, bullet ? level + 1 : level);
              first = false;
            }
          }
        }
      } else walk(n.content, bullet, level);
    }
  };
  walk(doc.content, false, 0);
  // The last paragraph doesn't need a line break after it.
  const last = runs[runs.length - 1];
  if (last?.options) delete (last.options as Record<string, unknown>).breakLine;
  return runs;
}

const hasText = (el: BoxEl) => !!el.text && plainText(el.text).trim().length > 0;

export async function writePptx(deck: Deck): Promise<Uint8Array> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx: Pptx = new PptxGenJS();
  pptx.defineLayout({ name: "FUSION", width: inch(deck.width), height: inch(deck.height) });
  pptx.layout = "FUSION";
  pptx.author = "Fusion Office";
  const shapeType = (k: string) => (pptx.ShapeType as unknown as Record<string, PptxGenJSType.ShapeType>)[SHAPE_NAMES[k] ?? "rect"] ?? pptx.ShapeType.rect;

  for (const s of deck.slides) {
    const slide = pptx.addSlide();
    if (s.background.image) slide.background = { data: s.background.image };
    else if (s.background.color) slide.background = { color: hex6(s.background.color) ?? "FFFFFF" };
    if (s.hidden) slide.hidden = true;

    for (const el of s.elements) {
      const pos = { x: inch(el.x), y: inch(el.y), w: inch(Math.max(1, el.w)), h: inch(Math.max(1, el.h)), rotate: el.rot || undefined, flipH: el.flipH, flipV: el.flipV };
      if (el.type === "image") {
        slide.addImage({ data: el.src, ...pos });
      } else if (el.type === "table") {
        const rows = el.rows.map((r) =>
          r.cells
            .filter((c) => !c.merged)
            .map((c) => ({
              text: c.text,
              options: {
                fill: c.fill ? { color: hex6(c.fill) } : undefined,
                color: hex6(c.color),
                bold: c.bold,
                align: c.align,
                colspan: c.colspan,
                rowspan: c.rowspan,
              },
            })),
        );
        slide.addTable(rows as PptxGenJSType.TableRow[], {
          x: pos.x,
          y: pos.y,
          w: pos.w,
          colW: el.cols.map(inch),
          rowH: el.rows.map((r) => inch(r.h)),
          fontSize: el.size,
          fontFace: firstFont(el.font),
          border: { type: "solid", pt: 0.75, color: hex6(el.border) ?? "9AA3B2" },
          valign: "middle",
        });
      } else if (el.type === "box") {
        const fill = el.fill ? { color: hex6(el.fill), transparency: el.fillAlpha !== undefined ? Math.round((1 - el.fillAlpha) * 100) : undefined } : undefined;
        const line = el.stroke ? { color: hex6(el.stroke), width: Math.max(0.25, pt(el.strokeW)) } : undefined;
        if (el.shape === "line") {
          slide.addShape(pptx.ShapeType.line, { ...pos, line: line ?? { color: "000000", width: 1 } });
        } else if (hasText(el)) {
          slide.addText(textRuns(el.text!, el), {
            ...pos,
            shape: el.shape === "none" ? undefined : shapeType(el.shape),
            fill,
            line,
            valign: el.valign,
            margin: [pt(el.pad[0]), pt(el.pad[2]), pt(el.pad[3]), pt(el.pad[1])],
            color: hex6(el.color) ?? hex6(deck.theme.text),
            fontSize: el.size ?? 18,
            fontFace: firstFont(el.font) ?? firstFont(deck.theme.body),
            fit: "none",
          });
        } else if (el.shape !== "none" && (fill || line)) {
          slide.addShape(shapeType(el.shape), { ...pos, fill, line });
        }
      }
      // "unsupported" elements (charts…) aren't written.
    }
    if (s.notes.trim()) slide.addNotes(s.notes);
  }
  return (await pptx.write({ outputType: "uint8array" })) as Uint8Array;
}
