"use client";

/**
 * Photo tools added in the third wave: background removal, passport photos
 * with a print sheet, exam and ID upload sizes, ID cards on one page, and
 * the single-purpose converters (HEIC, WEBP, PNG, TIFF).
 */
import { PDF, formatBytes, stem, type ToolFile } from "@/lib/tools/files";
import { FORMAT_INFO, outputName, parseSize, type Format } from "@/lib/image/encode";
import type { Decoded } from "@/lib/image/canvas";
import { EXAM_PRESETS, cropFor, examById, specSize, type PhotoSpec } from "@/lib/tools/photoPresets";
import type { LoadedFile, ToolSpec } from "./ToolRunner";
import { ColorField, NumberField, Segmented, Select, Slider, TextInput, Toggle } from "./controls";
import { TargetSize, eachImage } from "./imageSpecs";

const canvasLib = () => import("@/lib/image/canvas");
const presets = () => import("@/lib/tools/photoPresets");

const Note = ({ children }: { children: React.ReactNode }) => <p className="text-[12px] leading-relaxed text-fg-muted">{children}</p>;
const Warn = ({ children }: { children: React.ReactNode }) => <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[12px] leading-relaxed text-amber-200">{children}</p>;

/** Live preview of what a frame keeps from the first picture. */
function FramePreview({ file, ratio, zoom, panX, panY, face, background }: { file?: LoadedFile; ratio: number; zoom: number; panX: number; panY: number; face?: boolean; background?: string }) {
  if (!file?.thumb || !file.width || !file.height) return null;
  const r = cropFor({ width: file.width, height: file.height }, ratio, zoom, panX, panY);
  return (
    <div className="flex justify-center rounded-xl bg-sunken p-3 ring-1 ring-line">
      <div className="relative overflow-hidden rounded-[3px] shadow-[0_6px_18px_-6px_rgb(0_0_0/0.7)]" style={{ aspectRatio: String(ratio), width: ratio >= 1 ? 200 : Math.round(170 * ratio) + 30, background: background ?? "#fff" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={file.thumb} alt="Preview of the cropped photo" className="absolute max-w-none" style={{ width: `${100 / r.w}%`, height: `${100 / r.h}%`, left: `${(-r.x / r.w) * 100}%`, top: `${(-r.y / r.h) * 100}%` }} />
        {face && <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[9%] h-[62%] w-[58%] -translate-x-1/2 rounded-[50%] border border-dashed border-white/80 mix-blend-difference" />}
      </div>
    </div>
  );
}

type Framing = { zoom: number; panX: number; panY: number };
function FramingControls({ o, set }: { o: Framing; set: (p: Partial<Framing>) => void }) {
  return (
    <>
      <Slider label="Zoom" value={Math.round(o.zoom * 100)} min={100} max={300} onChange={(v) => set({ zoom: v / 100 })} format={(v) => `${v}%`} />
      <Slider label="Move left / right" value={Math.round(o.panX * 100)} min={-100} max={100} onChange={(v) => set({ panX: v / 100 })} format={() => ""} />
      <Slider label="Move up / down" value={Math.round(o.panY * 100)} min={-100} max={100} onChange={(v) => set({ panY: v / 100 })} format={() => ""} />
    </>
  );
}

/** Crop the picture to a frame of `ratio` using the framing sliders. */
async function framed(img: Decoded, ratio: number, f: Framing) {
  const { render, EMPTY_EDIT, NO_TRANSFORM } = await canvasLib();
  return render(img, { ...EMPTY_EDIT, transform: { ...NO_TRANSFORM, crop: cropFor(img, ratio, f.zoom, f.panX, f.panY) } });
}

// ─── Remove background ──────────────────────────────────────────────

type BgOpts = { tolerance: number; feather: number; fill: "transparent" | "white" | "color"; color: string };
const BG_NOTE = "Works on plain backgrounds: a wall, a sheet of paper, a studio backdrop or a flat colour. A busy background (a street, a room) needs a photo taken against a wall.";

const removeBg: ToolSpec<BgOpts> = {
  action: "Remove background",
  defaults: { tolerance: 35, feather: 1, fill: "transparent", color: "#3b82f6" },
  Options: ({ options: o, set }) => (
    <>
      <Segmented
        label="New background"
        value={o.fill}
        onChange={(fill) => set({ fill })}
        options={[
          { value: "transparent", label: "Transparent", hint: "PNG" },
          { value: "white", label: "White" },
          { value: "color", label: "A colour" },
        ]}
      />
      {o.fill === "color" && <ColorField label="Background colour" value={o.color} onChange={(color) => set({ color })} />}
      <Slider label="How much to remove" value={o.tolerance} min={5} max={90} onChange={(tolerance) => set({ tolerance })} format={(v) => (v < 25 ? "Careful" : v < 55 ? "Normal" : "Aggressive")} />
      <Slider label="Edge softness" value={o.feather} min={0} max={4} onChange={(feather) => set({ feather })} format={(v) => (v === 0 ? "Crisp" : `${v} px`)} />
      <Note>{BG_NOTE}</Note>
      <Note>If part of the subject disappears, lower “How much to remove”. If a halo of the old background stays, raise it.</Note>
    </>
  ),
  run: async (files, o, progress) => {
    const { render, exportCanvas, EMPTY_EDIT } = await canvasLib();
    const { cutOut } = await import("@/lib/image/background");
    return eachImage(files, progress, async (img, f) => {
      const fill = o.fill === "transparent" ? null : o.fill === "white" ? "#ffffff" : o.color;
      const cut = cutOut(render(img, EMPTY_EDIT), { tolerance: o.tolerance, feather: o.feather, fill });
      const format: Format = fill ? "jpeg" : "png";
      const r = await exportCanvas(cut.canvas, outputName(f.name, format, "no-background"), { format, quality: 0.92, background: fill ?? "#ffffff" });
      const share = Math.round(cut.removed * 100);
      return { ...r, note: share < 3 ? "Almost nothing was removed. This photo's background isn't one plain colour, or the subject touches every edge." : share > 97 ? "Nearly everything was removed. Lower “How much to remove” and try again." : `${share}% of the picture was background.` };
    });
  },
};

// ─── Passport photo ─────────────────────────────────────────────────

const PASSPORT_SIZES = [
  { id: "35x45", label: "35 × 45 mm", hint: "India, UK, EU, most forms", w: 35, h: 45 },
  { id: "51x51", label: "2 × 2 inch", hint: "US visa, OCI", w: 50.8, h: 50.8 },
  { id: "25x35", label: "25 × 35 mm", hint: "PAN, stamp size", w: 25, h: 35 },
  { id: "custom", label: "Custom", hint: "Your own size", w: 35, h: 45 },
] as const;

type PassportOpts = Framing & {
  size: (typeof PASSPORT_SIZES)[number]["id"];
  w: number;
  h: number;
  bg: "keep" | "white" | "blue" | "color";
  color: string;
  tolerance: number;
  sheet: "none" | "a4" | "4x6";
  copies: number;
  limit: boolean;
  target: string;
};
const PASSPORT_DPI = 300;
const BG_FILL = { white: "#ffffff", blue: "#cfe3fb" } as const;

const passportPhoto: ToolSpec<PassportOpts> = {
  action: "Make passport photo",
  defaults: { size: "35x45", w: 35, h: 45, bg: "keep", color: "#ffffff", tolerance: 35, sheet: "a4", copies: 8, limit: false, target: "50", zoom: 1, panX: 0, panY: -0.2 },
  Options: ({ options: o, set, files }) => (
    <>
      <FramePreview file={files[0]} ratio={o.w / o.h} zoom={o.zoom} panX={o.panX} panY={o.panY} face />
      <Note>Line the face up with the dashed oval: head centred, with a little space above the hair.</Note>
      <FramingControls o={o} set={set} />
      <Select
        label="Photo size"
        value={o.size}
        onChange={(size) => {
          const s = PASSPORT_SIZES.find((x) => x.id === size)!;
          set(size === "custom" ? { size } : { size, w: s.w, h: s.h });
        }}
        options={PASSPORT_SIZES.map((s) => ({ value: s.id, label: `${s.label} · ${s.hint}` }))}
      />
      {o.size === "custom" && (
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Width" value={o.w} min={10} max={150} suffix="mm" onChange={(w) => set({ w })} />
          <NumberField label="Height" value={o.h} min={10} max={150} suffix="mm" onChange={(h) => set({ h })} />
        </div>
      )}
      <Segmented
        label="Background"
        value={o.bg}
        onChange={(bg) => set({ bg })}
        options={[
          { value: "keep", label: "Keep" },
          { value: "white", label: "White" },
          { value: "blue", label: "Light blue" },
        ]}
      />
      {o.bg !== "keep" && (
        <>
          <Slider label="How much to remove" value={o.tolerance} min={5} max={90} onChange={(tolerance) => set({ tolerance })} format={(v) => (v < 25 ? "Careful" : v < 55 ? "Normal" : "Aggressive")} />
          <Note>Stand in front of a plain wall, with light on your face and no shadow behind you. A busy background can&apos;t be replaced.</Note>
        </>
      )}
      <Segmented
        label="Print sheet"
        value={o.sheet}
        onChange={(sheet) => set({ sheet })}
        options={[
          { value: "a4", label: "A4 page", hint: "PDF, home printer" },
          { value: "4x6", label: "4 × 6 inch", hint: "JPG, photo lab" },
          { value: "none", label: "No sheet", hint: "Just the photo" },
        ]}
      />
      {o.sheet !== "none" && <NumberField label="Copies on the sheet" value={o.copies} min={1} max={40} onChange={(copies) => set({ copies })} />}
      <Toggle label="Limit the photo's file size" hint="For online forms that need, say, under 50 KB." checked={o.limit} onChange={(limit) => set({ limit })} />
      {o.limit && <TargetSize label="Maximum size" value={o.target} onChange={(target) => set({ target })} />}
    </>
  ),
  validate: (_f, o) => (!(o.w >= 10 && o.h >= 10) ? "Enter the photo's width and height in millimetres." : o.limit && !parseSize(o.target) ? "Enter a size, like 50 (KB)." : null),
  run: async ([f], o, progress) => {
    const { decodeImage, exportCanvas, resize, newCanvas } = await canvasLib();
    const p = await presets();
    progress("Cropping…", 0.1);
    const img = await decodeImage(f);
    try {
      const px = { width: Math.round((o.w / 25.4) * PASSPORT_DPI), height: Math.round((o.h / 25.4) * PASSPORT_DPI) };
      let canvas = await framed(img, o.w / o.h, o);
      let note = "";
      if (o.bg !== "keep") {
        progress("Replacing the background…", 0.4);
        const { cutOut } = await import("@/lib/image/background");
        const cut = cutOut(canvas, { tolerance: o.tolerance, feather: 1, fill: o.bg === "color" ? o.color : BG_FILL[o.bg] });
        canvas = cut.canvas;
        if (cut.removed < 0.05) note = " The background wasn't one plain colour, so little of it could be replaced.";
      }
      canvas = resize(canvas, px, "stretch");
      const photo = await exportCanvas(canvas, outputName(f.name, "jpeg", "passport-photo"), { format: "jpeg", quality: 0.95, maxBytes: o.limit ? parseSize(o.target) : null, dpi: PASSPORT_DPI, background: "#ffffff" });
      const files: ToolFile[] = [photo];
      let sheetNote = "";
      if (o.sheet === "a4") {
        progress("Laying out the print sheet…", 0.8);
        const print = await exportCanvas(canvas, "p.jpg", { format: "jpeg", quality: 0.95, background: "#ffffff" });
        const sheet = await p.photoSheetPdf(print.bytes, { width: o.w, height: o.h }, o.copies);
        files.push({ name: `${stem(f.name)}-passport-sheet-a4.pdf`, bytes: sheet.bytes, type: PDF });
        sheetNote = ` ${sheet.count} on an A4 page: print at 100% (“actual size”) and cut along the lines.`;
      } else if (o.sheet === "4x6") {
        progress("Laying out the print sheet…", 0.8);
        const sheet = newCanvas(4 * PASSPORT_DPI, 6 * PASSPORT_DPI);
        const c = sheet.getContext("2d")!;
        c.fillStyle = "#ffffff";
        c.fillRect(0, 0, sheet.width, sheet.height);
        const slots = p.sheetLayout({ width: sheet.width, height: sheet.height }, px, 30, 45, o.copies);
        if (!slots.length) throw new Error("That photo size doesn't fit on a 4 × 6 inch print. Choose the A4 page.");
        c.strokeStyle = "#b5b5b5";
        c.lineWidth = 1;
        for (const s of slots) {
          c.drawImage(canvas, s.x, s.y, s.w, s.h);
          c.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
        }
        const out = await exportCanvas(sheet, `${stem(f.name)}-passport-sheet-4x6.jpg`, { format: "jpeg", quality: 0.95, dpi: PASSPORT_DPI });
        files.push(out);
        sheetNote = ` ${slots.length} on a 4 × 6 inch sheet: ask the lab to print it without resizing.`;
      }
      return {
        files,
        summary: `${o.w} × ${o.h} mm photo, ${photo.width} × ${photo.height} px, ${formatBytes(photo.bytes.length)}.${!photo.fits ? " It couldn't be made that small without losing too much detail." : ""}${sheetNote}${note}`,
      };
    } finally {
      img.close();
    }
  },
};

// ─── Exam and ID photo sizes ────────────────────────────────────────

type ExamOpts = Framing & { exam: string; item: number; width: number; height: number; maxSide: number; minKB: number; maxKB: number; dpi: number };
const fromSpec = (s: PhotoSpec) => ({ width: s.width, height: s.height, maxSide: s.maxSide ?? 0, minKB: s.minKB ?? 0, maxKB: s.maxKB, dpi: s.dpi ?? 0 });
const FIRST = EXAM_PRESETS[0];
/** Signatures and declarations are kept whole on white; photos and thumb prints fill the frame. */
const keepsWhole = (kind: PhotoSpec["kind"]) => kind === "signature" || kind === "declaration";

const examPhoto: ToolSpec<ExamOpts> = {
  action: "Resize for the form",
  defaults: { exam: FIRST.id, item: 0, ...fromSpec(FIRST.items[0]), zoom: 1, panX: 0, panY: 0 },
  Options: ({ options: o, set, files }) => {
    const exam = examById(o.exam) ?? FIRST;
    const spec = exam.items[o.item] ?? exam.items[0];
    const fixed = o.width > 0 && o.height > 0;
    return (
      <>
        <Select
          label="Form"
          value={o.exam}
          onChange={(id) => {
            const e = examById(id) ?? FIRST;
            set({ exam: id, item: 0, ...fromSpec(e.items[0]), zoom: 1, panX: 0, panY: 0 });
          }}
          options={EXAM_PRESETS.map((e) => ({ value: e.id, label: e.label, group: e.group }))}
        />
        {exam.items.length > 1 && (
          <Select label="Upload" value={String(o.item)} onChange={(i) => set({ item: Number(i), ...fromSpec(exam.items[Number(i)]), zoom: 1, panX: 0, panY: 0 })} options={exam.items.map((it, i) => ({ value: String(i), label: it.label }))} />
        )}
        {(exam.note || spec.note) && <Warn>{[exam.note, spec.note].filter(Boolean).join(" ")}</Warn>}
        {fixed && !keepsWhole(spec.kind) && (
          <>
            <FramePreview file={files[0]} ratio={o.width / o.height} zoom={o.zoom} panX={o.panX} panY={o.panY} face={spec.kind === "photo"} />
            <FramingControls o={o} set={set} />
          </>
        )}
        {keepsWhole(spec.kind) && <Note>The whole image is kept and white is added around it to match the shape. Crop it close to the ink first for the best result.</Note>}
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Width" value={o.width} min={0} max={6000} suffix="px" onChange={(width) => set({ width })} />
          <NumberField label="Height" value={o.height} min={0} max={6000} suffix="px" onChange={(height) => set({ height })} />
          <NumberField label="At least" value={o.minKB} min={0} max={5000} suffix="KB" onChange={(minKB) => set({ minKB })} />
          <NumberField label="At most" value={o.maxKB} min={1} max={5000} suffix="KB" onChange={(maxKB) => set({ maxKB })} />
        </div>
        {!fixed && <Note>No fixed pixel size for this upload: the picture keeps its shape{o.maxSide ? ` and is limited to ${o.maxSide} px on its longer side` : ""}. Type a width and height to force one.</Note>}
        <Note>These are the sizes from recent official notices. Each notice can change them, so compare with yours and edit the numbers above if they differ. The result is a JPG.</Note>
      </>
    );
  },
  validate: (_f, o) => (!(o.maxKB >= 1) ? "Enter the largest file size the form accepts." : o.minKB >= o.maxKB ? "The smallest size must be below the largest." : (o.width > 0) !== (o.height > 0) ? "Enter both a width and a height, or leave both at 0." : null),
  run: async (files, o, progress) => {
    const { render, resize, exportCanvas, EMPTY_EDIT } = await canvasLib();
    const { padJpeg } = await presets();
    const exam = examById(o.exam) ?? FIRST;
    const spec = exam.items[o.item] ?? exam.items[0];
    const slug = `${exam.id}-${spec.kind}`;
    return eachImage(files, progress, async (img, f) => {
      const size = specSize({ width: o.width, height: o.height, maxSide: o.maxSide || undefined }, img);
      const fixed = o.width > 0 && o.height > 0;
      const canvas = !fixed ? resize(render(img, EMPTY_EDIT), size, "stretch") : keepsWhole(spec.kind) ? render(img, EMPTY_EDIT, { size, fit: "contain", background: "#ffffff" }) : resize(await framed(img, o.width / o.height, o), size, "stretch");
      const r = await exportCanvas(canvas, outputName(f.name, "jpeg", slug), { format: "jpeg", quality: 0.95, maxBytes: o.maxKB * 1024, dpi: o.dpi || null, background: "#ffffff" });
      // Forms that reject files below a size look only at the byte count.
      const bytes = o.minKB ? padJpeg(r.bytes, o.minKB * 1024 + 64) : r.bytes;
      const kb = (bytes.length / 1024).toFixed(1);
      const shrunk = r.width !== size.width || r.height !== size.height;
      const range = o.minKB ? `${o.minKB}–${o.maxKB} KB` : `under ${o.maxKB} KB`;
      return {
        ...r,
        bytes,
        note: !r.fits
          ? `Couldn't get under ${o.maxKB} KB at this pixel size; this is the smallest version (${kb} KB).`
          : shrunk
            ? `${kb} KB, but the pixel size had to drop to ${r.width} × ${r.height} to fit under ${o.maxKB} KB.`
            : `${r.width} × ${r.height} px, ${kb} KB: within ${range}.`,
      };
    });
  },
};

// ─── ID card on one page ────────────────────────────────────────────

type IdOpts = { size: "card" | "large"; border: boolean; turn: boolean; gray: boolean; caption: string };
const idCard: ToolSpec<IdOpts> = {
  action: "Make one-page PDF",
  defaults: { size: "card", border: true, turn: true, gray: false, caption: "" },
  reorderable: true,
  Options: ({ options: o, set, files }) => (
    <>
      <Note>
        {files.length === 1 ? "Add the back of the card too (use “Add more files”) to put both sides on one page." : `${files.length} images, top to bottom in the order shown. Use the arrows to put the front first.`}
      </Note>
      <Segmented label="Print size" value={o.size} onChange={(size) => set({ size })} options={[{ value: "card", label: "Real card size", hint: "85.6 × 54 mm" }, { value: "large", label: "Larger", hint: "Easier to read" }]} />
      <Toggle label="Turn upright photos sideways" hint="Cards photographed in portrait are rotated to fit." checked={o.turn} onChange={(turn) => set({ turn })} />
      <Toggle label="Thin border around each side" checked={o.border} onChange={(border) => set({ border })} />
      <Toggle label="Black and white" hint="Like a photocopy; smaller file." checked={o.gray} onChange={(gray) => set({ gray })} />
      <TextInput label="Line under the card (optional)" hint="For example what the copy is for: “For bank KYC only, 12 Nov 2026”." value={o.caption} onChange={(caption) => set({ caption })} />
      <Note>Crop each photo close to the card first (Crop image) so the card fills its box. Writing what the copy is for on it helps stop it being reused.</Note>
    </>
  ),
  run: async (files, o, progress) => {
    const { decodeImage, render, rotateTransform, encodeCanvas, EMPTY_EDIT, NO_TRANSFORM } = await canvasLib();
    const { NO_ADJUSTMENTS } = await import("@/lib/image/pixels");
    const { idCardPdf } = await presets();
    const images: { bytes: Uint8Array; kind: "jpg" }[] = [];
    for (const [i, f] of files.entries()) {
      progress(`Preparing image ${i + 1} of ${files.length}…`, i / files.length);
      const img = await decodeImage(f);
      try {
        const transform = o.turn && img.height > img.width * 1.1 ? rotateTransform(NO_TRANSFORM, false) : NO_TRANSFORM;
        const canvas = render(img, { ...EMPTY_EDIT, transform, adjust: o.gray ? { ...NO_ADJUSTMENTS, saturation: -100 } : NO_ADJUSTMENTS }, { maxSide: 2000 });
        images.push({ bytes: await encodeCanvas((await canvasLib()).flatten(canvas), "jpeg", 0.9), kind: "jpg" });
      } finally {
        img.close();
      }
    }
    progress("Building the page…", 0.95);
    const bytes = await idCardPdf(images, o);
    return { files: [{ name: `${stem(files[0].name)}-id-card.pdf`, bytes, type: PDF }], summary: `${files.length} side${files.length === 1 ? "" : "s"} on one A4 page, ${formatBytes(bytes.length)}. Print at 100% for the true card size.` };
  },
};

// ─── Single-purpose converters ──────────────────────────────────────

type FixedOpts = { quality: number; background: string };
const convertTo = (format: Format, from: string): ToolSpec<FixedOpts> => ({
  action: `Convert to ${FORMAT_INFO[format].label}`,
  defaults: { quality: 92, background: "#ffffff" },
  Options: ({ options: o, set }) => (
    <>
      {FORMAT_INFO[format].lossy && <Slider label="Quality" value={o.quality} onChange={(quality) => set({ quality })} min={40} max={100} format={(v) => `${v}%`} />}
      {format === "jpeg" && from !== "HEIC" && <ColorField label="Fill transparent areas with" value={o.background} onChange={(background) => set({ background })} />}
      <Note>
        {from === "HEIC"
          ? "iPhone photos (HEIC / HEIF) are decoded on your device, in any browser. The first HEIC photo takes a few seconds longer while the decoder loads."
          : format === "png"
            ? "PNG keeps every pixel exactly (lossless), so files are larger than JPG."
            : `Converts ${from} images on your device. Nothing is uploaded.`}
      </Note>
    </>
  ),
  run: async (files, o, progress) => {
    const { render, exportCanvas, EMPTY_EDIT } = await canvasLib();
    return eachImage(files, progress, async (img, f) => exportCanvas(render(img, EMPTY_EDIT), outputName(f.name, format), { format, quality: o.quality / 100, background: o.background }));
  },
});

type HeicPdfOpts = { pageSize: "fit" | "a4" | "letter"; orientation: "auto" | "portrait" | "landscape"; margin: number };
const heicToPdf: ToolSpec<HeicPdfOpts> = {
  action: "Convert to PDF",
  defaults: { pageSize: "a4", orientation: "auto", margin: 0 },
  reorderable: true,
  Options: ({ options: o, set }) => (
    <>
      <Segmented label="Page size" value={o.pageSize} onChange={(pageSize) => set({ pageSize })} options={[{ value: "fit", label: "Same as photo" }, { value: "a4", label: "A4" }, { value: "letter", label: "Letter" }]} />
      {o.pageSize !== "fit" && <Segmented label="Orientation" value={o.orientation} onChange={(orientation) => set({ orientation })} options={[{ value: "auto", label: "Auto" }, { value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }]} />}
      <Segmented label="Margin" value={o.margin} onChange={(margin) => set({ margin })} options={[{ value: 0, label: "None" }, { value: 20, label: "Small" }, { value: 48, label: "Big" }]} />
      <Note>One photo per page, in the order shown. HEIC photos are decoded on your device.</Note>
    </>
  ),
  run: async (files, o, progress) => {
    const { decodeImage, render, encodeCanvas, flatten, EMPTY_EDIT } = await canvasLib();
    const jpgs: ToolFile[] = [];
    for (const [i, f] of files.entries()) {
      progress(`Reading photo ${i + 1} of ${files.length}…`, i / files.length);
      const img = await decodeImage(f);
      try {
        jpgs.push({ name: f.name, bytes: await encodeCanvas(flatten(render(img, EMPTY_EDIT, { maxSide: 3000 })), "jpeg", 0.9), type: "image/jpeg" });
      } finally {
        img.close();
      }
    }
    progress("Building PDF…", 0.95);
    const { imagesToPdf } = await import("@/lib/tools/processors/images");
    const bytes = await imagesToPdf(jpgs, o);
    return { files: [{ name: files.length === 1 ? `${stem(files[0].name)}.pdf` : "photos.pdf", bytes, type: PDF }], summary: `${files.length} photo${files.length === 1 ? "" : "s"} → 1 PDF.` };
  },
};

export const PHOTO_SPECS = {
  "remove-background": removeBg,
  "passport-photo-maker": passportPhoto,
  "exam-photo-resizer": examPhoto,
  "id-card-to-pdf": idCard,
  "heic-to-jpg": convertTo("jpeg", "HEIC"),
  "heic-to-pdf": heicToPdf,
  "webp-to-jpg": convertTo("jpeg", "WEBP"),
  "png-to-jpg": convertTo("jpeg", "PNG"),
  "jpg-to-png": convertTo("png", "JPG"),
  "tiff-to-jpg": convertTo("jpeg", "TIFF"),
};
