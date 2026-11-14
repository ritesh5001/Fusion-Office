"use client";

/**
 * AI tools that return structured results: quiz and flashcards, data
 * extraction to Excel, presentations from a document, and a resume check.
 * The PDF's text is read on the device; only the text goes to the AI.
 */
import { apiFetch } from "@/lib/api";
import { documentText } from "@/lib/tools/documentText";
import { stem, type ToolFile } from "@/lib/tools/files";
import type { LoadedFile, ProgressFn, ToolSpec } from "./ToolRunner";
import { NumberField, Segmented, TextArea, TextInput } from "./controls";

const Note = ({ children }: { children: React.ReactNode }) => <p className="text-[12px] leading-relaxed text-fg-muted">{children}</p>;
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const md = (s: string) => s.replace(/([*_`[\]])/g, "\\$1");

async function ai<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await apiFetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? (res.status === 503 ? "AI tools aren't available on this server yet." : `The AI request failed (${res.status}).`));
  }
  return (await res.json()) as T;
}

/** Text of a PDF, or of a Word / plain-text file read on the device. */
async function textOf(f: LoadedFile, progress: ProgressFn): Promise<string[]> {
  if (/\.(txt|md)$/i.test(f.name)) return [new TextDecoder().decode(f.bytes)];
  if (/\.docx$/i.test(f.name)) {
    const { default: mammoth } = await import("mammoth");
    const { value } = await mammoth.extractRawText({ arrayBuffer: f.bytes.slice().buffer as ArrayBuffer });
    if (!value.trim()) throw new Error(`${f.name} has no text.`);
    return [value];
  }
  return documentText(f.bytes, progress);
}

// ─── Quiz & flashcards ──────────────────────────────────────────────

type QuizKind = "mcq" | "truefalse" | "short" | "flashcards";
type QuizItem =
  | { kind: "mcq"; question: string; options: string[]; answer: number; explanation: string; page: number | null }
  | { kind: "truefalse"; statement: string; answer: boolean; explanation: string; page: number | null }
  | { kind: "short"; question: string; answer: string; page: number | null }
  | { kind: "flashcards"; front: string; back: string; page: number | null };

const page = (p: number | null) => (p ? ` _(p. ${p})_` : "");

/** Questions first, answers at the end, so the sheet can be printed for practice. */
export function quizMarkdown(title: string, items: QuizItem[]): string {
  const out = [`# ${md(title)}`, ""];
  if (items[0]?.kind === "flashcards") {
    out.push("| Front | Back |", "| --- | --- |");
    for (const it of items) if (it.kind === "flashcards") out.push(`| ${md(it.front).replace(/\|/g, "\\|")} | ${md(it.back).replace(/\|/g, "\\|")}${page(it.page)} |`);
    return out.join("\n");
  }
  items.forEach((it, i) => {
    if (it.kind === "mcq") out.push(`**${i + 1}. ${md(it.question)}**`, "", ...it.options.map((o, k) => `${String.fromCharCode(97 + k)}) ${md(o)}`), "");
    else if (it.kind === "truefalse") out.push(`**${i + 1}. True or false:** ${md(it.statement)}`, "");
    else if (it.kind === "short") out.push(`**${i + 1}. ${md(it.question)}**`, "");
  });
  out.push("---", "", "## Answers", "");
  items.forEach((it, i) => {
    if (it.kind === "mcq") out.push(`${i + 1}. **${String.fromCharCode(97 + it.answer)}) ${md(it.options[it.answer])}**${it.explanation ? ` — ${md(it.explanation)}` : ""}${page(it.page)}`);
    else if (it.kind === "truefalse") out.push(`${i + 1}. **${it.answer ? "True" : "False"}**${it.explanation ? ` — ${md(it.explanation)}` : ""}${page(it.page)}`);
    else if (it.kind === "short") out.push(`${i + 1}. ${md(it.answer)}${page(it.page)}`);
  });
  return out.join("\n");
}

/** Front/back pairs Anki and Quizlet import (tab-separated, one card a line). */
export function flashcardTsv(items: QuizItem[]): string {
  const clean = (s: string) => s.replace(/[\t\r\n]+/g, " ").trim();
  return items
    .map((it) => (it.kind === "flashcards" ? [it.front, it.back] : it.kind === "mcq" ? [it.question, it.options[it.answer]] : it.kind === "truefalse" ? [it.statement, it.answer ? "True" : "False"] : [it.question, it.answer]))
    .map(([a, b]) => `${clean(a)}\t${clean(b)}`)
    .join("\n");
}

type QuizOpts = { kind: QuizKind; count: number; level: "easy" | "medium" | "hard" };
const quiz = (kind: QuizKind): ToolSpec<QuizOpts> => ({
  action: "Generate",
  defaults: { kind, count: 10, level: "medium" },
  Options: ({ options: o, set }) => (
    <>
      <Segmented
        label="Make"
        value={o.kind}
        onChange={(kind) => set({ kind })}
        options={[
          { value: "mcq", label: "Multiple choice" },
          { value: "truefalse", label: "True / false" },
          { value: "short", label: "Short answers" },
          { value: "flashcards", label: "Flashcards" },
        ]}
      />
      <NumberField label="How many" value={o.count} min={3} max={40} onChange={(count) => set({ count })} />
      <Segmented label="Difficulty" value={o.level} onChange={(level) => set({ level })} options={[{ value: "easy", label: "Easy" }, { value: "medium", label: "Medium" }, { value: "hard", label: "Hard" }]} />
      <Note>Questions come only from your document, with the page each answer is on. You get a printable sheet with an answer key, and a file Anki or Quizlet can import.</Note>
    </>
  ),
  validate: (_f, o) => (o.count >= 3 && o.count <= 40 ? null : "Choose between 3 and 40."),
  run: async ([f], o, progress) => {
    const pages = await textOf(f, progress);
    progress("Writing questions…", 0.9);
    const { items } = await ai<{ items: QuizItem[] }>("/api/ai/quiz", { pages, kind: o.kind, count: o.count, level: o.level });
    const title = `${o.kind === "flashcards" ? "Flashcards" : "Quiz"}: ${stem(f.name)}`;
    const sheet = quizMarkdown(title, items);
    const tsv = flashcardTsv(items);
    return {
      files: [
        { name: `${stem(f.name)}-${o.kind === "flashcards" ? "flashcards" : "quiz"}.md`, bytes: new TextEncoder().encode(sheet), type: "text/markdown" },
        { name: `${stem(f.name)}-anki.txt`, bytes: new TextEncoder().encode(tsv), type: "text/plain" },
      ],
      text: { content: sheet, filename: `${stem(f.name)}-quiz.md` },
      summary: `${plural(items.length, o.kind === "flashcards" ? "flashcard" : "question")}. Import the .txt file in Anki (File → Import) or Quizlet (Import, tab between term and definition).`,
    };
  },
});

// ─── Data extraction ────────────────────────────────────────────────

type Extracted =
  | { kind: "invoice" | "receipt"; documents: { fields: Record<string, string>; items: Record<string, string>[] }[] }
  | { kind: "tables"; tables: { title: string; page: number | null; columns: string[]; rows: string[][] }[] };

const LABEL = (k: string) => k.replace(/_/g, " ").replace(/\b(gstin|cgst|sgst|igst|hsn|sac)\b/gi, (m) => m.toUpperCase()).replace(/^./, (c) => c.toUpperCase());
const NUMERIC = /^(subtotal|discount|cgst|sgst|igst|cess|round_off|total|tax|tip|quantity|rate|amount)$/;
const asNumber = (k: string, v: string) => {
  if (!NUMERIC.test(k)) return v;
  const n = Number(v.replace(/[^\d.-]/g, ""));
  return v.trim() && Number.isFinite(n) ? n : v;
};

const extract: ToolSpec<{ kind: "invoice" | "receipt" | "tables" }> = {
  action: "Extract to Excel",
  defaults: { kind: "invoice" },
  Options: ({ options: o, set, files }) => (
    <>
      <Segmented
        label="What to extract"
        value={o.kind}
        onChange={(kind) => set({ kind })}
        options={[
          { value: "invoice", label: "Invoices & bills", hint: "Seller, GSTIN, totals, line items" },
          { value: "receipt", label: "Receipts", hint: "Shop, date, total, items" },
          { value: "tables", label: "Every table", hint: "Any document" },
        ]}
      />
      <Note>
        {o.kind === "tables"
          ? "Each table becomes a sheet."
          : `One row per ${o.kind} in the Summary sheet (${files.length > 1 ? `${files.length} files` : "add several files to collect them in one sheet"}), and every line item in Items.`}{" "}
        Values are copied as printed; check totals before you file them.
      </Note>
      <Note>Works on PDFs with selectable text; run OCR PDF first on scans and photos.</Note>
    </>
  ),
  run: async (files, o, progress) => {
    const { default: ExcelJS } = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    wb.creator = "Fusion Office";
    let docs = 0;
    let rows = 0;
    if (o.kind === "tables") {
      for (const [i, f] of files.entries()) {
        const pages = await textOf(f, (m, fr) => progress(m, (i + (fr ?? 0) * 0.5) / files.length));
        progress(`Finding tables in ${f.name}…`, (i + 0.6) / files.length);
        const r = await ai<Extracted>("/api/ai/extract", { pages, kind: "tables" });
        if (r.kind !== "tables") continue;
        r.tables.forEach((t, k) => {
          const ws = wb.addWorksheet(`${(t.title || `Table ${k + 1}`).replace(/[\\/?*[\]:]/g, " ").slice(0, 25)} ${wb.worksheets.length + 1}`.trim());
          if (t.columns.length) ws.addRow(t.columns).font = { bold: true };
          for (const row of t.rows) ws.addRow(row.map((c) => (/^-?[\d,]+(\.\d+)?$/.test(c.trim()) ? Number(c.replace(/,/g, "")) : c)));
          rows += t.rows.length;
          docs++;
        });
      }
      if (!docs) throw new Error("No tables were found.");
    } else {
      const summary = wb.addWorksheet("Summary", { views: [{ state: "frozen", ySplit: 1 }] });
      const items = wb.addWorksheet("Items", { views: [{ state: "frozen", ySplit: 1 }] });
      const fieldCols = new Set<string>();
      const all: { file: string; fields: Record<string, string>; items: Record<string, string>[] }[] = [];
      for (const [i, f] of files.entries()) {
        const pages = await textOf(f, (m, fr) => progress(m, (i + (fr ?? 0) * 0.5) / files.length));
        progress(`Extracting from ${f.name}…`, (i + 0.6) / files.length);
        const r = await ai<Extracted>("/api/ai/extract", { pages, kind: o.kind });
        if (r.kind === "tables") continue;
        for (const d of r.documents) {
          Object.keys(d.fields).forEach((k) => fieldCols.add(k));
          all.push({ file: f.name, ...d });
        }
      }
      const cols = [...fieldCols];
      summary.addRow(["File", ...cols.map(LABEL)]).font = { bold: true };
      const itemCols = ["description", "hsn_sac", "quantity", "unit", "rate", "discount", "tax_rate", "amount"].filter((c) => all.some((d) => d.items.some((it) => it[c])));
      items.addRow(["File", "Document", ...itemCols.map(LABEL)]).font = { bold: true };
      for (const d of all) {
        summary.addRow([d.file, ...cols.map((c) => asNumber(c, d.fields[c] ?? ""))]);
        for (const it of d.items) items.addRow([d.file, d.fields.invoice_number ?? d.fields.bill_number ?? "", ...itemCols.map((c) => asNumber(c, it[c] ?? ""))]);
        rows += d.items.length;
      }
      docs = all.length;
      for (const ws of [summary, items]) ws.columns.forEach((c) => (c.width = 18));
    }
    const name = files.length === 1 ? `${stem(files[0].name)}-data.xlsx` : "extracted-data.xlsx";
    const out: ToolFile = { name, bytes: new Uint8Array(await wb.xlsx.writeBuffer()), type: XLSX };
    return { files: [out], summary: o.kind === "tables" ? `${plural(docs, "table")} with ${plural(rows, "row")}.` : `${plural(docs, o.kind)} and ${plural(rows, "line item")} extracted.` };
  },
};

// ─── PDF → slides ───────────────────────────────────────────────────

type Outline = { title: string; subtitle: string; slides: { title: string; bullets: string[]; notes: string }[] };
const THEMES = {
  clean: { bg: "FFFFFF", title: "1F2937", text: "374151", accent: "2563EB" },
  dark: { bg: "111827", title: "F9FAFB", text: "D1D5DB", accent: "A3E635" },
  warm: { bg: "FFF7ED", title: "7C2D12", text: "44403C", accent: "EA580C" },
} as const;

export async function outlineToPptx(o: Outline, theme: keyof typeof THEMES): Promise<Uint8Array> {
  const { default: PptxGen } = await import("pptxgenjs");
  const t = THEMES[theme];
  const pptx = new PptxGen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = o.title;
  const cover = pptx.addSlide();
  cover.background = { color: t.bg };
  cover.addShape("rect", { x: 0.6, y: 3.05, w: 1.2, h: 0.08, fill: { color: t.accent }, line: { color: t.accent } });
  cover.addText(o.title, { x: 0.6, y: 1.6, w: 12, h: 1.4, fontSize: 40, bold: true, color: t.title, fontFace: "Calibri" });
  if (o.subtitle) cover.addText(o.subtitle, { x: 0.6, y: 3.3, w: 12, h: 0.8, fontSize: 20, color: t.text, fontFace: "Calibri" });
  for (const s of o.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: t.bg };
    slide.addShape("rect", { x: 0.6, y: 1.25, w: 0.9, h: 0.06, fill: { color: t.accent }, line: { color: t.accent } });
    slide.addText(s.title, { x: 0.6, y: 0.4, w: 12.1, h: 0.85, fontSize: 30, bold: true, color: t.title, fontFace: "Calibri" });
    slide.addText(
      s.bullets.map((b) => ({ text: b, options: { bullet: { indent: 18 }, breakLine: true } })),
      { x: 0.7, y: 1.6, w: 11.9, h: 5.3, fontSize: 20, color: t.text, valign: "top", paraSpaceAfter: 10, fontFace: "Calibri" },
    );
    if (s.notes) slide.addNotes(s.notes);
  }
  return new Uint8Array((await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer);
}

type SlideOpts = { count: number; audience: string; theme: keyof typeof THEMES };
const slides: ToolSpec<SlideOpts> = {
  action: "Make presentation",
  defaults: { count: 10, audience: "", theme: "clean" },
  Options: ({ options: o, set }) => (
    <>
      <NumberField label="Slides" value={o.count} min={3} max={30} onChange={(count) => set({ count })} />
      <TextInput label="Audience (optional)" hint="Helps pick the level of detail." value={o.audience} onChange={(audience) => set({ audience })} placeholder="e.g. the board, Class 10 students, new joiners" />
      <Segmented label="Look" value={o.theme} onChange={(theme) => set({ theme })} options={[{ value: "clean", label: "Clean" }, { value: "dark", label: "Dark" }, { value: "warm", label: "Warm" }]} />
      <Note>Turns a report, chapter or proposal into an editable PowerPoint: one idea per slide, short bullets, and speaker notes. Open it in the PowerPoint editor to change anything.</Note>
    </>
  ),
  validate: (_f, o) => (o.count >= 3 && o.count <= 30 ? null : "Choose between 3 and 30 slides."),
  run: async ([f], o, progress) => {
    const pages = await textOf(f, progress);
    progress("Planning the slides…", 0.85);
    const outline = await ai<Outline>("/api/ai/slides", { pages, count: o.count, audience: o.audience });
    const bytes = await outlineToPptx(outline, o.theme);
    const text = [`# ${outline.title}`, outline.subtitle, "", ...outline.slides.flatMap((s, i) => [`## ${i + 1}. ${s.title}`, ...s.bullets.map((b) => `- ${b}`), ""])].join("\n");
    return { files: [{ name: `${stem(f.name)}-slides.pptx`, bytes, type: PPTX }], text: { content: text, filename: `${stem(f.name)}-outline.md` }, summary: `${plural(outline.slides.length + 1, "slide")}, with speaker notes.` };
  },
};

// ─── Resume check ───────────────────────────────────────────────────

type Ats = { score: number; verdict: string; matched: string[]; missing: string[]; sections: { name: string; status: "good" | "improve" | "missing"; note: string }[]; formatting: string[]; suggestions: string[] };

export function atsMarkdown(name: string, r: Ats, withJob: boolean): string {
  const icon = { good: "✅", improve: "🟡", missing: "❌" } as const;
  return [
    `# Resume check: ${md(name)}`,
    "",
    `## Score: ${r.score} / 100`,
    "",
    md(r.verdict),
    "",
    ...(withJob ? ["## Keywords from the job", "", `**Found (${r.matched.length}):** ${r.matched.map(md).join(", ") || "none"}`, "", `**Missing (${r.missing.length}):** ${r.missing.map(md).join(", ") || "none"}`, ""] : []),
    ...(r.sections.length ? ["## Sections", "", ...r.sections.map((s) => `- ${icon[s.status]} **${md(s.name)}** — ${md(s.note)}`), ""] : []),
    ...(r.formatting.length ? ["## Formatting that can trip an ATS", "", ...r.formatting.map((x) => `- ${md(x)}`), ""] : []),
    ...(r.suggestions.length ? ["## What to change first", "", ...r.suggestions.map((x, i) => `${i + 1}. ${md(x)}`), ""] : []),
    "_Scores are a guide to how well the resume matches, not a prediction of any company's system._",
  ].join("\n");
}

const ats: ToolSpec<{ job: string }> = {
  action: "Check my resume",
  defaults: { job: "" },
  Options: ({ options: o, set }) => (
    <>
      <TextArea label="Job description (recommended)" hint="Paste the job post to see which keywords match. Leave empty for a general check." value={o.job} onChange={(job) => set({ job })} rows={8} placeholder="Paste the job description here…" />
      <Note>Upload your resume as PDF or Word. You get a match score, missing keywords, section-by-section notes and the fixes that matter most. Nothing is invented: suggestions are changes you can truthfully make.</Note>
    </>
  ),
  validate: (_f, o) => (o.job.length > 12_000 ? "That job description is too long. Paste the main part." : null),
  run: async ([f], o, progress) => {
    const pages = await textOf(f, progress);
    progress("Reviewing your resume…", 0.85);
    const r = await ai<Ats>("/api/ai/ats", { pages, job: o.job });
    const report = atsMarkdown(f.name, r, !!o.job.trim());
    return { files: [], text: { content: report, filename: `${stem(f.name)}-ats-report.md` }, summary: `Score ${r.score} / 100${o.job.trim() ? ` · ${r.missing.length} missing keyword${r.missing.length === 1 ? "" : "s"}` : ""}.` };
  },
};

export const AI_SPECS = {
  "quiz-generator": quiz("mcq"),
  "flashcard-maker": quiz("flashcards"),
  "ai-data-extraction": extract,
  "pdf-to-presentation-ai": slides,
  "ats-resume-checker": ats,
};
