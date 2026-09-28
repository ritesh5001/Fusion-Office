/**
 * .xlsx ⇄ spreadsheet model with exceljs, plus CSV. Saving writes back into
 * the original workbook when there is one, so things the editor doesn't show
 * (conditional formatting, data validation, print setup, images, defined
 * names) are kept.
 */
import type ExcelJSType from "exceljs";
import { emptySheet, key, newSheetId, parseRange, unkey, type Cell, type CellStyle, type Sheet, type Workbook } from "./model";
import { dateToSerial, formatValue, parseInput } from "./format";
import type { Engine } from "./formula";

type XWorkbook = ExcelJSType.Workbook;
type XWorksheet = ExcelJSType.Worksheet;
type XCell = ExcelJSType.Cell;
/** exceljs orders sheets by this field; it's missing from its type definitions. */
type Ordered = XWorksheet & { orderNo: number };

const loadExcel = async () => (await import("exceljs")).default;

// Office's default theme colours: bg1, tx1, bg2, tx2, accent1–6.
const THEME = ["FFFFFF", "000000", "E7E6E6", "44546A", "4472C4", "ED7D31", "A5A5A5", "FFC000", "5B9BD5", "70AD47"];

function color(c: { argb?: string; theme?: number; tint?: number } | undefined): string | undefined {
  if (!c) return undefined;
  let hex = c.argb ? c.argb.slice(-6) : c.theme !== undefined ? THEME[c.theme] : undefined;
  if (!hex || !/^[0-9a-f]{6}$/i.test(hex)) return undefined;
  if (c.tint) {
    const t = c.tint;
    hex = [0, 2, 4]
      .map((i) => {
        const v = parseInt(hex!.slice(i, i + 2), 16);
        return Math.round(t > 0 ? v + (255 - v) * t : v * (1 + t))
          .toString(16)
          .padStart(2, "0");
      })
      .join("");
  }
  return `#${hex.toLowerCase()}`;
}

const argb = (hex: string) => `FF${hex.replace("#", "").toUpperCase()}`;

function readStyle(cell: XCell): CellStyle | undefined {
  const st = cell.style ?? {};
  const s: CellStyle = {};
  const f = st.font;
  if (f) {
    if (f.bold) s.b = true;
    if (f.italic) s.i = true;
    if (f.underline) s.u = true;
    if (f.strike) s.s = true;
    const col = color(f.color as never);
    if (col && col !== "#000000") s.color = col;
    if (f.size && f.size !== 11) s.size = f.size;
    if (f.name && f.name !== "Calibri") s.font = f.name;
  }
  const fill = st.fill as { type?: string; pattern?: string; fgColor?: never } | undefined;
  if (fill?.type === "pattern" && fill.pattern === "solid") {
    const col = color(fill.fgColor);
    if (col) s.fill = col;
  }
  const al = st.alignment;
  if (al) {
    if (al.horizontal === "center" || al.horizontal === "centerContinuous") s.h = "center";
    else if (al.horizontal === "right") s.h = "right";
    else if (al.horizontal === "left") s.h = "left";
    if (al.vertical === "top") s.v = "top";
    else if (al.vertical === "middle") s.v = "middle";
    if (al.wrapText) s.wrap = true;
  }
  if (st.numFmt && st.numFmt !== "General") s.fmt = st.numFmt;
  const b = st.border;
  if (b) {
    const side = (x: { style?: string; color?: never } | undefined) => (x?.style ? (color(x.color) ?? "#000000") : undefined);
    const border = { t: side(b.top as never), r: side(b.right as never), b: side(b.bottom as never), l: side(b.left as never) };
    if (border.t || border.r || border.b || border.l) s.border = border;
  }
  return Object.keys(s).length ? s : undefined;
}

function readValue(cell: XCell): Cell | null {
  const v = cell.value as unknown;
  const out: Cell = {};
  const formula = (cell as unknown as { formula?: string }).formula;
  if (formula) {
    out.f = formula.replace(/^=/, "");
    const res = (v as { result?: unknown })?.result;
    if (typeof res === "number" || typeof res === "string" || typeof res === "boolean") out.v = res;
    return out;
  }
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") out.v = v;
  else if (v instanceof Date) {
    // exceljs gives dates as UTC midnight.
    out.v = dateToSerial(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate(), v.getUTCHours(), v.getUTCMinutes(), v.getUTCSeconds());
  } else if (typeof v === "object") {
    const o = v as { richText?: { text: string }[]; text?: unknown; error?: string };
    if (o.richText) out.v = o.richText.map((r) => r.text).join("");
    else if (o.error) out.e = o.error;
    else if (o.text !== undefined) out.v = typeof o.text === "string" ? o.text : ((o.text as { richText?: { text: string }[] }).richText?.map((r) => r.text).join("") ?? "");
    else return null;
  }
  return out;
}

export interface ReadResult {
  wb: Workbook;
  source: XWorkbook;
  warnings: string[];
}

export async function readXlsx(bytes: Uint8Array): Promise<ReadResult> {
  const ExcelJS = await loadExcel();
  const source = new ExcelJS.Workbook();
  try {
    await source.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  } catch {
    throw new Error("This file couldn't be opened. It may be damaged, password protected, or not an Excel workbook.");
  }
  const warnings = new Set<string>();
  const sheets: Sheet[] = [];
  source.eachSheet((ws: XWorksheet) => {
    const sheet: Sheet = { ...emptySheet(ws.name), sourceId: ws.id, hidden: ws.state !== "visible" && ws.state !== undefined };
    // Include rows without values: a row may hold only coloured or bordered cells.
    ws.eachRow({ includeEmpty: true }, (row, rn) => {
      if (row.height && Math.abs(row.height - 15) > 0.5) sheet.rows[rn - 1] = Math.round((row.height * 4) / 3);
      row.eachCell({ includeEmpty: true }, (cell, cn) => {
        const v = readValue(cell);
        const s = readStyle(cell);
        if (!v && !s) return;
        const c: Cell = v ?? {};
        if (s) c.s = s;
        sheet.cells[key(rn - 1, cn - 1)] = c;
      });
    });
    (ws.columns ?? []).forEach((col, i) => {
      if (col?.width && Math.abs(col.width - 9.140625) > 0.2) sheet.cols[i] = Math.round(col.width * 7 + 5);
    });
    for (const m of ((ws.model as unknown as { merges?: string[] }).merges ?? [])) {
      const g = parseRange(m);
      if (g) sheet.merges.push(g);
    }
    const view = ws.views?.[0] as { state?: string; xSplit?: number; ySplit?: number } | undefined;
    if (view?.state === "frozen") sheet.freeze = { rows: view.ySplit ?? 0, cols: view.xSplit ?? 0 };
    if ((ws as unknown as { conditionalFormattings?: unknown[] }).conditionalFormattings?.length) warnings.add("Conditional formatting isn't shown here, but it's kept when you save.");
    if (ws.getImages?.().length) warnings.add("Pictures in the workbook aren't shown here, but they're kept when you save.");
    sheets.push(sheet);
  });
  if (!sheets.length) sheets.push(emptySheet("Sheet1"));
  return { wb: { sheets }, source, warnings: [...warnings] };
}

function writeStyle(cell: XCell, s: CellStyle | undefined) {
  const st: Partial<ExcelJSType.Style> = {};
  if (s) {
    const font: Partial<ExcelJSType.Font> = {};
    if (s.b) font.bold = true;
    if (s.i) font.italic = true;
    if (s.u) font.underline = true;
    if (s.s) font.strike = true;
    if (s.color) font.color = { argb: argb(s.color) };
    if (s.size) font.size = s.size;
    if (s.font) font.name = s.font;
    if (Object.keys(font).length) st.font = font;
    if (s.fill) st.fill = { type: "pattern", pattern: "solid", fgColor: { argb: argb(s.fill) } };
    if (s.h || s.v || s.wrap) st.alignment = { horizontal: s.h, vertical: s.v, wrapText: s.wrap || undefined };
    if (s.fmt) st.numFmt = s.fmt;
    if (s.border) {
      const side = (c?: string) => (c ? { style: "thin" as const, color: { argb: argb(c) } } : undefined);
      st.border = { top: side(s.border.t), right: side(s.border.r), bottom: side(s.border.b), left: side(s.border.l) };
    }
  }
  cell.style = st as ExcelJSType.Style;
}

/** Save the workbook as .xlsx (into `source` when the file came from one). */
export async function writeXlsx(wb: Workbook, engine: Engine, source: XWorkbook | null): Promise<Uint8Array> {
  const ExcelJS = await loadExcel();
  const out = source ?? new ExcelJS.Workbook();
  if (!source) {
    out.creator = "Fusion Office";
    out.created = new Date();
  }
  // Drop worksheets that were deleted in the editor.
  const keep = new Set(wb.sheets.map((s) => s.sourceId).filter((x): x is number => x !== undefined));
  for (const ws of [...out.worksheets]) if (!keep.has(ws.id)) out.removeWorksheet(ws.id);

  wb.sheets.forEach((sheet, si) => {
    let ws = sheet.sourceId !== undefined ? out.getWorksheet(sheet.sourceId) : undefined;
    if (!ws) ws = out.addWorksheet(sheet.name);
    else {
      if (ws.name !== sheet.name) ws.name = sheet.name;
      // Clear what was there; the model is the full truth for cells.
      ws.eachRow({ includeEmpty: true }, (row) =>
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.value = null;
          cell.style = {} as ExcelJSType.Style;
        }),
      );
      for (const m of ((ws.model as unknown as { merges?: string[] }).merges ?? [])) ws.unMergeCells(m);
    }
    (ws as Ordered).orderNo = si;
    ws.state = sheet.hidden ? "hidden" : "visible";
    for (const [k, c] of Object.entries(sheet.cells)) {
      const { r, c: col } = unkey(k);
      const cell = ws.getCell(r + 1, col + 1);
      if (c.f !== undefined) {
        const v = engine.value(si, r, col);
        const result = v instanceof Error ? { error: v.message } : v;
        cell.value = { formula: c.f, result: result ?? undefined } as ExcelJSType.CellFormulaValue;
      } else if (c.e) cell.value = { error: c.e } as ExcelJSType.CellErrorValue;
      else cell.value = c.v ?? null;
      writeStyle(cell, c.s);
    }
    for (const m of sheet.merges) ws.mergeCells(m.r1 + 1, m.c1 + 1, m.r2 + 1, m.c2 + 1);
    for (const [c, px] of Object.entries(sheet.cols)) ws.getColumn(Number(c) + 1).width = Math.max(1, (px - 5) / 7);
    for (const [r, px] of Object.entries(sheet.rows)) ws.getRow(Number(r) + 1).height = px * 0.75;
    ws.views = sheet.freeze && (sheet.freeze.rows || sheet.freeze.cols) ? [{ state: "frozen", xSplit: sheet.freeze.cols, ySplit: sheet.freeze.rows }] : [{}];
  });
  // Keep sheet order as in the editor.
  const ordered = ([...out.worksheets] as Ordered[]).sort((a, b) => a.orderNo - b.orderNo);
  ordered.forEach((ws, i) => (ws.orderNo = i));
  return new Uint8Array(await out.xlsx.writeBuffer());
}

// ─── CSV ────────────────────────────────────────────────────────────

/** RFC 4180 CSV (also ; or tab separated) → rows of fields. */
export function parseCsv(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = [",", ";", "\t"].reduce((best, s) => (first.split(s).length > first.split(best).length ? s : best), ",");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else q = false;
      } else field += ch;
    } else if (ch === '"' && field === "") q = true;
    else if (ch === sep) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function csvToWorkbook(text: string, name: string, dayFirst = true): Workbook {
  const sheet: Sheet = { ...emptySheet(name.slice(0, 31) || "Sheet1"), id: newSheetId() };
  parseCsv(text.replace(/^﻿/, "")).forEach((row, r) =>
    row.forEach((field, c) => {
      if (field === "") return;
      // CSV holds values, not formulas.
      const p = parseInput(field.startsWith("=") ? `'${field}` : field, dayFirst);
      if ("formula" in p) return;
      sheet.cells[key(r, c)] = p.fmt ? { v: p.v, s: { fmt: p.fmt } } : { v: p.v };
    }),
  );
  return { sheets: [sheet] };
}

/** One sheet as CSV, with values as displayed. */
export function sheetToCsv(wb: Workbook, si: number, engine: Engine): string {
  const sheet = wb.sheets[si];
  const b = engine.bounds(si);
  const lines: string[] = [];
  for (let r = 0; r <= b.rows; r++) {
    const fields: string[] = [];
    for (let c = 0; c <= b.cols; c++) {
      const cell = sheet.cells[key(r, c)];
      const v = engine.value(si, r, c);
      const t = cell ? formatValue(v, cell.s?.fmt) : "";
      fields.push(/[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);
    }
    lines.push(fields.join(","));
  }
  return lines.join("\r\n");
}

