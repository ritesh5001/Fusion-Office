"use client";

/**
 * Tools that read a PDF with pdf.js in the browser: split by bookmarks or by
 * text, extract text, invert colours, find and redact personal data, and the
 * privacy report.
 */
import { PDFArray, PDFDict, PDFDocument, PDFName } from "pdf-lib";
import { canvasToBytes, openPdf, pageTextRuns, renderToCanvas } from "../pdfjs";
import { detectPii, mask, PII_LABEL, type PiiKind, type PiiMatch } from "../pii";
import type { TextRun } from "../text";

type Progress = (message: string, fraction?: number) => void;

// ─── Split by bookmarks / text ────────────────────────────────────

export interface Part {
  title: string;
  start: number;
}

/** Top-level bookmarks and the page each starts on, in page order. */
export async function bookmarkParts(bytes: Uint8Array): Promise<Part[]> {
  const pdf = await openPdf(bytes);
  try {
    const outline = (await pdf.getOutline()) ?? [];
    const parts: Part[] = [];
    for (const item of outline) {
      try {
        const dest = typeof item.dest === "string" ? await pdf.getDestination(item.dest) : item.dest;
        if (!dest?.[0]) continue;
        const start = typeof dest[0] === "number" ? dest[0] : await pdf.getPageIndex(dest[0]);
        parts.push({ title: item.title.trim() || `Part ${parts.length + 1}`, start });
      } catch {
        /* bookmark without a usable destination */
      }
    }
    return parts.sort((a, b) => a.start - b.start).filter((p, i, all) => i === 0 || p.start !== all[i - 1].start);
  } finally {
    await pdf.destroy();
  }
}

/** Pages whose text contains `phrase` (case-insensitive, spacing-tolerant). */
export async function pagesContaining(bytes: Uint8Array, phrase: string, progress?: Progress): Promise<number[]> {
  const needle = phrase.toLowerCase().replace(/\s+/g, " ").trim();
  const pdf = await openPdf(bytes);
  try {
    const hits: number[] = [];
    for (let i = 0; i < pdf.numPages; i++) {
      progress?.(`Reading page ${i + 1} of ${pdf.numPages}…`, i / pdf.numPages);
      const content = await (await pdf.getPage(i + 1)).getTextContent();
      const text = content.items
        .map((it) => ("str" in it ? it.str : ""))
        .join(" ")
        .toLowerCase()
        .replace(/\s+/g, " ");
      if (text.includes(needle)) hits.push(i);
    }
    return hits;
  } finally {
    await pdf.destroy();
  }
}

/** Page groups that start at each page in `starts` (the pages before the first start stay together). */
export function groupsFromStarts(starts: number[], pageCount: number): number[][] {
  const s = [...new Set(starts.filter((p) => p > 0 && p < pageCount))].sort((a, b) => a - b);
  const bounds = [0, ...s, pageCount];
  return bounds.slice(0, -1).map((from, i) => Array.from({ length: bounds[i + 1] - from }, (_, k) => from + k));
}

// ─── Extract text ─────────────────────────────────────────────────

/** All text in reading order, one line per text line, pages separated. */
export async function extractText(bytes: Uint8Array, progress?: Progress): Promise<{ text: string; pages: number; empty: number }> {
  const pdf = await openPdf(bytes);
  try {
    const pages: string[] = [];
    let empty = 0;
    for (let i = 0; i < pdf.numPages; i++) {
      progress?.(`Reading page ${i + 1} of ${pdf.numPages}…`, i / pdf.numPages);
      const content = await (await pdf.getPage(i + 1)).getTextContent();
      let out = "";
      for (const it of content.items) {
        if (!("str" in it)) continue;
        out += it.str;
        if (it.hasEOL) out += "\n";
      }
      const clean = out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      if (!clean) empty++;
      pages.push(`--- Page ${i + 1} ---\n${clean}`);
    }
    return { text: pages.join("\n\n") + "\n", pages: pdf.numPages, empty };
  } finally {
    await pdf.destroy();
  }
}

// ─── Tables (PDF → CSV) ───────────────────────────────────────────

/** Each page's text as rows and columns, from how the text lines up. */
export async function pdfTables(bytes: Uint8Array, progress?: Progress): Promise<string[][][]> {
  const { groupLines, lineCells, alignColumns } = await import("../text");
  const pdf = await openPdf(bytes);
  try {
    const tables: string[][][] = [];
    for (let i = 0; i < pdf.numPages; i++) {
      progress?.(`Reading page ${i + 1} of ${pdf.numPages}…`, i / pdf.numPages);
      const lines = groupLines((await pageTextRuns(pdf, i)).runs);
      tables.push(alignColumns(lines.map((l) => lineCells(l))));
    }
    return tables;
  } finally {
    await pdf.destroy();
  }
}

// ─── Invert colours ───────────────────────────────────────────────

export type ColourMode = "dark" | "sepia" | "grayscale" | "contrast";

function recolour(data: Uint8ClampedArray, mode: ColourMode) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (mode === "dark") {
      // Invert lightness but keep hues (pure inversion turns red into cyan).
      const k = 255 - l;
      const s = l > 0 ? k / Math.max(l, 1) : 1;
      data[i] = Math.min(255, Math.max(0, r === g && g === b ? k : r * s + (k - l * s)));
      data[i + 1] = Math.min(255, Math.max(0, r === g && g === b ? k : g * s + (k - l * s)));
      data[i + 2] = Math.min(255, Math.max(0, r === g && g === b ? k : b * s + (k - l * s)));
      // Soften pure black/white to easy-on-the-eyes greys.
      data[i] = 18 + data[i] * 0.86;
      data[i + 1] = 20 + data[i + 1] * 0.86;
      data[i + 2] = 26 + data[i + 2] * 0.86;
    } else if (mode === "sepia") {
      data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
      data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
      data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
    } else if (mode === "grayscale") {
      data[i] = data[i + 1] = data[i + 2] = l;
    } else {
      // High contrast: dark ink becomes black, the rest white.
      const v = l < 150 ? 0 : 255;
      data[i] = data[i + 1] = data[i + 2] = v;
    }
  }
}

/** Recolour every page (pages become images, so text is no longer selectable). */
export async function recolourPdf(bytes: Uint8Array, mode: ColourMode, progress?: Progress): Promise<Uint8Array> {
  const pdf = await openPdf(bytes);
  try {
    const out = await PDFDocument.create();
    for (let i = 0; i < pdf.numPages; i++) {
      progress?.(`Recolouring page ${i + 1} of ${pdf.numPages}…`, i / pdf.numPages);
      const page = await pdf.getPage(i + 1);
      const vp = page.getViewport({ scale: 1 });
      const canvas = await renderToCanvas(pdf, i, 2);
      const ctx = canvas.getContext("2d")!;
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      recolour(img.data, mode);
      ctx.putImageData(img, 0, 0);
      const jpg = await out.embedJpg(await canvasToBytes(canvas, "image/jpeg", 0.88));
      out.addPage([vp.width, vp.height]).drawImage(jpg, { x: 0, y: 0, width: vp.width, height: vp.height });
    }
    return out.save();
  } finally {
    await pdf.destroy();
  }
}

// ─── Personal data ────────────────────────────────────────────────

/** Text of a page the same way Redact builds it (runs joined by spaces), so matches line up. */
const runText = (runs: TextRun[]) => runs.map((r) => r.str).join(" ");

export async function findPersonalData(bytes: Uint8Array, kinds: PiiKind[], progress?: Progress): Promise<{ matches: PiiMatch[]; perPage: number[]; pages: number }> {
  const pdf = await openPdf(bytes);
  try {
    const matches: PiiMatch[] = [];
    const perPage: number[] = [];
    for (let i = 0; i < pdf.numPages; i++) {
      progress?.(`Scanning page ${i + 1} of ${pdf.numPages}…`, (i / pdf.numPages) * 0.6);
      const found = detectPii(runText((await pageTextRuns(pdf, i)).runs), kinds);
      perPage.push(found.length);
      matches.push(...found);
    }
    return { matches, perPage, pages: pdf.numPages };
  } finally {
    await pdf.destroy();
  }
}

export interface RedactPiiResult {
  bytes: Uint8Array;
  counts: Partial<Record<PiiKind, number>>;
  total: number;
}

/** Find personal data and remove it from the file for good (via Redact). */
export async function redactPersonalData(bytes: Uint8Array, kinds: PiiKind[], progress?: Progress): Promise<RedactPiiResult> {
  const { matches } = await findPersonalData(bytes, kinds, progress);
  const counts: Partial<Record<PiiKind, number>> = {};
  for (const m of matches) counts[m.kind] = (counts[m.kind] ?? 0) + 1;
  if (!matches.length) return { bytes, counts, total: 0 };
  const { redactInBrowser } = await import("./redactBrowser");
  const terms = [...new Set(matches.map((m) => m.value))];
  const r = await redactInBrowser(bytes, terms, { caseSensitive: true, wholeWord: false }, (m, f) => progress?.(m, 0.6 + (f ?? 0) * 0.4));
  return { bytes: r.bytes, counts, total: matches.length };
}

// ─── Privacy report ───────────────────────────────────────────────

export interface PrivacyReport {
  pages: number;
  pii: { kind: PiiKind; label: string; count: number; examples: string[] }[];
  metadata: { field: string; value: string }[];
  hasXmp: boolean;
  javascript: boolean;
  attachments: number;
  formFields: number;
  annotations: number;
  links: number;
}

export async function privacyReport(bytes: Uint8Array, progress?: Progress): Promise<PrivacyReport> {
  const kinds = Object.keys(PII_LABEL) as PiiKind[];
  const { matches, pages } = await findPersonalData(bytes, kinds, progress);
  const byKind = new Map<PiiKind, string[]>();
  for (const m of matches) byKind.set(m.kind, [...(byKind.get(m.kind) ?? []), m.value]);

  progress?.("Checking hidden data…", 0.9);
  const { loadSourcePdf } = await import("../../pdf/decrypt");
  const doc = await loadSourcePdf(bytes);
  const metadata = [
    ["Title", doc.getTitle()],
    ["Author", doc.getAuthor()],
    ["Subject", doc.getSubject()],
    ["Keywords", doc.getKeywords()],
    ["Created with", doc.getCreator()],
    ["Producer", doc.getProducer()],
    ["Created", doc.getCreationDate()?.toISOString().slice(0, 10)],
    ["Modified", doc.getModificationDate()?.toISOString().slice(0, 10)],
  ]
    .filter(([, v]) => v)
    .map(([field, value]) => ({ field: field as string, value: String(value) }));
  const names = doc.catalog.lookup(PDFName.of("Names"));
  const javascript = !!doc.catalog.get(PDFName.of("OpenAction")) || (names instanceof PDFDict && !!names.get(PDFName.of("JavaScript")));
  let attachments = 0;
  const files = names instanceof PDFDict ? names.lookup(PDFName.of("EmbeddedFiles")) : undefined;
  if (files instanceof PDFDict) {
    // A name tree: [name, file, name, file…], possibly split into child nodes.
    const list = files.lookup(PDFName.of("Names"));
    attachments = list instanceof PDFArray ? Math.floor(list.size() / 2) : files.lookup(PDFName.of("Kids")) ? 1 : 0;
  }
  let formFields = 0;
  try {
    formFields = doc.getForm().getFields().length;
  } catch {
    /* no form */
  }
  let annotations = 0;
  let links = 0;
  for (const p of doc.getPages()) {
    const annots = p.node.Annots();
    if (!annots) continue;
    for (let k = 0; k < annots.size(); k++) {
      const a = annots.lookup(k);
      const sub = a instanceof PDFDict ? (a.lookup(PDFName.of("Subtype")) as PDFName | undefined)?.decodeText() : undefined;
      if (sub === "Link") links++;
      else if (sub !== "Widget" && sub !== "Popup") annotations++;
    }
  }
  return {
    pages,
    pii: [...byKind].map(([kind, values]) => ({ kind, label: PII_LABEL[kind], count: values.length, examples: [...new Set(values)].slice(0, 3).map(mask) })),
    metadata,
    hasXmp: !!doc.catalog.get(PDFName.of("Metadata")),
    javascript,
    attachments,
    formFields,
    annotations,
    links,
  };
}

export function reportToMarkdown(name: string, r: PrivacyReport): string {
  const lines = [`# Privacy report: ${name}`, "", `Pages scanned: ${r.pages}`, "", "## Personal data in the text", ""];
  if (!r.pii.length) lines.push("None found.");
  else for (const p of r.pii) lines.push(`- **${p.label}**: ${p.count} (e.g. ${p.examples.join(", ")})`);
  lines.push("", "## Hidden information", "");
  if (r.metadata.length) for (const m of r.metadata) lines.push(`- ${m.field}: ${m.value}`);
  else lines.push("- No document properties");
  lines.push(
    `- XMP metadata block: ${r.hasXmp ? "yes" : "no"}`,
    `- Scripts: ${r.javascript ? "yes" : "no"}`,
    `- Attached files: ${r.attachments}`,
    `- Form fields: ${r.formFields}`,
    `- Comments and annotations: ${r.annotations}`,
    `- Links: ${r.links}`,
  );
  return lines.join("\n") + "\n";
}
