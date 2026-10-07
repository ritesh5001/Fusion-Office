import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { fetch } from "expo/fetch";
import { File } from "expo-file-system";
import { readBytes, stem, type PickedFile } from "./files";
import { API_URL } from "./tools";
import { RESIZE_DEFAULTS, resizeOne, resizeProblem } from "./resize";

/**
 * Tools that run natively in the app. Device tools never upload anything;
 * server tools call the same conversion API as the website. Every other tool
 * opens the website's version inside the app (see app/web.tsx).
 */
export interface Output {
  name: string;
  bytes: Uint8Array;
  mimeType: string;
}

export type Choice<V extends string | number> = { value: V; label: string; hint?: string };
export type OptionDef =
  | { key: string; label: string; kind: "choice"; choices: Choice<string | number>[] }
  | { key: string; label: string; kind: "text"; placeholder: string };

export type Progress = (fraction: number) => void;

export interface NativeTool {
  slug: string;
  /** Status line while running, e.g. "Merging PDFs". */
  verb: string;
  runs: "device" | "server";
  minFiles?: number;
  /** What the picker should offer. */
  pick: "pdf" | "image" | "document";
  options: OptionDef[];
  /** A tool with richer settings than `options` draws its own panel (see ToolRunnerScreen). */
  panel?: "resize";
  defaults: Record<string, string | number>;
  /** Why the current options can't run yet, shown on the button; null when ready. */
  validate?: (options: Record<string, string | number>) => string | null;
  run: (files: PickedFile[], options: Record<string, string | number>, progress: Progress) => Promise<Output[]>;
}

const PDF = "application/pdf";
const load = async (f: PickedFile) => PDFDocument.load(await readBytes(f.uri), { ignoreEncryption: true });

/** Any picked photo (HEIC, WebP, PNG…) as JPEG bytes pdf-lib can embed, plus its size. */
async function asJpeg(f: PickedFile, maxSide?: number, quality = 0.92) {
  const ctx = ImageManipulator.manipulate(f.uri);
  let img = await ctx.renderAsync();
  if (maxSide && Math.max(img.width, img.height) > maxSide) {
    ctx.resize(img.width >= img.height ? { width: maxSide } : { height: maxSide });
    img = await ctx.renderAsync();
  }
  const saved = await img.saveAsync({ format: SaveFormat.JPEG, compress: quality });
  return { bytes: await new File(saved.uri).bytes(), width: saved.width, height: saved.height };
}

async function eachFile(files: PickedFile[], progress: Progress, fn: (f: PickedFile) => Promise<Output>) {
  const out: Output[] = [];
  for (const [i, f] of files.entries()) {
    progress(i / files.length);
    out.push(await fn(f));
  }
  return out;
}

export const NATIVE: Record<string, NativeTool> = {
  "merge-pdf": {
    slug: "merge-pdf",
    verb: "Merging PDFs",
    runs: "device",
    minFiles: 2,
    pick: "pdf",
    options: [],
    defaults: {},
    run: async (files, _o, progress) => {
      const out = await PDFDocument.create();
      for (const [i, f] of files.entries()) {
        progress(i / files.length);
        const src = await load(f);
        (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
      }
      return [{ name: "merged.pdf", bytes: await out.save(), mimeType: PDF }];
    },
  },

  "split-pdf": {
    slug: "split-pdf",
    verb: "Splitting PDF",
    runs: "device",
    pick: "pdf",
    options: [{ key: "every", label: "Pages per file", kind: "choice", choices: [{ value: 1, label: "1" }, { value: 2, label: "2" }, { value: 5, label: "5" }, { value: 10, label: "10" }] }],
    defaults: { every: 1 },
    run: async ([f], o, progress) => {
      const src = await load(f);
      const total = src.getPageCount();
      const every = Number(o.every) || 1;
      const out: Output[] = [];
      for (let start = 0; start < total; start += every) {
        progress(start / total);
        const doc = await PDFDocument.create();
        const idx = Array.from({ length: Math.min(every, total - start) }, (_, k) => start + k);
        (await doc.copyPages(src, idx)).forEach((p) => doc.addPage(p));
        const label = idx.length === 1 ? `${start + 1}` : `${start + 1}-${start + idx.length}`;
        out.push({ name: `${stem(f.name)}-pages-${label}.pdf`, bytes: await doc.save(), mimeType: PDF });
      }
      return out;
    },
  },

  "rotate-pdf": {
    slug: "rotate-pdf",
    verb: "Rotating pages",
    runs: "device",
    pick: "pdf",
    options: [{ key: "angle", label: "Rotate", kind: "choice", choices: [{ value: 90, label: "90° right" }, { value: 180, label: "180°" }, { value: 270, label: "90° left" }] }],
    defaults: { angle: 90 },
    run: (files, o, progress) =>
      eachFile(files, progress, async (f) => {
        const doc = await load(f);
        doc.getPages().forEach((p) => p.setRotation(degrees((p.getRotation().angle + Number(o.angle)) % 360)));
        return { name: `${stem(f.name)}-rotated.pdf`, bytes: await doc.save(), mimeType: PDF };
      }),
  },

  "page-numbers": {
    slug: "page-numbers",
    verb: "Numbering pages",
    runs: "device",
    pick: "pdf",
    options: [{ key: "style", label: "Format", kind: "choice", choices: [{ value: "n", label: "1" }, { value: "n-of", label: "1 of 9" }, { value: "page-n", label: "Page 1" }] }],
    defaults: { style: "n-of" },
    run: (files, o, progress) =>
      eachFile(files, progress, async (f) => {
        const doc = await load(f);
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const pages = doc.getPages();
        pages.forEach((p, i) => {
          const text = o.style === "n" ? `${i + 1}` : o.style === "page-n" ? `Page ${i + 1}` : `${i + 1} of ${pages.length}`;
          const { width } = p.getSize();
          const size = 10;
          p.drawText(text, { x: width / 2 - font.widthOfTextAtSize(text, size) / 2, y: 24, size, font, color: rgb(0.3, 0.3, 0.33) });
        });
        return { name: `${stem(f.name)}-numbered.pdf`, bytes: await doc.save(), mimeType: PDF };
      }),
  },

  "watermark-pdf": {
    slug: "watermark-pdf",
    verb: "Adding watermark",
    runs: "device",
    pick: "pdf",
    options: [
      { key: "text", label: "Watermark text", kind: "text", placeholder: "CONFIDENTIAL" },
      { key: "opacity", label: "Strength", kind: "choice", choices: [{ value: 0.12, label: "Light" }, { value: 0.22, label: "Medium" }, { value: 0.35, label: "Strong" }] },
    ],
    defaults: { text: "CONFIDENTIAL", opacity: 0.22 },
    run: (files, o, progress) =>
      eachFile(files, progress, async (f) => {
        const doc = await load(f);
        const font = await doc.embedFont(StandardFonts.HelveticaBold);
        const text = String(o.text || "CONFIDENTIAL");
        for (const p of doc.getPages()) {
          const { width, height } = p.getSize();
          const size = Math.min(width, height) / Math.max(6, text.length * 0.55);
          const w = font.widthOfTextAtSize(text, size);
          p.drawText(text, { x: width / 2 - (w / 2) * Math.cos(Math.PI / 4), y: height / 2 - (w / 2) * Math.sin(Math.PI / 4), size, font, rotate: degrees(45), color: rgb(0.45, 0.45, 0.5), opacity: Number(o.opacity) });
        }
        return { name: `${stem(f.name)}-watermarked.pdf`, bytes: await doc.save(), mimeType: PDF };
      }),
  },

  "jpg-to-pdf": {
    slug: "jpg-to-pdf",
    verb: "Building PDF",
    runs: "device",
    pick: "image",
    options: [{ key: "page", label: "Page size", kind: "choice", choices: [{ value: "fit", label: "Fit photo" }, { value: "a4", label: "A4" }] }],
    defaults: { page: "fit" },
    run: async (files, o, progress) => {
      const doc = await PDFDocument.create();
      for (const [i, f] of files.entries()) {
        progress(i / files.length);
        const img = await asJpeg(f, 2400);
        const embedded = await doc.embedJpg(img.bytes);
        if (o.page === "a4") {
          const [W, H, m] = [595.28, 841.89, 28];
          const s = Math.min((W - 2 * m) / img.width, (H - 2 * m) / img.height);
          const page = doc.addPage([W, H]);
          page.drawImage(embedded, { x: (W - img.width * s) / 2, y: (H - img.height * s) / 2, width: img.width * s, height: img.height * s });
        } else {
          const s = 595.28 / Math.max(img.width, img.height) * 1.4142;
          const page = doc.addPage([img.width * s, img.height * s]);
          page.drawImage(embedded, { x: 0, y: 0, width: img.width * s, height: img.height * s });
        }
      }
      const name = files.length === 1 ? `${stem(files[0].name)}.pdf` : "photos.pdf";
      return [{ name, bytes: await doc.save(), mimeType: PDF }];
    },
  },

  "compress-image": {
    slug: "compress-image",
    verb: "Compressing image",
    runs: "device",
    pick: "image",
    options: [{ key: "level", label: "Compression", kind: "choice", choices: [{ value: "less", label: "Less", hint: "Best quality" }, { value: "recommended", label: "Balanced", hint: "Good quality" }, { value: "extreme", label: "Smallest", hint: "Smallest file" }] }],
    defaults: { level: "recommended" },
    run: (files, o, progress) =>
      eachFile(files, progress, async (f) => {
        const [side, q] = o.level === "less" ? [3000, 0.82] : o.level === "extreme" ? [1600, 0.5] : [2200, 0.68];
        const img = await asJpeg(f, side, q);
        return { name: `${stem(f.name)}-compressed.jpg`, bytes: img.bytes, mimeType: "image/jpeg" };
      }),
  },

  "resize-image": {
    slug: "resize-image",
    verb: "Resizing image",
    runs: "device",
    pick: "image",
    options: [],
    panel: "resize",
    defaults: RESIZE_DEFAULTS,
    validate: resizeProblem,
    run: (files, o, progress) => eachFile(files, progress, (f) => resizeOne(f, o)),
  },

  "convert-image": {
    slug: "convert-image",
    verb: "Converting image",
    runs: "device",
    pick: "image",
    options: [{ key: "format", label: "Convert to", kind: "choice", choices: [{ value: "jpg", label: "JPG" }, { value: "png", label: "PNG" }] }],
    defaults: { format: "jpg" },
    run: (files, o, progress) =>
      eachFile(files, progress, async (f) => {
        const png = o.format === "png";
        const saved = await (await ImageManipulator.manipulate(f.uri).renderAsync()).saveAsync({ format: png ? SaveFormat.PNG : SaveFormat.JPEG, compress: 0.92 });
        return { name: `${stem(f.name)}.${png ? "png" : "jpg"}`, bytes: await new File(saved.uri).bytes(), mimeType: png ? "image/png" : "image/jpeg" };
      }),
  },

  "rotate-image": {
    slug: "rotate-image",
    verb: "Rotating image",
    runs: "device",
    pick: "image",
    options: [{ key: "angle", label: "Rotate", kind: "choice", choices: [{ value: 90, label: "90° right" }, { value: 180, label: "180°" }, { value: 270, label: "90° left" }] }],
    defaults: { angle: 90 },
    run: (files, o, progress) =>
      eachFile(files, progress, async (f) => {
        const saved = await (await ImageManipulator.manipulate(f.uri).rotate(Number(o.angle)).renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
        return { name: `${stem(f.name)}-rotated.jpg`, bytes: await new File(saved.uri).bytes(), mimeType: "image/jpeg" };
      }),
  },
};

/** Word, Excel and PowerPoint to PDF: converted on the Fusion Office server, then deleted there. */
const officeTo = (slug: string, verb: string): NativeTool => ({
  slug,
  verb,
  runs: "server",
  pick: "document",
  options: [],
  defaults: {},
  run: (files, _o, progress) =>
    eachFile(files, progress, async (f) => {
      const res = await fetch(`${API_URL}/api/convert/office`, {
        method: "POST",
        headers: { "content-type": "application/octet-stream", "x-filename": encodeURIComponent(f.name) },
        body: new File(f.uri),
      });
      if (!res.ok) {
        let msg = `The server couldn't convert ${f.name} (${res.status}).`;
        try {
          msg = ((await res.json()) as { error?: string }).error ?? msg;
        } catch {}
        throw new Error(msg);
      }
      return { name: `${stem(f.name)}.pdf`, bytes: await res.bytes(), mimeType: PDF };
    }),
});
NATIVE["word-to-pdf"] = officeTo("word-to-pdf", "Converting to PDF");
NATIVE["excel-to-pdf"] = officeTo("excel-to-pdf", "Converting to PDF");
NATIVE["powerpoint-to-pdf"] = officeTo("powerpoint-to-pdf", "Converting to PDF");
/** CorelDRAW drawings: PDF in the app (PNG, JPG and SVG are on the website version). */
NATIVE["cdr-converter"] = officeTo("cdr-converter", "Converting the drawing");

/** "Scan to PDF" in the app is the camera feeding JPG to PDF. */
NATIVE["scan-to-pdf"] = { ...NATIVE["jpg-to-pdf"], slug: "scan-to-pdf", verb: "Building your scan" };
