import {
  BlendMode,
  LineCapStyle,
  PDFDocument,
  PDFFont,
  PDFHexString,
  PDFImage,
  PDFPage,
  StandardFonts,
  concatTransformationMatrix,
  degrees,
  popGraphicsState,
  pushGraphicsState,
  rgb,
} from "pdf-lib";
import { getSourceBytes } from "./sources";
import { renderPage } from "./renderer";
import {
  applyMatrix,
  hexToRgb01,
  objectMatrix,
  textBaseline,
  viewToUserMatrix,
  wrapText,
  linePath,
  type Box,
  type Matrix,
} from "./geometry";
import {
  totalRotation,
  viewSize,
  type DocumentState,
  type EditorObject,
  type EditorPage,
  type FontFamily,
  type Rect,
  type TextObject,
} from "../editor/types";
import { objectBounds } from "../editor/objects";

export interface ExportOptions {
  /** Export only these pages (in document order). Default: all. */
  pageIds?: string[];
  /** Flatten existing form fields and draw comments into the page. */
  flatten?: boolean;
  /** Keep comments (as PDF sticky-note annotations unless flattened). */
  includeComments?: boolean;
  /** Resolution for rasterizing redacted pages. */
  redactionDpi?: number;
  title?: string;
  onProgress?: (done: number, total: number) => void;
}

const color = (hex: string) => {
  const [r, g, b] = hexToRgb01(hex);
  return rgb(r, g, b);
};
const isTransparent = (c: string | undefined) => !c || c === "transparent";

const FONT_MAP: Record<FontFamily, [StandardFonts, StandardFonts, StandardFonts, StandardFonts]> = {
  // regular, bold, italic, bold-italic
  Helvetica: [StandardFonts.Helvetica, StandardFonts.HelveticaBold, StandardFonts.HelveticaOblique, StandardFonts.HelveticaBoldOblique],
  Times: [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold, StandardFonts.TimesRomanItalic, StandardFonts.TimesRomanBoldItalic],
  Courier: [StandardFonts.Courier, StandardFonts.CourierBold, StandardFonts.CourierOblique, StandardFonts.CourierBoldOblique],
};

class ExportContext {
  private fonts = new Map<string, Promise<PDFFont>>();
  private images = new Map<string, Promise<PDFImage>>();
  private sources = new Map<string, Promise<PDFDocument>>();
  constructor(
    public out: PDFDocument,
    private flatten: boolean,
  ) {}

  font(family: FontFamily, bold: boolean, italic: boolean) {
    const name = FONT_MAP[family][(bold ? 1 : 0) + (italic ? 2 : 0)];
    let f = this.fonts.get(name);
    if (!f) {
      f = this.out.embedFont(name);
      this.fonts.set(name, f);
    }
    return f;
  }

  image(src: string) {
    let img = this.images.get(src);
    if (!img) {
      const bytes = dataUrlToBytes(src);
      img = src.startsWith("data:image/jpeg") || src.startsWith("data:image/jpg")
        ? this.out.embedJpg(bytes)
        : this.out.embedPng(bytes);
      this.images.set(src, img);
    }
    return img;
  }

  source(id: string) {
    let doc = this.sources.get(id);
    if (!doc) {
      doc = PDFDocument.load(getSourceBytes(id), { ignoreEncryption: true, updateMetadata: false }).then((d) => {
        if (this.flatten) {
          try {
            d.getForm().flatten();
          } catch {
            /* documents without (valid) forms */
          }
        }
        return d;
      });
      this.sources.set(id, doc);
    }
    return doc;
  }
}

export function dataUrlToBytes(url: string): Uint8Array {
  const base64 = url.slice(url.indexOf(",") + 1);
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Standard PDF fonts only cover WinAnsi; replace characters they can't encode. */
function sanitize(font: PDFFont, text: string): string {
  let out = "";
  for (const ch of text) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += ch === "₹" ? "Rs." : "?";
    }
  }
  return out;
}

export async function exportPdf(doc: DocumentState, opts: ExportOptions = {}): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  out.setTitle(opts.title ?? doc.name.replace(/\.pdf$/i, ""));
  out.setProducer("Fusion Office PDF Editor");
  out.setCreator("Fusion Office");
  const ctx = new ExportContext(out, !!opts.flatten);
  const includeComments = opts.includeComments ?? true;

  const pages = opts.pageIds
    ? doc.pages.filter((p) => opts.pageIds!.includes(p.id))
    : doc.pages;

  for (let i = 0; i < pages.length; i++) {
    await exportPage(ctx, pages[i], { ...opts, includeComments });
    opts.onProgress?.(i + 1, pages.length);
  }
  return out.save();
}

async function exportPage(ctx: ExportContext, page: EditorPage, opts: ExportOptions) {
  const { out } = ctx;
  const view = viewSize(page);
  const redactions = page.objects.filter((o) => o.type === "redact").map((o) => (o as { rect: Rect }).rect);

  let pdfPage: PDFPage;
  let matrix: Matrix;

  if (redactions.length > 0) {
    // True redaction: rasterize the original page with the areas blacked out.
    // The resulting page contains no text/vector content from the original.
    pdfPage = out.addPage([view.width, view.height]);
    const scale = (opts.redactionDpi ?? 200) / 72;
    const canvas = document.createElement("canvas");
    await renderPage(page, canvas, scale, { pixelRatio: 1 }).promise;
    const c2d = canvas.getContext("2d")!;
    c2d.fillStyle = "#000000";
    const sx = canvas.width / view.width;
    const sy = canvas.height / view.height;
    for (const r of redactions) c2d.fillRect(r.x * sx - 1, r.y * sy - 1, r.w * sx + 2, r.h * sy + 2);
    const jpg = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("Rasterization failed"))), "image/jpeg", 0.92),
    );
    const img = await out.embedJpg(new Uint8Array(await jpg.arrayBuffer()));
    pdfPage.drawImage(img, { x: 0, y: 0, width: view.width, height: view.height });
    matrix = [1, 0, 0, 1, 0, 0];
  } else {
    let box: Box;
    if (page.source.kind === "pdf") {
      const src = await ctx.source(page.source.sourceId);
      const [copied] = await out.copyPages(src, [page.source.pageIndex]);
      pdfPage = out.addPage(copied);
      pdfPage.setRotation(degrees(totalRotation(page)));
      box = pdfPage.getCropBox();
    } else {
      pdfPage = out.addPage([page.width, page.height]);
      pdfPage.setRotation(degrees(totalRotation(page)));
      box = { x: 0, y: 0, width: page.width, height: page.height };
    }
    // Isolate the original content so its graphics state can't leak into ours.
    const start = out.context.register(out.context.contentStream([pushGraphicsState()]));
    const end = out.context.register(out.context.contentStream([popGraphicsState()]));
    pdfPage.node.wrapContentStreams(start, end);
    matrix = viewToUserMatrix(totalRotation(page), box);
  }

  // Objects fully covered by a redaction are dropped entirely.
  const covered = (o: EditorObject) => {
    if (o.type === "redact") return false;
    const b = objectBounds(o);
    return redactions.some((r) => b.x >= r.x && b.y >= r.y && b.x + b.w <= r.x + r.w && b.y + b.h <= r.y + r.h);
  };

  pdfPage.pushOperators(pushGraphicsState(), concatTransformationMatrix(...matrix));
  for (const obj of page.objects) {
    if (covered(obj)) continue;
    if (obj.type === "comment" && !opts.flatten) continue; // added as annotation below
    if (obj.type === "comment" && !opts.includeComments) continue;
    await drawObject(ctx, pdfPage, obj, view.height);
  }
  // Paint redaction boxes over user content as well.
  for (const r of redactions) {
    pdfPage.drawRectangle({ x: r.x, y: view.height - r.y - r.h, width: r.w, height: r.h, color: rgb(0, 0, 0) });
  }
  pdfPage.pushOperators(popGraphicsState());

  if (opts.includeComments && !opts.flatten) {
    for (const obj of page.objects) {
      if (obj.type !== "comment") continue;
      const [ux, uy] = applyMatrix(matrix, obj.cx, view.height - obj.cy);
      const annot = out.context.obj({
        Type: "Annot",
        Subtype: "Text",
        Rect: [ux - 10, uy - 10, ux + 10, uy + 10],
        Contents: PDFHexString.fromText(obj.text),
        T: PDFHexString.fromText(obj.author ?? "Fusion Office"),
        Name: "Comment",
        C: hexToRgb01(obj.color),
        F: 4,
        Open: false,
      });
      pdfPage.node.addAnnot(out.context.register(annot));
    }
  }
}

function withMatrix(page: PDFPage, m: Matrix, draw: () => void) {
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...m));
  draw();
  page.pushOperators(popGraphicsState());
}

async function drawObject(ctx: ExportContext, page: PDFPage, obj: EditorObject, vh: number) {
  switch (obj.type) {
    case "text":
      return drawText(ctx, page, obj, vh);

    case "image": {
      const img = await ctx.image(obj.src);
      const m = objectMatrix(obj.cx, vh - obj.cy, obj.angle, obj.flipX ? -1 : 1, obj.flipY ? -1 : 1);
      withMatrix(page, m, () =>
        page.drawImage(img, { x: -obj.width / 2, y: -obj.height / 2, width: obj.width, height: obj.height, opacity: obj.opacity }),
      );
      return;
    }

    case "shape": {
      const { width: w, height: h } = obj;
      const fill = isTransparent(obj.fill) ? undefined : color(obj.fill);
      const stroke = isTransparent(obj.stroke) || obj.strokeWidth <= 0 ? undefined : color(obj.stroke);
      const common = {
        color: fill,
        opacity: obj.opacity,
        borderColor: stroke,
        borderWidth: stroke ? obj.strokeWidth : 0,
        borderOpacity: obj.opacity,
      };
      withMatrix(page, objectMatrix(obj.cx, vh - obj.cy, obj.angle), () => {
        switch (obj.shape) {
          case "rect":
            page.drawRectangle({ x: -w / 2, y: -h / 2, width: w, height: h, ...common });
            break;
          case "ellipse":
            page.drawEllipse({ x: 0, y: 0, xScale: w / 2, yScale: h / 2, ...common });
            break;
          case "triangle":
            page.drawSvgPath(`M 0 ${-h / 2} L ${w / 2} ${h / 2} L ${-w / 2} ${h / 2} Z`, { x: 0, y: 0, ...common });
            break;
          case "line":
          case "arrow":
            page.drawSvgPath(linePath(obj.shape, w, obj.strokeWidth), {
              x: 0,
              y: 0,
              borderColor: color(obj.stroke),
              borderWidth: obj.strokeWidth,
              borderOpacity: obj.opacity,
              borderLineCap: LineCapStyle.Round,
            });
            break;
        }
      });
      return;
    }

    case "path":
      withMatrix(page, objectMatrix(obj.cx, vh - obj.cy, obj.angle, obj.scaleX, obj.scaleY), () =>
        page.drawSvgPath(obj.d, {
          x: 0,
          y: 0,
          borderColor: color(obj.stroke),
          borderWidth: obj.strokeWidth,
          borderOpacity: obj.opacity,
          borderLineCap: LineCapStyle.Round,
          blendMode: obj.mode === "highlighter" ? BlendMode.Multiply : undefined,
        }),
      );
      return;

    case "markup":
      for (const r of obj.rects) {
        const y = vh - r.y - r.h;
        if (obj.style === "highlight") {
          page.drawRectangle({ x: r.x, y, width: r.w, height: r.h, color: color(obj.color), opacity: obj.opacity, blendMode: BlendMode.Multiply });
        } else {
          const t = Math.max(0.8, r.h * 0.07);
          const lineY = obj.style === "underline" ? y + r.h * 0.12 : y + r.h * 0.45;
          page.drawRectangle({ x: r.x, y: lineY, width: r.w, height: t, color: color(obj.color), opacity: 1 });
        }
      }
      return;

    case "whiteout":
      page.drawRectangle({
        x: obj.rect.x,
        y: vh - obj.rect.y - obj.rect.h,
        width: obj.rect.w,
        height: obj.rect.h,
        color: color(obj.color),
      });
      return;

    case "comment": {
      // Flattened comment: draw a note icon; the text is lost by design.
      const x = obj.cx - 10;
      const y = vh - obj.cy - 10;
      page.drawRectangle({ x, y, width: 20, height: 20, color: color(obj.color), borderColor: rgb(0.55, 0.45, 0.1), borderWidth: 0.8 });
      for (let i = 0; i < 3; i++) page.drawRectangle({ x: x + 4, y: y + 5 + i * 4, width: 12, height: 1.2, color: rgb(0.35, 0.3, 0.1) });
      return;
    }

    case "redact":
      return;
  }
}

async function drawText(ctx: ExportContext, page: PDFPage, obj: TextObject, vh: number) {
  if (!obj.text.trim()) return;
  const font = await ctx.font(obj.fontFamily, obj.bold, obj.italic);
  const size = obj.fontSize;
  const spacing = (obj.letterSpacing / 1000) * size;
  const measure = (s: string) => {
    const clean = sanitize(font, s);
    return font.widthOfTextAtSize(clean, size) + spacing * Math.max(0, [...clean].length - 1);
  };
  const lines = wrapText(obj.text, obj.width + 0.5, measure);
  const textColor = color(obj.color);

  withMatrix(page, objectMatrix(obj.cx, vh - obj.cy, obj.angle), () => {
    lines.forEach((raw, i) => {
      const line = sanitize(font, raw);
      const lw = measure(raw);
      const left =
        -obj.width / 2 + (obj.align === "center" ? (obj.width - lw) / 2 : obj.align === "right" ? obj.width - lw : 0);
      const y = obj.height / 2 - textBaseline(i, size, obj.lineHeight);
      if (spacing === 0) {
        page.drawText(line, { x: left, y, size, font, color: textColor, opacity: obj.opacity });
      } else {
        let x = left;
        for (const ch of line) {
          page.drawText(ch, { x, y, size, font, color: textColor, opacity: obj.opacity });
          x += font.widthOfTextAtSize(ch, size) + spacing;
        }
      }
      if (obj.underline && line.trim()) {
        page.drawRectangle({
          x: left,
          y: y - size * 0.12,
          width: lw,
          height: Math.max(0.6, size / 15),
          color: textColor,
          opacity: obj.opacity,
        });
      }
    });
  });
}

/** Build a new single-page PDF from an image (for "Insert → Image as page"). */
export async function imageToPdfBytes(dataUrl: string, w: number, h: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const bytes = dataUrlToBytes(dataUrl);
  const img = dataUrl.startsWith("data:image/jpeg") ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
  // Fit to A4-ish width at 72dpi while keeping aspect ratio.
  const scale = Math.min(1, 595 / w, 842 / h);
  const page = doc.addPage([w * scale, h * scale]);
  page.drawImage(img, { x: 0, y: 0, width: w * scale, height: h * scale });
  return doc.save();
}
