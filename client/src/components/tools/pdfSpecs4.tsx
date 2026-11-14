"use client";

/**
 * Fourth wave: archive and web formats (PDF/A, web-optimized, SVG, TIFF, PNG),
 * Office format conversion, email to PDF, PDF to JSON, scan clean-up,
 * splitting at separator sheets, letterhead overlay, sanitizing, and digital
 * signatures with a certificate. Engines load only when a tool runs.
 */
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { PDF, derived, formatBytes, selectPages, stem, type ToolFile } from "@/lib/tools/files";
import type { Position } from "@/lib/tools/processors/stamp";
import type { BlankSensitivity, EnhanceMode } from "@/lib/tools/scanMath";
import type { LoadedFile, ProgressFn, ToolSpec } from "./ToolRunner";
import { NumberField, PagesField, PositionPicker, Segmented, Select, TextInput, Toggle } from "./controls";

const pdfOut = (name: string, bytes: Uint8Array): ToolFile => ({ name, bytes, type: PDF });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const Note = ({ children }: { children: React.ReactNode }) => <p className="text-[12px] leading-relaxed text-fg-muted">{children}</p>;
const Warn = ({ children }: { children: React.ReactNode }) => <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[12px] leading-relaxed text-amber-200">{children}</p>;
const isPdf = (f: Pick<LoadedFile, "name" | "type">) => f.type === PDF || /\.pdf$/i.test(f.name);
const scan = () => import("@/lib/tools/processors/scanClean");
const countOf = async (f: LoadedFile) => f.pages ?? (await (await import("@/lib/tools/processors/organize")).pageCount(f.bytes));

async function serverError(res: Response) {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return new Error(data.error ?? (res.status === 503 ? "This tool isn't available on the server yet." : `The server couldn't process this file (${res.status}).`));
}

/** Send a file's bytes to a server engine. */
async function sendFile(path: string, f: Pick<ToolFile, "name" | "bytes">) {
  const res = await apiFetch(path, {
    method: "POST",
    headers: { "content-type": "application/octet-stream", "x-filename": encodeURIComponent(f.name) },
    body: new Blob([f.bytes as BlobPart]),
  });
  if (!res.ok) throw await serverError(res);
  return res;
}

async function eachFile(files: LoadedFile[], progress: ProgressFn, fn: (f: LoadedFile, report: ProgressFn) => Promise<ToolFile | ToolFile[]>) {
  const out: ToolFile[] = [];
  for (const [i, f] of files.entries()) {
    const label = files.length > 1 ? `File ${i + 1} of ${files.length}: ` : "";
    progress(`${label}Working…`, i / files.length);
    const r = await fn(f, (m, frac) => progress(`${label}${m}`, (i + (frac ?? 0)) / files.length));
    out.push(...(Array.isArray(r) ? r : [r]));
  }
  return out;
}

// ─── Archive and web ────────────────────────────────────────────────

const pdfa: ToolSpec<{ level: "1b" | "2b" | "3b" }> = {
  action: "Convert to PDF/A",
  defaults: { level: "2b" },
  Options: ({ options: o, set }) => (
    <>
      <Segmented
        label="PDF/A version"
        value={o.level}
        onChange={(level) => set({ level })}
        options={[
          { value: "2b", label: "PDF/A-2b", hint: "Recommended, keeps transparency" },
          { value: "1b", label: "PDF/A-1b", hint: "Oldest, widest acceptance" },
          { value: "3b", label: "PDF/A-3b", hint: "Allows attached files" },
        ]}
      />
      <Note>Fonts are embedded and colours fixed to sRGB so the file looks the same in decades. Courts, tax portals and archives often ask for PDF/A. Converted on our server; the file is deleted right after.</Note>
    </>
  ),
  run: async (files, o, progress) => ({
    files: await eachFile(files, progress, async (f) => pdfOut(derived(f.name, "pdfa"), new Uint8Array(await (await sendFile(`/api/convert/pdfa?level=${o.level}`, f)).arrayBuffer()))),
    summary: `Converted to PDF/A-${o.level.toUpperCase().replace("B", "b")}. Scripts, encryption and other things PDF/A doesn't allow were removed.`,
  }),
};

const webOptimize: ToolSpec<Record<string, never>> = {
  action: "Optimize for web",
  defaults: {},
  Options: () => (
    <>
      <Note>Reorders the file (“linearizes” it) so a browser shows the first page while the rest is still downloading. Nothing on the pages changes.</Note>
      <Note>Best for PDFs you put on a website. To make the file smaller as well, run Compress PDF first.</Note>
    </>
  ),
  run: async (files, _o, progress) => {
    const lines: string[] = [];
    const out = await eachFile(files, progress, async (f) => {
      const res = await sendFile("/api/convert/linearize", f);
      const bytes = new Uint8Array(await res.arrayBuffer());
      lines.push(`${files.length > 1 ? `${f.name}: ` : ""}${res.headers.get("x-already-linearized") === "1" ? "was already web-optimized; " : ""}${formatBytes(f.bytes.length)} → ${formatBytes(bytes.length)}.`);
      return pdfOut(derived(f.name, "web"), bytes);
    });
    return { files: out, summary: <div className="space-y-1">{lines.map((l, i) => <p key={i}>{l}</p>)}</div> };
  },
};

const pdfToSvg: ToolSpec<{ pages: string }> = {
  action: "Convert to SVG",
  defaults: { pages: "all" },
  Options: ({ options: o, set, files }) => (
    <>
      <PagesField value={o.pages} onChange={(pages) => set({ pages })} />
      <Note>Each page becomes an SVG with real vector shapes and text, for Illustrator, Inkscape, Figma or the web. Up to 40 pages at a time; converted on our server and deleted right after.</Note>
      {files[0]?.pages && files[0].pages > 40 && <Warn>This PDF has {files[0].pages} pages. Choose up to 40, such as 1-40.</Warn>}
    </>
  ),
  run: async ([f], o, progress) => {
    const pages = selectPages(o.pages, await countOf(f));
    if (pages.length > 40) throw new Error("Choose at most 40 pages at a time.");
    const out: ToolFile[] = [];
    // Contiguous runs, one request each.
    const runs: [number, number][] = [];
    for (const p of pages) {
      const last = runs[runs.length - 1];
      if (last && last[1] === p - 1) last[1] = p;
      else runs.push([p, p]);
    }
    for (const [k, [a, b]] of runs.entries()) {
      progress(`Converting pages ${a + 1}–${b + 1}…`, k / runs.length);
      const res = await sendFile(`/api/convert/svg?first=${a + 1}&last=${b + 1}`, f);
      const { pages: svgs } = (await res.json()) as { pages: string[] };
      svgs.forEach((svg, i) => out.push({ name: derived(f.name, `page-${a + i + 1}`, "svg"), bytes: new TextEncoder().encode(svg), type: "image/svg+xml" }));
    }
    return { files: out, summary: `${plural(out.length, "page")} converted to SVG.` };
  },
};

type TiffOpts = { dpi: number; gray: boolean; together: boolean; pages: string };
const pdfToTiff: ToolSpec<TiffOpts> = {
  action: "Convert to TIFF",
  defaults: { dpi: 200, gray: false, together: true, pages: "all" },
  Options: ({ options: o, set }) => (
    <>
      <Segmented label="Resolution" value={o.dpi} onChange={(dpi) => set({ dpi })} options={[{ value: 150, label: "150 DPI" }, { value: 200, label: "200 DPI", hint: "Fax and archives" }, { value: 300, label: "300 DPI", hint: "Print" }]} />
      <Toggle label="Grayscale" hint="Smaller files; usual for scanned documents." checked={o.gray} onChange={(gray) => set({ gray })} />
      <Toggle label="All pages in one multi-page TIFF" hint="Off: one TIFF per page." checked={o.together} onChange={(together) => set({ together })} />
      <PagesField value={o.pages} onChange={(pages) => set({ pages })} />
    </>
  ),
  run: async ([f], o, progress) => {
    const pages = selectPages(o.pages, await countOf(f));
    const tiffs = await (await scan()).pdfToTiff(f.bytes, { ...o, pages }, progress);
    const files = o.together ? [{ name: derived(f.name, "", "tiff"), bytes: tiffs[0], type: "image/tiff" }] : tiffs.map((t, i) => ({ name: derived(f.name, `page-${pages[i] + 1}`, "tiff"), bytes: t, type: "image/tiff" }));
    return { files, summary: `${plural(pages.length, "page")} at ${o.dpi} DPI${o.gray ? ", grayscale" : ""}.` };
  },
};

const pdfToPng: ToolSpec<{ dpi: number; pages: string; transparent: boolean }> = {
  action: "Convert to PNG",
  defaults: { dpi: 150, pages: "all", transparent: false },
  Options: ({ options: o, set }) => (
    <>
      <Segmented label="Quality" value={o.dpi} onChange={(dpi) => set({ dpi })} options={[{ value: 96, label: "Screen" }, { value: 150, label: "Standard" }, { value: 300, label: "Print" }]} />
      <PagesField value={o.pages} onChange={(pages) => set({ pages })} />
      <Note>PNG keeps text and lines perfectly sharp, which suits slides, diagrams and screenshots. For photos, PDF to JPG makes smaller files.</Note>
    </>
  ),
  run: async ([f], o, progress) => {
    const { pdfToImages } = await import("@/lib/tools/processors/images");
    const files = await pdfToImages(f, { format: "png", dpi: o.dpi, pages: selectPages(o.pages, await countOf(f)) }, (d, t) => progress(`Rendering page ${Math.min(d + 1, t)} of ${t}…`, d / t));
    return { files, summary: `${plural(files.length, "image")} ready.` };
  },
};

// ─── Office formats ─────────────────────────────────────────────────

const OFFICE_TARGETS: Record<string, { value: string; label: string; hint: string }[]> = {
  doc: [
    { value: "docx", label: "Word (.docx)", hint: "Modern Word" },
    { value: "odt", label: "ODT", hint: "LibreOffice Writer" },
    { value: "rtf", label: "RTF", hint: "Opens anywhere" },
    { value: "txt", label: "Plain text", hint: ".txt" },
    { value: "pdf", label: "PDF", hint: "" },
  ],
  sheet: [
    { value: "xlsx", label: "Excel (.xlsx)", hint: "Modern Excel" },
    { value: "ods", label: "ODS", hint: "LibreOffice Calc" },
    { value: "csv", label: "CSV", hint: "First sheet" },
    { value: "xls", label: "Excel 97 (.xls)", hint: "Old Excel" },
    { value: "pdf", label: "PDF", hint: "" },
  ],
  slides: [
    { value: "pptx", label: "PowerPoint (.pptx)", hint: "Modern PowerPoint" },
    { value: "odp", label: "ODP", hint: "LibreOffice Impress" },
    { value: "ppt", label: "PowerPoint 97 (.ppt)", hint: "Old PowerPoint" },
    { value: "pdf", label: "PDF", hint: "" },
  ],
};
const kindOf = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["doc", "docx", "odt", "rtf", "pdf"].includes(ext)) return "doc";
  if (["xls", "xlsx", "ods", "csv"].includes(ext)) return "sheet";
  if (["ppt", "pptx", "odp"].includes(ext)) return "slides";
  return null;
};
const OFFICE_MIME: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  rtf: "application/rtf",
  txt: "text/plain",
  csv: "text/csv",
  doc: "application/msword",
  xls: "application/vnd.ms-excel",
  ppt: "application/vnd.ms-powerpoint",
  pdf: PDF,
};

const officeConverter: ToolSpec<{ doc: string; sheet: string; slides: string }> = {
  action: "Convert",
  defaults: { doc: "odt", sheet: "ods", slides: "odp" },
  Options: ({ options: o, set, files }) => {
    const kinds = [...new Set(files.map((f) => kindOf(f.name)).filter((k): k is "doc" | "sheet" | "slides" => !!k))];
    return (
      <>
        {kinds.includes("doc") && <Select label="Documents become" value={o.doc} onChange={(doc) => set({ doc })} options={OFFICE_TARGETS.doc.map((t) => ({ value: t.value, label: t.hint ? `${t.label} · ${t.hint}` : t.label }))} />}
        {kinds.includes("sheet") && <Select label="Spreadsheets become" value={o.sheet} onChange={(sheet) => set({ sheet })} options={OFFICE_TARGETS.sheet.map((t) => ({ value: t.value, label: t.hint ? `${t.label} · ${t.hint}` : t.label }))} />}
        {kinds.includes("slides") && <Select label="Presentations become" value={o.slides} onChange={(slides) => set({ slides })} options={OFFICE_TARGETS.slides.map((t) => ({ value: t.value, label: t.hint ? `${t.label} · ${t.hint}` : t.label }))} />}
        {files.some((f) => isPdf(f)) && <Note>PDFs are first turned into an editable Word document on your device, then into the format you choose.</Note>}
        <Note>Between Word, OpenDocument (LibreOffice), RTF, plain text, CSV and the old Office 97 formats. Converted on our server with LibreOffice; files are deleted right after.</Note>
      </>
    );
  },
  validate: (files) => (files.every((f) => kindOf(f.name)) ? null : "Choose Word, Excel, PowerPoint, OpenDocument, RTF, CSV or PDF files."),
  run: async (files, o, progress) => {
    const out = await eachFile(files, progress, async (f, report) => {
      const kind = kindOf(f.name)!;
      const to = o[kind];
      let input: Pick<ToolFile, "name" | "bytes"> = f;
      if (isPdf(f)) {
        if (to === "pdf") return { ...f, name: f.name };
        const { pdfToWord } = await import("@/lib/tools/processors/office");
        input = { name: `${stem(f.name)}.docx`, bytes: await pdfToWord(f.bytes, (d, t) => report(`Reading page ${Math.min(d + 1, t)} of ${t}…`, (d / t) * 0.5)) };
        if (to === "docx") return { name: input.name, bytes: input.bytes, type: OFFICE_MIME.docx };
      }
      report("Converting on the server…", 0.6);
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (ext === to) throw new Error(`${f.name} is already a .${to} file.`);
      const res = await sendFile(`/api/convert/office?to=${to}`, input);
      return { name: `${stem(f.name)}.${to}`, bytes: new Uint8Array(await res.arrayBuffer()), type: OFFICE_MIME[to] };
    });
    return { files: out, summary: `${plural(out.length, "file")} converted.` };
  },
};

// ─── Email to PDF ───────────────────────────────────────────────────

const emailToPdf: ToolSpec<{ attachments: boolean; images: boolean }> = {
  action: "Convert to PDF",
  defaults: { attachments: true, images: false },
  Options: ({ options: o, set }) => (
    <>
      <Toggle label="Also save the attachments" hint="Downloaded with the PDF, as they were sent." checked={o.attachments} onChange={(attachments) => set({ attachments })} />
      <Toggle label="Print attached photos after the message" checked={o.images} onChange={(images) => set({ images })} />
      <Note>For .eml files (Gmail “Download message”, Outlook on the web, Thunderbird, Apple Mail) and .msg files from Outlook. Sender, recipients, date and subject are printed above the message.</Note>
      <Note>Pictures loaded from the internet (often tracking pixels) are left out. The email is read on your device; only the finished page is printed on our server.</Note>
    </>
  ),
  run: async (files, o, progress) => {
    const mail = await import("@/lib/tools/mail");
    let blocked = 0;
    const out = await eachFile(files, progress, async (f, report) => {
      report("Reading the email…", 0.1);
      const m = /\.msg$/i.test(f.name) ? await mail.parseMsg(f.bytes) : mail.parseEml(f.bytes);
      const { html, blocked: b } = mail.mailToHtml(m, { appendImages: o.images });
      blocked += b;
      report("Printing to PDF…", 0.5);
      const res = await apiFetch("/api/convert/html", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ html, name: m.subject || stem(f.name) }) });
      if (!res.ok) throw await serverError(res);
      const base = (m.subject || stem(f.name)).replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80);
      const pdf = pdfOut(`${base}.pdf`, new Uint8Array(await res.arrayBuffer()));
      const atts = o.attachments ? m.attachments.filter((a) => !a.inline).map((a) => ({ name: `${base} - ${a.name}`, bytes: a.bytes, type: a.type })) : [];
      return [pdf, ...atts];
    });
    return { files: out, summary: `${plural(files.length, "email")} converted${blocked ? `; ${plural(blocked, "remote picture")} left out` : ""}.` };
  },
};

// ─── PDF → JSON ─────────────────────────────────────────────────────

const pdfToJson: ToolSpec<{ text: "none" | "pages" | "lines" }> = {
  action: "Convert to JSON",
  defaults: { text: "pages" },
  Options: ({ options: o, set }) => (
    <>
      <Segmented
        label="Text"
        value={o.text}
        onChange={(text) => set({ text })}
        options={[
          { value: "pages", label: "Per page" },
          { value: "lines", label: "Per line", hint: "With positions and sizes" },
          { value: "none", label: "Leave out", hint: "Structure only" },
        ]}
      />
      <Note>Document properties, pages, form fields and values, fonts, bookmarks, attachments, and a check for scripts and risky actions, as one JSON file for developers and data pipelines.</Note>
    </>
  ),
  run: async ([f], o, progress) => {
    progress("Reading the structure…", 0.05);
    const { pdfStructure } = await import("@/lib/tools/processors/inspect");
    const s = await pdfStructure(f.bytes);
    const { readBookmarks } = await import("@/lib/tools/processors/pdftext");
    const bookmarks = await readBookmarks(f.bytes).catch(() => []);
    const pages: Record<string, unknown>[] = s.pages.map((p) => ({ ...p }));
    if (o.text !== "none") {
      const { openPdf, pageTextRuns } = await import("@/lib/tools/pdfjs");
      const { groupLines } = await import("@/lib/tools/text");
      const pdf = await openPdf(f.bytes);
      try {
        for (let i = 0; i < pdf.numPages; i++) {
          progress(`Reading page ${i + 1} of ${pdf.numPages}…`, 0.1 + (i / pdf.numPages) * 0.85);
          const lines = groupLines((await pageTextRuns(pdf, i)).runs);
          if (o.text === "pages") pages[i].text = lines.map((l) => l.text).join("\n");
          else pages[i].lines = lines.map((l) => ({ text: l.text, x: Math.round(l.x * 10) / 10, y: Math.round(l.baseline * 10) / 10, size: Math.round(l.size * 10) / 10, bold: l.bold }));
        }
      } finally {
        await pdf.destroy();
      }
    }
    const json = JSON.stringify({ file: { name: f.name, size: f.bytes.length, pdfVersion: s.pdfVersion, pages: s.pages.length, encrypted: s.encrypted }, metadata: s.metadata, pages, form: s.form, bookmarks, fonts: s.fonts, attachments: s.attachments, security: s.risks }, null, 2);
    const r = s.risks;
    const flags = [r.javascript.length && `JavaScript (${r.javascript.join(", ")})`, r.launch && "actions that launch programs", r.submitForm && "form data sent to a web address", r.embeddedFiles && plural(r.embeddedFiles, "embedded file")].filter(Boolean);
    return {
      files: [{ name: `${stem(f.name)}.json`, bytes: new TextEncoder().encode(json), type: "application/json" }],
      text: { content: json.length > 200_000 ? `${json.slice(0, 200_000)}\n… (download the file for the rest)` : json, filename: `${stem(f.name)}.json` },
      summary: flags.length ? `Heads-up: this PDF contains ${flags.join(", ")}. Sanitize PDF removes them.` : `${plural(s.pages.length, "page")}; no scripts or risky actions found.`,
    };
  },
};

// ─── Scans ──────────────────────────────────────────────────────────

const enhanceScan: ToolSpec<{ mode: EnhanceMode; dpi: number }> = {
  action: "Improve scan",
  defaults: { mode: "auto", dpi: 200 },
  Options: ({ options: o, set }) => (
    <>
      <Segmented
        label="Result"
        value={o.mode}
        onChange={(mode) => set({ mode })}
        options={[
          { value: "auto", label: "Clean colour", hint: "White paper, sharper ink" },
          { value: "gray", label: "Clean grey", hint: "Like a good photocopy" },
          { value: "bw", label: "Black & white", hint: "Crisp text, smallest" },
          { value: "contrast", label: "More contrast", hint: "Keep everything else" },
        ]}
      />
      <Segmented label="Resolution" value={o.dpi} onChange={(dpi) => set({ dpi })} options={[{ value: 150, label: "150 DPI" }, { value: 200, label: "200 DPI" }, { value: 300, label: "300 DPI" }]} />
      <Note>Fixes phone-camera scans: shadows and uneven light are evened out, grey or yellow paper turns white and faint text gets darker.</Note>
      <Note>Pages become pictures, so run OCR PDF afterwards if you need to select or search the text.</Note>
    </>
  ),
  run: async (files, o, progress) => ({
    files: await eachFile(files, progress, async (f, report) => pdfOut(derived(f.name, "clean"), await (await scan()).enhanceScanPdf(f.bytes, o, report))),
  }),
};

type SepOpts = { mode: "blank" | "qr"; keep: boolean; match: string; sensitivity: BlankSensitivity };
const splitSeparator: ToolSpec<SepOpts> = {
  action: "Split at separators",
  defaults: { mode: "blank", keep: false, match: "", sensitivity: "normal" },
  Options: ({ options: o, set }) => (
    <>
      <Segmented
        label="Separator sheets are"
        value={o.mode}
        onChange={(mode) => set({ mode, keep: mode === "qr" ? o.keep : false })}
        options={[
          { value: "blank", label: "Blank pages", hint: "A blank sheet between documents" },
          { value: "qr", label: "Pages with a QR code", hint: "Cover sheets or labelled pages" },
        ]}
      />
      {o.mode === "blank" ? (
        <Segmented label="What counts as blank" value={o.sensitivity} onChange={(sensitivity) => set({ sensitivity })} options={[{ value: "strict", label: "Strict" }, { value: "normal", label: "Normal" }, { value: "loose", label: "Loose" }]} />
      ) : (
        <>
          <TextInput label="Only codes containing (optional)" hint="Leave empty to split at every QR code." value={o.match} onChange={(match) => set({ match })} placeholder="e.g. SPLIT or INV-" />
          <Toggle label="The QR page is the first page of each document" hint="Off: QR sheets are separators and are left out." checked={o.keep} onChange={(keep) => set({ keep })} />
        </>
      )}
      <Note>
        {o.mode === "blank"
          ? "Scan a stack of documents in one go with a blank sheet between them, and get one PDF per document."
          : "Each part is named after the QR code's text (an invoice number, a file name), so batches sort themselves."}
      </Note>
    </>
  ),
  run: async ([f], o, progress) => {
    const r = await (await scan()).splitAtSeparators(f.bytes, o, progress);
    return {
      files: r.parts.map((p) => pdfOut(`${p.name}.pdf`, p.bytes)),
      summary: `${plural(r.separators.length, "separator")} found (page${r.separators.length === 1 ? "" : "s"} ${r.separators.map((s) => s + 1).join(", ")}); ${plural(r.parts.length, "document")}.`,
    };
  },
};

// ─── Overlay ────────────────────────────────────────────────────────

type OverlayOpts = { mode: "over" | "under"; match: "first" | "same" | "cycle"; pages: "all" | "first" | "notFirst" | "odd" | "even"; fit: "stretch" | "contain" };
const overlay: ToolSpec<OverlayOpts> = {
  action: "Apply overlay",
  defaults: { mode: "under", match: "first", pages: "all", fit: "stretch" },
  minFiles: 2,
  reorderable: true,
  Options: ({ options: o, set, files }) => (
    <>
      <Note>
        {files.length < 2 ? "Add two PDFs: your document first, then the letterhead or overlay." : `“${files[0].name}” gets “${files[1].name}”${files.length > 2 ? " (other files are ignored)" : ""}. Use the arrows to swap them.`}
      </Note>
      <Segmented label="Place it" value={o.mode} onChange={(mode) => set({ mode })} options={[{ value: "under", label: "Underneath", hint: "Letterhead, background" }, { value: "over", label: "On top", hint: "Stamps, forms over text" }]} />
      <Select
        label="On which pages"
        value={o.pages}
        onChange={(pages) => set({ pages })}
        options={[
          { value: "all", label: "Every page" },
          { value: "first", label: "First page only" },
          { value: "notFirst", label: "All except the first" },
          { value: "odd", label: "Odd pages" },
          { value: "even", label: "Even pages" },
        ]}
      />
      {files[1]?.pages && files[1].pages > 1 && (
        <Segmented label="Overlay pages" value={o.match} onChange={(match) => set({ match })} options={[{ value: "first", label: "Always page 1" }, { value: "same", label: "Page by page", hint: "Last one repeats" }, { value: "cycle", label: "Repeat in turn" }]} />
      )}
      <Segmented label="Size" value={o.fit} onChange={(fit) => set({ fit })} options={[{ value: "stretch", label: "Fill the page" }, { value: "contain", label: "Keep proportions" }]} />
      <Note>Text stays selectable in both files. Tip: make the letterhead from your Word template with Word to PDF.</Note>
    </>
  ),
  validate: (files) => (files.length < 2 ? "Add your document and the overlay PDF." : files.slice(0, 2).every(isPdf) ? null : "Both files must be PDFs."),
  run: async ([doc, over], o, progress) => {
    progress("Applying the overlay…");
    const { overlayPdf } = await import("@/lib/tools/processors/inspect");
    const r = await overlayPdf(doc.bytes, over.bytes, o);
    return { files: [pdfOut(derived(doc.name, "overlay"), r.bytes)], summary: `Added to ${plural(r.pages, "page")}.` };
  },
};

// ─── Sanitize ───────────────────────────────────────────────────────

type SanOpts = { scripts: boolean; links: boolean; metadata: boolean; attachments: boolean; annotations: boolean };
const sanitize: ToolSpec<SanOpts> = {
  action: "Sanitize PDF",
  defaults: { scripts: true, links: false, metadata: true, attachments: true, annotations: false },
  Options: ({ options: o, set }) => (
    <>
      <Toggle label="Scripts and risky actions" hint="JavaScript, launching programs, sending form data, opening other files." checked={o.scripts} onChange={(scripts) => set({ scripts })} />
      <Toggle label="Hidden properties" hint="Author, software, dates and XMP metadata." checked={o.metadata} onChange={(metadata) => set({ metadata })} />
      <Toggle label="Attached files" checked={o.attachments} onChange={(attachments) => set({ attachments })} />
      <Toggle label="Links" hint="Web addresses in links and bookmarks." checked={o.links} onChange={(links) => set({ links })} />
      <Toggle label="Comments and markup" checked={o.annotations} onChange={(annotations) => set({ annotations })} />
      <Note>Removed items are deleted from the file itself, not just hidden. The pages look the same. Run it on PDFs from unknown senders, or before publishing a document.</Note>
    </>
  ),
  validate: (_f, o) => (Object.values(o).some(Boolean) ? null : "Choose at least one thing to remove."),
  run: async (files, o, progress) => {
    const { sanitizePdf } = await import("@/lib/tools/processors/inspect");
    const lines: string[] = [];
    const out = await eachFile(files, progress, async (f) => {
      const { bytes, report: r } = await sanitizePdf(f.bytes, o);
      const parts = [r.scripts && plural(r.scripts, "script"), r.actions && plural(r.actions, "risky action"), r.links && plural(r.links, "link"), r.attachments && plural(r.attachments, "attachment"), r.annotations && plural(r.annotations, "comment"), r.metadata && "hidden properties"].filter(Boolean);
      lines.push(`${files.length > 1 ? `${f.name}: ` : ""}${parts.length ? `removed ${parts.join(", ")}` : "nothing to remove; it was already clean"}.`);
      return pdfOut(derived(f.name, "sanitized"), bytes);
    });
    return { files: out, summary: <div className="space-y-1">{lines.map((l, i) => <p key={i}>{l}</p>)}</div> };
  },
};

// ─── Digital signatures ─────────────────────────────────────────────

const isCert = (f: Pick<LoadedFile, "name">) => /\.(pfx|p12)$/i.test(f.name);
type SignOpts = { password: string; reason: string; location: string; contact: string; visible: boolean; page: number; position: Position };
const signCertificate: ToolSpec<SignOpts> = {
  action: "Sign PDF",
  defaults: { password: "", reason: "", location: "", contact: "", visible: true, page: 1, position: "bottom-right" },
  minFiles: 2,
  Options: function SignOptions({ options: o, set, files }) {
    const [shown, setShown] = useState(false);
    const pdf = files.find(isPdf);
    const cert = files.find(isCert);
    return (
      <>
        <Note>{!pdf || !cert ? "Add the PDF and your certificate file (.pfx or .p12), using “Add more files” for the second." : `Signing “${pdf.name}” with “${cert.name}”.`}</Note>
        <label className="block space-y-1.5">
          <span className="text-[13px] font-medium text-fg">Certificate password</span>
          <div className="flex gap-2">
            <input type={shown ? "text" : "password"} autoComplete="off" value={o.password} onChange={(e) => set({ password: e.target.value })} className="h-10 min-w-0 flex-1 rounded-lg bg-sunken px-3 text-[14px] text-fg ring-1 ring-line-strong outline-none focus:ring-2 focus:ring-brand-500" />
            <button type="button" onClick={() => setShown((v) => !v)} className="h-10 rounded-lg px-3 text-[13px] text-fg-muted ring-1 ring-line-strong hover:text-fg">
              {shown ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        <TextInput label="Reason (optional)" value={o.reason} onChange={(reason) => set({ reason })} placeholder="I approve this document" />
        <TextInput label="Location (optional)" value={o.location} onChange={(location) => set({ location })} placeholder="Pune, India" />
        <Toggle label="Show a signature box on the page" checked={o.visible} onChange={(visible) => set({ visible })} />
        {o.visible && (
          <>
            <NumberField label="On page" value={o.page} min={1} max={pdf?.pages} onChange={(page) => set({ page })} />
            <PositionPicker value={o.position} onChange={(position) => set({ position })} />
          </>
        )}
        <Note>The signature is made on your device: the certificate and its password never leave it. It is a standard PDF digital signature (PKCS#7, SHA-256) that Adobe Acrobat Reader verifies.</Note>
        <Warn>USB-token DSCs (ePass, ProxKey and similar) can&apos;t be used from a web page. Use a .pfx/.p12 certificate file, or the token&apos;s own signing software.</Warn>
      </>
    );
  },
  validate: (files, o) => (!files.some(isPdf) ? "Add the PDF to sign." : !files.some(isCert) ? "Add your certificate file (.pfx or .p12)." : !o.password ? "Enter the certificate password." : null),
  run: async (files, o, progress) => {
    const pdf = files.find(isPdf)!;
    const cert = files.find(isCert)!;
    progress("Opening the certificate…", 0.2);
    const sig = await import("@/lib/tools/signature");
    const id = sig.readCertificateFile(cert.bytes, o.password);
    progress("Signing…", 0.6);
    const bytes = await sig.signPdf(pdf.bytes, id, { reason: o.reason, location: o.location, contact: o.contact, visible: o.visible ? { page: o.page, position: o.position } : null });
    const until = id.validTo.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return {
      files: [pdfOut(derived(pdf.name, "signed"), bytes)],
      summary: `Signed by ${id.name}${id.issuer && id.issuer !== id.name ? `, certificate from ${id.issuer}` : " (self-signed certificate)"}, valid until ${until}. Don't edit the signed file: any change makes the signature invalid.`,
    };
  },
};

const verifySignature: ToolSpec<Record<string, never>> = {
  action: "Check signatures",
  defaults: {},
  Options: () => (
    <>
      <Note>Lists every digital signature in the PDF: who signed, when, with which certificate, and whether the document has changed since.</Note>
      <Note>Checked on your device. Whether the certificate&apos;s issuer is trusted (a licensed certifying authority) isn&apos;t checked; Adobe Acrobat Reader shows that.</Note>
    </>
  ),
  run: async (files, _o, progress) => {
    const sig = await import("@/lib/tools/signature");
    const reports: string[] = [];
    let total = 0;
    let bad = 0;
    for (const [i, f] of files.entries()) {
      progress(`Checking ${f.name}…`, i / files.length);
      const list = await sig.checkSignatures(f.bytes);
      total += list.length;
      bad += list.filter((s) => s.intact === false).length;
      reports.push(sig.signatureReportMarkdown(f.name, list));
    }
    const md = reports.join("\n\n---\n\n");
    return {
      files: [],
      text: { content: md, filename: `${files.length === 1 ? stem(files[0].name) : "signatures"}-signature-report.md` },
      summary: !total ? "No digital signatures found." : bad ? `${plural(bad, "signature")} of ${total} ${bad === 1 ? "is" : "are"} not valid.` : `${plural(total, "signature")} found, all valid for the signed content.`,
    };
  },
};

export const PDF_SPECS_4 = {
  "pdf-to-pdfa": pdfa,
  "web-optimize-pdf": webOptimize,
  "pdf-to-svg": pdfToSvg,
  "pdf-to-tiff": pdfToTiff,
  "pdf-to-png": pdfToPng,
  "office-converter": officeConverter,
  "email-to-pdf": emailToPdf,
  "pdf-to-json": pdfToJson,
  "enhance-scan": enhanceScan,
  "split-by-separator": splitSeparator,
  "overlay-pdf": overlay,
  "sanitize-pdf": sanitize,
  "sign-pdf-certificate": signCertificate,
  "verify-pdf-signature": verifySignature,
};
