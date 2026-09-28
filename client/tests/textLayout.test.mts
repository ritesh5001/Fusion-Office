// Layout analysis (lines, headings, lists, tables → Markdown) and Find & Redact.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { groupLines, toBlocks, blocksToMarkdown, diffLines, type TextRun } from "../src/lib/tools/text.ts";
import { redactPdf } from "../src/lib/tools/processors/redact.ts";

const run = (str: string, x: number, baseline: number, size = 11, bold = false): TextRun => ({
  str, x, baseline, width: str.length * size * 0.5, size, bold, italic: false,
});

test("headings, paragraphs, lists and tables become Markdown", () => {
  const runs: TextRun[] = [
    run("Quarterly Report", 50, 60, 24, true),
    run("Revenue grew in every region this quarter and the", 50, 100),
    run("team shipped two products.", 50, 114),
    run("Highlights", 50, 150, 11, true),
    run("• Faster exports", 50, 170),
    run("• Lower costs", 50, 184),
    run("Region", 50, 220), run("Sales", 200, 220), run("Growth", 320, 220),
    run("North", 50, 234), run("1200", 200, 234), run("12%", 320, 234),
    run("South", 50, 248), run("900", 200, 248), run("8%", 320, 248),
  ];
  const md = blocksToMarkdown(toBlocks(groupLines(runs)));
  assert.match(md, /^# Quarterly Report/m);
  assert.match(md, /Revenue grew in every region this quarter and the team shipped two products\./);
  assert.match(md, /^### Highlights/m);
  assert.match(md, /^- Faster exports\n- Lower costs/m);
  assert.match(md, /\| Region \| Sales \| Growth \|\n\| --- \| --- \| --- \|\n\| North \| 1200 \| 12% \|/);
});

test("line diff marks additions and removals", () => {
  const d = diffLines(["a", "b", "c", "d"], ["a", "c", "x", "d"]);
  assert.deepEqual(d.map((o) => `${o.op}:${o.text}`), ["same:a", "del:b", "same:c", "add:x", "same:d"]);
});

async function runsFromPdf(bytes: Uint8Array): Promise<TextRun[][]> {
  const doc = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const pages: TextRun[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    pages.push(
      tc.items
        .filter((it): it is { str: string; transform: number[]; width: number } => "str" in it && !!(it as { str: string }).str.trim())
        .map((it) => {
          const [a, b, c, d, e, f] = it.transform;
          const len = Math.hypot(a, b) || 1;
          return { str: it.str, x: e, baseline: f, width: it.width, size: Math.hypot(c, d), bold: false, italic: false, user: { x: e, y: f, dx: a / len, dy: b / len, ux: c, uy: d, width: it.width } };
        }),
    );
  }
  return pages;
}

test("find & redact removes every match from the file, not just covers it", async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const p = doc.addPage([400, 300]);
  p.drawText("Call 9876543210 today", { x: 30, y: 200, size: 14, font });
  p.drawText("Backup: 9876543210", { x: 30, y: 170, size: 14, font });
  p.drawText("Keep this line", { x: 30, y: 140, size: 14, font });
  const bytes = await doc.save();
  const report = await redactPdf(bytes, await runsFromPdf(bytes), ["9876543210"], { caseSensitive: false, wholeWord: true });
  assert.deepEqual(report.matches, { 0: 2 });
  assert.deepEqual(report.unsafePages, []);
  const text = (await runsFromPdf(report.bytes))[0].map((r) => r.str).join(" ");
  assert.ok(!text.includes("9876543210"), text);
  assert.match(text, /Call/);
  assert.match(text, /today/);
  assert.match(text, /Keep this line/);
});
