import { StaticCanvas } from "fabric";
import { renderThumbnail } from "../pdf/renderer";
import { createFabricObject } from "./fabricAdapter";
import { viewSize, type EditorPage } from "./types";

const PIXEL_RATIO = 2;

/**
 * A page thumbnail with the user's edits on top (signatures, text, shapes,
 * edited lines), so the page list shows what Download will produce. The PDF
 * page itself comes from the cached thumbnail; only the edits are redrawn.
 */
export async function renderPreview(page: EditorPage, width: number): Promise<string> {
  const base = await renderThumbnail(page, width);
  const visible = page.objects.filter((o) => !o.hidden);
  if (!visible.length) return base;

  const view = viewSize(page);
  const scale = (width / view.width) * PIXEL_RATIO;
  const w = Math.round(view.width * scale);
  const h = Math.round(view.height * scale);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;

  const img = new Image();
  img.src = base;
  await img.decode();
  ctx.drawImage(img, 0, 0, w, h);

  // Edited PDF lines: hide the original words, as the editor does on the page.
  for (const o of visible) {
    if (o.type !== "text" || !o.replaces) continue;
    const r = o.replaces.rect;
    ctx.fillStyle = o.replaces.background;
    ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
  }

  const layer = new StaticCanvas(document.createElement("canvas"), { width: w, height: h, enableRetinaScaling: false, renderOnAddRemove: false });
  layer.setZoom(scale);
  for (const o of visible) {
    try {
      layer.add(await createFabricObject(o));
    } catch {
      /* an image that can't load shouldn't break the preview */
    }
  }
  layer.renderAll();
  ctx.drawImage(layer.getElement(), 0, 0);
  void layer.dispose();
  return out.toDataURL("image/jpeg", 0.82);
}
