/** Spreadsheet model for the Excel editor. Rows and columns are 0-based. */

export interface Border {
  t?: string;
  r?: string;
  b?: string;
  l?: string;
}

export interface CellStyle {
  b?: boolean;
  i?: boolean;
  u?: boolean;
  s?: boolean;
  color?: string;
  fill?: string;
  size?: number;
  font?: string;
  h?: "left" | "center" | "right";
  v?: "top" | "middle" | "bottom";
  wrap?: boolean;
  /** Excel number format, e.g. "#,##0.00", "0%", "dd/mm/yyyy". */
  fmt?: string;
  border?: Border;
}

export type Scalar = string | number | boolean | null;

export interface Cell {
  /** Literal value (for formula cells: the value last saved in the file). */
  v?: Scalar;
  /** Formula without the leading "=". */
  f?: string;
  /** Error text for literal error cells (#N/A…). */
  e?: string;
  s?: CellStyle;
}

export interface Range {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

export interface Sheet {
  id: string;
  name: string;
  cells: Record<string, Cell>;
  /** Column widths / row heights in px, where not default. */
  cols: Record<number, number>;
  rows: Record<number, number>;
  merges: Range[];
  freeze?: { rows: number; cols: number };
  hidden?: boolean;
  /** Worksheet id in the original .xlsx, so saving writes back into it. */
  sourceId?: number;
}

export interface Workbook {
  sheets: Sheet[];
}

export const DEFAULT_COL = 100;
export const DEFAULT_ROW = 24;
export const MAX_ROWS = 1_048_576;
export const MAX_COLS = 16_384;

export const key = (r: number, c: number) => `${r},${c}`;
export const unkey = (k: string) => {
  const i = k.indexOf(",");
  return { r: Number(k.slice(0, i)), c: Number(k.slice(i + 1)) };
};

/** 0 → "A", 25 → "Z", 26 → "AA" */
export function colName(c: number): string {
  let s = "";
  for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** "AA" → 26 */
export function colIndex(name: string): number {
  let n = 0;
  for (const ch of name.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export const addr = (r: number, c: number) => `${colName(c)}${r + 1}`;

export const rangeAddr = (g: Range) => (g.r1 === g.r2 && g.c1 === g.c2 ? addr(g.r1, g.c1) : `${addr(g.r1, g.c1)}:${addr(g.r2, g.c2)}`);

/** "B12" → { r: 11, c: 1 } */
export function parseAddr(s: string): { r: number; c: number } | null {
  const m = s.trim().toUpperCase().match(/^\$?([A-Z]{1,3})\$?(\d{1,7})$/);
  if (!m) return null;
  const r = Number(m[2]) - 1;
  const c = colIndex(m[1]);
  return r >= 0 && r < MAX_ROWS && c < MAX_COLS ? { r, c } : null;
}

/** "A1:C5" or "B2" → range */
export function parseRange(s: string): Range | null {
  const [a, b] = s.split(":");
  const p = parseAddr(a);
  const q = b ? parseAddr(b) : p;
  return p && q ? norm({ r1: p.r, c1: p.c, r2: q.r, c2: q.c }) : null;
}

export const norm = (g: Range): Range => ({ r1: Math.min(g.r1, g.r2), c1: Math.min(g.c1, g.c2), r2: Math.max(g.r1, g.r2), c2: Math.max(g.c1, g.c2) });

export const inRange = (g: Range, r: number, c: number) => r >= g.r1 && r <= g.r2 && c >= g.c1 && c <= g.c2;

export const newSheetId = () => `s${Math.random().toString(36).slice(2, 9)}`;

export const emptySheet = (name: string): Sheet => ({ id: newSheetId(), name, cells: {}, cols: {}, rows: {}, merges: [] });

export const emptyWorkbook = (): Workbook => ({ sheets: [emptySheet("Sheet1")] });

/** Last used row and column of a sheet (-1 when empty). */
export function usedBounds(sheet: Sheet): { rows: number; cols: number } {
  let rows = -1;
  let cols = -1;
  for (const k in sheet.cells) {
    const { r, c } = unkey(k);
    if (r > rows) rows = r;
    if (c > cols) cols = c;
  }
  return { rows, cols };
}

/** A sheet name that isn't taken yet: "Sheet2", "Sales (2)"… */
export function uniqueName(wb: Workbook, base: string): string {
  const names = new Set(wb.sheets.map((s) => s.name.toLowerCase()));
  if (!names.has(base.toLowerCase())) return base;
  for (let i = 2; ; i++) {
    const n = /^Sheet\d+$/i.test(base) ? `Sheet${i}` : `${base} (${i})`;
    if (!names.has(n.toLowerCase())) return n;
  }
}

/** The merge that covers (r, c), if any. */
export const mergeAt = (sheet: Sheet, r: number, c: number) => sheet.merges.find((m) => inRange(m, r, c));
