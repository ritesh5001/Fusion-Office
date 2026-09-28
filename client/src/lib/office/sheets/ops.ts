/**
 * Spreadsheet edits that return a new sheet or workbook (nothing is changed
 * in place, which keeps undo simple). Pure; unit tested.
 */
import { key, MAX_COLS, MAX_ROWS, norm, unkey, type Cell, type Range, type Sheet, type Workbook } from "./model";
import { shiftForStructure, translateFormula } from "./formula";
import { isDateFormat } from "./format";

/** Cells of a sheet inside a range, found the cheap way for big or small ranges. */
export function cellsIn(sheet: Sheet, g: Range): [number, number, Cell][] {
  const out: [number, number, Cell][] = [];
  const area = (g.r2 - g.r1 + 1) * (g.c2 - g.c1 + 1);
  if (area > Object.keys(sheet.cells).length) {
    for (const k in sheet.cells) {
      const { r, c } = unkey(k);
      if (r >= g.r1 && r <= g.r2 && c >= g.c1 && c <= g.c2) out.push([r, c, sheet.cells[k]]);
    }
  } else {
    for (let r = g.r1; r <= g.r2; r++)
      for (let c = g.c1; c <= g.c2; c++) {
        const cell = sheet.cells[key(r, c)];
        if (cell) out.push([r, c, cell]);
      }
  }
  return out;
}

/** Replace some cells (undefined removes one). */
export function withCells(sheet: Sheet, updates: Iterable<[string, Cell | undefined]>): Sheet {
  const cells = { ...sheet.cells };
  for (const [k, c] of updates) {
    if (c && (c.v !== undefined && c.v !== null ? true : c.f !== undefined || c.e !== undefined || (c.s && Object.keys(c.s).length))) cells[k] = c;
    else delete cells[k];
  }
  return { ...sheet, cells };
}

export const updateSheet = (wb: Workbook, si: number, fn: (s: Sheet) => Sheet): Workbook => ({ sheets: wb.sheets.map((s, i) => (i === si ? fn(s) : s)) });

// ─── Insert / delete rows and columns ───────────────────────────────

/** Insert (count > 0) or delete (count < 0) rows or columns at `at` on sheet `si`. */
export function insertAxis(wb: Workbook, si: number, axis: "row" | "col", at: number, count: number): Workbook {
  const target = wb.sheets[si];
  const move = (v: number): number | null => {
    if (count > 0) return v >= at ? v + count : v;
    if (v < at) return v;
    if (v < at - count) return null;
    return v + count;
  };
  const sheets = wb.sheets.map((sheet, i) => {
    const fixFormula = (c: Cell): Cell => (c.f === undefined ? c : { ...c, f: shiftForStructure(c.f, sheet.name, target.name, axis, at, count) });
    if (i !== si) {
      let changed = false;
      const cells: Record<string, Cell> = {};
      for (const k in sheet.cells) {
        const c = sheet.cells[k];
        const n = fixFormula(c);
        if (n !== c && n.f !== c.f) changed = true;
        cells[k] = n.f !== c.f ? n : c;
      }
      return changed ? { ...sheet, cells } : sheet;
    }
    const cells: Record<string, Cell> = {};
    for (const k in sheet.cells) {
      const { r, c } = unkey(k);
      const nr = axis === "row" ? move(r) : r;
      const nc = axis === "col" ? move(c) : c;
      if (nr === null || nc === null) continue;
      cells[key(nr, nc)] = fixFormula(sheet.cells[k]);
    }
    const sizes = (m: Record<number, number>) => {
      const out: Record<number, number> = {};
      for (const [k, v] of Object.entries(m)) {
        const n = move(Number(k));
        if (n !== null) out[n] = v;
      }
      return out;
    };
    const merges: Range[] = [];
    for (const m of sheet.merges) {
      const [lo, hi] = axis === "row" ? [m.r1, m.r2] : [m.c1, m.c2];
      let nlo = move(lo);
      let nhi = move(hi);
      if (count < 0) {
        nlo ??= at;
        nhi ??= at - 1;
      }
      if (nlo === null || nhi === null || nhi < nlo) continue;
      const nm = axis === "row" ? { ...m, r1: nlo, r2: nhi } : { ...m, c1: nlo, c2: nhi };
      if (nm.r1 !== nm.r2 || nm.c1 !== nm.c2) merges.push(nm);
    }
    return {
      ...sheet,
      cells,
      merges,
      rows: axis === "row" ? sizes(sheet.rows) : sheet.rows,
      cols: axis === "col" ? sizes(sheet.cols) : sheet.cols,
    };
  });
  return { sheets };
}

/** Renaming a sheet updates formulas that point at it. */
export function renameSheet(wb: Workbook, si: number, name: string): Workbook {
  const old = wb.sheets[si].name;
  const quote = (n: string) => (/^[A-Za-z_][\w.]*$/.test(n) && !/^[A-Za-z]{1,3}\d+$/.test(n) ? n : `'${n.replace(/'/g, "''")}'`);
  return {
    sheets: wb.sheets.map((sheet, i) => {
      const cells: Record<string, Cell> = {};
      let changed = false;
      for (const k in sheet.cells) {
        const c = sheet.cells[k];
        if (c.f && c.f.toLowerCase().includes(old.toLowerCase())) {
          // Rewrite only sheet prefixes that name the old sheet.
          const f = renamePrefix(c.f, old, quote(name));
          if (f !== c.f) {
            changed = true;
            cells[k] = { ...c, f };
            continue;
          }
        }
        cells[k] = c;
      }
      const s = changed ? { ...sheet, cells } : sheet;
      return i === si ? { ...s, name } : s;
    }),
  };
}

function renamePrefix(f: string, old: string, replacement: string): string {
  let out = "";
  const re = /('(?:[^']|'')+'|[A-Za-z_À-￿][\w.À-￿]*)!/g;
  let last = 0;
  // Leave anything inside a "string" alone.
  for (let m = re.exec(f); m; m = re.exec(f)) {
    const before = f.slice(0, m.index);
    if ((before.match(/"/g) ?? []).length % 2 === 1) continue;
    const name = m[1].startsWith("'") ? m[1].slice(1, -1).replace(/''/g, "'") : m[1];
    if (name.toLowerCase() !== old.toLowerCase()) continue;
    out += f.slice(last, m.index) + replacement + "!";
    last = m.index + m[0].length;
  }
  return out + f.slice(last);
}

// ─── Sort ───────────────────────────────────────────────────────────

/** Sort the rows of `g` by column `byCol`. Formulas move with their rows. */
export function sortRange(sheet: Sheet, g: Range, byCol: number, asc: boolean, header: boolean, valueOf: (r: number, c: number) => unknown): Sheet {
  const start = header ? g.r1 + 1 : g.r1;
  const rows = Array.from({ length: g.r2 - start + 1 }, (_, i) => start + i);
  const rank = (v: unknown) => (v === null || v === undefined || v === "" ? 3 : typeof v === "number" ? 0 : typeof v === "string" ? 1 : 2);
  rows.sort((a, b) => {
    const x = valueOf(a, byCol);
    const y = valueOf(b, byCol);
    const rx = rank(x);
    const ry = rank(y);
    // Blank cells always go last.
    if (rx === 3 || ry === 3) return rx - ry;
    if (rx !== ry) return (rx - ry) * (asc ? 1 : -1);
    const d = typeof x === "string" ? x.localeCompare(String(y), undefined, { numeric: true, sensitivity: "base" }) : Number(x) - Number(y);
    return asc ? d : -d;
  });
  const updates: [string, Cell | undefined][] = [];
  rows.forEach((from, i) => {
    const to = start + i;
    for (let c = g.c1; c <= g.c2; c++) {
      const cell = sheet.cells[key(from, c)];
      updates.push([key(to, c), cell && cell.f !== undefined ? { ...cell, f: translateFormula(cell.f, to - from, 0) } : cell]);
    }
  });
  return withCells(sheet, updates);
}

// ─── Fill handle ────────────────────────────────────────────────────

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function listSeries(text: string, list: string[]): ((step: number) => string) | null {
  const t = text.toLowerCase();
  const full = list.indexOf(t);
  const short = list.findIndex((x) => x.slice(0, 3) === t);
  const i = full >= 0 ? full : short;
  if (i < 0) return null;
  const isShort = full < 0;
  const cased = (s: string) => (text === text.toUpperCase() ? s.toUpperCase() : text[0] === text[0].toUpperCase() ? s[0].toUpperCase() + s.slice(1) : s);
  const n = list.length;
  return (step) => {
    const name = list[(((i + step) % n) + n) % n];
    return cased(isShort ? name.slice(0, 3) : name);
  };
}

/**
 * Fill `target` (which contains `src`) the way Excel's fill handle does:
 * number series continue (1, 2 → 3, 4), a single date or "Item 1" counts up,
 * weekday and month names continue, formulas shift, anything else repeats.
 */
export function fillRange(sheet: Sheet, src: Range, target: Range): Sheet {
  const t = norm(target);
  const down = t.r2 > src.r2 || t.r1 < src.r1;
  const updates: [string, Cell | undefined][] = [];
  const lines = down ? src.c2 - src.c1 + 1 : src.r2 - src.r1 + 1;
  const len = down ? src.r2 - src.r1 + 1 : src.c2 - src.c1 + 1;
  for (let line = 0; line < lines; line++) {
    const at = (i: number) => (down ? { r: src.r1 + i, c: src.c1 + line } : { r: src.r1 + line, c: src.c1 + i });
    const seq = Array.from({ length: len }, (_, i) => sheet.cells[key(at(i).r, at(i).c)]);
    const nums = seq.map((c) => (c && c.f === undefined && typeof c.v === "number" ? c.v : null));
    const numeric = nums.every((n) => n !== null);
    const step = numeric && len > 1 ? (nums[len - 1]! - nums[0]!) / (len - 1) : numeric && len === 1 && isDateFormat(seq[0]?.s?.fmt) ? 1 : null;
    const textNum = len === 1 && typeof seq[0]?.v === "string" && seq[0].f === undefined ? seq[0].v.match(/^(.*?)(\d+)$/) : null;
    const listFn = len === 1 && typeof seq[0]?.v === "string" ? (listSeries(seq[0].v, WEEKDAYS) ?? listSeries(seq[0].v, MONTH_NAMES)) : null;
    const span = down ? t.r2 - t.r1 + 1 : t.c2 - t.c1 + 1;
    for (let k = 0; k < span; k++) {
      const pos = down ? { r: t.r1 + k, c: src.c1 + line } : { r: src.r1 + line, c: t.c1 + k };
      const idx = down ? pos.r - src.r1 : pos.c - src.c1;
      if (idx >= 0 && idx < len) continue; // the source itself
      // Offset from the source start, negative when filling up or left.
      const off = idx;
      const srcIdx = ((off % len) + len) % len;
      const from = seq[srcIdx];
      const fromPos = at(srcIdx);
      let cell: Cell | undefined;
      if (step !== null) cell = { ...from, v: nums[0]! + step * off };
      else if (textNum) cell = { ...from, v: `${textNum[1]}${Math.max(0, Number(textNum[2]) + off)}` };
      else if (listFn) cell = { ...from, v: listFn(off) };
      else if (from?.f !== undefined) cell = { ...from, f: translateFormula(from.f, pos.r - fromPos.r, pos.c - fromPos.c) };
      else cell = from;
      updates.push([key(pos.r, pos.c), cell]);
    }
  }
  return withCells(sheet, updates);
}

// ─── Copy / paste ───────────────────────────────────────────────────

export interface Clip {
  sheet: number;
  range: Range;
  cells: (Cell | undefined)[][];
  cut: boolean;
  text: string;
}

/** Paste `clip` with its top-left at (r, c). Formulas shift by the distance moved. */
export function pasteClip(sheet: Sheet, clip: Clip, r: number, c: number, target?: Range): Sheet {
  const rows = clip.cells.length;
  const cols = clip.cells[0]?.length ?? 0;
  // A bigger target that's a multiple of the copied block gets it repeated.
  const tr = target && (target.r2 - target.r1 + 1) % rows === 0 ? target.r2 - target.r1 + 1 : rows;
  const tc = target && (target.c2 - target.c1 + 1) % cols === 0 ? target.c2 - target.c1 + 1 : cols;
  const updates: [string, Cell | undefined][] = [];
  for (let i = 0; i < tr; i++)
    for (let j = 0; j < tc; j++) {
      const cell = clip.cells[i % rows][j % cols];
      const rr = r + i;
      const cc = c + j;
      if (rr >= MAX_ROWS || cc >= MAX_COLS) continue;
      const dr = rr - (clip.range.r1 + (i % rows));
      const dc = cc - (clip.range.c1 + (j % cols));
      updates.push([key(rr, cc), cell && cell.f !== undefined && !clip.cut ? { ...cell, f: translateFormula(cell.f, dr, dc) } : cell]);
    }
  return withCells(sheet, updates);
}

/** Tab-separated text (from Excel, Sheets or anywhere) → rows of fields. */
export function parseTsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let q = false;
  const s = text.replace(/\r\n?/g, "\n").replace(/\n$/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"' && s[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"' && field === "") q = true;
    else if (ch === "\t") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  rows.push(row);
  return rows;
}

