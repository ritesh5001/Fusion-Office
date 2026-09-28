"use client";

import { decodeImage, encodeCanvas, resample } from "../image/canvas";

/**
 * A picked image as a data URL for a document or slide. Large photos are
 * scaled down (max `maxSide` px) so documents stay a sensible size.
 */
export async function imageFileToDataUrl(file: File, maxSide = 1800): Promise<{ src: string; width: number; height: number }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const img = await decodeImage({ bytes, type: file.type, name: file.name });
  try {
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const keep = scale === 1 && bytes.length < 1_500_000 && /^image\/(png|jpeg|gif)$/.test(file.type);
    if (keep) return { src: await blobToDataUrl(new Blob([bytes as BlobPart], { type: file.type })), width: img.width, height: img.height };
    const c = resample(img.source, { sx: 0, sy: 0, sw: img.width, sh: img.height }, img.width * scale, img.height * scale);
    // PNG keeps transparency (logos, screenshots); photos become JPEG.
    const png = file.type === "image/png" || file.type === "image/svg+xml" || file.type === "image/gif";
    const out = await encodeCanvas(c, png ? "png" : "jpeg", 0.88);
    return { src: await blobToDataUrl(new Blob([out as BlobPart], { type: png ? "image/png" : "image/jpeg" })), width: c.width, height: c.height };
  } finally {
    img.close();
  }
}

export const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

/** Turn any image data URL the browser can show into PNG bytes (for formats Office files can't hold). */
export async function rasterizeDataUrl(src: string): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  try {
    const blob = await (await fetch(src)).blob();
    const img = await decodeImage({ bytes: new Uint8Array(await blob.arrayBuffer()), type: blob.type, name: "image" });
    try {
      const c = resample(img.source, { sx: 0, sy: 0, sw: img.width, sh: img.height }, img.width, img.height);
      return { bytes: await encodeCanvas(c, "png"), width: c.width, height: c.height };
    } finally {
      img.close();
    }
  } catch {
    return null;
  }
}
