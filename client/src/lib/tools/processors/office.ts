"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { canvasToBytes, openPdf, pageTextRuns, renderToCanvas } from "../pdfjs";
import { bodySize, groupLines, lineCells, alignColumns, pagesToMarkdown, toBlocks, type PageText } from "../text";

type Progress = (done: number, total: number) => void;

async function readPages(doc: PDFDocumentProxy, onProgress?: Progress): Promise<PageText[]> {
  const pages: PageText[] = [];
  for (let i = 0; i < doc.numPages; i++) {
    onProgress?.(i, doc.numPages);
    const { runs, width, height } = await pageTextRuns(doc, i);
    pages.push({ lines: groupLines(runs), width, height });
  }
  onProgress?.(doc.numPages, doc.numPages);
  return pages;
}

const NO_TEXT = "This PDF has no selectable text (it looks scanned). Run OCR PDF first, then convert.";

// ─── Markdown ───────────────────────────────────────────────────────

export async function pdfToMarkdown(bytes: Uint8Array, opts: { pageBreaks: boolean }, onProgress?: Progress): Promise<string> {
  const doc = await openPdf(bytes);
  try {
    const pages = await readPages(doc, onProgress);
    if (!pages.some((p) => p.lines.length)) throw new Error(NO_TEXT);
    return pagesToMarkdown(pages, opts);
  } finally {
    await doc.destroy();
  }
}

// ─── Word ───────────────────────────────────────────────────────────

export async function pdfToWord(bytes: Uint8Array, onProgress?: Progress): Promise<Uint8Array> {
  const docx = await import("docx");
  const pdf = await openPdf(bytes);
  try {
    const pages = await readPages(pdf, onProgress);
    if (!pages.some((p) => p.lines.length)) throw new Error(NO_TEXT);
    const body = bodySize(pages.flatMap((p) => p.lines));
    const children: (InstanceType<typeof docx.Paragraph> | InstanceType<typeof docx.Table>)[] = [];
    const headings = [docx.HeadingLevel.HEADING_1, docx.HeadingLevel.HEADING_2, docx.HeadingLevel.HEADING_3];
    pages.forEach((page, pi) => {
      const blocks = toBlocks(page.lines, body);
      blocks.forEach((b, bi) => {
        const pageBreakBefore = pi > 0 && bi === 0;
        if (b.kind === "heading") {
          children.push(new docx.Paragraph({ text: b.text, heading: headings[b.level - 1], pageBreakBefore }));
        } else if (b.kind === "paragraph") {
          children.push(
            new docx.Paragraph({ children: [new docx.TextRun({ text: b.text, bold: b.bold, italics: b.italic })], spacing: { after: 160 }, pageBreakBefore }),
          );
        } else if (b.kind === "list") {
          b.items.forEach((item, k) =>
            children.push(
              new docx.Paragraph({
                text: b.ordered ? `${k + 1}. ${item}` : item,
                bullet: b.ordered ? undefined : { level: 0 },
                pageBreakBefore: pageBreakBefore && k === 0,
              }),
            ),
          );
        } else {
          if (pageBreakBefore) children.push(new docx.Paragraph({ text: "", pageBreakBefore: true }));
          const width = Math.max(...b.rows.map((r) => r.length));
          children.push(
            new docx.Table({
              width: { size: 100, type: docx.WidthType.PERCENTAGE },
              rows: b.rows.map(
                (r, ri) =>
                  new docx.TableRow({
                    children: Array.from(
                      { length: width },
                      (_, k) =>
                        new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: r[k] ?? "", bold: ri === 0 })] })] }),
                    ),
                  }),
              ),
            }),
          );
          children.push(new docx.Paragraph({ text: "" }));
        }
      });
    });
    const first = pages[0];
    const document = new docx.Document({
      creator: "Fusion Office",
      sections: [
        {
          properties: {
            page: { size: { width: Math.round(first.width * 20), height: Math.round(first.height * 20) } }, // twips
          },
          children,
        },
      ],
    });
    return new Uint8Array(await (await docx.Packer.toBlob(document)).arrayBuffer());
  } finally {
    await pdf.destroy();
  }
}

// ─── PowerPoint ─────────────────────────────────────────────────────

/** One slide per page: the page as a crisp image, its text in the speaker notes. */
export async function pdfToPowerPoint(bytes: Uint8Array, onProgress?: Progress): Promise<Uint8Array> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pdf = await openPdf(bytes);
  try {
    const first = await pdf.getPage(1);
    const vp = first.getViewport({ scale: 1 });
    const pptx = new PptxGenJS();
    const W = 10;
    const H = +(W * (vp.height / vp.width)).toFixed(3);
    pptx.defineLayout({ name: "PDF", width: W, height: H });
    pptx.layout = "PDF";
    for (let i = 0; i < pdf.numPages; i++) {
      onProgress?.(i, pdf.numPages);
      const canvas = await renderToCanvas(pdf, i, 2);
      const jpg = await canvasToBytes(canvas, "image/jpeg", 0.9);
      let b64 = "";
      for (let k = 0; k < jpg.length; k += 0x8000) b64 += String.fromCharCode(...jpg.subarray(k, k + 0x8000));
      const slide = pptx.addSlide();
      // Fit the page into the slide, keeping its aspect ratio.
      const s = Math.min(W / canvas.width, H / canvas.height);
      const w = canvas.width * s;
      const h = canvas.height * s;
      slide.addImage({ data: `data:image/jpeg;base64,${btoa(b64)}`, x: (W - w) / 2, y: (H - h) / 2, w, h });
      const { runs } = await pageTextRuns(pdf, i);
      const notes = groupLines(runs).map((l) => l.text).join("\n");
      if (notes) slide.addNotes(notes);
    }
    onProgress?.(pdf.numPages, pdf.numPages);
    const out = await pptx.write({ outputType: "uint8array" });
    return out as Uint8Array;
  } finally {
    await pdf.destroy();
  }
}

// ─── Excel ──────────────────────────────────────────────────────────

const NUMBER = /^[-+(]?[₹$€£]?\s?\d{1,3}(,\d{2,3})*(\.\d+)?\)?$|^[-+]?\d+(\.\d+)?$/;
function toValue(s: string): string | number {
  const t = s.trim();
  if (!NUMBER.test(t)) return t;
  const negative = /^\(.*\)$/.test(t) || t.startsWith("-");
  const n = Number(t.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? (negative ? -n : n) : t;
}

/** Each page becomes a sheet; text is laid out on a grid of detected columns. */
export async function pdfToExcel(bytes: Uint8Array, onProgress?: Progress): Promise<Uint8Array> {
  const { default: ExcelJS } = await import("exceljs");
  const pdf = await openPdf(bytes);
  try {
    const pages = await readPages(pdf, onProgress);
    if (!pages.some((p) => p.lines.length)) throw new Error(NO_TEXT);
    const wb = new ExcelJS.Workbook();
    wb.creator = "Fusion Office";
    pages.forEach((page, i) => {
      const ws = wb.addWorksheet(`Page ${i + 1}`);
      const rows = alignColumns(page.lines.map((l) => lineCells(l)));
      rows.forEach((r) => ws.addRow(r.map(toValue)));
      ws.columns.forEach((col) => {
        let max = 8;
        col.eachCell?.({ includeEmpty: false }, (c) => (max = Math.max(max, String(c.value ?? "").length + 2)));
        col.width = Math.min(max, 60);
      });
    });
    return new Uint8Array(await wb.xlsx.writeBuffer());
  } finally {
    await pdf.destroy();
  }
}
