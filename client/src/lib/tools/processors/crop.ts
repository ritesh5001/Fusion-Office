import { applyMatrix } from "../../pdf/geometry";
import { loadPdf, pageView, save } from "./common";

/** Crop area as fractions of the page as displayed (0..1, top-left origin). */
export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Set the visible area (CropBox) of the selected pages. Content outside is hidden, not deleted. */
export async function cropPdf(bytes: Uint8Array, rect: CropRect, pages?: number[]): Promise<Uint8Array> {
  const doc = await loadPdf(bytes);
  const targets = pages ?? doc.getPageIndices();
  for (const i of targets) {
    const page = doc.getPage(i);
    const v = pageView(page);
    // View space (y-up) corners → user space.
    const x0 = rect.x * v.width;
    const x1 = (rect.x + rect.w) * v.width;
    const y0 = v.height - (rect.y + rect.h) * v.height;
    const y1 = v.height - rect.y * v.height;
    const [ax, ay] = applyMatrix(v.matrix, x0, y0);
    const [bx, by] = applyMatrix(v.matrix, x1, y1);
    const box = { x: Math.min(ax, bx), y: Math.min(ay, by), width: Math.abs(bx - ax), height: Math.abs(by - ay) };
    page.setCropBox(box.x, box.y, box.width, box.height);
    page.setTrimBox(box.x, box.y, box.width, box.height);
  }
  return save(doc);
}
