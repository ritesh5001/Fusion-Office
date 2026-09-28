import { PDFName, PDFOperator, PDFOperatorNames, StandardFonts, concatTransformationMatrix, degrees, popGraphicsState, pushGraphicsState, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { hexToRgb01, objectMatrix } from "../../pdf/geometry";
import { loadPdf, pageView, save } from "./common";

export type Position = "top-left" | "top-center" | "top-right" | "middle-left" | "center" | "middle-right" | "bottom-left" | "bottom-center" | "bottom-right";

/** Where a box of size w×h sits on a page of size W×H (top-left view coords, returns its center). */
export function place(pos: Position, W: number, H: number, w: number, h: number, margin: number) {
  const [v, hz] = pos === "center" ? ["middle", "center"] : pos.split("-");
  const cx = hz === "left" ? margin + w / 2 : hz === "right" ? W - margin - w / 2 : W / 2;
  const cy = v === "top" ? margin + h / 2 : v === "bottom" ? H - margin - h / 2 : H / 2;
  return { cx, cy };
}

/** Run `draw` in view space (y-up, origin bottom-left of the page as displayed). */
function inView(page: PDFPage, draw: (viewHeight: number, viewWidth: number) => void) {
  const v = pageView(page);
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...v.matrix));
  draw(v.height, v.width);
  page.pushOperators(popGraphicsState());
}

const color = (hex: string) => {
  const [r, g, b] = hexToRgb01(hex);
  return rgb(r, g, b);
};

const FONTS = { Helvetica: StandardFonts.HelveticaBold, Times: StandardFonts.TimesRomanBold, Courier: StandardFonts.CourierBold } as const;

export interface TextWatermark {
  kind: "text";
  text: string;
  font: keyof typeof FONTS;
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
  position: Position;
  /** Repeat across the page in a grid. */
  mosaic: boolean;
}
export interface ImageWatermark {
  kind: "image";
  image: Uint8Array;
  imageType: "png" | "jpg";
  /** Width as a fraction of the page width. */
  scale: number;
  opacity: number;
  rotation: number;
  position: Position;
  mosaic: boolean;
}

/**
 * Tag what follows as a watermark (PDF "artifact"), the way Acrobat does, so
 * screen readers skip it and it can be found and removed later.
 */
const beginWatermark = (page: PDFPage) =>
  page.pushOperators(PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [PDFName.of("Artifact"), "<< /Type /Pagination /Subtype /Watermark >>"]));
const endWatermark = (page: PDFPage) => page.pushOperators(PDFOperator.of(PDFOperatorNames.EndMarkedContent));

export async function watermarkPdf(bytes: Uint8Array, mark: TextWatermark | ImageWatermark, pages?: number[]): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const targets = pages ?? doc.getPageIndices();
  const font: PDFFont | null = mark.kind === "text" ? await doc.embedFont(FONTS[mark.font]) : null;
  const image = mark.kind === "image" ? await (mark.imageType === "png" ? doc.embedPng(mark.image) : doc.embedJpg(mark.image)) : null;
  for (const i of targets) {
    const page = doc.getPage(i);
    beginWatermark(page);
    inView(page, (VH, VW) => {
      let w: number;
      let h: number;
      if (mark.kind === "text") {
        w = font!.widthOfTextAtSize(mark.text, mark.fontSize);
        h = mark.fontSize;
      } else {
        w = VW * mark.scale;
        h = (w * image!.height) / image!.width;
      }
      const centers: { cx: number; cy: number }[] = [];
      if (mark.mosaic) {
        const stepX = Math.max(w * 1.6, 60);
        const stepY = Math.max(h * 3, 60);
        for (let y = stepY / 2; y < VH + stepY; y += stepY)
          for (let x = stepX / 2 - (Math.round(y / stepY) % 2) * (stepX / 2); x < VW + stepX; x += stepX) centers.push({ cx: x, cy: y });
      } else centers.push(place(mark.position, VW, VH, w, h, 36));
      for (const { cx, cy } of centers) {
        page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...objectMatrix(cx, VH - cy, -mark.rotation)));
        if (mark.kind === "text") {
          // drawText's origin is the baseline; nudge so the text is centred.
          page.drawText(mark.text, { x: -w / 2, y: -h * 0.35, size: mark.fontSize, font: font!, color: color(mark.color), opacity: mark.opacity });
        } else {
          page.drawImage(image!, { x: -w / 2, y: -h / 2, width: w, height: h, opacity: mark.opacity });
        }
        page.pushOperators(popGraphicsState());
      }
    });
    endWatermark(page);
  }
  return save(doc);
}

export interface PageNumberOptions {
  position: Position;
  /** Tokens: {n} current page, {total} page count. */
  format: string;
  start: number;
  fontSize: number;
  color: string;
  margin: number;
}

export async function addPageNumbers(bytes: Uint8Array, opts: PageNumberOptions, pages?: number[]): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const targets = pages ?? doc.getPageIndices();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const total = targets.length + opts.start - 1;
  targets.forEach((i, k) => {
    const page = doc.getPage(i);
    const label = opts.format.replaceAll("{n}", String(k + opts.start)).replaceAll("{total}", String(total));
    inView(page, (VH, VW) => {
      const w = font.widthOfTextAtSize(label, opts.fontSize);
      const { cx, cy } = place(opts.position, VW, VH, w, opts.fontSize, opts.margin);
      page.drawText(label, { x: cx - w / 2, y: VH - cy - opts.fontSize * 0.35, size: opts.fontSize, font, color: color(opts.color) });
    });
  });
  return save(doc);
}

export { degrees };
