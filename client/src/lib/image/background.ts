"use client";

/**
 * Browser side of background removal: find the background on a reduced copy
 * (fast, and plenty for an outline), then cut the full-size picture with the
 * enlarged, smoothed mask.
 */
import { newCanvas, resample } from "./canvas";
import { removeBackground, type MatteOptions } from "./matte";

const WORK_SIDE = 1400;

export interface CutOut {
  canvas: HTMLCanvasElement;
  /** Share of the picture that was background, 0–1. */
  removed: number;
  background: [number, number, number];
}

/** The picture with its background made transparent, or painted `fill`. */
export function cutOut(source: HTMLCanvasElement, o: MatteOptions & { fill?: string | null }): CutOut {
  const scale = Math.min(1, WORK_SIDE / Math.max(source.width, source.height));
  const small = scale < 1 ? resample(source, { sx: 0, sy: 0, sw: source.width, sh: source.height }, source.width * scale, source.height * scale) : source;
  const ctx = small.getContext("2d", { willReadFrequently: true })!;
  const px = ctx.getImageData(0, 0, small.width, small.height);
  const matte = removeBackground(px.data, small.width, small.height, o);

  const maskData = new ImageData(small.width, small.height);
  for (let i = 0; i < matte.alpha.length; i++) maskData.data[i * 4 + 3] = matte.alpha[i];
  const mask = newCanvas(small.width, small.height);
  mask.getContext("2d")!.putImageData(maskData, 0, 0);

  const out = newCanvas(source.width, source.height);
  const c = out.getContext("2d")!;
  c.drawImage(source, 0, 0);
  c.globalCompositeOperation = "destination-in";
  c.imageSmoothingQuality = "high";
  c.drawImage(mask, 0, 0, out.width, out.height);
  if (o.fill) {
    // Paint the new background behind the subject.
    c.globalCompositeOperation = "destination-over";
    c.fillStyle = o.fill;
    c.fillRect(0, 0, out.width, out.height);
  }
  c.globalCompositeOperation = "source-over";
  return { canvas: out, removed: matte.removed, background: matte.background };
}
