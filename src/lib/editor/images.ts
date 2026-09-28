"use client";

export interface LoadedImage {
  src: string;
  width: number;
  height: number;
}

const MAX_DIM = 2400;

/**
 * Read an image file into a PNG/JPEG data URL that pdf-lib can embed.
 * WEBP/GIF/etc. are converted to PNG; very large images are downscaled.
 */
export async function readImageFile(file: Blob): Promise<LoadedImage> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Unsupported or corrupted image"));
      el.src = url;
    });
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const scale = Math.min(1, MAX_DIM / Math.max(w, h));
    const isJpeg = file.type === "image/jpeg";
    if (scale === 1 && (isJpeg || file.type === "image/png")) {
      return { src: await blobToDataUrl(file), width: w, height: h };
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const src = isJpeg ? canvas.toDataURL("image/jpeg", 0.92) : canvas.toDataURL("image/png");
    return { src, width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Crop transparent/white margins from a canvas (used for signatures). */
export function trimCanvas(canvas: HTMLCanvasElement, pad = 8): HTMLCanvasElement {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return canvas;
  const out = document.createElement("canvas");
  out.width = maxX - minX + 1 + pad * 2;
  out.height = maxY - minY + 1 + pad * 2;
  out.getContext("2d")!.drawImage(canvas, minX - pad, minY - pad, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

export function downloadBytes(bytes: Uint8Array, filename: string, type = "application/pdf") {
  const blob = new Blob([bytes as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function printBytes(bytes: Uint8Array) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  iframe.src = url;
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.open(url, "_blank");
    }
    setTimeout(() => {
      iframe.remove();
      URL.revokeObjectURL(url);
    }, 60_000);
  };
  document.body.appendChild(iframe);
}
