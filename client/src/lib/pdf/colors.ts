import { renderPage } from "./renderer";
import { totalRotation, type EditorPage, type Rect } from "../editor/types";

const SCALE = 2;
const rasterCache = new Map<string, Promise<HTMLCanvasElement>>();

function raster(page: EditorPage): Promise<HTMLCanvasElement> {
  const key = page.source.kind === "pdf" ? `${page.source.sourceId}:${page.source.pageIndex}:${totalRotation(page)}` : `blank:${page.id}`;
  let p = rasterCache.get(key);
  if (!p) {
    p = (async () => {
      const rendered = document.createElement("canvas");
      await renderPage(page, rendered, SCALE, { pixelRatio: 1 }).promise;
      // Copy into a canvas optimised for repeated pixel reads.
      const canvas = document.createElement("canvas");
      canvas.width = rendered.width;
      canvas.height = rendered.height;
      canvas.getContext("2d", { willReadFrequently: true })!.drawImage(rendered, 0, 0);
      return canvas;
    })();
    rasterCache.set(key, p);
    p.catch(() => rasterCache.delete(key));
  }
  return p;
}

const toHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/**
 * Sample the background behind a text line (most common colour on its border)
 * and the ink colour (average of the pixels furthest from that background).
 */
export async function sampleTextColors(page: EditorPage, rect: Rect): Promise<{ text: string; background: string }> {
  const fallback = { text: "#111111", background: "#ffffff" };
  try {
    const canvas = await raster(page);
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const pad = 2;
    const x = Math.max(0, Math.floor((rect.x - pad) * SCALE));
    const y = Math.max(0, Math.floor((rect.y - pad) * SCALE));
    const w = Math.min(canvas.width - x, Math.ceil((rect.w + pad * 2) * SCALE));
    const h = Math.min(canvas.height - y, Math.ceil((rect.h + pad * 2) * SCALE));
    if (w <= 2 || h <= 2) return fallback;
    const data = ctx.getImageData(x, y, w, h).data;
    const px = (i: number, j: number) => {
      const o = (j * w + i) * 4;
      return [data[o], data[o + 1], data[o + 2]] as const;
    };

    // Background: mode of the border pixels, quantized to reduce noise.
    const counts = new Map<string, { n: number; rgb: readonly [number, number, number] }>();
    const addBorder = (i: number, j: number) => {
      const c = px(i, j);
      const k = c.map((v) => v >> 3).join(",");
      const e = counts.get(k);
      if (e) e.n++;
      else counts.set(k, { n: 1, rgb: c });
    };
    for (let i = 0; i < w; i++) {
      addBorder(i, 0);
      addBorder(i, h - 1);
    }
    for (let j = 0; j < h; j++) {
      addBorder(0, j);
      addBorder(w - 1, j);
    }
    const bg = [...counts.values()].sort((a, b) => b.n - a.n)[0].rgb;

    // Ink: the 8% of interior pixels furthest from the background.
    const dist: { d: number; c: readonly [number, number, number] }[] = [];
    for (let j = 1; j < h - 1; j++) {
      for (let i = 1; i < w - 1; i++) {
        const c = px(i, j);
        const d = (c[0] - bg[0]) ** 2 + (c[1] - bg[1]) ** 2 + (c[2] - bg[2]) ** 2;
        if (d > 900) dist.push({ d, c });
      }
    }
    if (!dist.length) return { text: fallback.text, background: toHex(...bg) };
    dist.sort((a, b) => b.d - a.d);
    const top = dist.slice(0, Math.max(1, Math.floor(dist.length * 0.08)));
    const avg = [0, 1, 2].map((k) => top.reduce((s, p) => s + p.c[k], 0) / top.length) as [number, number, number];
    return { text: toHex(...avg), background: toHex(...bg) };
  } catch {
    return fallback;
  }
}
