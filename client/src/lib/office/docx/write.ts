/**
 * Editor document → DOCX (with the `docx` library). Keeps what the editor
 * can express: headings, alignment, fonts, sizes, colours, highlight,
 * bold/italic/underline/strike, super/subscript, links, nested lists, tables
 * (merged cells, shading, widths), images, page breaks, rules and page setup.
 */
import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, HeadingLevel, ImageRun, LevelFormat, Packer, PageBreak, Paragraph, ShadingType, Tab, Table,
  TableCell, TableRow, TextRun, WidthType, type IParagraphOptions, type IRunOptions, type ParagraphChild,
} from "docx";
import { fromDataUrl, hex6 } from "../ooxml";
import { imageSize } from "../imageInfo";
import type { JSONContent, WordDoc } from "./model";

type Mark = NonNullable<JSONContent["marks"]>[number];

/** Turns an image the DOCX format can't hold (WEBP, SVG…) into PNG. Browser-only; optional. */
export type Rasterize = (dataUrl: string) => Promise<{ bytes: Uint8Array; width: number; height: number } | null>;

const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
const ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

/** "14pt" | "18px" | "1.2em" → points. */
export function toPoints(size: unknown, base: number): number | undefined {
  if (typeof size !== "string" && typeof size !== "number") return undefined;
  const m = String(size).trim().match(/^([\d.]+)\s*(pt|px|em|rem)?$/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  const unit = (m[2] ?? "pt").toLowerCase();
  return unit === "px" ? n * 0.75 : unit === "em" || unit === "rem" ? n * base : n;
}

export async function writeDocx(doc: WordDoc, rasterize?: Rasterize): Promise<Uint8Array> {
  const { meta } = doc;
  const contentWidthPt = meta.page.width - meta.page.margin.left - meta.page.margin.right;
  const maxImagePx = (contentWidthPt / 72) * 96;
  let orderedInstance = 0;

  const runOptions = (marks: Mark[] | undefined): IRunOptions => {
    const o: Record<string, unknown> = {};
    for (const m of marks ?? []) {
      if (m.type === "bold") o.bold = true;
      else if (m.type === "italic") o.italics = true;
      else if (m.type === "underline") o.underline = {};
      else if (m.type === "strike") o.strike = true;
      else if (m.type === "superscript") o.superScript = true;
      else if (m.type === "subscript") o.subScript = true;
      else if (m.type === "code") o.font = "Courier New";
      else if (m.type === "textStyle") {
        const color = hex6(m.attrs?.color as string);
        if (color) o.color = color;
        const pt = toPoints(m.attrs?.fontSize, meta.fontSize);
        if (pt) o.size = Math.round(pt * 2);
        const font = (m.attrs?.fontFamily as string | undefined)?.split(",")[0].replace(/["']/g, "").trim();
        if (font) o.font = font;
        const bg = hex6(m.attrs?.backgroundColor as string);
        if (bg) o.shading = { type: ShadingType.CLEAR, color: "auto", fill: bg };
      } else if (m.type === "highlight") {
        const fill = hex6((m.attrs?.color as string) ?? "#ffff00") ?? "FFFF00";
        o.shading = { type: ShadingType.CLEAR, color: "auto", fill };
      }
    }
    return o as IRunOptions;
  };

  const image = async (attrs: Record<string, unknown>): Promise<ImageRun | null> => {
    const src = String(attrs.src ?? "");
    let data = fromDataUrl(src);
    if (!data) return null;
    let type = data.mime === "image/png" ? "png" : data.mime === "image/jpeg" ? "jpg" : data.mime === "image/gif" ? "gif" : data.mime === "image/bmp" ? "bmp" : null;
    let natural = imageSize(data.bytes);
    if (!type) {
      const r = rasterize ? await rasterize(src) : null;
      if (!r) return null;
      data = { bytes: r.bytes, mime: "image/png" };
      type = "png";
      natural = { width: r.width, height: r.height };
    }
    let w = Number(attrs.width) || natural?.width || 300;
    let h = Number(attrs.height) || (natural ? (natural.height / natural.width) * w : 200);
    if (w > maxImagePx) {
      h = (h * maxImagePx) / w;
      w = maxImagePx;
    }
    return new ImageRun({ type: type as "png", data: data.bytes, transformation: { width: Math.round(w), height: Math.round(h) }, altText: attrs.alt ? { name: String(attrs.alt), description: String(attrs.alt), title: String(attrs.alt) } : undefined });
  };

  /** Inline content → runs (links grouped into hyperlinks). */
  const inline = async (nodes: JSONContent[] | undefined): Promise<ParagraphChild[]> => {
    const out: ParagraphChild[] = [];
    let link: { href: string; runs: TextRun[] } | null = null;
    const endLink = () => {
      if (link) out.push(new ExternalHyperlink({ link: link.href, children: link.runs }));
      link = null;
    };
    for (const n of nodes ?? []) {
      if (n.type === "text") {
        const href = n.marks?.find((m) => m.type === "link")?.attrs?.href as string | undefined;
        const parts = (n.text ?? "").split("\t");
        const children = parts.flatMap((p, i) => (i ? [new Tab(), p] : [p])).filter((c) => c !== "");
        const opts = runOptions(n.marks);
        if (href) {
          const run = new TextRun({ ...opts, children, style: "Hyperlink" });
          if (link && link.href === href) link.runs.push(run);
          else {
            endLink();
            link = { href, runs: [run] };
          }
        } else {
          endLink();
          out.push(new TextRun({ ...opts, children }));
        }
      } else {
        endLink();
        if (n.type === "hardBreak") out.push(new TextRun({ break: 1 }));
        else if (n.type === "image") {
          const img = await image(n.attrs ?? {});
          if (img) out.push(img);
        }
      }
    }
    endLink();
    return out;
  };

  const paragraph = async (n: JSONContent, extra: Partial<IParagraphOptions> = {}): Promise<Paragraph> => {
    const align = ALIGN[(n.attrs?.textAlign as string) ?? ""];
    const heading = n.type === "heading" ? HEADINGS[Math.min(6, Math.max(1, Number(n.attrs?.level) || 1)) - 1] : undefined;
    return new Paragraph({ children: await inline(n.content), alignment: align, heading, ...extra });
  };

  const table = async (n: JSONContent, depth: number): Promise<Table> => {
    const rows = n.content ?? [];
    // Column widths from the first row that has them.
    let colWidths: number[] = [];
    for (const r of rows) {
      const w = (r.content ?? []).flatMap((c) => (c.attrs?.colwidth as number[] | null) ?? Array(Number(c.attrs?.colspan) || 1).fill(0));
      if (w.every((x) => x > 0)) {
        colWidths = w.map((px) => Math.round(px * 15));
        break;
      }
      if (!colWidths.length) colWidths = w.map(() => 0);
    }
    const totalTw = contentWidthPt * 20;
    if (!colWidths.length) colWidths = [totalTw];
    if (colWidths.some((w) => !w)) colWidths = colWidths.map(() => Math.floor(totalTw / colWidths.length));
    return new Table({
      width: { size: colWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
      columnWidths: colWidths,
      rows: await Promise.all(
        rows.map(
          async (r) =>
            new TableRow({
              children: await Promise.all(
                (r.content ?? []).map(async (c) => {
                  const fill = hex6(c.attrs?.backgroundColor as string);
                  const widths = c.attrs?.colwidth as number[] | null;
                  const children = (await blocks(c.content ?? [], depth + 1)) as Paragraph[];
                  return new TableCell({
                    children: children.length ? children : [new Paragraph({})],
                    columnSpan: Number(c.attrs?.colspan) > 1 ? Number(c.attrs?.colspan) : undefined,
                    rowSpan: Number(c.attrs?.rowspan) > 1 ? Number(c.attrs?.rowspan) : undefined,
                    shading: fill ? { type: ShadingType.CLEAR, color: "auto", fill } : c.type === "tableHeader" ? { type: ShadingType.CLEAR, color: "auto", fill: "F2F4F7" } : undefined,
                    width: widths?.every((w) => w > 0) ? { size: Math.round(widths.reduce((a, b) => a + b, 0) * 15), type: WidthType.DXA } : undefined,
                  });
                }),
              ),
            }),
        ),
      ),
    });
  };

  const list = async (n: JSONContent, level: number, instance: number): Promise<(Paragraph | Table)[]> => {
    const ordered = n.type === "orderedList";
    const reference = ordered ? "numbers" : "bullets";
    const out: (Paragraph | Table)[] = [];
    for (const item of n.content ?? []) {
      let first = true;
      for (const child of item.content ?? []) {
        if (child.type === "bulletList" || child.type === "orderedList") {
          out.push(...(await list(child, level + 1, child.type === "orderedList" && !ordered ? ++orderedInstance : instance)));
        } else if (child.type === "paragraph" || child.type === "heading") {
          out.push(await paragraph(child, first ? { numbering: { reference, level: Math.min(level, 8), instance } } : { indent: { left: 720 * (level + 1) } }));
          first = false;
        } else out.push(...(await blocks([child], level)));
      }
    }
    return out;
  };

  async function blocks(nodes: JSONContent[], depth = 0): Promise<(Paragraph | Table)[]> {
    const out: (Paragraph | Table)[] = [];
    for (const n of nodes) {
      switch (n.type) {
        case "paragraph":
        case "heading":
          out.push(await paragraph(n));
          break;
        case "bulletList":
        case "orderedList":
          out.push(...(await list(n, 0, n.type === "orderedList" ? ++orderedInstance : 0)));
          break;
        case "blockquote":
          for (const p of await blocks(n.content ?? [], depth)) out.push(p);
          break;
        case "table":
          out.push(await table(n, depth));
          // Word merges back-to-back tables; keep them apart.
          out.push(new Paragraph({}));
          break;
        case "horizontalRule":
          out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 } } }));
          break;
        case "pageBreak":
          out.push(new Paragraph({ children: [new PageBreak()] }));
          break;
        case "codeBlock":
          for (const line of (n.content ?? []).map((t) => t.text ?? "").join("").split("\n")) out.push(new Paragraph({ children: [new TextRun({ text: line, font: "Courier New" })] }));
          break;
        case "image": {
          const img = await image(n.attrs ?? {});
          if (img) out.push(new Paragraph({ children: [img] }));
          break;
        }
        default:
          if (n.content) out.push(...(await blocks(n.content, depth)));
      }
    }
    return out;
  }

  const bulletChars = ["•", "◦", "▪"];
  const numberFormats = [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN];
  const levels = (ordered: boolean) =>
    Array.from({ length: 9 }, (_, level) => ({
      level,
      format: ordered ? numberFormats[level % 3] : LevelFormat.BULLET,
      text: ordered ? `%${level + 1}.` : bulletChars[level % 3],
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
    }));

  const heading = (size: number) => ({ run: { size: size * 2, bold: true }, paragraph: { spacing: { before: 240, after: 80 } } });
  const children = await blocks(doc.content.content ?? []);
  const document = new Document({
    creator: "Fusion Office",
    styles: {
      default: {
        document: { run: { font: meta.font, size: Math.round(meta.fontSize * 2) }, paragraph: { spacing: { after: 120, line: 276 } } },
        heading1: heading(20),
        heading2: heading(16),
        heading3: heading(13),
        heading4: heading(12),
        heading5: heading(11),
        heading6: heading(11),
      },
    },
    numbering: { config: [{ reference: "bullets", levels: levels(false) }, { reference: "numbers", levels: levels(true) }] },
    sections: [
      {
        properties: {
          page: {
            size: { width: Math.round(meta.page.width * 20), height: Math.round(meta.page.height * 20) },
            margin: {
              top: Math.round(meta.page.margin.top * 20),
              right: Math.round(meta.page.margin.right * 20),
              bottom: Math.round(meta.page.margin.bottom * 20),
              left: Math.round(meta.page.margin.left * 20),
            },
          },
        },
        children: children.length ? children : [new Paragraph({})],
      },
    ],
  });
  return new Uint8Array(await Packer.toArrayBuffer(document));
}
