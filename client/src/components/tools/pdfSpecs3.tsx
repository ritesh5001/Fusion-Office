"use client";

/**
 * PDF tool screens added in the third wave: single-purpose page tools, scan
 * clean-up, fitting a file under a size, stamps, QR codes, bookmarks,
 * attachments and bank statements. Engines load only when a tool runs.
 */
import { useEffect } from "react";
import { PDF, derived, formatBytes, parseRanges, selectPages, stem, type ToolFile } from "@/lib/tools/files";
import { parseSize } from "@/lib/image/encode";
import type { Position } from "@/lib/tools/processors/stamp";
import type { Paper } from "@/lib/tools/processors/pageOps";
import type { BlankSensitivity } from "@/lib/tools/scanMath";
import type { LoadedFile, ProgressFn, ToolSpec } from "./ToolRunner";
import { ColorField, NumberField, PagesField, PositionPicker, Segmented, Select, Slider, TextArea, TextInput, Toggle } from "./controls";
import { TargetSize } from "./imageSpecs";

const ops = () => import("@/lib/tools/processors/pageOps");
const scan = () => import("@/lib/tools/processors/scanClean");
const organize = () => import("@/lib/tools/processors/organize");
const pdftext = () => import("@/lib/tools/processors/pdftext");

const pdfOut = (name: string, bytes: Uint8Array): ToolFile => ({ name, bytes, type: PDF });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const MM = 72 / 25.4;

const Note = ({ children }: { children: React.ReactNode }) => <p className="text-[12px] leading-relaxed text-fg-muted">{children}</p>;

async function eachFile(files: LoadedFile[], progress: ProgressFn, fn: (f: LoadedFile, report: ProgressFn) => Promise<ToolFile>) {
  const out: ToolFile[] = [];
  for (const [i, f] of files.entries()) {
    const label = files.length > 1 ? `File ${i + 1} of ${files.length}: ` : "";
    progress(`${label}Processing…`, i / files.length);
    out.push(await fn(f, (m, frac) => progress(`${label}${m}`, (i + (frac ?? 0)) / files.length)));
  }
  return out;
}

const countOf = async (f: LoadedFile) => f.pages ?? (await (await organize()).pageCount(f.bytes));
const pagesOf = async (f: LoadedFile, spec: string) => selectPages(spec, await countOf(f));
/** "2, 5-7" → unique 0-based pages in the order typed. */
const listed = async (f: LoadedFile, spec: string) => [...new Set(parseRanges(spec, await countOf(f)).flat())];

const PAPER_OPTIONS: { value: Paper; label: string }[] = [
  { value: "a4", label: "A4" },
  { value: "letter", label: "Letter" },
  { value: "legal", label: "Legal" },
  { value: "a3", label: "A3" },
  { value: "a5", label: "A5" },
];

// ─── Organize ───────────────────────────────────────────────────────

const deletePages: ToolSpec<{ pages: string }> = {
  action: "Delete pages",
  defaults: { pages: "" },
  Options: ({ options: o, set, files }) => (
    <>
      <TextInput label="Pages to delete" hint={`Numbers and ranges, like 2, 5-7. This PDF has ${files[0]?.pages ?? "?"} pages.`} value={o.pages} onChange={(pages) => set({ pages })} placeholder="2, 5-7" />
      <Note>The new file contains only the pages you keep, so the deleted ones can&apos;t be recovered from it. To pick pages by looking at them, use Organize PDF.</Note>
    </>
  ),
  validate: (_f, o) => (o.pages.trim() ? null : "Type the pages to delete, like 2, 5-7."),
  run: async ([f], o) => {
    const r = await (await ops()).deletePages(f.bytes, await listed(f, o.pages));
    return { files: [pdfOut(derived(f.name, "pages-removed"), r.bytes)], summary: `${plural(r.removed, "page")} deleted, ${r.kept} kept.` };
  },
};

const extractPages: ToolSpec<{ pages: string; separate: boolean }> = {
  action: "Extract pages",
  defaults: { pages: "", separate: false },
  Options: ({ options: o, set, files }) => (
    <>
      <TextInput label="Pages to extract" hint={`In the order you type them. This PDF has ${files[0]?.pages ?? "?"} pages.`} value={o.pages} onChange={(pages) => set({ pages })} placeholder="1, 4-6, 9" />
      <Toggle label="One file per page" hint="Off: all the chosen pages go into one PDF." checked={o.separate} onChange={(separate) => set({ separate })} />
    </>
  ),
  validate: (_f, o) => (o.pages.trim() ? null : "Type the pages to extract, like 1, 4-6."),
  run: async ([f], o) => {
    const pages = await listed(f, o.pages);
    if (o.separate) {
      const parts = await (await organize()).splitPdf(f.bytes, pages.map((p) => [p]));
      return { files: parts.map((b, i) => pdfOut(derived(f.name, `page-${pages[i] + 1}`), b)), summary: `${plural(pages.length, "page")} saved as separate files.` };
    }
    return { files: [pdfOut(derived(f.name, "extract"), await (await ops()).extractPages(f.bytes, pages))], summary: `${plural(pages.length, "page")} extracted into one PDF.` };
  },
};

type BlankOpts = { where: "start" | "end" | "after" | "every"; page: number; count: number };
const addBlank: ToolSpec<BlankOpts> = {
  action: "Add blank pages",
  defaults: { where: "end", page: 1, count: 1 },
  Options: ({ options: o, set, files }) => (
    <>
      <Segmented
        label="Where"
        value={o.where}
        onChange={(where) => set({ where })}
        options={[
          { value: "start", label: "At the start" },
          { value: "end", label: "At the end" },
          { value: "after", label: "After a page" },
          { value: "every", label: "After every page", hint: "For one-sided printing on a duplex printer" },
        ]}
      />
      {o.where === "after" && <NumberField label="After page" value={o.page} min={1} max={files[0]?.pages} onChange={(page) => set({ page })} />}
      <NumberField label={o.where === "every" ? "Blank pages after each" : "How many"} value={o.count} min={1} max={50} onChange={(count) => set({ count })} />
      <Note>Each blank page takes the size of the page next to it.</Note>
    </>
  ),
  validate: (_f, o) => (o.count >= 1 ? null : "Add at least one blank page."),
  run: async (files, o, progress) => {
    let added = 0;
    const out = await eachFile(files, progress, async (f) => {
      const r = await (await ops()).insertBlankPages(f.bytes, o);
      added += r.added;
      return pdfOut(derived(f.name, "with-blanks"), r.bytes);
    });
    return { files: out, summary: `${plural(added, "blank page")} added.` };
  },
};

const reverse: ToolSpec<Record<string, never>> = {
  action: "Reverse order",
  defaults: {},
  Options: () => <Note>The last page becomes the first. Useful for stacks that were scanned back to front.</Note>,
  run: async (files, _o, progress) => ({ files: await eachFile(files, progress, async (f) => pdfOut(derived(f.name, "reversed"), await (await ops()).reversePages(f.bytes))) }),
};

type BookletOpts = { paper: "a4" | "letter" | "a3"; rightToLeft: boolean };
const booklet: ToolSpec<BookletOpts> = {
  action: "Make booklet",
  defaults: { paper: "a4", rightToLeft: false },
  Options: ({ options: o, set, files }) => {
    const n = files[0]?.pages;
    return (
      <>
        <Segmented label="Sheet" value={o.paper} onChange={(paper) => set({ paper })} options={[{ value: "a4", label: "A4", hint: "A5 booklet" }, { value: "a3", label: "A3", hint: "A4 booklet" }, { value: "letter", label: "Letter" }]} />
        <Toggle label="Right-to-left book" hint="Binds on the right, for Urdu, Arabic and Hebrew." checked={o.rightToLeft} onChange={(rightToLeft) => set({ rightToLeft })} />
        {n ? <Note>{n} pages need {plural(Math.ceil(n / 4), "sheet")} of paper{n % 4 ? `, with ${4 - (n % 4)} blank at the end` : ""}.</Note> : null}
        <Note>Print double-sided, flipping on the short edge, then fold the stack in half and staple the fold.</Note>
      </>
    );
  },
  run: async (files, o, progress) => {
    let sheets = 0;
    const out = await eachFile(files, progress, async (f) => {
      const r = await (await ops()).bookletPdf(f.bytes, o);
      sheets += r.sheets;
      return pdfOut(derived(f.name, "booklet"), r.bytes);
    });
    return { files: out, summary: `Ready to print on ${plural(sheets, "sheet")}, double-sided (flip on the short edge).` };
  },
};

type PosterOpts = { cols: number; rows: number; paper: Paper; overlap: number; pages: string };
const poster: ToolSpec<PosterOpts> = {
  action: "Make poster",
  defaults: { cols: 2, rows: 2, paper: "a4", overlap: 10, pages: "1" },
  Options: ({ options: o, set }) => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Sheets across" value={o.cols} min={1} max={10} onChange={(cols) => set({ cols })} />
        <NumberField label="Sheets down" value={o.rows} min={1} max={10} onChange={(rows) => set({ rows })} />
      </div>
      <Select label="Print on" value={o.paper} onChange={(paper) => set({ paper })} options={PAPER_OPTIONS} />
      <NumberField label="Overlap for gluing" value={o.overlap} min={0} max={30} suffix="mm" onChange={(overlap) => set({ overlap })} />
      <PagesField value={o.pages} onChange={(pages) => set({ pages })} label="Pages to enlarge" />
      <Note>Each page is enlarged across {o.cols * o.rows} sheets. Print at 100% (&quot;actual size&quot;), trim one edge of each sheet and tape them together.</Note>
    </>
  ),
  validate: (_f, o) => (o.cols * o.rows > 1 ? null : "Choose at least two sheets, such as 2 across and 1 down."),
  run: async ([f], o, progress) => {
    progress("Cutting the page into sheets…");
    const r = await (await ops()).posterPdf(f.bytes, { ...o, overlap: o.overlap * MM }, await pagesOf(f, o.pages));
    return { files: [pdfOut(derived(f.name, `poster-${o.cols}x${o.rows}`), r.bytes)], summary: `${plural(r.sheets, "sheet")} to print and join.` };
  },
};

// ─── Optimize ───────────────────────────────────────────────────────

type TargetOpts = { target: string; grayscale: boolean; allowPages: boolean };
const compressToSize: ToolSpec<TargetOpts> = {
  action: "Compress to this size",
  defaults: { target: "200", grayscale: false, allowPages: true },
  Options: ({ options: o, set, files }) => (
    <>
      <TargetSize label="Maximum size" value={o.target} onChange={(target) => set({ target })} picks={["100", "200", "300", "500", "1 MB", "2 MB"]} />
      {files.length > 0 && <Note>{files.length === 1 ? `This file is ${formatBytes(files[0].bytes.length)}.` : `${files.length} files, each brought under the limit.`}</Note>}
      <Toggle
        label="Turn pages into pictures if needed"
        hint="Reaches very small sizes like 100 KB. Text on those pages stops being selectable; turn off to keep text as text."
        checked={o.allowPages}
        onChange={(allowPages) => set({ allowPages })}
      />
      <Toggle label="Grayscale" hint="Black and white pages are smaller." checked={o.grayscale} onChange={(grayscale) => set({ grayscale })} />
    </>
  ),
  validate: (_f, o) => (parseSize(o.target) ? null : "Enter a size, like 200 (KB) or 1 MB."),
  run: async (files, o, progress) => {
    const target = parseSize(o.target)!;
    const lines: string[] = [];
    const out = await eachFile(files, progress, async (f, report) => {
      const r = await (await scan()).compressPdfToSize(f.bytes, target, o, report);
      const name = files.length > 1 ? `${f.name}: ` : "";
      lines.push(
        r.method === "original" && r.fits
          ? `${name}already ${formatBytes(r.after)}, so it was left as it is.`
          : r.fits
            ? `${name}${formatBytes(r.before)} → ${formatBytes(r.after)}${r.method === "pages" ? ` (pages saved as ${r.dpi} DPI pictures)` : " (text kept selectable)"}.`
            : `${name}couldn't get under ${formatBytes(target)}; the smallest version is ${formatBytes(r.after)}.${o.allowPages ? " Try Split by size." : " Allow pages to become pictures to go lower."}`,
      );
      return pdfOut(derived(f.name, r.fits ? `under-${o.target.replace(/\s+/g, "").toLowerCase()}${/[a-z]/i.test(o.target) ? "" : "kb"}` : "compressed"), r.bytes);
    });
    return { files: out, summary: <div className="space-y-1">{lines.map((l, i) => <p key={i}>{l}</p>)}</div> };
  },
};

const removeBlank: ToolSpec<{ sensitivity: BlankSensitivity }> = {
  action: "Remove blank pages",
  defaults: { sensitivity: "normal" },
  Options: ({ options: o, set }) => (
    <>
      <Segmented
        label="What counts as blank"
        value={o.sensitivity}
        onChange={(sensitivity) => set({ sensitivity })}
        options={[
          { value: "strict", label: "Strict", hint: "Only clean, empty pages" },
          { value: "normal", label: "Normal", hint: "Ignores scanner dust" },
          { value: "loose", label: "Loose", hint: "Also faint marks and show-through" },
        ]}
      />
      <Note>Each page is checked as a picture, so empty scanned pages are found too. Page numbers or a header count as content.</Note>
    </>
  ),
  run: async (files, o, progress) => {
    const lines: string[] = [];
    const out = await eachFile(files, progress, async (f, report) => {
      const r = await (await scan()).removeBlankPages(f.bytes, o.sensitivity, report);
      const name = files.length > 1 ? `${f.name}: ` : "";
      lines.push(r.removed.length ? `${name}removed ${plural(r.removed.length, "blank page")} (${r.removed.map((p) => p + 1).join(", ")}) of ${r.pages}.` : `${name}no blank pages found.`);
      return pdfOut(derived(f.name, "no-blanks"), r.bytes);
    });
    return { files: out, summary: <div className="space-y-1">{lines.map((l, i) => <p key={i}>{l}</p>)}</div> };
  },
};

const deskew: ToolSpec<Record<string, never>> = {
  action: "Straighten pages",
  defaults: {},
  Options: () => (
    <>
      <Note>Measures how far each scanned page is tilted (up to 12°) from its lines of text and turns it upright. Pages that are already straight aren&apos;t touched.</Note>
      <Note>Nothing is re-scanned or blurred: the page is turned as it is, so text and image quality stay the same.</Note>
    </>
  ),
  run: async (files, _o, progress) => {
    const lines: string[] = [];
    const out = await eachFile(files, progress, async (f, report) => {
      const r = await (await scan()).deskewPdf(f.bytes, 0.3, report);
      const worst = Math.max(0, ...r.angles.map(Math.abs));
      const name = files.length > 1 ? `${f.name}: ` : "";
      lines.push(r.fixed ? `${name}${plural(r.fixed, "page")} straightened (largest tilt ${worst.toFixed(1)}°).` : `${name}every page is already straight.`);
      return pdfOut(derived(f.name, "straightened"), r.bytes);
    });
    return { files: out, summary: <div className="space-y-1">{lines.map((l, i) => <p key={i}>{l}</p>)}</div> };
  },
};

const trim: ToolSpec<{ padding: number; uniform: boolean }> = {
  action: "Trim margins",
  defaults: { padding: 4, uniform: true },
  Options: ({ options: o, set }) => (
    <>
      <NumberField label="Space to leave around the content" value={o.padding} min={0} max={40} suffix="mm" onChange={(padding) => set({ padding })} />
      <Toggle label="Same crop on every page" hint="Pages keep one size. Off: each page is trimmed to its own content." checked={o.uniform} onChange={(uniform) => set({ uniform })} />
      <Note>Finds the white margin around the text and pictures and crops it away, which makes pages easier to read on a phone or e-reader. To choose the area yourself, use Crop PDF.</Note>
    </>
  ),
  run: async (files, o, progress) => ({
    files: await eachFile(files, progress, async (f, report) => pdfOut(derived(f.name, "trimmed"), (await (await scan()).trimMargins(f.bytes, { padding: o.padding * MM, uniform: o.uniform }, report)).bytes)),
    summary: "Margins trimmed. The hidden area isn't deleted from the file; use Redact PDF to remove content for good.",
  }),
};

type ResizeOpts = { paper: Paper; orientation: "auto" | "portrait" | "landscape"; margin: number; pages: string };
const resizePages: ToolSpec<ResizeOpts> = {
  action: "Change page size",
  defaults: { paper: "a4", orientation: "auto", margin: 0, pages: "all" },
  Options: ({ options: o, set }) => (
    <>
      <Select label="New page size" value={o.paper} onChange={(paper) => set({ paper })} options={PAPER_OPTIONS} />
      <Segmented label="Orientation" value={o.orientation} onChange={(orientation) => set({ orientation })} options={[{ value: "auto", label: "Keep each page's" }, { value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }]} />
      <NumberField label="Margin" value={o.margin} min={0} max={50} suffix="mm" onChange={(margin) => set({ margin })} />
      <PagesField value={o.pages} onChange={(pages) => set({ pages })} />
      <Note>Each page is scaled to fit the new size and centred, never stretched. Text stays sharp and selectable. Links and fillable form fields on resized pages aren&apos;t kept.</Note>
    </>
  ),
  run: async (files, o, progress) => ({
    files: await eachFile(files, progress, async (f) =>
      pdfOut(derived(f.name, o.paper), await (await ops()).resizePages(f.bytes, { paper: o.paper, orientation: o.orientation, margin: o.margin * MM }, o.pages.trim().toLowerCase() === "all" || !o.pages.trim() ? undefined : await pagesOf(f, o.pages))),
    ),
    summary: `Pages set to ${PAPER_OPTIONS.find((p) => p.value === o.paper)!.label}.`,
  }),
};

const grayscale: ToolSpec<Record<string, never>> = {
  action: "Convert to grayscale",
  defaults: {},
  Options: () => (
    <>
      <Note>Every page becomes a black-and-white picture, which saves colour ink and is what many offices ask for.</Note>
      <Note>Text on the pages stops being selectable. To keep text as text and only grey the photos, use Compress PDF with “Grayscale images” on.</Note>
    </>
  ),
  run: async (files, _o, progress) => ({
    files: await eachFile(files, progress, async (f, report) => pdfOut(derived(f.name, "grayscale"), await (await pdftext()).recolourPdf(f.bytes, "grayscale", report))),
  }),
};

// ─── Edit ───────────────────────────────────────────────────────────

type StampOpts = { preset: string; text: string; subtext: string; date: boolean; color: string; position: Position; scale: number; rotation: number; opacity: number; pages: string };
const STAMPS = [
  ["paid", "PAID", "#15803d"],
  ["approved", "APPROVED", "#15803d"],
  ["received", "RECEIVED", "#1d4ed8"],
  ["verified", "VERIFIED", "#1d4ed8"],
  ["original", "ORIGINAL", "#1d4ed8"],
  ["copy", "COPY", "#1d4ed8"],
  ["draft", "DRAFT", "#6b7280"],
  ["confidential", "CONFIDENTIAL", "#b91c1c"],
  ["rejected", "REJECTED", "#b91c1c"],
  ["cancelled", "CANCELLED", "#b91c1c"],
  ["urgent", "URGENT", "#b91c1c"],
  ["custom", "Your own text…", "#1d4ed8"],
] as const;
const todayText = () => new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const stampSpec: ToolSpec<StampOpts> = {
  action: "Stamp PDF",
  defaults: { preset: "paid", text: "PAID", subtext: "", date: true, color: "#15803d", position: "top-right", scale: 0.32, rotation: -12, opacity: 0.85, pages: "1" },
  Options: ({ options: o, set }) => (
    <>
      <Select
        label="Stamp"
        value={o.preset}
        onChange={(preset) => {
          const s = STAMPS.find((x) => x[0] === preset)!;
          set(preset === "custom" ? { preset, text: "" } : { preset, text: s[1], color: s[2] });
        }}
        options={STAMPS.map(([value, label]) => ({ value, label: value === "custom" ? label : label.charAt(0) + label.slice(1).toLowerCase() }))}
      />
      {o.preset === "custom" && <TextInput label="Stamp text" value={o.text} onChange={(text) => set({ text })} placeholder="e.g. CHECKED" />}
      <Toggle label="Add today's date" checked={o.date} onChange={(date) => set({ date })} />
      <TextInput label="Second line (optional)" hint="A name, a receipt number or your own date." value={o.subtext} onChange={(subtext) => set({ subtext })} />
      <ColorField label="Ink colour" value={o.color} onChange={(color) => set({ color })} />
      <PositionPicker value={o.position} onChange={(position) => set({ position })} />
      <Slider label="Size" value={Math.round(o.scale * 100)} min={12} max={70} onChange={(v) => set({ scale: v / 100 })} format={(v) => `${v}% of page width`} />
      <Slider label="Tilt" value={o.rotation} min={-45} max={45} onChange={(rotation) => set({ rotation })} format={(v) => `${v}°`} />
      <Slider label="Ink strength" value={Math.round(o.opacity * 100)} min={30} max={100} onChange={(v) => set({ opacity: v / 100 })} format={(v) => `${v}%`} />
      <PagesField value={o.pages} onChange={(pages) => set({ pages })} />
    </>
  ),
  validate: (_f, o) => (o.text.trim() ? null : "Type the stamp text."),
  run: async (files, o, progress) => {
    const subtext = [o.date ? todayText() : "", o.subtext.trim()].filter(Boolean).join(" - ");
    return {
      files: await eachFile(files, progress, async (f) => pdfOut(derived(f.name, o.text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "stamped"), await (await ops()).stampPdf(f.bytes, { ...o, subtext, margin: 28 }, await pagesOf(f, o.pages)))),
    };
  },
};

type QrOpts = { text: string; label: string; position: Position; size: number; pages: string };
const qrSpec: ToolSpec<QrOpts> = {
  action: "Add QR code",
  defaults: { text: "", label: "", position: "bottom-right", size: 25, pages: "1" },
  Options: ({ options: o, set }) => (
    <>
      <TextArea label="Link or text in the code" value={o.text} onChange={(text) => set({ text })} placeholder="https://example.com/verify/123 or upi://pay?pa=name@bank" rows={3} />
      <TextInput label="Caption under the code (optional)" value={o.label} onChange={(label) => set({ label })} placeholder="Scan to verify" />
      <PositionPicker value={o.position} onChange={(position) => set({ position })} />
      <Slider label="Size" value={o.size} min={15} max={60} onChange={(size) => set({ size })} format={(v) => `${v} mm`} />
      <PagesField value={o.pages} onChange={(pages) => set({ pages })} />
      <Note>Made on your device. Keep the code at least 20 mm wide so phone cameras read it from paper.</Note>
    </>
  ),
  validate: (_f, o) => (o.text.trim() ? (o.text.trim().length > 1200 ? "That's too much text for one QR code. Use a shorter link." : null) : "Type the link or text for the QR code."),
  run: async (files, o, progress) => ({
    files: await eachFile(files, progress, async (f) => pdfOut(derived(f.name, "qr"), await (await ops()).qrStampPdf(f.bytes, { text: o.text, label: o.label, position: o.position, size: o.size * MM, margin: 24 }, await pagesOf(f, o.pages)))),
  }),
};

type BookmarkOpts = { text: string; loadedFor: string; found: number };
const bookmarks: ToolSpec<BookmarkOpts> = {
  action: "Save bookmarks",
  defaults: { text: "", loadedFor: "", found: 0 },
  Options: function BookmarkOptions({ options: o, set, files }) {
    const f = files[0];
    // Show the PDF's current bookmarks once per file.
    useEffect(() => {
      if (!f || o.loadedFor === f.id) return;
      let alive = true;
      Promise.all([pdftext(), ops()])
        .then(async ([t, p]) => {
          const list = await t.readBookmarks(f.bytes);
          if (alive) set({ text: p.bookmarksToText(list), loadedFor: f.id, found: list.length });
        })
        .catch(() => alive && set({ loadedFor: f.id, found: 0 }));
      return () => {
        alive = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [f?.id]);
    return (
      <>
        <TextArea label="Bookmarks" hint="One per line: the page number, then the title. Indent with two spaces to nest one under another." value={o.text} onChange={(text) => set({ text })} rows={12} placeholder={"1 Introduction\n4 Chapter 1\n  6 Background\n12 Chapter 2"} />
        <Note>
          {o.loadedFor === f?.id ? (o.found ? `${plural(o.found, "bookmark")} found in this PDF. Edit, reorder or add lines.` : "This PDF has no bookmarks yet. Type them above.") : "Reading bookmarks…"} The PDF has {f?.pages ?? "?"} pages. Leave the box empty to remove all bookmarks.
        </Note>
      </>
    );
  },
  run: async ([f], o) => {
    const p = await ops();
    const list = p.parseBookmarks(o.text, await countOf(f));
    return { files: [pdfOut(derived(f.name, "bookmarks"), await p.writeBookmarks(f.bytes, list))], summary: list.length ? `${plural(list.length, "bookmark")} saved. The PDF opens with its bookmark panel showing.` : "All bookmarks removed." };
  },
};

const isPdf = (f: LoadedFile) => f.type === PDF || /\.pdf$/i.test(f.name);
type AttachOpts = { mode: "extract" | "add" | "remove" };
const attachments: ToolSpec<AttachOpts> = {
  action: "Go",
  defaults: { mode: "extract" },
  reorderable: true,
  Options: ({ options: o, set, files }) => (
    <>
      <Segmented
        label="What to do"
        value={o.mode}
        onChange={(mode) => set({ mode })}
        options={[
          { value: "extract", label: "Extract", hint: "Save the files inside" },
          { value: "add", label: "Add", hint: "Embed files in the PDF" },
          { value: "remove", label: "Remove", hint: "Delete all attachments" },
        ]}
      />
      {o.mode === "add" ? (
        <Note>
          The first file must be the PDF. Every file after it is embedded inside ({Math.max(0, files.length - 1)} so far): spreadsheets, images, other PDFs, anything. Readers show them in their attachments panel.
        </Note>
      ) : (
        <Note>{o.mode === "extract" ? "Saves every file embedded in the PDF, including paperclip attachments on pages, exactly as it was added." : "Deletes every embedded file from the PDF. The pages aren't changed."}</Note>
      )}
    </>
  ),
  validate: (files, o) =>
    !files[0] || !isPdf(files[0]) ? "The first file must be a PDF." : o.mode === "add" && files.length < 2 ? "Add the files to attach after the PDF (use “Add more files”)." : o.mode !== "add" && files.length > 1 ? "To attach these files to the PDF, choose Add above. Extract and Remove work on one PDF." : null,
  run: async (files, o, progress) => {
    const p = await ops();
    const [pdf, ...rest] = files;
    if (o.mode === "add") {
      progress("Embedding files…");
      const bytes = await p.addAttachments(pdf.bytes, rest.map((f) => ({ name: f.name, bytes: f.bytes, type: f.type })));
      return { files: [pdfOut(derived(pdf.name, "with-attachments"), bytes)], summary: `${plural(rest.length, "file")} attached (${formatBytes(rest.reduce((n, f) => n + f.bytes.length, 0))}).` };
    }
    const found = await p.listAttachments(pdf.bytes);
    if (o.mode === "extract") {
      if (!found.length) throw new Error("This PDF has no attachments.");
      return { files: found.map((a) => ({ name: a.name, bytes: a.bytes, type: a.type })), summary: `${plural(found.length, "attachment")} found.` };
    }
    if (!found.length) return { files: [pdfOut(pdf.name, pdf.bytes)], summary: "This PDF had no attachments, so nothing changed." };
    return { files: [pdfOut(derived(pdf.name, "no-attachments"), await p.removeAttachments(pdf.bytes))], summary: `${plural(found.length, "attachment")} removed.` };
  },
};

type AnnotOpts = { keepLinks: boolean; keepFormFields: boolean; pages: string };
const removeAnnotations: ToolSpec<AnnotOpts> = {
  action: "Remove annotations",
  defaults: { keepLinks: true, keepFormFields: true, pages: "all" },
  Options: ({ options: o, set }) => (
    <>
      <Note>Deletes comments, sticky notes, highlights, underlines, stamps and pen drawings that were added on top of the pages. The pages themselves aren&apos;t changed.</Note>
      <Toggle label="Keep links" checked={o.keepLinks} onChange={(keepLinks) => set({ keepLinks })} />
      <Toggle label="Keep form fields" hint="Turn off to strip a form's fillable boxes too." checked={o.keepFormFields} onChange={(keepFormFields) => set({ keepFormFields })} />
      <PagesField value={o.pages} onChange={(pages) => set({ pages })} />
    </>
  ),
  run: async (files, o, progress) => {
    let removed = 0;
    const out = await eachFile(files, progress, async (f) => {
      const r = await (await ops()).removeAnnotations(f.bytes, o, await pagesOf(f, o.pages));
      removed += r.removed;
      return pdfOut(derived(f.name, "clean"), r.bytes);
    });
    return { files: out, summary: removed ? `${plural(removed, "annotation")} removed.` : "No annotations were found on these pages." };
  },
};

// ─── Bank statement ─────────────────────────────────────────────────

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const bankStatement: ToolSpec<Record<string, never>> = {
  action: "Convert to Excel",
  defaults: {},
  Options: () => (
    <>
      <Note>Finds the transactions in a bank statement and gives you one clean sheet: date, description, reference, debit, credit and balance, with real dates and numbers ready for totals, filters and Tally or GST working papers.</Note>
      <Note>Works on statements downloaded from net banking (text PDFs). For a password-protected statement use Unlock PDF first; for a scanned one, run OCR PDF first.</Note>
    </>
  ),
  run: async (files, _o, progress) => {
    const { parseStatement, statementRows, STATEMENT_COLUMNS } = await import("@/lib/tools/bankStatement");
    const { rowsToCsv } = await import("@/lib/tools/documents");
    const { default: ExcelJS } = await import("exceljs");
    const out: ToolFile[] = [];
    const lines: string[] = [];
    for (const [i, f] of files.entries()) {
      const tables = await (await pdftext()).pdfTables(f.bytes, (m, frac) => progress(m, (i + (frac ?? 0)) / files.length));
      if (!tables.some((t) => t.length)) throw new Error(`${f.name} has no selectable text. If it's a scan, run OCR PDF first.`);
      const s = parseStatement(tables);
      if (!s.txns.length) throw new Error(`No transactions were found in ${f.name}. Try PDF to Excel for a plain copy of its tables.`);
      const wb = new ExcelJS.Workbook();
      wb.creator = "Fusion Office";
      const ws = wb.addWorksheet("Transactions", { views: [{ state: "frozen", ySplit: 1 }] });
      ws.columns = [
        { header: STATEMENT_COLUMNS[0], width: 13, style: { numFmt: "dd-mm-yyyy" } },
        { header: STATEMENT_COLUMNS[1], width: 56 },
        { header: STATEMENT_COLUMNS[2], width: 22 },
        { header: STATEMENT_COLUMNS[3], width: 15, style: { numFmt: "#,##0.00" } },
        { header: STATEMENT_COLUMNS[4], width: 15, style: { numFmt: "#,##0.00" } },
        { header: STATEMENT_COLUMNS[5], width: 16, style: { numFmt: "#,##0.00" } },
      ];
      ws.getRow(1).font = { bold: true };
      for (const t of s.txns) ws.addRow([new Date(`${t.date}T00:00:00Z`), t.description, t.ref, t.debit, t.credit, t.balance]);
      const last = s.txns.length + 1;
      const total = ws.addRow(["", "Total", "", { formula: `SUM(D2:D${last})`, result: s.totalDebit }, { formula: `SUM(E2:E${last})`, result: s.totalCredit }, ""]);
      total.font = { bold: true };
      ws.autoFilter = { from: "A1", to: `F${last}` };
      out.push({ name: `${stem(f.name)}.xlsx`, bytes: new Uint8Array(await wb.xlsx.writeBuffer()), type: XLSX });
      out.push({ name: `${stem(f.name)}.csv`, bytes: new TextEncoder().encode("﻿" + rowsToCsv(statementRows(s))), type: "text/csv" });
      const inr = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const check = s.checked ? (s.reconciled === s.checked ? " Every row agrees with the running balance." : ` ${s.checked - s.reconciled} of ${s.checked} rows don't agree with the running balance: check those against the PDF.`) : "";
      lines.push(`${files.length > 1 ? `${f.name}: ` : ""}${plural(s.txns.length, "transaction")} · debits ₹${inr(s.totalDebit)} · credits ₹${inr(s.totalCredit)}.${check}`);
    }
    return { files: out, summary: <div className="space-y-1">{lines.map((l, i) => <p key={i}>{l}</p>)}</div> };
  },
};

export const PDF_SPECS_3 = {
  "delete-pdf-pages": deletePages,
  "extract-pdf-pages": extractPages,
  "add-blank-pages": addBlank,
  "reverse-pdf": reverse,
  "booklet-pdf": booklet,
  "poster-pdf": poster,
  "compress-pdf-to-size": compressToSize,
  "remove-blank-pages": removeBlank,
  "deskew-pdf": deskew,
  "trim-pdf-margins": trim,
  "resize-pdf-pages": resizePages,
  "grayscale-pdf": grayscale,
  "stamp-pdf": stampSpec,
  "qr-code-pdf": qrSpec,
  "pdf-bookmarks": bookmarks,
  "pdf-attachments": attachments,
  "remove-annotations": removeAnnotations,
  "bank-statement-to-excel": bankStatement,
};
