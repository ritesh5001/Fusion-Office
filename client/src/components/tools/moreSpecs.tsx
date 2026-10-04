"use client";

/**
 * Tool screens added in the second wave (page tools, stamping, document
 * converters, privacy, handwriting). Engines load only when a tool runs.
 */
import { useEffect } from "react";
import { PDF, derived, formatBytes, selectPages, stem, zipFiles, type ToolFile } from "@/lib/tools/files";
import { apiFetch } from "@/lib/api";
import type { Position } from "@/lib/tools/processors/stamp";
import type { PiiKind } from "@/lib/tools/pii";
import type { LoadedFile, ToolSpec } from "./ToolRunner";
import { ColorField, NumberField, PagesField, PositionPicker, Segmented, Slider, TextArea, TextInput, Toggle } from "./controls";

const pages = () => import("@/lib/tools/processors/pages");
const stamp = () => import("@/lib/tools/processors/stamp");
const organize = () => import("@/lib/tools/processors/organize");
const pdftext = () => import("@/lib/tools/processors/pdftext");
const documents = () => import("@/lib/tools/documents");

const pdfOut = (name: string, bytes: Uint8Array): ToolFile => ({ name, bytes, type: PDF });
const textFile = (name: string, content: string, type = "text/plain"): ToolFile => ({ name, bytes: new TextEncoder().encode(content), type });

async function eachFile(files: LoadedFile[], progress: (m: string, f?: number) => void, fn: (f: LoadedFile) => Promise<ToolFile>) {
  const out: ToolFile[] = [];
  for (const [i, f] of files.entries()) {
    progress(files.length > 1 ? `Processing ${i + 1} of ${files.length}…` : "Processing…", i / files.length);
    out.push(await fn(f));
  }
  return out;
}

const pagesOf = async (f: LoadedFile, spec: string) => selectPages(spec, f.pages ?? (await (await organize()).pageCount(f.bytes)));

const decodeText = (f: LoadedFile) => new TextDecoder().decode(f.bytes);

/** Print an HTML document to PDF on the server (Chrome). */
async function printHtml(html: string, name: string, landscape = false): Promise<Uint8Array> {
  const res = await apiFetch("/api/convert/html", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ html, name, landscape }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? (res.status === 503 ? "This converter isn't available on the server yet." : `The server couldn't convert this file (${res.status}).`));
  }
  return new Uint8Array(await res.arrayBuffer());
}

const Note = ({ children }: { children: React.ReactNode }) => <p className="text-[12px] leading-relaxed text-fg-muted">{children}</p>;

// ─── Organize ───────────────────────────────────────────────────────

const alternateMix: ToolSpec<{ reverseSecond: boolean }> = {
  action: "Mix pages",
  defaults: { reverseSecond: false },
  minFiles: 2,
  reorderable: true,
  Options: ({ options: o, set, files }) => (
    <>
      <Note>One page from each of the {files.length} files in turn: page 1 of the first, page 1 of the second, then page 2 of each, and so on.</Note>
      <Toggle
        label="Reverse the second file"
        hint="For a one-sided scan of a double-sided stack: fronts in the first file, backs (last to first) in the second."
        checked={o.reverseSecond}
        onChange={(reverseSecond) => set({ reverseSecond })}
      />
    </>
  ),
  run: async (files, o, progress) => {
    progress("Mixing pages…");
    const bytes = await (await pages()).alternatePages(files.map((f) => f.bytes), o);
    return { files: [pdfOut("mixed.pdf", bytes)], summary: `Pages of ${files.length} files interleaved into one PDF.` };
  },
};

type NupOpts = { perSheet: 2 | 4 | 6 | 9 | 16; sheet: "a4" | "letter" | "source"; border: boolean; order: "rows" | "columns" };
const pagesPerSheet: ToolSpec<NupOpts> = {
  action: "Combine pages",
  defaults: { perSheet: 2, sheet: "a4", border: true, order: "rows" },
  Options: ({ options: o, set }) => (
    <>
      <Segmented label="Pages per sheet" value={o.perSheet} onChange={(perSheet) => set({ perSheet })} options={[2, 4, 6, 9, 16].map((n) => ({ value: n as NupOpts["perSheet"], label: String(n) }))} />
      <Segmented label="Sheet size" value={o.sheet} onChange={(sheet) => set({ sheet })} options={[{ value: "a4", label: "A4" }, { value: "letter", label: "Letter" }, { value: "source", label: "Same as pages" }]} />
      <Segmented label="Order" value={o.order} onChange={(order) => set({ order })} options={[{ value: "rows", label: "Across, then down" }, { value: "columns", label: "Down, then across" }]} />
      <Toggle label="Thin border around each page" checked={o.border} onChange={(border) => set({ border })} />
    </>
  ),
  run: async (files, o, progress) => ({
    files: await eachFile(files, progress, async (f) => pdfOut(derived(f.name, `${o.perSheet}-up`), await (await pages()).pagesPerSheet(f.bytes, o))),
    summary: `${o.perSheet} pages on every sheet. Good for handouts and saving paper.`,
  }),
};

type FlipOpts = { mode: "horizontal" | "vertical" | "both"; pages: string };
const flip: ToolSpec<FlipOpts> = {
  action: "Flip PDF",
  defaults: { mode: "horizontal", pages: "all" },
  Options: ({ options: o, set }) => (
    <>
      <Segmented
        label="Mirror"
        value={o.mode}
        onChange={(mode) => set({ mode })}
        options={[
          { value: "horizontal", label: "Left ↔ right" },
          { value: "vertical", label: "Top ↕ bottom" },
          { value: "both", label: "Both" },
        ]}
      />
      <PagesField value={o.pages} onChange={(pages) => set({ pages })} />
      <Note>Useful for printing on transparency or iron-on transfer paper, and for scans that came out mirrored.</Note>
    </>
  ),
  run: async (files, o, progress) => ({
    files: await eachFile(files, progress, async (f) => pdfOut(derived(f.name, "flipped"), await (await pages()).flipPdf(f.bytes, o.mode, await pagesOf(f, o.pages)))),
  }),
};

type HalfOpts = { cut: "vertical" | "horizontal"; rightFirst: boolean };
const splitHalf: ToolSpec<HalfOpts> = {
  action: "Split pages in half",
  defaults: { cut: "vertical", rightFirst: false },
  Options: ({ options: o, set }) => (
    <>
      <Segmented label="Cut" value={o.cut} onChange={(cut) => set({ cut })} options={[{ value: "vertical", label: "Down the middle" }, { value: "horizontal", label: "Across the middle" }]} />
      {o.cut === "vertical" && <Toggle label="Right half first" hint="For right-to-left books (Arabic, Hebrew, Urdu)." checked={o.rightFirst} onChange={(rightFirst) => set({ rightFirst })} />}
      <Note>Every page becomes two. Ideal for book scans with two pages on each sheet.</Note>
    </>
  ),
  run: async (files, o, progress) => ({
    files: await eachFile(files, progress, async (f) => pdfOut(derived(f.name, "halves"), await (await pages()).splitInHalf(f.bytes, o))),
  }),
};

const splitSize: ToolSpec<{ mb: number }> = {
  action: "Split by size",
  defaults: { mb: 5 },
  Options: ({ options: o, set, files }) => (
    <>
      <NumberField label="Largest part" value={o.mb} min={0.2} max={500} step={0.5} suffix="MB" onChange={(mb) => set({ mb })} />
      {files[0] && <Note>This file is {formatBytes(files[0].bytes.length)}. Each part will stay under {o.mb} MB, with pages kept in order.</Note>}
    </>
  ),
  validate: (_f, o) => (o.mb > 0 ? null : "Choose a size above 0 MB."),
  run: async ([f], o, progress) => {
    const parts = await (await pages()).splitBySize(f.bytes, o.mb * 1024 * 1024, (d, t) => progress(`Measuring pages… ${d} of ${t}`, d / t));
    const big = parts.filter((p) => p.length > o.mb * 1024 * 1024).length;
    return {
      files: parts.map((p, i) => pdfOut(derived(f.name, `part-${i + 1}`), p)),
      summary: `${parts.length} part${parts.length === 1 ? "" : "s"}${big ? ` · ${big} single page${big === 1 ? " is" : "s are"} larger than ${o.mb} MB on ${big === 1 ? "its" : "their"} own` : ""}.`,
    };
  },
};

const splitBookmarks: ToolSpec<Record<string, never>> = {
  action: "Split by bookmarks",
  defaults: {},
  Options: () => <Note>Each top-level bookmark (chapter) becomes its own PDF, named after the bookmark.</Note>,
  run: async ([f], _o, progress) => {
    progress("Reading bookmarks…");
    const t = await pdftext();
    const parts = await t.bookmarkParts(f.bytes);
    if (!parts.length) throw new Error("This PDF has no bookmarks. Try Split by text or Split PDF instead.");
    const count = f.pages ?? (await (await organize()).pageCount(f.bytes));
    const groups = t.groupsFromStarts(parts.map((p) => p.start), count);
    const outs = await (await organize()).splitPdf(f.bytes, groups);
    const titled = [{ title: "Front matter", start: 0 }, ...parts].filter((p, i, all) => i > 0 || all[1]?.start !== 0);
    return {
      files: outs.map((b, i) => pdfOut(`${String(i + 1).padStart(2, "0")} ${(titled[i]?.title ?? `Part ${i + 1}`).replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80)}.pdf`, b)),
      summary: `${outs.length} files, one per chapter.`,
    };
  },
};

const splitText: ToolSpec<{ phrase: string }> = {
  action: "Split by text",
  defaults: { phrase: "" },
  Options: ({ options: o, set }) => (
    <>
      <TextInput label="Start a new file at every page containing" value={o.phrase} onChange={(phrase) => set({ phrase })} placeholder="e.g. Invoice No." />
      <Note>Handy for a batch of invoices, payslips or forms scanned into one PDF. Needs selectable text (run OCR first on scans).</Note>
    </>
  ),
  validate: (_f, o) => (o.phrase.trim() ? null : "Enter the text that marks a new file."),
  run: async ([f], o, progress) => {
    const t = await pdftext();
    const hits = await t.pagesContaining(f.bytes, o.phrase, progress);
    if (!hits.length) throw new Error(`“${o.phrase.trim()}” wasn't found in this PDF.`);
    const count = f.pages ?? (await (await organize()).pageCount(f.bytes));
    const outs = await (await organize()).splitPdf(f.bytes, t.groupsFromStarts(hits, count));
    return { files: outs.map((b, i) => pdfOut(derived(f.name, `part-${i + 1}`), b)), summary: `Found on ${hits.length} page${hits.length === 1 ? "" : "s"}; ${outs.length} files.` };
  },
};

const pdfToZip: ToolSpec<{ name: string }> = {
  action: "Create ZIP",
  defaults: { name: "documents" },
  minFiles: 1,
  Options: ({ options: o, set, files }) => (
    <>
      <TextInput label="ZIP file name" value={o.name} onChange={(name) => set({ name })} />
      <Note>{files.length} file{files.length === 1 ? "" : "s"}, {formatBytes(files.reduce((n, f) => n + f.bytes.length, 0))}. Made on your device; nothing is uploaded.</Note>
    </>
  ),
  run: async (files, o) => {
    const zip = zipFiles(files, `${(o.name.trim() || "documents").replace(/\.zip$/i, "")}.zip`);
    return { files: [zip], summary: `${files.length} files bundled · ${formatBytes(zip.bytes.length)}` };
  },
};

// ─── Optimize ───────────────────────────────────────────────────────

const gstFilingPrep: ToolSpec<{ mb: number }> = {
  action: "Prepare for upload",
  defaults: { mb: 5 },
  Options: ({ options: o, set }) => (
    <>
      <Segmented label="Portal limit per file" value={o.mb} onChange={(mb) => set({ mb })} options={[{ value: 2, label: "2 MB" }, { value: 5, label: "5 MB" }, { value: 10, label: "10 MB" }, { value: 20, label: "20 MB" }]} />
      <Note>Compresses the PDF first, then splits it into numbered parts that each fit the limit, for GST notices (SCN replies, appeals) and other portals.</Note>
    </>
  ),
  run: async ([f], o, progress) => {
    progress("Compressing…", 0.1);
    const { compressPdf } = await import("@/lib/tools/processors/compress");
    const c = await compressPdf(f.bytes, { level: "recommended", grayscale: false, stripMetadata: true });
    const limit = o.mb * 1024 * 1024;
    if (c.bytes.length <= limit) return { files: [pdfOut(derived(f.name, "upload"), c.bytes)], summary: `Fits in one file: ${formatBytes(c.bytes.length)} (was ${formatBytes(f.bytes.length)}).` };
    const parts = await (await pages()).splitBySize(c.bytes, limit, (d, t) => progress(`Splitting… ${d} of ${t} pages`, 0.4 + (d / t) * 0.6));
    return {
      files: parts.map((p, i) => pdfOut(derived(f.name, `part-${i + 1}-of-${parts.length}`), p)),
      summary: `Compressed to ${formatBytes(c.bytes.length)} and split into ${parts.length} parts under ${o.mb} MB each.`,
    };
  },
};

// ─── Edit ───────────────────────────────────────────────────────────

type BatesOpts = { prefix: string; suffix: string; start: number; digits: number; position: Position; fontSize: number; color: string; margin: number };
const bates: ToolSpec<BatesOpts> = {
  action: "Add Bates numbers",
  defaults: { prefix: "", suffix: "", start: 1, digits: 6, position: "bottom-right", fontSize: 9, color: "#111827", margin: 22 },
  reorderable: true,
  Options: ({ options: o, set }) => {
    const sample = `${o.prefix}${String(o.start).padStart(o.digits, "0")}${o.suffix}`;
    return (
      <>
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Prefix" value={o.prefix} onChange={(prefix) => set({ prefix })} placeholder="ABC-" />
          <TextInput label="Suffix" value={o.suffix} onChange={(suffix) => set({ suffix })} />
          <NumberField label="Start at" value={o.start} min={0} onChange={(start) => set({ start })} />
          <NumberField label="Digits" value={o.digits} min={1} max={12} onChange={(digits) => set({ digits })} />
        </div>
        <p className="rounded-md bg-raised px-3 py-2 font-mono text-[13px]">{sample}</p>
        <PositionPicker value={o.position} onChange={(position) => set({ position })} />
        <NumberField label="Size" value={o.fontSize} min={6} max={24} suffix="pt" onChange={(fontSize) => set({ fontSize })} />
        <Note>Numbering continues from one file to the next, in the order shown.</Note>
      </>
    );
  },
  run: async (files, o, progress) => {
    progress("Numbering…");
    const r = await (await stamp()).addBatesNumbers(files.map((f) => f.bytes), o);
    return {
      files: r.files.map((b, i) => pdfOut(derived(files[i].name, "bates"), b)),
      summary: r.ranges.map(([a, b], i) => `${files[i].name}: ${a}${a === b ? "" : ` – ${b}`}`).join(" · "),
    };
  },
};

type HfOpts = { hl: string; hc: string; hr: string; fl: string; fc: string; fr: string; fontSize: number; color: string; margin: number; rule: boolean; pages: string };
const SlotInputs = ({ title, values, onChange }: { title: string; values: [string, string, string]; onChange: (i: number, v: string) => void }) => (
  <div className="space-y-1.5">
    <p className="text-[12px] font-medium text-fg">{title}</p>
    <div className="grid grid-cols-3 gap-1.5">
      {["Left", "Centre", "Right"].map((label, i) => (
        <input
          key={label}
          aria-label={`${title} ${label.toLowerCase()}`}
          placeholder={label}
          value={values[i]}
          onChange={(e) => onChange(i, e.target.value)}
          className="h-9 min-w-0 rounded-lg bg-sunken text-fg placeholder:text-fg-subtle px-2 text-[13px] ring-1 ring-line-strong outline-none focus:ring-2 focus:ring-brand-500"
        />
      ))}
    </div>
  </div>
);
const headerFooter: ToolSpec<HfOpts> = {
  action: "Add headers & footers",
  defaults: { hl: "{file}", hc: "", hr: "{date}", fl: "", fc: "Page {page} of {total}", fr: "", fontSize: 9, color: "#374151", margin: 28, rule: false, pages: "all" },
  Options: ({ options: o, set }) => (
    <>
      <SlotInputs title="Header" values={[o.hl, o.hc, o.hr]} onChange={(i, v) => set({ [["hl", "hc", "hr"][i]]: v } as Partial<HfOpts>)} />
      <SlotInputs title="Footer" values={[o.fl, o.fc, o.fr]} onChange={(i, v) => set({ [["fl", "fc", "fr"][i]]: v } as Partial<HfOpts>)} />
      <Note>
        Use <code>{"{page}"}</code>, <code>{"{total}"}</code>, <code>{"{date}"}</code> and <code>{"{file}"}</code> in any box.
      </Note>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Size" value={o.fontSize} min={6} max={20} suffix="pt" onChange={(fontSize) => set({ fontSize })} />
        <NumberField label="Margin" value={o.margin} min={8} max={72} suffix="pt" onChange={(margin) => set({ margin })} />
      </div>
      <ColorField label="Colour" value={o.color} onChange={(color) => set({ color })} />
      <Toggle label="Thin separator line" checked={o.rule} onChange={(rule) => set({ rule })} />
      <PagesField value={o.pages} onChange={(pages) => set({ pages })} />
    </>
  ),
  validate: (_f, o) => ([o.hl, o.hc, o.hr, o.fl, o.fc, o.fr].some((t) => t.trim()) ? null : "Type something for the header or footer."),
  run: async (files, o, progress) => {
    const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    return {
      files: await eachFile(files, progress, async (f) =>
        pdfOut(
          derived(f.name, "header-footer"),
          await (
            await stamp()
          ).addHeaderFooter(f.bytes, { header: [o.hl, o.hc, o.hr], footer: [o.fl, o.fc, o.fr], fontSize: o.fontSize, color: o.color, margin: o.margin, rule: o.rule, fileName: f.name, date }, await pagesOf(f, o.pages)),
        ),
      ),
    };
  },
};

const flatten: ToolSpec<{ forms: boolean; annotations: boolean; scripts: boolean }> = {
  action: "Flatten PDF",
  defaults: { forms: true, annotations: true, scripts: true },
  Options: ({ options: o, set }) => (
    <>
      <Toggle label="Form fields" hint="Answers become part of the page and can't be changed." checked={o.forms} onChange={(forms) => set({ forms })} />
      <Toggle label="Comments, stamps & drawings" hint="Merged into the page. Links keep working." checked={o.annotations} onChange={(annotations) => set({ annotations })} />
      <Toggle label="Remove scripts" checked={o.scripts} onChange={(scripts) => set({ scripts })} />
    </>
  ),
  run: async (files, o, progress) => {
    let fields = 0;
    let annots = 0;
    const out = await eachFile(files, progress, async (f) => {
      const r = await (await pages()).flattenPdf(f.bytes, o);
      fields += r.fields;
      annots += r.annotations;
      return pdfOut(derived(f.name, "flattened"), r.bytes);
    });
    return { files: out, summary: `${fields} form field${fields === 1 ? "" : "s"} and ${annots} annotation${annots === 1 ? "" : "s"} flattened.` };
  },
};

type MetaOpts = { title: string; author: string; subject: string; keywords: string; creator: string; producer: string; created: string; modified: string; loadedFor: string };
const editMetadata: ToolSpec<MetaOpts> = {
  action: "Save properties",
  defaults: { title: "", author: "", subject: "", keywords: "", creator: "", producer: "", created: "", modified: "", loadedFor: "" },
  Options: function MetadataOptions({ options: o, set, files }) {
    const f = files[0];
    // Fill the form with the file's current properties once per file.
    useEffect(() => {
      if (!f || o.loadedFor === f.id) return;
      let alive = true;
      pages()
        .then((p) => p.readMetadata(f.bytes))
        .then((m) => alive && set({ ...m, loadedFor: f.id }))
        .catch(() => alive && set({ loadedFor: f.id }));
      return () => {
        alive = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [f?.id]);
    const field = (key: keyof MetaOpts, label: string, type = "text") => <TextInput label={label} type={type} value={o[key]} onChange={(v) => set({ [key]: v } as Partial<MetaOpts>)} />;
    return (
      <>
        {field("title", "Title")}
        {field("author", "Author")}
        {field("subject", "Subject")}
        {field("keywords", "Keywords", "text")}
        {field("creator", "Created with")}
        {field("producer", "Producer")}
        <div className="grid grid-cols-2 gap-3">
          {field("created", "Created", "date")}
          {field("modified", "Modified", "date")}
        </div>
        <Note>Leave a field empty to remove it. Keywords: separate with commas.</Note>
      </>
    );
  },
  run: async ([f], o) => {
    const { loadedFor: _l, ...meta } = o;
    void _l;
    return { files: [pdfOut(f.name, await (await pages()).writeMetadata(f.bytes, meta))], summary: "Document properties updated." };
  },
};

const invert: ToolSpec<{ mode: "dark" | "sepia" | "grayscale" | "contrast" }> = {
  action: "Change colours",
  defaults: { mode: "dark" },
  Options: ({ options: o, set }) => (
    <>
      <Segmented
        label="Style"
        value={o.mode}
        onChange={(mode) => set({ mode })}
        options={[
          { value: "dark", label: "Dark mode" },
          { value: "sepia", label: "Sepia" },
          { value: "grayscale", label: "Grayscale" },
          { value: "contrast", label: "High contrast" },
        ]}
      />
      <Note>Dark mode keeps colours recognisable instead of turning red into cyan. Pages become images, so text won't be selectable.</Note>
    </>
  ),
  run: async (files, o, progress) => ({
    files: await eachFile(files, progress, async (f) => pdfOut(derived(f.name, o.mode), await (await pdftext()).recolourPdf(f.bytes, o.mode, progress))),
  }),
};

type HandOpts = { text: string; style: "neat" | "cursive" | "casual"; paper: "plain" | "lined" | "grid"; ink: string; size: number; messiness: number };
const handDefaults: HandOpts = { text: "", style: "neat", paper: "lined", ink: "#1f3a93", size: 14, messiness: 45 };
const HandControls = ({ o, set }: { o: HandOpts; set: (p: Partial<HandOpts>) => void }) => (
  <>
    <Segmented label="Handwriting" value={o.style} onChange={(style) => set({ style })} options={[{ value: "neat", label: "Neat" }, { value: "casual", label: "Casual" }, { value: "cursive", label: "Cursive" }]} />
    <Segmented label="Paper" value={o.paper} onChange={(paper) => set({ paper })} options={[{ value: "lined", label: "Lined" }, { value: "grid", label: "Squared" }, { value: "plain", label: "Plain" }]} />
    <Segmented label="Ink" value={o.ink} onChange={(ink) => set({ ink })} options={[{ value: "#1f3a93", label: "Blue" }, { value: "#1b1b1f", label: "Black" }, { value: "#a3161a", label: "Red" }]} />
    <Slider label="Size" value={o.size} min={10} max={24} onChange={(size) => set({ size })} format={(v) => `${v} pt`} />
    <Slider label="Natural wobble" value={o.messiness} min={0} max={100} onChange={(messiness) => set({ messiness })} format={(v) => (v < 30 ? "Tidy" : v < 70 ? "Natural" : "Messy")} />
  </>
);
const textToHandwriting: ToolSpec<HandOpts> = {
  action: "Write it",
  defaults: handDefaults,
  noFiles: true,
  Options: ({ options: o, set }) => (
    <>
      <TextArea label="Your text" value={o.text} onChange={(text) => set({ text })} placeholder="Type or paste the notes to write out…" rows={9} />
      <HandControls o={o} set={set} />
    </>
  ),
  validate: (_f, o) => (o.text.trim() ? null : "Type or paste some text first."),
  run: async (_f, o, progress) => {
    const { textToHandwriting: render } = await import("@/lib/tools/handwriting");
    return { files: [pdfOut("handwritten-notes.pdf", await render(o.text, o, progress))] };
  },
};
const pdfToHandwriting: ToolSpec<HandOpts> = {
  action: "Write it",
  defaults: handDefaults,
  Options: ({ options: o, set }) => <HandControls o={o} set={set} />,
  run: async ([f], o, progress) => {
    const { text, empty, pages: n } = await (await pdftext()).extractText(f.bytes, progress);
    if (empty === n) throw new Error("This PDF has no selectable text (it looks scanned). Run OCR PDF first.");
    const clean = text.replace(/^--- Page \d+ ---\n/gm, "");
    const { textToHandwriting: render } = await import("@/lib/tools/handwriting");
    return { files: [pdfOut(derived(f.name, "handwritten"), await render(clean, o, progress))] };
  },
};

// ─── Convert to PDF ─────────────────────────────────────────────────

const markdownToPdf: ToolSpec<{ landscape: boolean }> = {
  action: "Convert to PDF",
  defaults: { landscape: false },
  Options: ({ options: o, set }) => (
    <>
      <Toggle label="Landscape" checked={o.landscape} onChange={(landscape) => set({ landscape })} />
      <Note>Headings, lists, tables, code blocks and links are kept. Images must be embedded in the file to appear.</Note>
    </>
  ),
  run: async (files, o, progress) => {
    const d = await documents();
    return {
      files: await eachFile(files, progress, async (f) => pdfOut(`${stem(f.name)}.pdf`, await printHtml(d.htmlDocument(stem(f.name), d.markdownToHtml(decodeText(f))), stem(f.name), o.landscape))),
    };
  },
};

const csvToPdf: ToolSpec<{ header: boolean }> = {
  action: "Convert to PDF",
  defaults: { header: true },
  Options: ({ options: o, set }) => (
    <>
      <Toggle label="First row is a header" hint="Repeated at the top of every page." checked={o.header} onChange={(header) => set({ header })} />
      <Note>Wide tables switch to landscape automatically. Commas, semicolons and tabs are all understood.</Note>
    </>
  ),
  run: async (files, o, progress) => {
    const d = await documents();
    return {
      files: await eachFile(files, progress, async (f) => {
        const rows = d.parseCsv(decodeText(f));
        if (!rows.length) throw new Error(`${f.name} is empty.`);
        return pdfOut(`${stem(f.name)}.pdf`, await printHtml(d.csvToHtml(rows, { header: o.header, title: stem(f.name) }), stem(f.name)));
      }),
    };
  },
};

const ebookToPdf: ToolSpec<Record<string, never>> = {
  action: "Convert to PDF",
  defaults: {},
  Options: () => <Note>EPUB books (DRM-free), plain text and HTML files. Chapters start on a new page and pictures are kept.</Note>,
  run: async (files, _o, progress) => {
    const d = await documents();
    return {
      files: await eachFile(files, progress, async (f) => {
        const ext = f.name.split(".").pop()?.toLowerCase();
        let html: string;
        let title = stem(f.name);
        if (ext === "epub") {
          const r = d.epubToHtml(f.bytes, title);
          html = r.html;
          title = r.title;
        } else if (ext === "html" || ext === "htm" || ext === "xhtml") {
          const src = decodeText(f).replace(/<script[\s\S]*?<\/script>/gi, "");
          html = d.htmlDocument(title, src.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? src);
        } else html = d.textToHtml(decodeText(f), title);
        progress("Typesetting…");
        return pdfOut(`${title.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 100)}.pdf`, await printHtml(html, title));
      }),
    };
  },
};

// ─── Convert from PDF ───────────────────────────────────────────────

const markdownOf = async (f: LoadedFile, progress: (m: string, f?: number) => void) => {
  const { pdfToMarkdown } = await import("@/lib/tools/processors/office");
  return pdfToMarkdown(f.bytes, { pageBreaks: true }, (d, t) => progress(`Reading page ${Math.min(d + 1, t)} of ${t}…`, d / t));
};

const pdfToHtml: ToolSpec<Record<string, never>> = {
  action: "Convert to HTML",
  defaults: {},
  Options: () => <Note>A clean, readable web page with headings, lists and tables, ready to publish or edit.</Note>,
  run: async ([f], _o, progress) => {
    const d = await documents();
    const html = d.pdfMarkdownToHtml(await markdownOf(f, progress), stem(f.name));
    return { files: [textFile(`${stem(f.name)}.html`, html, "text/html")], text: { content: html, filename: `${stem(f.name)}.html` } };
  },
};

const pdfToEpub: ToolSpec<{ author: string }> = {
  action: "Convert to EPUB",
  defaults: { author: "" },
  Options: ({ options: o, set }) => (
    <>
      <TextInput label="Author (optional)" value={o.author} onChange={(author) => set({ author })} />
      <Note>Text reflows on any e-reader (Kindle via Send to Kindle, Apple Books, Kobo). One chapter per page.</Note>
    </>
  ),
  run: async ([f], o, progress) => {
    const d = await documents();
    const epub = d.markdownToEpub(await markdownOf(f, progress), stem(f.name), o.author.trim());
    return { files: [{ name: `${stem(f.name)}.epub`, bytes: epub, type: "application/epub+zip" }] };
  },
};

const pdfToCsv: ToolSpec<{ together: boolean }> = {
  action: "Convert to CSV",
  defaults: { together: true },
  Options: ({ options: o, set }) => (
    <>
      <Toggle label="All pages in one file" hint="Off: one CSV file per page." checked={o.together} onChange={(together) => set({ together })} />
      <Note>Columns are detected from how the text lines up. Works best on PDFs with selectable text.</Note>
    </>
  ),
  run: async ([f], o, progress) => {
    const d = await documents();
    const tables = await (await pdftext()).pdfTables(f.bytes, progress);
    if (!tables.some((t) => t.length)) throw new Error("No text found. If this is a scan, run OCR PDF first.");
    if (o.together) {
      const csv = d.rowsToCsv(tables.flatMap((t, i) => (i ? [[], ...t] : t)));
      return { files: [textFile(`${stem(f.name)}.csv`, "﻿" + csv, "text/csv")] };
    }
    return { files: tables.map((t, i) => textFile(`${stem(f.name)}-page-${i + 1}.csv`, "﻿" + d.rowsToCsv(t), "text/csv")) };
  },
};

const extractTextSpec: ToolSpec<Record<string, never>> = {
  action: "Extract text",
  defaults: {},
  Options: () => <Note>All the text in reading order, as a plain .txt file you can copy anywhere.</Note>,
  run: async ([f], _o, progress) => {
    const r = await (await pdftext()).extractText(f.bytes, progress);
    if (r.empty === r.pages) throw new Error("This PDF has no selectable text (it looks scanned). Run OCR PDF first.");
    return {
      files: [textFile(`${stem(f.name)}.txt`, r.text)],
      text: { content: r.text, filename: `${stem(f.name)}.txt` },
      summary: r.empty ? `${r.empty} of ${r.pages} pages had no text (scanned?).` : undefined,
    };
  },
};

const extractImagesSpec: ToolSpec<Record<string, never>> = {
  action: "Extract images",
  defaults: {},
  Options: () => <Note>Photos and graphics inside the PDF, at their original quality.</Note>,
  run: async (files, _o, progress) => {
    const { extractImages } = await import("@/lib/tools/processors/images");
    const out: ToolFile[] = [];
    for (const [i, f] of files.entries()) {
      progress(`Reading ${f.name}…`, i / files.length);
      out.push(...(await extractImages(f)));
    }
    if (!out.length) throw new Error("No images found in this PDF.");
    return { files: out, summary: `${out.length} image${out.length === 1 ? "" : "s"} found.` };
  },
};

// ─── Security & privacy ─────────────────────────────────────────────

const removeRestrictions: ToolSpec<Record<string, never>> = {
  action: "Remove restrictions",
  defaults: {},
  Options: () => <Note>For PDFs you can open but not print, copy from or edit. Only use it on documents you're allowed to change.</Note>,
  run: async (files, _o, progress) => {
    let freed = 0;
    const out = await eachFile(files, progress, async (f) => {
      const r = await (await pages()).removeRestrictions(f.bytes);
      if (r.wasRestricted) freed++;
      return pdfOut(derived(f.name, "unrestricted"), r.bytes);
    });
    return { files: out, summary: freed ? `Restrictions removed from ${freed} file${freed === 1 ? "" : "s"}.` : "These files had no restrictions." };
  },
};

const PII_CHOICES: { kind: PiiKind; label: string }[] = [
  { kind: "aadhaar", label: "Aadhaar" },
  { kind: "pan", label: "PAN" },
  { kind: "card", label: "Card numbers" },
  { kind: "email", label: "Emails" },
  { kind: "phone", label: "Phone numbers" },
  { kind: "gstin", label: "GSTIN" },
  { kind: "ifsc", label: "IFSC" },
  { kind: "iban", label: "IBAN" },
];
const autoRedact: ToolSpec<{ kinds: PiiKind[] }> = {
  action: "Find & redact",
  defaults: { kinds: ["aadhaar", "pan", "card", "email", "phone", "gstin"] },
  Options: ({ options: o, set }) => (
    <>
      <p className="text-[13px] font-medium">Remove</p>
      <div className="grid grid-cols-2 gap-x-3">
        {PII_CHOICES.map((c) => (
          <Toggle key={c.kind} label={c.label} checked={o.kinds.includes(c.kind)} onChange={(on) => set({ kinds: on ? [...o.kinds, c.kind] : o.kinds.filter((k) => k !== c.kind) })} />
        ))}
      </div>
      <Note>Aadhaar and card numbers are checked against their check digits, so ordinary numbers aren't removed. The text is deleted from the file, not just covered.</Note>
    </>
  ),
  validate: (_f, o) => (o.kinds.length ? null : "Choose at least one kind of data."),
  run: async (files, o, progress) => {
    const { piiCount } = await import("@/lib/tools/pii");
    const totals: Partial<Record<PiiKind, number>> = {};
    const out = await eachFile(files, progress, async (f) => {
      const r = await (await pdftext()).redactPersonalData(f.bytes, o.kinds, progress);
      for (const [k, n] of Object.entries(r.counts)) totals[k as PiiKind] = (totals[k as PiiKind] ?? 0) + (n ?? 0);
      return pdfOut(derived(f.name, "redacted"), r.bytes);
    });
    const parts = Object.entries(totals).map(([k, n]) => piiCount(k as PiiKind, n ?? 0));
    return { files: out, summary: parts.length ? `Removed ${parts.join(", ")}.` : "No personal data of the chosen kinds was found." };
  },
};

const privacyScanner: ToolSpec<{ clean: boolean }> = {
  action: "Scan for private data",
  defaults: { clean: false },
  Options: ({ options: o, set }) => (
    <>
      <Note>Checks the text for Aadhaar, PAN, card, phone and bank details, and the file for hidden properties, scripts, attachments and comments.</Note>
      <Toggle label="Also make a cleaned copy" hint="Redacts what's found and removes hidden properties." checked={o.clean} onChange={(clean) => set({ clean })} />
    </>
  ),
  run: async ([f], o, progress) => {
    const t = await pdftext();
    const report = await t.privacyReport(f.bytes, progress);
    const md = t.reportToMarkdown(f.name, report);
    const files: ToolFile[] = [];
    if (o.clean) {
      progress("Cleaning…", 0.95);
      const red = await t.redactPersonalData(f.bytes, report.pii.map((p) => p.kind), progress);
      const blank = { title: "", author: "", subject: "", keywords: "", creator: "", producer: "", created: "", modified: "" };
      files.push(pdfOut(derived(f.name, "cleaned"), await (await pages()).writeMetadata(red.bytes, blank)));
    }
    const found = report.pii.reduce((n, p) => n + p.count, 0);
    return {
      files,
      text: { content: md, filename: `${stem(f.name)}-privacy-report.md` },
      summary: found ? `${found} piece${found === 1 ? "" : "s"} of personal data found.` : "No personal data found in the text.",
    };
  },
};

const fingerprintSpec: ToolSpec<Record<string, never>> = {
  action: "Generate fingerprints",
  defaults: {},
  Options: () => <Note>SHA-256, SHA-1 and MD5 of any file, calculated on your device. Compare them to prove a file hasn't changed.</Note>,
  run: async (files, _o, progress) => {
    const { fingerprint } = await import("@/lib/tools/hash");
    const lines: string[] = [];
    for (const [i, f] of files.entries()) {
      progress(`Hashing ${f.name}…`, i / files.length);
      const r = await fingerprint(f.name, f.bytes);
      lines.push(`${r.name} (${formatBytes(r.size)})`, `SHA-256  ${r.sha256}`, `SHA-1    ${r.sha1}`, `MD5      ${r.md5}`, "");
    }
    const content = lines.join("\n");
    return { files: [textFile("fingerprints.txt", content)], text: { content, filename: "fingerprints.txt" } };
  },
};

// ─── Images ─────────────────────────────────────────────────────────

const thumbmark: ToolSpec<{ ink: string; strength: number }> = {
  action: "Make thumbmark",
  defaults: { ink: "#1f2a6b", strength: 55 },
  Options: ({ options: o, set }) => (
    <>
      <Segmented label="Ink" value={o.ink} onChange={(ink) => set({ ink })} options={[{ value: "#1f2a6b", label: "Blue" }, { value: "#5b2a86", label: "Violet" }, { value: "#111111", label: "Black" }]} />
      <Slider label="Strength" value={o.strength} min={0} max={100} onChange={(strength) => set({ strength })} format={(v) => (v < 35 ? "Light" : v < 70 ? "Normal" : "Strong")} />
      <Note>Press your inked thumb on white paper and take a sharp photo in good light. You get a transparent PNG to place on forms.</Note>
    </>
  ),
  run: async (files, o, progress) => {
    const { makeThumbmark } = await import("@/lib/tools/thumbmark");
    return { files: await eachFile(files, progress, (f) => makeThumbmark(f, o)) };
  },
};

export const MORE_SPECS: Record<string, ToolSpec<never>> = {
  "alternate-mix": alternateMix,
  "pages-per-sheet": pagesPerSheet,
  "flip-pdf": flip,
  "split-in-half": splitHalf,
  "split-by-size": splitSize,
  "split-by-bookmarks": splitBookmarks,
  "split-by-text": splitText,
  "pdf-to-zip": pdfToZip,
  "gst-filing-prep": gstFilingPrep,
  "bates-numbering": bates,
  "header-footer": headerFooter,
  "flatten-pdf": flatten,
  "edit-metadata": editMetadata,
  "invert-colours": invert,
  "text-to-handwriting": textToHandwriting,
  "pdf-to-handwriting": pdfToHandwriting,
  "markdown-to-pdf": markdownToPdf,
  "csv-to-pdf": csvToPdf,
  "ebook-to-pdf": ebookToPdf,
  "pdf-to-html": pdfToHtml,
  "pdf-to-epub": pdfToEpub,
  "pdf-to-csv": pdfToCsv,
  "extract-text": extractTextSpec,
  "extract-images": extractImagesSpec,
  "remove-restrictions": removeRestrictions,
  "auto-redact-pii": autoRedact,
  "privacy-scanner": privacyScanner,
  "file-fingerprint": fingerprintSpec,
  "thumbmark-maker": thumbmark,
} as unknown as Record<string, ToolSpec<never>>;
