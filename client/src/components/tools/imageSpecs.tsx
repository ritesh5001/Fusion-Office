"use client";

import { formatBytes } from "@/lib/tools/files";
import { FORMAT_INFO, formatFor, outputName, parseSize, type Format } from "@/lib/image/encode";
import { fromPixels, resizeDims, toPixels, type Fit, type ResizeSpec, type Unit } from "@/lib/image/geometry";
import type { Decoded, Exported, Transform } from "@/lib/image/canvas";
import type { LoadedFile, ProgressFn, ToolSpec } from "./ToolRunner";
import { ColorField, NumberField, Segmented, Slider, TextInput, Toggle } from "./controls";
import { cn } from "../ui/primitives";

// Image code loads only when a tool runs.
const canvasLib = () => import("@/lib/image/canvas");

type OutFormat = "keep" | Format;
const resolveFormat = (f: LoadedFile, o: OutFormat): Format => (o === "keep" ? formatFor(f.type) : o);

interface Row {
  name: string;
  before: number;
  after: number;
  from: string;
  to: string;
  note?: string;
}

/** Decode each image, run `fn`, and collect results plus a before/after summary. */
async function eachImage(files: LoadedFile[], progress: ProgressFn, fn: (img: Decoded, f: LoadedFile) => Promise<Exported & { note?: string }>) {
  const { decodeImage } = await canvasLib();
  const out: Exported[] = [];
  const rows: Row[] = [];
  for (const [i, f] of files.entries()) {
    progress(files.length > 1 ? `Image ${i + 1} of ${files.length}…` : "Processing…", i / files.length);
    const img = await decodeImage(f);
    try {
      const r = await fn(img, f);
      out.push(r);
      rows.push({ name: r.name, before: f.bytes.length, after: r.bytes.length, from: `${img.width} × ${img.height}`, to: `${r.width} × ${r.height}`, note: r.note });
    } finally {
      img.close();
    }
  }
  return { files: out, summary: <SizeSummary rows={rows} /> };
}

function SizeSummary({ rows }: { rows: Row[] }) {
  const before = rows.reduce((n, r) => n + r.before, 0);
  const after = rows.reduce((n, r) => n + r.after, 0);
  const change = Math.round((1 - after / before) * 100);
  return (
    <div className="space-y-1.5">
      <p>
        {formatBytes(before)} → <span className="font-medium text-ink">{formatBytes(after)}</span>
        {change > 0 ? ` (${change}% smaller)` : change < 0 ? ` (${-change}% larger)` : ""}
        {rows.length === 1 && rows[0].from !== rows[0].to ? ` · ${rows[0].from} → ${rows[0].to} px` : rows.length === 1 ? ` · ${rows[0].to} px` : ""}
      </p>
      {rows.filter((r) => r.note).map((r) => (
        <p key={r.name} className="text-[13px]">
          {rows.length > 1 ? `${r.name}: ` : ""}
          {r.note}
        </p>
      ))}
    </div>
  );
}

const FORMAT_OPTIONS = (keepLabel = "Same as original") => [
  { value: "keep" as const, label: "Keep", hint: keepLabel },
  { value: "jpeg" as const, label: "JPG", hint: "Photos, smallest" },
  { value: "png" as const, label: "PNG", hint: "Sharp graphics, transparency" },
  { value: "webp" as const, label: "WEBP", hint: "Small, modern" },
];

/** Target file size input with quick picks. */
export function TargetSize({ value, onChange, label = "Target size" }: { value: string; onChange: (v: string) => void; label?: string }) {
  const bytes = parseSize(value);
  return (
    <div className="space-y-2">
      <TextInput label={label} hint="In KB (e.g. 50) or MB (e.g. 1.5 MB). The file will be this size or smaller." value={value} onChange={onChange} placeholder="50" />
      <div className="flex flex-wrap gap-1.5">
        {["20", "50", "100", "200", "500", "1 MB"].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn("h-7 rounded-full px-2.5 text-[12px] ring-1", parseSize(p) === bytes ? "bg-brand-50 font-medium text-brand-700 ring-brand-500" : "bg-white ring-rule hover:ring-rule-strong")}
          >
            {/mb/i.test(p) ? p : `${p} KB`}
          </button>
        ))}
      </div>
      {value && !bytes && <p className="text-[12px] text-red-700">Enter a size of at least 1 KB, like 50 or 1.5 MB.</p>}
    </div>
  );
}

const needTarget = (target: string) => (parseSize(target) ? null : "Enter a target size, like 50 (KB) or 1.5 MB.");

// ─── Compress ───────────────────────────────────────────────────────

type CompressOpts = { mode: "quality" | "size"; level: "light" | "recommended" | "strong"; target: string; format: OutFormat };
const LEVELS = { light: { quality: 0.85, maxSide: 0 }, recommended: { quality: 0.72, maxSide: 3840 }, strong: { quality: 0.55, maxSide: 2048 } };

const compressImage: ToolSpec<CompressOpts> = {
  action: "Compress",
  defaults: { mode: "quality", level: "recommended", target: "100", format: "keep" },
  Options: ({ options: o, set, files }) => (
    <>
      <Segmented
        label="Compress by"
        value={o.mode}
        onChange={(mode) => set({ mode })}
        options={[
          { value: "quality", label: "Quality", hint: "Pick how much" },
          { value: "size", label: "File size", hint: "Fit under a size" },
        ]}
      />
      {o.mode === "quality" ? (
        <Segmented
          label="Level"
          value={o.level}
          onChange={(level) => set({ level })}
          options={[
            { value: "light", label: "Light", hint: "Best quality" },
            { value: "recommended", label: "Recommended", hint: "Good balance" },
            { value: "strong", label: "Strong", hint: "Smallest, max 2048 px" },
          ]}
        />
      ) : (
        <TargetSize value={o.target} onChange={(target) => set({ target })} />
      )}
      <Segmented label="Save as" value={o.format} onChange={(format) => set({ format })} options={FORMAT_OPTIONS()} />
      {files.some((f) => resolveFormat(f, o.format) === "png") && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
          PNG is lossless, so PNG files get smaller only by shrinking their dimensions. Choose JPG or WEBP for much smaller photos.
        </p>
      )}
    </>
  ),
  validate: (_f, o) => (o.mode === "size" ? needTarget(o.target) : null),
  run: async (files, o, progress) => {
    const { render, exportCanvas, EMPTY_EDIT } = await canvasLib();
    return eachImage(files, progress, async (img, f) => {
      const format = resolveFormat(f, o.format);
      const sameFormat = format === formatFor(f.type) && FORMAT_INFO[format].mime === f.type;
      const name = outputName(f.name, format, "compressed");
      const maxBytes = o.mode === "size" ? parseSize(o.target) : null;
      if (maxBytes && sameFormat && f.bytes.length <= maxBytes)
        return { name, bytes: f.bytes, type: f.type, width: img.width, height: img.height, quality: 1, fits: true, note: "Already under the target size, so it was kept as it is." };
      const cap = o.mode === "quality" ? LEVELS[o.level].maxSide : 0;
      const big = Math.max(img.width, img.height);
      const size = cap && big > cap ? resizeDims(img, { mode: "percent", percent: (cap / big) * 100 }) : undefined;
      const canvas = render(img, EMPTY_EDIT, { size });
      const r = await exportCanvas(canvas, name, { format, quality: LEVELS[o.level].quality, maxBytes });
      if (!r.fits) return { ...r, note: `Couldn't get below ${formatBytes(maxBytes!)} without making it unusably small; this is the smallest version.` };
      if (!maxBytes && sameFormat && !size && r.bytes.length >= f.bytes.length)
        return { ...r, bytes: f.bytes, width: img.width, height: img.height, note: "This image is already well compressed, so the original was kept. Try Strong, or save as WEBP." };
      const shrunk = r.width !== img.width;
      return { ...r, note: shrunk && maxBytes ? `Dimensions were reduced to ${r.width} × ${r.height} to reach the size.` : undefined };
    });
  },
};

// ─── Resize ─────────────────────────────────────────────────────────

type ResizeOpts = {
  mode: "percent" | "pixels" | "print";
  percent: number;
  width: number;
  height: number;
  keepRatio: boolean;
  fit: Fit;
  unit: Exclude<Unit, "px">;
  dpi: number;
  limit: boolean;
  target: string;
  format: OutFormat;
  background: string;
};

const PRINT_PRESETS: { label: string; width: number; height: number; unit: Exclude<Unit, "px"> }[] = [
  { label: "Passport photo · 3.5 × 4.5 cm", width: 3.5, height: 4.5, unit: "cm" },
  { label: "Signature · 3.5 × 1.5 cm", width: 3.5, height: 1.5, unit: "cm" },
  { label: "Stamp size · 2 × 2.5 cm", width: 2, height: 2.5, unit: "cm" },
  { label: "US visa · 2 × 2 in", width: 2, height: 2, unit: "in" },
];

const PIXEL_PRESETS = [
  { label: "Square 1080", width: 1080, height: 1080 },
  { label: "Full HD 1920 × 1080", width: 1920, height: 1080 },
  { label: "HD 1280 × 720", width: 1280, height: 720 },
  { label: "Story 1080 × 1920", width: 1080, height: 1920 },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

/** An image side (px) expressed in the unit of a resize mode. */
const current = (px: number, mode: ResizeOpts["mode"], unit: ResizeOpts["unit"], dpi: number) => (mode === "pixels" ? px : round2(fromPixels(px, unit, dpi)));

/** Convert a length between cm, mm and inches (via inches: 1 "pixel" per inch). */
const convertUnit = (v: number, from: ResizeOpts["unit"], to: ResizeOpts["unit"]) => (v ? round2(fromPixels(toPixels(v, from, 1_000_000) / 1_000_000, to, 1)) : v);

function resizeSpec(o: ResizeOpts): ResizeSpec {
  if (o.mode === "percent") return { mode: "percent", percent: o.percent };
  if (o.mode === "pixels") return { mode: "pixels", width: o.width, height: o.height, keepRatio: o.keepRatio };
  return { mode: "print", width: o.width, height: o.height, unit: o.unit, dpi: o.dpi, keepRatio: o.keepRatio };
}

export function Chips<T>({ items, label, onPick }: { items: T[]; label: (t: T) => string; onPick: (t: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <button key={label(t)} type="button" onClick={() => onPick(t)} className="h-7 rounded-full bg-white px-2.5 text-[12px] ring-1 ring-rule hover:ring-brand-500">
          {label(t)}
        </button>
      ))}
    </div>
  );
}

const resizeImage: ToolSpec<ResizeOpts> = {
  action: "Resize",
  defaults: { mode: "percent", percent: 50, width: 0, height: 0, keepRatio: true, fit: "fill", unit: "cm", dpi: 300, limit: false, target: "50", format: "keep", background: "#ffffff" },
  Options: ({ options: o, set, files }) => {
    const first = files.find((f) => f.width);
    const ratio = first ? first.width! / first.height! : 0;
    // With the ratio locked, typing one side fills in the other (from the first image).
    const setSide = (side: "width" | "height", v: number) => {
      if (!o.keepRatio || !ratio || !v) return set({ [side]: v } as Partial<ResizeOpts>);
      const other = side === "width" ? v / ratio : v * ratio;
      const round = (n: number) => (o.mode === "pixels" ? Math.round(n) : Math.round(n * 100) / 100);
      set(side === "width" ? { width: v, height: round(other) } : { height: v, width: round(other) });
    };
    const out = first ? resizeDims({ width: first.width!, height: first.height! }, resizeSpec(o)) : null;
    const unit = o.mode === "pixels" ? "px" : o.unit;
    return (
      <>
        <Segmented
          label="Resize by"
          value={o.mode}
          onChange={(mode) =>
            // Start from the image's current size, in the new mode's unit.
            set(first && mode !== "percent" ? { mode, width: current(first.width!, mode, o.unit, o.dpi), height: current(first.height!, mode, o.unit, o.dpi) } : { mode })
          }
          options={[
            { value: "percent", label: "Percent" },
            { value: "pixels", label: "Pixels" },
            { value: "print", label: "Print size", hint: "cm, mm, inches" },
          ]}
        />
        {o.mode === "percent" ? (
          <>
            <Slider label="Size" value={o.percent} onChange={(percent) => set({ percent })} min={1} max={200} format={(v) => `${v}%`} />
            <Chips items={[10, 25, 50, 75]} label={(p) => `${p}%`} onPick={(percent) => set({ percent })} />
          </>
        ) : (
          <>
            {o.mode === "print" && (
              <>
                <Chips items={PRINT_PRESETS} label={(p) => p.label} onPick={(p) => set({ width: p.width, height: p.height, unit: p.unit, keepRatio: false, fit: "fill" })} />
                <Segmented
                  label="Unit"
                  value={o.unit}
                  onChange={(unit) => set({ unit, width: convertUnit(o.width, o.unit, unit), height: convertUnit(o.height, o.unit, unit) })}
                  options={[{ value: "cm", label: "cm" }, { value: "mm", label: "mm" }, { value: "in", label: "inch" }]}
                />
              </>
            )}
            {o.mode === "pixels" && <Chips items={PIXEL_PRESETS} label={(p) => p.label} onPick={(p) => set({ width: p.width, height: p.height, keepRatio: false })} />}
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Width" value={o.width} onChange={(v) => setSide("width", v)} min={0} step={o.mode === "pixels" ? 1 : 0.1} suffix={unit} />
              <NumberField label="Height" value={o.height} onChange={(v) => setSide("height", v)} min={0} step={o.mode === "pixels" ? 1 : 0.1} suffix={unit} />
            </div>
            {o.mode === "print" && <NumberField label="Resolution" value={o.dpi} onChange={(dpi) => set({ dpi })} min={72} max={1200} suffix="DPI" />}
            <Toggle label="Keep proportions" hint="Leave on to avoid stretching. With it off you choose how the image fills the new shape." checked={o.keepRatio} onChange={(keepRatio) => set({ keepRatio })} />
            {!o.keepRatio && (
              <Segmented
                label="Fit"
                value={o.fit}
                onChange={(fit) => set({ fit })}
                options={[
                  { value: "fill", label: "Crop to fill", hint: "No borders" },
                  { value: "contain", label: "Add borders", hint: "Whole image" },
                  { value: "stretch", label: "Stretch" },
                ]}
              />
            )}
            {!o.keepRatio && o.fit === "contain" && <ColorField label="Border colour" value={o.background} onChange={(background) => set({ background })} />}
          </>
        )}
        {out && (
          <p className="rounded-lg bg-paper-deep px-3 py-2 text-[12px] text-ink-soft">
            {files.length > 1 ? "First image: " : ""}
            {first!.width} × {first!.height} → <span className="font-medium text-ink">{out.width} × {out.height} px</span>
          </p>
        )}
        <Toggle label="Limit the file size" hint="For upload forms that need, say, under 50 KB." checked={o.limit} onChange={(limit) => set({ limit })} />
        {o.limit && <TargetSize label="Maximum size" value={o.target} onChange={(target) => set({ target })} />}
        <Segmented label="Save as" value={o.format} onChange={(format) => set({ format })} options={FORMAT_OPTIONS()} />
      </>
    );
  },
  validate: (_f, o) => {
    if (o.mode === "percent" && (o.percent < 1 || o.percent > 400)) return "Choose a size between 1% and 400%.";
    if (o.mode !== "percent" && !(o.width > 0) && !(o.height > 0)) return "Enter a width or a height.";
    if (o.mode !== "percent" && !o.keepRatio && !(o.width > 0 && o.height > 0)) return "Enter both width and height, or keep proportions.";
    return o.limit ? needTarget(o.target) : null;
  },
  run: async (files, o, progress) => {
    const { render, exportCanvas, EMPTY_EDIT } = await canvasLib();
    return eachImage(files, progress, async (img, f) => {
      const format = resolveFormat(f, o.format);
      // With proportions kept the size already matches the image's shape; an
      // exact box (proportions off) uses the chosen fit.
      const size = resizeDims(img, resizeSpec(o));
      const exact = o.mode !== "percent" && !o.keepRatio;
      const canvas = render(img, EMPTY_EDIT, { size, fit: exact ? o.fit : "stretch", background: o.background });
      const maxBytes = o.limit ? parseSize(o.target) : null;
      const r = await exportCanvas(canvas, outputName(f.name, format, "resized"), { format, quality: 0.9, maxBytes, dpi: o.mode === "print" ? o.dpi : null, background: o.background });
      const note = !r.fits
        ? `Couldn't get below ${formatBytes(maxBytes!)}; this is the smallest version.`
        : maxBytes && (r.width !== canvas.width || r.height !== canvas.height)
          ? `To fit under ${formatBytes(maxBytes)} it was reduced further, to ${r.width} × ${r.height}.`
          : o.mode === "print"
            ? `Prints at ${o.width || "auto"} × ${o.height || "auto"} ${o.unit} (${o.dpi} DPI).`
            : undefined;
      return { ...r, note };
    });
  },
};

// ─── Convert ────────────────────────────────────────────────────────

type ConvertOpts = { format: Format; quality: number; background: string };

const convertImage: ToolSpec<ConvertOpts> = {
  action: "Convert",
  defaults: { format: "jpeg", quality: 90, background: "#ffffff" },
  Options: ({ options: o, set }) => (
    <>
      <Segmented
        label="Convert to"
        value={o.format}
        onChange={(format) => set({ format })}
        options={[
          { value: "jpeg", label: "JPG", hint: "Photos, smallest" },
          { value: "png", label: "PNG", hint: "Sharp graphics, transparency" },
          { value: "webp", label: "WEBP", hint: "Small, modern" },
        ]}
      />
      {FORMAT_INFO[o.format].lossy && <Slider label="Quality" value={o.quality} onChange={(quality) => set({ quality })} min={30} max={100} format={(v) => `${v}%`} />}
      {o.format === "jpeg" && <ColorField label="Fill transparent areas with" value={o.background} onChange={(background) => set({ background })} />}
    </>
  ),
  run: async (files, o, progress) => {
    const { render, exportCanvas, EMPTY_EDIT } = await canvasLib();
    return eachImage(files, progress, async (img, f) =>
      exportCanvas(render(img, EMPTY_EDIT), outputName(f.name, o.format), { format: o.format, quality: o.quality / 100, background: o.background }),
    );
  },
};

// ─── Rotate ─────────────────────────────────────────────────────────

type RotateOpts = { angle: 0 | 90 | 180 | 270; flipH: boolean; flipV: boolean };

const rotateImage: ToolSpec<RotateOpts> = {
  action: "Rotate",
  defaults: { angle: 90, flipH: false, flipV: false },
  Options: ({ options: o, set }) => (
    <>
      <Segmented
        label="Rotate"
        value={o.angle}
        onChange={(angle) => set({ angle })}
        options={[
          { value: 0, label: "None" },
          { value: 90, label: "90° right" },
          { value: 180, label: "180°" },
          { value: 270, label: "90° left" },
        ]}
      />
      <Toggle label="Mirror left to right" checked={o.flipH} onChange={(flipH) => set({ flipH })} />
      <Toggle label="Mirror top to bottom" checked={o.flipV} onChange={(flipV) => set({ flipV })} />
    </>
  ),
  validate: (_f, o) => (o.angle || o.flipH || o.flipV ? null : "Choose a rotation or a mirror."),
  run: async (files, o, progress) => {
    const { render, exportCanvas, EMPTY_EDIT, NO_TRANSFORM, rotateTransform, flipTransform } = await canvasLib();
    let t: Transform = NO_TRANSFORM;
    for (let i = 0; i < o.angle / 90; i++) t = rotateTransform(t, true);
    if (o.flipH) t = flipTransform(t, true);
    if (o.flipV) t = flipTransform(t, false);
    return eachImage(files, progress, async (img, f) => {
      const format = resolveFormat(f, "keep");
      return exportCanvas(render(img, { ...EMPTY_EDIT, transform: t }), outputName(f.name, format, "rotated"), { format, quality: 0.92 });
    });
  },
};

export const IMAGE_SPECS = {
  "compress-image": compressImage,
  "resize-image": resizeImage,
  "convert-image": convertImage,
  "rotate-image": rotateImage,
};
