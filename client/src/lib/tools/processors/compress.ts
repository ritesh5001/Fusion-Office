"use client";

import { PDFArray, PDFDict, PDFName, PDFNumber, PDFRawStream, PDFRef, type PDFDocument } from "pdf-lib";
import { loadPdf } from "./common";

export type CompressLevel = "low" | "recommended" | "extreme";

export interface CompressOptions {
  level: CompressLevel;
  grayscale: boolean;
  stripMetadata: boolean;
}

export interface CompressResult {
  bytes: Uint8Array;
  before: number;
  after: number;
  imagesFound: number;
  imagesRecompressed: number;
  /** True when nothing could be made smaller and the original is returned. */
  unchanged: boolean;
}

const LEVELS: Record<CompressLevel, { maxDim: number; quality: number }> = {
  low: { maxDim: 2400, quality: 0.85 },
  recommended: { maxDim: 1600, quality: 0.72 },
  extreme: { maxDim: 1000, quality: 0.5 },
};

const nameOf = (o: unknown) => (o instanceof PDFName ? o.decodeText() : undefined);
const numOf = (o: unknown) => (o instanceof PDFNumber ? o.asNumber() : undefined);

function filters(dict: PDFDict, doc: PDFDocument): string[] {
  const f = doc.context.lookup(dict.get(PDFName.of("Filter")));
  if (f instanceof PDFName) return [f.decodeText()];
  if (f instanceof PDFArray) return f.asArray().map((x) => nameOf(doc.context.lookup(x)) ?? "?");
  return [];
}

/** Colour components of an image's colour space, or null if unsupported. */
function components(dict: PDFDict, doc: PDFDocument): number | null {
  const cs = doc.context.lookup(dict.get(PDFName.of("ColorSpace")));
  const n = nameOf(cs);
  if (n === "DeviceRGB" || n === "CalRGB") return 3;
  if (n === "DeviceGray" || n === "CalGray") return 1;
  if (cs instanceof PDFArray) {
    const kind = nameOf(doc.context.lookup(cs.get(0)));
    if (kind === "ICCBased") {
      const profile = doc.context.lookup(cs.get(1));
      const comps = profile instanceof PDFRawStream ? numOf(profile.dict.get(PDFName.of("N"))) : undefined;
      return comps === 1 || comps === 3 ? comps : null;
    }
    if (kind === "CalRGB") return 3;
    if (kind === "CalGray") return 1;
  }
  return null; // CMYK, Indexed, Lab, Separation… left untouched
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Undo PNG row predictors (Predictor ≥ 10). */
function unpredict(data: Uint8Array, width: number, comps: number): Uint8Array {
  const rowLen = width * comps;
  const rows = Math.floor(data.length / (rowLen + 1));
  const out = new Uint8Array(rows * rowLen);
  for (let y = 0; y < rows; y++) {
    const type = data[y * (rowLen + 1)];
    const src = y * (rowLen + 1) + 1;
    const dst = y * rowLen;
    for (let x = 0; x < rowLen; x++) {
      const raw = data[src + x];
      const left = x >= comps ? out[dst + x - comps] : 0;
      const up = y > 0 ? out[dst - rowLen + x] : 0;
      const upLeft = y > 0 && x >= comps ? out[dst - rowLen + x - comps] : 0;
      let v = raw;
      if (type === 1) v = raw + left;
      else if (type === 2) v = raw + up;
      else if (type === 3) v = raw + ((left + up) >> 1);
      else if (type === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        v = raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
      }
      out[dst + x] = v & 255;
    }
  }
  return out;
}

async function decodeImage(stream: PDFRawStream, doc: PDFDocument): Promise<ImageBitmap | ImageData | null> {
  const dict = stream.dict;
  const f = filters(dict, doc);
  if (dict.get(PDFName.of("ImageMask")) || dict.get(PDFName.of("Decode"))) return null;
  const comps = components(dict, doc);
  if (!comps) return null;
  const width = numOf(dict.get(PDFName.of("Width")));
  const height = numOf(dict.get(PDFName.of("Height")));
  if (!width || !height) return null;

  if (f.length === 1 && f[0] === "DCTDecode") {
    return createImageBitmap(new Blob([stream.contents as BlobPart], { type: "image/jpeg" })).catch(() => null);
  }
  if (f.length === 1 && f[0] === "FlateDecode" && numOf(dict.get(PDFName.of("BitsPerComponent"))) === 8) {
    let data = await inflate(stream.contents).catch(() => null);
    if (!data) return null;
    const parms = doc.context.lookup(dict.get(PDFName.of("DecodeParms")));
    const predictor = parms instanceof PDFDict ? numOf(parms.get(PDFName.of("Predictor"))) ?? 1 : 1;
    if (predictor === 2) return null; // TIFF predictor: rare, skip
    if (predictor >= 10) data = unpredict(data, width, comps);
    if (data.length < width * height * comps) return null;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0, j = 0; i < width * height; i++, j += comps) {
      const r = data[j];
      rgba[i * 4] = r;
      rgba[i * 4 + 1] = comps === 3 ? data[j + 1] : r;
      rgba[i * 4 + 2] = comps === 3 ? data[j + 2] : r;
      rgba[i * 4 + 3] = 255;
    }
    return new ImageData(rgba, width, height);
  }
  return null; // JPX, CCITT, JBIG2, 16-bit… already compact or unsupported
}

async function encodeJpeg(src: ImageBitmap | ImageData, maxDim: number, quality: number, gray: boolean) {
  const w0 = src.width;
  const h0 = src.height;
  const scale = Math.min(1, maxDim / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  if (src instanceof ImageData) {
    const tmp = document.createElement("canvas");
    tmp.width = w0;
    tmp.height = h0;
    tmp.getContext("2d")!.putImageData(src, 0, 0);
    ctx.drawImage(tmp, 0, 0, w, h);
  } else ctx.drawImage(src, 0, 0, w, h);
  if (gray) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = l;
    }
    ctx.putImageData(img, 0, 0);
  }
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  if (!blob) return null;
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width: w, height: h };
}

/**
 * Shrink a PDF by re-encoding its images (text and vector graphics stay
 * sharp and selectable), compressing uncompressed streams and, optionally,
 * removing metadata.
 */
export async function compressPdf(
  bytes: Uint8Array,
  opts: CompressOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<CompressResult> {
  const doc = await loadPdf(bytes);
  const { maxDim, quality } = LEVELS[opts.level];
  const ctx = doc.context;
  const images: [PDFRef, PDFRawStream][] = [];
  const plain: [PDFRef, PDFRawStream][] = [];
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    if (nameOf(obj.dict.get(PDFName.of("Subtype"))) === "Image") images.push([ref, obj]);
    else if (!obj.dict.get(PDFName.of("Filter")) && obj.contents.length > 512) plain.push([ref, obj]);
  }

  let recompressed = 0;
  for (const [k, [ref, stream]] of images.entries()) {
    onProgress?.(k, images.length);
    const decoded = await decodeImage(stream, doc);
    if (!decoded) continue;
    const enc = await encodeJpeg(decoded, maxDim, quality, opts.grayscale);
    if ("close" in decoded) decoded.close();
    if (!enc || enc.bytes.length >= stream.contents.length * 0.9) continue; // not worth it
    const dict = stream.dict;
    const entries: Record<string, unknown> = {
      Type: "XObject",
      Subtype: "Image",
      Width: enc.width,
      Height: enc.height,
      ColorSpace: "DeviceRGB",
      BitsPerComponent: 8,
      Filter: "DCTDecode",
    };
    const next = ctx.stream(enc.bytes, entries as Record<string, never>);
    // Keep transparency and rendering hints.
    for (const key of ["SMask", "Interpolate", "Intent", "Mask"]) {
      const v = dict.get(PDFName.of(key));
      if (v) next.dict.set(PDFName.of(key), v);
    }
    ctx.assign(ref, next);
    recompressed++;
  }
  onProgress?.(images.length, images.length);

  for (const [ref, stream] of plain) {
    const entries: Record<string, unknown> = {};
    for (const [key, value] of stream.dict.entries()) if (key.decodeText() !== "Length") entries[key.decodeText()] = value;
    ctx.assign(ref, ctx.flateStream(stream.contents, entries as Record<string, never>));
  }

  if (opts.stripMetadata) {
    doc.setTitle("");
    doc.setAuthor("");
    doc.setSubject("");
    doc.setKeywords([]);
    doc.setCreator("");
    doc.setProducer("");
    doc.catalog.delete(PDFName.of("Metadata"));
  }

  const out = await doc.save({ useObjectStreams: true });
  const smaller = out.length < bytes.length;
  return {
    bytes: smaller ? out : bytes,
    before: bytes.length,
    after: smaller ? out.length : bytes.length,
    imagesFound: images.length,
    imagesRecompressed: recompressed,
    unchanged: !smaller,
  };
}
