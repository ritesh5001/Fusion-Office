"use client";

/**
 * Thumbmark maker: a phone photo of a thumbprint → a clean, transparent PNG.
 * The paper's own shading (uneven light, shadows) is estimated with a heavy
 * blur and subtracted, so only the ridges remain, in the chosen ink colour.
 */
import { decodeImage } from "../image/canvas";
import { hexToRgb01 } from "../pdf/geometry";
import type { ToolFile } from "./files";

export interface ThumbmarkOptions {
  ink: string;
  /** 0 … 100: how faint a ridge still counts as ink. */
  strength: number;
}

export async function makeThumbmark(file: ToolFile, o: ThumbmarkOptions): Promise<ToolFile> {
  const img = await decodeImage(file);
  // Work at up to 1400 px on the long side.
  const k = Math.min(1, 1400 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * k));
  const h = Math.max(1, Math.round(img.height * k));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img.source, 0, 0, w, h);
  img.close();
  const src = ctx.getImageData(0, 0, w, h);

  // Background estimate: shrink a lot and scale back up (a cheap, wide blur).
  const small = document.createElement("canvas");
  small.width = Math.max(1, Math.round(w / 24));
  small.height = Math.max(1, Math.round(h / 24));
  const sctx = small.getContext("2d")!;
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(canvas, 0, 0, small.width, small.height);
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = w;
  bgCanvas.height = h;
  const bctx = bgCanvas.getContext("2d")!;
  bctx.imageSmoothingQuality = "high";
  bctx.drawImage(small, 0, 0, w, h);
  const bg = bctx.getImageData(0, 0, w, h).data;

  const lum = (d: Uint8ClampedArray, i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  const threshold = 46 - (o.strength / 100) * 38; // darker-than-paper needed, in grey levels
  const [r, g, b] = hexToRgb01(o.ink).map((v) => Math.round(v * 255));
  const out = ctx.createImageData(w, h);
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dark = lum(bg, i) - lum(src.data, i);
      if (dark <= threshold) continue;
      const a = Math.min(255, Math.round(((dark - threshold) / 40) * 255));
      out.data[i] = r;
      out.data[i + 1] = g;
      out.data[i + 2] = b;
      out.data[i + 3] = a;
      if (a > 60) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
  }
  if (x1 < 0) throw new Error("No thumbprint found. Try a sharper photo on plain paper, or raise the strength.");
  ctx.clearRect(0, 0, w, h);
  ctx.putImageData(out, 0, 0);
  // Crop to the print with a little room around it.
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.06);
  const cx0 = Math.max(0, x0 - pad);
  const cy0 = Math.max(0, y0 - pad);
  const cw = Math.min(w, x1 + pad) - cx0;
  const ch = Math.min(h, y1 + pad) - cy0;
  const crop = document.createElement("canvas");
  crop.width = cw;
  crop.height = ch;
  crop.getContext("2d")!.drawImage(canvas, cx0, cy0, cw, ch, 0, 0, cw, ch);
  const blob = await new Promise<Blob>((res, rej) => crop.toBlob((bl) => (bl ? res(bl) : rej(new Error("Couldn't save the image"))), "image/png"));
  return { name: `${file.name.replace(/\.[^.]+$/, "")}-thumbmark.png`, bytes: new Uint8Array(await blob.arrayBuffer()), type: "image/png" };
}
