"use client";

import type { ReactNode } from "react";
import { PDF, derived, formatBytes, selectPages, parseRanges, stem, type ToolFile } from "@/lib/tools/files";
import type { Position } from "@/lib/tools/processors/stamp";

// PDF engines load when a tool actually runs, keeping tool pages light.
const organize = () => import("@/lib/tools/processors/organize");
const stamp = () => import("@/lib/tools/processors/stamp");
const security = () => import("@/lib/tools/processors/security");
import { apiFetch } from "@/lib/api";
import type { LoadedFile, ToolResult, ToolSpec } from "./ToolRunner";
import { ColorField, NumberField, PagesField, PositionPicker, Segmented, Slider, TextInput, Toggle } from "./controls";
import { IMAGE_SPECS } from "./imageSpecs";
import { MORE_SPECS } from "./moreSpecs";

const pdfOut = (name: string, bytes: Uint8Array): ToolFile => ({ name, bytes, type: PDF });

/** Per-file processing with progress. */
async function eachFile(files: LoadedFile[], progress: (m: string, f?: number) => void, fn: (f: LoadedFile) => Promise<ToolFile>) {
  const out: ToolFile[] = [];
  for (const [i, f] of files.entries()) {
    progress(files.length > 1 ? `Processing ${i + 1} of ${files.length}…` : "Processing…", i / files.length);
    out.push(await fn(f));
  }
  return out;
}

const pagesOf = async (f: LoadedFile, spec: string) => selectPages(spec, f.pages ?? (await (await organize()).pageCount(f.bytes)));

// ─── Organize ───────────────────────────────────────────────────────

const merge: ToolSpec<Record<string, never>> = {
  action: "Merge PDF",
  defaults: {},
  minFiles: 2,
  reorderable: true,
  Options: ({ files }) => (
    <p className="text-[13px] leading-relaxed text-ink-soft">
      {files.length} files will be combined in the order shown. Use the arrows to change the order.
    </p>
  ),
  run: async (files, _o, progress) => {
    progress("Merging…");
    const bytes = await (await organize()).mergePdfs(files.map((f) => f.bytes));
    return { files: [pdfOut("merged.pdf", bytes)], summary: `${files.length} files merged into one PDF.` };
  },
};

type SplitOptions = { mode: "ranges" | "every" | "extract"; ranges: string; every: number; extract: string; together: boolean };
const split: ToolSpec<SplitOptions> = {
  action: "Split PDF",
  defaults: { mode: "ranges", ranges: "", every: 1, extract: "", together: true },
  Options: ({ options: o, set, files }) => (
    <>
      <Segmented
        label="How to split"
        value={o.mode}
        onChange={(mode) => set({ mode })}
        options={[
          { value: "ranges", label: "By ranges" },
          { value: "every", label: "Every N pages" },
          { value: "extract", label: "Extract pages" },
        ]}
      />
      {o.mode === "ranges" && <TextInput label="Ranges" hint={`Each range becomes a file. The document has ${files[0]?.pages ?? "?"} pages.`} value={o.ranges} onChange={(ranges) => set({ ranges })} placeholder="1-3, 4-8, 9" />}
      {o.mode === "every" && <NumberField label="Pages per file" value={o.every} min={1} onChange={(every) => set({ every })} />}
      {o.mode === "extract" && (
        <>
          <TextInput label="Pages to extract" value={o.extract} onChange={(extract) => set({ extract })} placeholder="2, 5, 7-9" />
          <Toggle label="Put them in one PDF" checked={o.together} onChange={(together) => set({ together })} />
        </>
      )}
    </>
  ),
  validate: (_f, o) => (o.mode === "ranges" && !o.ranges.trim() ? "Enter at least one range." : o.mode === "extract" && !o.extract.trim() ? "Enter the pages to extract." : null),
  run: async ([f], o, progress) => {
    const { pageCount, splitPdf } = await organize();
    const n = f.pages ?? (await pageCount(f.bytes));
    let groups: number[][];
    if (o.mode === "every") {
      const k = Math.max(1, Math.floor(o.every));
      groups = [];
      for (let i = 0; i < n; i += k) groups.push(Array.from({ length: Math.min(k, n - i) }, (_, j) => i + j));
    } else if (o.mode === "ranges") groups = parseRanges(o.ranges, n);
    else {
      const pages = [...new Set(parseRanges(o.extract, n).flat())].sort((a, b) => a - b);
      groups = o.together ? [pages] : pages.map((p) => [p]);
    }
    progress("Splitting…");
    const parts = await splitPdf(f.bytes, groups);
    const label = (g: number[]) => (g.length === 1 ? `page-${g[0] + 1}` : `pages-${g[0] + 1}-${g[g.length - 1] + 1}`);
    return { files: parts.map((b, i) => pdfOut(derived(f.name, label(groups[i])), b)), summary: `Created ${parts.length} file${parts.length === 1 ? "" : "s"}.` };
  },
};

type RotateOptions = { angle: 90 | 180 | 270; pages: string };
const rotate: ToolSpec<RotateOptions> = {
  action: "Rotate PDF",
  defaults: { angle: 90, pages: "all" },
  Options: ({ options: o, set }) => (
    <>
      <Segmented label="Rotate" value={o.angle} onChange={(angle) => set({ angle })} options={[{ value: 90, label: "Right 90°" }, { value: 180, label: "180°" }, { value: 270, label: "Left 90°" }]} />
      <PagesField value={o.pages} onChange={(pages) => set({ pages })} />
    </>
  ),
  run: async (files, o, progress) => ({
    files: await eachFile(files, progress, async (f) => pdfOut(derived(f.name, "rotated"), await (await organize()).rotatePdf(f.bytes, o.angle, await pagesOf(f, o.pages)))),
  }),
};

// ─── Optimize ───────────────────────────────────────────────────────

type CompressOpts = { level: "low" | "recommended" | "extreme"; grayscale: boolean; stripMetadata: boolean };
const compress: ToolSpec<CompressOpts> = {
  action: "Compress PDF",
  defaults: { level: "recommended", grayscale: false, stripMetadata: true },
  Options: ({ options: o, set }) => (
    <>
      <Segmented
        label="Compression"
        value={o.level}
        onChange={(level) => set({ level })}
        options={[
          { value: "low", label: "Less", hint: "Best quality" },
          { value: "recommended", label: "Recommended", hint: "Good quality" },
          { value: "extreme", label: "Extreme", hint: "Smallest file" },
        ]}
      />
      <Toggle label="Grayscale images" checked={o.grayscale} onChange={(grayscale) => set({ grayscale })} />
      <Toggle label="Remove metadata" hint="Author, title, creator and hidden XMP data" checked={o.stripMetadata} onChange={(stripMetadata) => set({ stripMetadata })} />
      <p className="text-[12px] leading-relaxed text-ink-soft">Only images are re-encoded. Text and drawings stay sharp and selectable.</p>
    </>
  ),
  run: async (files, o) => {
    const { compressPdf } = await import("@/lib/tools/processors/compress");
    const out: ToolFile[] = [];
    let before = 0;
    let after = 0;
    let unchanged = 0;
    for (const [i, f] of files.entries()) {
      const r = await compressPdf(f.bytes, o);
      before += r.before;
      after += r.after;
      if (r.unchanged) unchanged++;
      out.push(pdfOut(derived(f.name, "compressed"), r.bytes));
      void i;
    }
    const saved = before ? Math.round((1 - after / before) * 100) : 0;
    return {
      files: out,
      summary: (
        <>
          <strong className="text-ink">{saved > 0 ? `${saved}% smaller` : "Already optimized"}</strong> · {formatBytes(before)} → {formatBytes(after)}
          {unchanged > 0 && saved > 0 && <span className="block text-[13px]">{unchanged} file(s) were already as small as they can get.</span>}
        </>
      ),
    };
  },
};

const repair: ToolSpec<Record<string, never>> = {
  action: "Repair PDF",
  defaults: {},
  run: async (files, _o, progress) => {
    const notes: string[] = [];
    const out = await eachFile(files, progress, async (f) => {
      const r = await (await import("@/lib/tools/processors/repair")).repairPdf(f.bytes);
      notes.push(...r.notes.map((n) => (files.length > 1 ? `${f.name}: ${n}` : n)));
      return pdfOut(derived(f.name, "repaired"), r.bytes);
    });
    return { files: out, summary: <ul className="space-y-1">{notes.map((n, i) => <li key={i}>{n}</li>)}</ul> };
  },
};

const ocr: ToolSpec<{ skipTextPages: boolean }> = {
  action: "Make searchable",
  defaults: { skipTextPages: true },
  Options: ({ options: o, set }) => (
    <>
      <Toggle label="Skip pages that already have text" checked={o.skipTextPages} onChange={(skipTextPages) => set({ skipTextPages })} />
      <p className="text-[12px] leading-relaxed text-ink-soft">
        Recognises English text. The first run downloads the recognition engine (about 15 MB) from this site; after that it's cached.
      </p>
    </>
  ),
  run: async ([f], o, progress) => {
    const { ocrPdf } = await import("@/lib/tools/processors/ocr");
    const r = await ocrPdf(f.bytes, { language: "eng", skipTextPages: o.skipTextPages }, (m, frac) => progress(m, frac));
    return {
      files: [pdfOut(derived(f.name, "ocr"), r.bytes)],
      summary:
        r.pagesProcessed === 0
          ? "Every page already had selectable text, so nothing needed recognising."
          : `Recognised ${r.words.toLocaleString()} words on ${r.pagesProcessed} page${r.pagesProcessed === 1 ? "" : "s"}${r.pagesSkipped ? ` (${r.pagesSkipped} already had text)` : ""}. The text is now searchable and selectable.`,
    };
  },
};

// ─── Convert ────────────────────────────────────────────────────────

type ImgOpts = { pageSize: "fit" | "a4" | "letter"; orientation: "auto" | "portrait" | "landscape"; margin: number };
const jpgToPdf: ToolSpec<ImgOpts> = {
  action: "Convert to PDF",
  defaults: { pageSize: "a4", orientation: "auto", margin: 0 },
  reorderable: true,
  Options: ({ options: o, set }) => (
    <>
      <Segmented label="Page size" value={o.pageSize} onChange={(pageSize) => set({ pageSize })} options={[{ value: "fit", label: "Same as image" }, { value: "a4", label: "A4" }, { value: "letter", label: "Letter" }]} />
      {o.pageSize !== "fit" && (
        <Segmented label="Orientation" value={o.orientation} onChange={(orientation) => set({ orientation })} options={[{ value: "auto", label: "Auto" }, { value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }]} />
      )}
      <Segmented label="Margin" value={o.margin} onChange={(margin) => set({ margin })} options={[{ value: 0, label: "None" }, { value: 20, label: "Small" }, { value: 48, label: "Big" }]} />
    </>
  ),
  run: async (files, o, progress) => {
    const { imagesToPdf } = await import("@/lib/tools/processors/images");
    progress("Building PDF…");
    const bytes = await imagesToPdf(files, o);
    return { files: [pdfOut(files.length === 1 ? derived(files[0].name, "") : "images.pdf", bytes)], summary: `${files.length} image${files.length === 1 ? "" : "s"} → 1 PDF.` };
  },
};

type ToJpg = { mode: "pages" | "extract"; format: "jpg" | "png"; dpi: number; pages: string };
const pdfToJpg: ToolSpec<ToJpg> = {
  action: "Convert to images",
  defaults: { mode: "pages", format: "jpg", dpi: 150, pages: "all" },
  Options: ({ options: o, set }) => (
    <>
      <Segmented label="What to get" value={o.mode} onChange={(mode) => set({ mode })} options={[{ value: "pages", label: "Page to image", hint: "Every page as a picture" }, { value: "extract", label: "Extract images", hint: "Photos inside, untouched" }]} />
      {o.mode === "pages" && (
        <>
          <Segmented label="Format" value={o.format} onChange={(format) => set({ format })} options={[{ value: "jpg", label: "JPG" }, { value: "png", label: "PNG" }]} />
          <Segmented label="Quality" value={o.dpi} onChange={(dpi) => set({ dpi })} options={[{ value: 96, label: "Screen" }, { value: 150, label: "Standard" }, { value: 300, label: "Print" }]} />
          <PagesField value={o.pages} onChange={(pages) => set({ pages })} />
        </>
      )}
    </>
  ),
  run: async ([f], o, progress) => {
    const { pdfToImages, extractImages } = await import("@/lib/tools/processors/images");
    const files =
      o.mode === "extract"
        ? await extractImages(f)
        : await pdfToImages(f, { format: o.format, dpi: o.dpi, pages: await pagesOf(f, o.pages) }, (d, t) => progress(`Rendering page ${Math.min(d + 1, t)} of ${t}…`, d / t));
    if (!files.length) throw new Error("No photos were found inside this PDF. Try Page to image instead.");
    return { files, summary: `${files.length} image${files.length === 1 ? "" : "s"} ready.` };
  },
};

const officeFrom = (kind: "word" | "powerpoint" | "excel" | "markdown"): ToolSpec<{ pageBreaks: boolean }> => ({
  action: kind === "markdown" ? "Convert to Markdown" : `Convert to ${kind === "word" ? "Word" : kind === "powerpoint" ? "PowerPoint" : "Excel"}`,
  defaults: { pageBreaks: true },
  Options:
    kind === "markdown"
      ? ({ options: o, set }) => <Toggle label="Separate pages with ---" checked={o.pageBreaks} onChange={(pageBreaks) => set({ pageBreaks })} />
      : () => (
          <p className="text-[13px] leading-relaxed text-ink-soft">
            {kind === "word" && "Headings, paragraphs, lists and tables become editable Word content."}
            {kind === "powerpoint" && "Each page becomes a slide. The page's text goes into the speaker notes."}
            {kind === "excel" && "Each page becomes a sheet. Columns are detected from how the text lines up."}
          </p>
        ),
  run: async ([f], o, progress) => {
    const m = await import("@/lib/tools/processors/office");
    const p = (d: number, t: number) => progress(`Reading page ${Math.min(d + 1, t)} of ${t}…`, d / t);
    if (kind === "markdown") {
      const md = await m.pdfToMarkdown(f.bytes, o, p);
      const name = `${stem(f.name)}.md`;
      return { files: [{ name, bytes: new TextEncoder().encode(md), type: "text/markdown" }], text: { content: md, filename: name } };
    }
    if (kind === "word") return { files: [{ name: `${stem(f.name)}.docx`, bytes: await m.pdfToWord(f.bytes, p), type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }] };
    if (kind === "powerpoint") return { files: [{ name: `${stem(f.name)}.pptx`, bytes: await m.pdfToPowerPoint(f.bytes, p), type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }] };
    return { files: [{ name: `${stem(f.name)}.xlsx`, bytes: await m.pdfToExcel(f.bytes, p), type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }] };
  },
});

async function serverError(res: Response) {
  const data = await res.json().catch(() => ({}));
  return new Error((data as { error?: string }).error ?? (res.status === 503 ? "This tool isn't available on this server yet." : `The server couldn't convert this file (${res.status}).`));
}

const officeTo: ToolSpec<Record<string, never>> = {
  action: "Convert to PDF",
  defaults: {},
  run: async (files, _o, progress) => ({
    files: await eachFile(files, progress, async (f) => {
      const res = await apiFetch("/api/convert/office", {
        method: "POST",
        headers: { "content-type": "application/octet-stream", "x-filename": encodeURIComponent(f.name) },
        body: new Blob([f.bytes as BlobPart]),
      });
      if (!res.ok) throw await serverError(res);
      return pdfOut(`${stem(f.name)}.pdf`, new Uint8Array(await res.arrayBuffer()));
    }),
  }),
};

type HtmlOpts = { url: string; pageSize: "A4" | "Letter"; landscape: boolean };
const htmlToPdf: ToolSpec<HtmlOpts> = {
  action: "Convert to PDF",
  defaults: { url: "", pageSize: "A4", landscape: false },
  noFiles: true,
  Options: ({ options: o, set }) => (
    <>
      <TextInput label="Web page address" value={o.url} onChange={(url) => set({ url })} placeholder="https://example.com" type="url" />
      <Segmented label="Page size" value={o.pageSize} onChange={(pageSize) => set({ pageSize })} options={[{ value: "A4", label: "A4" }, { value: "Letter", label: "Letter" }]} />
      <Toggle label="Landscape" checked={o.landscape} onChange={(landscape) => set({ landscape })} />
    </>
  ),
  validate: (_f, o) => (/^https?:\/\/\S+\.\S+/.test(o.url.trim()) ? null : "Enter a full web address, starting with https://"),
  run: async (_f, o, progress) => {
    progress("Loading the page…");
    const res = await apiFetch("/api/convert/html", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...o, url: o.url.trim() }) });
    if (!res.ok) throw await serverError(res);
    const host = new URL(o.url.trim()).hostname.replace(/^www\./, "");
    return { files: [pdfOut(`${host}.pdf`, new Uint8Array(await res.arrayBuffer()))] };
  },
};

// ─── Edit ───────────────────────────────────────────────────────────

type WmOpts = {
  kind: "text" | "image";
  text: string;
  font: "Helvetica" | "Times" | "Courier";
  fontSize: number;
  color: string;
  opacity: number;
  rotation: number;
  position: Position;
  mosaic: boolean;
  pages: string;
  image: { bytes: Uint8Array; type: string; name: string } | null;
  scale: number;
};
const watermark: ToolSpec<WmOpts> = {
  action: "Add watermark",
  defaults: { kind: "text", text: "CONFIDENTIAL", font: "Helvetica", fontSize: 48, color: "#d92d20", opacity: 0.25, rotation: 45, position: "center", mosaic: false, pages: "all", image: null, scale: 0.4 },
  Options: ({ options: o, set }) => (
    <>
      <Segmented label="Watermark" value={o.kind} onChange={(kind) => set({ kind })} options={[{ value: "text", label: "Text" }, { value: "image", label: "Image" }]} />
      {o.kind === "text" ? (
        <>
          <TextInput label="Text" value={o.text} onChange={(text) => set({ text })} />
          <Segmented label="Font" value={o.font} onChange={(font) => set({ font })} options={[{ value: "Helvetica", label: "Sans" }, { value: "Times", label: "Serif" }, { value: "Courier", label: "Mono" }]} />
          <NumberField label="Size" value={o.fontSize} min={6} max={300} suffix="pt" onChange={(fontSize) => set({ fontSize })} />
          <ColorField label="Colour" value={o.color} onChange={(color) => set({ color })} />
        </>
      ) : (
        <>
          <label className="block space-y-1.5">
            <span className="text-[13px] font-medium">Image (PNG or JPG)</span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) set({ image: { bytes: new Uint8Array(await f.arrayBuffer()), type: f.type, name: f.name } });
              }}
              className="block w-full text-[13px] file:mr-3 file:rounded-full file:border-0 file:bg-paper-deep file:px-3 file:py-1.5 file:text-[13px]"
            />
          </label>
          <Slider label="Width" value={Math.round(o.scale * 100)} min={5} max={100} onChange={(v) => set({ scale: v / 100 })} format={(v) => `${v}% of page`} />
        </>
      )}
      <Slider label="Transparency" value={Math.round((1 - o.opacity) * 100)} min={0} max={95} onChange={(v) => set({ opacity: 1 - v / 100 })} format={(v) => `${v}%`} />
      <Segmented label="Rotation" value={o.rotation} onChange={(rotation) => set({ rotation })} options={[{ value: 0, label: "0°" }, { value: 45, label: "45°" }, { value: 90, label: "90°" }]} />
      <Toggle label="Tile across the page" checked={o.mosaic} onChange={(mosaic) => set({ mosaic })} />
      {!o.mosaic && <PositionPicker value={o.position} onChange={(position) => set({ position })} />}
      <PagesField value={o.pages} onChange={(pages) => set({ pages })} />
    </>
  ),
  validate: (_f, o) => (o.kind === "text" && !o.text.trim() ? "Enter the watermark text." : o.kind === "image" && !o.image ? "Choose an image." : null),
  run: async (files, o, progress) => ({
    files: await eachFile(files, progress, async (f) => {
      const mark =
        o.kind === "text"
          ? { kind: "text" as const, text: o.text, font: o.font, fontSize: o.fontSize, color: o.color, opacity: o.opacity, rotation: o.rotation, position: o.position, mosaic: o.mosaic }
          : { kind: "image" as const, image: o.image!.bytes, imageType: (o.image!.type === "image/png" ? "png" : "jpg") as "png" | "jpg", scale: o.scale, opacity: o.opacity, rotation: o.rotation, position: o.position, mosaic: o.mosaic };
      return pdfOut(derived(f.name, "watermarked"), await (await stamp()).watermarkPdf(f.bytes, mark, await pagesOf(f, o.pages)));
    }),
  }),
};

type NumOpts = { position: Position; format: string; start: number; fontSize: number; color: string; margin: number; pages: string };
const pageNumbers: ToolSpec<NumOpts> = {
  action: "Add page numbers",
  defaults: { position: "bottom-center", format: "{n}", start: 1, fontSize: 11, color: "#111827", margin: 28, pages: "all" },
  Options: ({ options: o, set }) => (
    <>
      <PositionPicker value={o.position} onChange={(position) => set({ position })} />
      <Segmented
        label="Format"
        value={o.format}
        onChange={(format) => set({ format })}
        options={[
          { value: "{n}", label: "1" },
          { value: "Page {n}", label: "Page 1" },
          { value: "Page {n} of {total}", label: "Page 1 of N" },
          { value: "{n} / {total}", label: "1 / N" },
          { value: "- {n} -", label: "- 1 -" },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="First number" value={o.start} min={0} onChange={(start) => set({ start })} />
        <NumberField label="Size" value={o.fontSize} min={6} max={48} suffix="pt" onChange={(fontSize) => set({ fontSize })} />
      </div>
      <Segmented label="Margin" value={o.margin} onChange={(margin) => set({ margin })} options={[{ value: 16, label: "Small" }, { value: 28, label: "Recommended" }, { value: 48, label: "Big" }]} />
      <ColorField label="Colour" value={o.color} onChange={(color) => set({ color })} />
      <PagesField label="Pages to number" value={o.pages} onChange={(pages) => set({ pages })} />
    </>
  ),
  run: async (files, o, progress) => ({
    files: await eachFile(files, progress, async (f) => pdfOut(derived(f.name, "numbered"), await (await stamp()).addPageNumbers(f.bytes, o, await pagesOf(f, o.pages)))),
  }),
};

// ─── Security ───────────────────────────────────────────────────────

type ProtectOpts = { password: string; confirm: string; allowPrinting: boolean; allowCopying: boolean; allowEditing: boolean };
const protect: ToolSpec<ProtectOpts> = {
  action: "Protect PDF",
  defaults: { password: "", confirm: "", allowPrinting: true, allowCopying: false, allowEditing: false },
  Options: ({ options: o, set }) => (
    <>
      <TextInput label="Password" type="password" autoComplete="new-password" value={o.password} onChange={(password) => set({ password })} />
      <TextInput label="Repeat password" type="password" autoComplete="new-password" value={o.confirm} onChange={(confirm) => set({ confirm })} />
      <Toggle label="Allow printing" checked={o.allowPrinting} onChange={(allowPrinting) => set({ allowPrinting })} />
      <Toggle label="Allow copying text" checked={o.allowCopying} onChange={(allowCopying) => set({ allowCopying })} />
      <Toggle label="Allow editing" checked={o.allowEditing} onChange={(allowEditing) => set({ allowEditing })} />
      <p className="text-[12px] leading-relaxed text-ink-soft">Encrypted with AES-256. Keep the password safe: it can't be recovered.</p>
    </>
  ),
  validate: (_f, o) => (o.password.length < 4 ? "Use at least 4 characters." : o.password !== o.confirm ? "The passwords don't match." : null),
  run: async (files, o, progress) => ({
    files: await eachFile(files, progress, async (f) =>
      pdfOut(derived(f.name, "protected"), await (await security()).protectPdf(f.bytes, { userPassword: o.password, allowPrinting: o.allowPrinting, allowCopying: o.allowCopying, allowEditing: o.allowEditing })),
    ),
    summary: "Your PDF now asks for the password when it's opened.",
  }),
};

const unlock: ToolSpec<{ password: string }> = {
  action: "Unlock PDF",
  defaults: { password: "" },
  Options: ({ options: o, set }) => (
    <>
      <TextInput label="Current password" type="password" autoComplete="current-password" value={o.password} onChange={(password) => set({ password })} />
      <p className="text-[12px] leading-relaxed text-ink-soft">Only for files you're allowed to open. The password is used in your browser and never sent anywhere.</p>
    </>
  ),
  validate: (_f, o) => (!o.password ? "Enter the file's password." : null),
  run: async ([f], o) => ({ files: [pdfOut(derived(f.name, "unlocked"), await (await security()).unlockPdf(f.bytes, o.password))], summary: "The password has been removed." }),
};

type RedactOpts = { terms: string; caseSensitive: boolean; wholeWord: boolean };
const redact: ToolSpec<RedactOpts> = {
  action: "Redact",
  defaults: { terms: "", caseSensitive: false, wholeWord: true },
  Options: ({ options: o, set }) => (
    <>
      <label className="block space-y-1.5">
        <span className="block text-[13px] font-medium">Words or phrases to remove</span>
        <span className="block text-[12px] text-ink-soft">One per line: names, phone numbers, account numbers…</span>
        <textarea
          value={o.terms}
          onChange={(e) => set({ terms: e.target.value })}
          rows={5}
          className="w-full rounded-lg bg-white p-3 text-[14px] ring-1 ring-rule outline-none focus:ring-2 focus:ring-brand-500"
        />
      </label>
      <Toggle label="Whole words only" checked={o.wholeWord} onChange={(wholeWord) => set({ wholeWord })} />
      <Toggle label="Match case" checked={o.caseSensitive} onChange={(caseSensitive) => set({ caseSensitive })} />
      <p className="text-[12px] leading-relaxed text-ink-soft">
        Matches are deleted from the file, not just covered. For areas like signatures or photos, use the Redact tool in the editor.
      </p>
    </>
  ),
  validate: (_f, o) => (o.terms.trim() ? null : "Enter at least one word to redact."),
  run: async (files, o, progress) => {
    const { redactInBrowser } = await import("@/lib/tools/processors/redactBrowser");
    const terms = o.terms.split("\n");
    const out: ToolFile[] = [];
    const lines: ReactNode[] = [];
    for (const f of files) {
      const r = await redactInBrowser(f.bytes, terms, o, progress);
      out.push(pdfOut(derived(f.name, "redacted"), r.bytes));
      lines.push(
        <li key={f.name}>
          {files.length > 1 && <strong className="text-ink">{f.name}: </strong>}
          {r.totalMatches ? `Removed ${r.totalMatches} match${r.totalMatches === 1 ? "" : "es"} on ${r.pagesWithMatches} page${r.pagesWithMatches === 1 ? "" : "s"}.` : "No matches found."}
          {r.flattenedPages.length > 0 && ` Page${r.flattenedPages.length === 1 ? "" : "s"} ${r.flattenedPages.map((p) => p + 1).join(", ")} were flattened to images to make sure the text is gone.`}
        </li>,
      );
    }
    return { files: out, summary: <ul className="space-y-1">{lines}</ul> };
  },
};

// ─── AI ─────────────────────────────────────────────────────────────

async function documentText(bytes: Uint8Array, progress: (m: string, f?: number) => void): Promise<string[]> {
  const { openPdf, pageTextRuns } = await import("@/lib/tools/pdfjs");
  const { groupLines } = await import("@/lib/tools/text");
  const pdf = await openPdf(bytes);
  const pages: string[] = [];
  for (let i = 0; i < pdf.numPages; i++) {
    progress(`Reading page ${i + 1} of ${pdf.numPages}…`, i / pdf.numPages);
    pages.push(groupLines((await pageTextRuns(pdf, i)).runs).map((l) => l.text).join("\n"));
  }
  await pdf.destroy();
  if (!pages.some((p) => p.trim())) throw new Error("This PDF has no selectable text. Run OCR PDF first.");
  return pages;
}

type SumOpts = { length: "short" | "medium" | "detailed" };
const summarize: ToolSpec<SumOpts> = {
  action: "Summarize",
  defaults: { length: "medium" },
  Options: ({ options: o, set }) => (
    <Segmented label="Length" value={o.length} onChange={(length) => set({ length })} options={[{ value: "short", label: "Short" }, { value: "medium", label: "Medium" }, { value: "detailed", label: "Detailed" }]} />
  ),
  run: async ([f], o, progress) => {
    const pages = await documentText(f.bytes, progress);
    progress("Summarizing…");
    const res = await apiFetch("/api/ai/summarize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pages, length: o.length }) });
    if (!res.ok) throw await serverError(res);
    const { summary } = (await res.json()) as { summary: string };
    return { files: [], text: { content: summary, filename: `${stem(f.name)}-summary.md` } };
  },
};

export const LANGUAGES = [
  "English", "Hindi", "Spanish", "French", "German", "Portuguese", "Italian", "Dutch", "Arabic", "Bengali", "Chinese (Simplified)",
  "Japanese", "Korean", "Russian", "Tamil", "Telugu", "Marathi", "Gujarati", "Urdu", "Turkish", "Indonesian",
];
type TrOpts = { target: string };
const translate: ToolSpec<TrOpts> = {
  action: "Translate",
  defaults: { target: "Hindi" },
  Options: ({ options: o, set }) => (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-medium">Translate to</span>
      <select value={o.target} onChange={(e) => set({ target: e.target.value })} className="h-10 w-full rounded-lg bg-white px-3 text-[14px] ring-1 ring-rule">
        {LANGUAGES.map((l) => (
          <option key={l}>{l}</option>
        ))}
      </select>
    </label>
  ),
  run: async ([f], o, progress) => {
    const pages = await documentText(f.bytes, progress);
    progress(`Translating into ${o.target}…`);
    const res = await apiFetch("/api/ai/translate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pages, target: o.target }) });
    if (!res.ok) throw await serverError(res);
    const { pages: translated } = (await res.json()) as { pages: string[] };
    const { translatedDocx } = await import("@/lib/tools/processors/translate");
    const docx = await translatedDocx(translated, o.target);
    const md = translated.map((p, i) => `## Page ${i + 1}\n\n${p}`).join("\n\n");
    return {
      files: [{ name: `${stem(f.name)}-${o.target.toLowerCase().replace(/[^a-z]+/g, "-")}.docx`, bytes: docx, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }],
      text: { content: md, filename: `${stem(f.name)}-${o.target.toLowerCase().replace(/[^a-z]+/g, "-")}.md` },
      summary: `Translated ${pages.length} page${pages.length === 1 ? "" : "s"} into ${o.target}.`,
    };
  },
};

export const SPECS: Record<string, ToolSpec<never>> = {
  "merge-pdf": merge,
  "split-pdf": split,
  "rotate-pdf": rotate,
  "compress-pdf": compress,
  "repair-pdf": repair,
  "ocr-pdf": ocr,
  "jpg-to-pdf": jpgToPdf,
  "pdf-to-jpg": pdfToJpg,
  "pdf-to-word": officeFrom("word"),
  "pdf-to-powerpoint": officeFrom("powerpoint"),
  "pdf-to-excel": officeFrom("excel"),
  "pdf-to-markdown": officeFrom("markdown"),
  "word-to-pdf": officeTo,
  "powerpoint-to-pdf": officeTo,
  "excel-to-pdf": officeTo,
  "html-to-pdf": htmlToPdf,
  "watermark-pdf": watermark,
  "page-numbers": pageNumbers,
  "protect-pdf": protect,
  "unlock-pdf": unlock,
  "redact-pdf": redact,
  "summarize-pdf": summarize,
  "translate-pdf": translate,
  ...IMAGE_SPECS,
  ...MORE_SPECS,
} as unknown as Record<string, ToolSpec<never>>;

export type { ToolResult };
