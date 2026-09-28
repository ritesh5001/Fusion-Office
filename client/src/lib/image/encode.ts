/**
 * Output formats, "fit into N KB" search and print-resolution (DPI) tags.
 * The search takes the encoder as a function, so it is pure and unit tested.
 */

export type Format = "jpeg" | "png" | "webp";

export const FORMAT_INFO: Record<Format, { mime: string; ext: string; label: string; lossy: boolean }> = {
  jpeg: { mime: "image/jpeg", ext: "jpg", label: "JPG", lossy: true },
  png: { mime: "image/png", ext: "png", label: "PNG", lossy: false },
  webp: { mime: "image/webp", ext: "webp", label: "WEBP", lossy: true },
};

/** The output format for an input file ("keep" falls back to JPG for formats browsers can't write). */
export function formatFor(mime: string): Format {
  if (mime === "image/png" || mime === "image/gif" || mime === "image/svg+xml" || mime === "image/bmp") return "png";
  if (mime === "image/webp") return "webp";
  return "jpeg";
}

/** Encode an image of the given size. Resolves to the encoded bytes. */
export type Encoder = (width: number, height: number, quality: number) => Promise<Uint8Array>;

export interface TargetResult {
  bytes: Uint8Array;
  width: number;
  height: number;
  /** Quality used (lossy formats), 1 for PNG. */
  quality: number;
  /** False when even the smallest attempt was bigger than the target. */
  fits: boolean;
}

/**
 * Find the best-looking encoding no bigger than `target` bytes. Lossy formats
 * first lower the quality (down to `minQuality`); if that isn't enough the
 * dimensions shrink too. PNG can only shrink dimensions.
 */
export async function encodeToTarget(
  size: { width: number; height: number },
  target: number,
  lossy: boolean,
  encode: Encoder,
  { minQuality = 0.4, maxQuality = 0.95 } = {},
): Promise<TargetResult> {
  let { width, height } = size;
  let smallest: TargetResult | null = null;
  for (let round = 0; round < 12; round++) {
    if (!lossy) {
      const bytes = await encode(width, height, 1);
      const r = { bytes, width, height, quality: 1, fits: bytes.length <= target };
      if (r.fits) return r;
      smallest = r;
    } else {
      // Binary search for the highest quality that fits at this size.
      let lo = minQuality;
      let hi = maxQuality;
      let best: TargetResult | null = null;
      const top = await encode(width, height, hi);
      if (top.length <= target) return { bytes: top, width, height, quality: hi, fits: true };
      const bottom = await encode(width, height, lo);
      if (bottom.length <= target) {
        best = { bytes: bottom, width, height, quality: lo, fits: true };
        for (let i = 0; i < 6; i++) {
          const q = (lo + hi) / 2;
          const bytes = await encode(width, height, q);
          if (bytes.length <= target) {
            best = { bytes, width, height, quality: q, fits: true };
            lo = q;
          } else hi = q;
        }
        return best;
      }
      smallest = { bytes: bottom, width, height, quality: lo, fits: false };
    }
    // Too big even at the lowest quality: shrink. File size scales roughly with pixel count.
    const current = smallest.bytes.length;
    const factor = Math.min(0.9, Math.sqrt(target / current) * 0.95);
    const nw = Math.max(1, Math.round(width * factor));
    const nh = Math.max(1, Math.round(height * factor));
    if (nw === width && nh === height) break;
    width = nw;
    height = nh;
    if (width < 16 || height < 16) {
      // Tiny image and still too big: last resort, lowest quality.
      if (lossy && minQuality > 0.05) minQuality = 0.05;
      else break;
    }
  }
  return smallest!;
}

// ─── Print resolution ───────────────────────────────────────────────

/** Mark a JPEG as `dpi` dots per inch (JFIF density), adding the JFIF header if missing. */
export function setJpegDpi(bytes: Uint8Array, dpi: number): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;
  const d = Math.max(1, Math.min(65535, Math.round(dpi)));
  const isJfif = bytes[2] === 0xff && bytes[3] === 0xe0 && String.fromCharCode(...bytes.subarray(6, 10)) === "JFIF" && bytes[10] === 0;
  if (isJfif) {
    const out = bytes.slice();
    out[13] = 1; // units: dots per inch
    out[14] = d >> 8;
    out[15] = d & 255;
    out[16] = d >> 8;
    out[17] = d & 255;
    return out;
  }
  const app0 = new Uint8Array([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, d >> 8, d & 255, d >> 8, d & 255, 0x00, 0x00]);
  const out = new Uint8Array(bytes.length + app0.length);
  out.set(bytes.subarray(0, 2), 0);
  out.set(app0, 2);
  out.set(bytes.subarray(2), 2 + app0.length);
  return out;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Mark a PNG as `dpi` dots per inch (pHYs chunk), replacing any existing one. */
export function setPngDpi(bytes: Uint8Array, dpi: number): Uint8Array {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!sig.every((b, i) => bytes[i] === b)) return bytes;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: Uint8Array[] = [bytes.subarray(0, 8)];
  let pos = 8;
  let inserted = false;
  const ppm = Math.round(dpi / 0.0254);
  while (pos + 8 <= bytes.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8));
    const end = pos + 12 + len;
    if (type !== "pHYs") chunks.push(bytes.subarray(pos, end));
    if (type === "IHDR" && !inserted) {
      const chunk = new Uint8Array(21);
      const cv = new DataView(chunk.buffer);
      cv.setUint32(0, 9);
      chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
      cv.setUint32(8, ppm);
      cv.setUint32(12, ppm);
      chunk[16] = 1; // unit: metre
      cv.setUint32(17, crc32(chunk.subarray(4, 17)));
      chunks.push(chunk);
      inserted = true;
    }
    pos = end;
    if (type === "IEND") break;
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

export function setDpi(bytes: Uint8Array, format: Format, dpi: number): Uint8Array {
  if (format === "jpeg") return setJpegDpi(bytes, dpi);
  if (format === "png") return setPngDpi(bytes, dpi);
  return bytes;
}

/** "photo.png" + webp → "photo.webp", with an optional suffix. */
export function outputName(name: string, format: Format, suffix = "") {
  const stem = name.replace(/\.[^.]+$/, "") || "image";
  return `${stem}${suffix ? `-${suffix}` : ""}.${FORMAT_INFO[format].ext}`;
}

/** Parse "50", "50kb", "1.5 MB" → bytes (KB = 1024 bytes, as upload forms count). */
export function parseSize(input: string): number | null {
  const m = input.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(kb|k|mb|m|b)?$/);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2] ?? "kb";
  const bytes = unit.startsWith("m") ? n * 1024 * 1024 : unit === "b" ? n : n * 1024;
  return bytes >= 1024 ? Math.floor(bytes) : null;
}
