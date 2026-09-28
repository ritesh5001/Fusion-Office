/**
 * Excel formulas: tokenizer, parser, evaluator and reference rewriting.
 * Functions come from formulajs (400 Excel functions, MIT); IF, IFERROR,
 * TEXT, ROW/COLUMN, NOW and friends are handled here. Dates are serial numbers.
 */
import * as fjs from "@formulajs/formulajs";
import { colIndex, colName, MAX_COLS, MAX_ROWS, type Cell, type Scalar, type Workbook } from "./model";
import { dateToSerial, formatValue, general, isDateFormat } from "./format";

// formulajs returns and recognises its own error objects; use the same ones.
const fe = (fjs as unknown as { utils: { errors: Record<string, Error>; date: { useSerial: () => void } } }).utils;
fe.date.useSerial();
const CANON: Record<string, Error> = {
  "#DIV/0!": fe.errors.div0,
  "#N/A": fe.errors.na,
  "#VALUE!": fe.errors.value,
  "#REF!": fe.errors.ref,
  "#NAME?": fe.errors.name,
  "#NUM!": fe.errors.num,
  "#NULL!": fe.errors.nil,
  "#CALC!": fe.errors.calc,
};
export const err = (code: string): Error => CANON[code] ?? new Error(code);
const isErr = (v: unknown): v is Error => v instanceof Error;

export type Value = Scalar | Error | Matrix;
export type Matrix = (Scalar | Error)[][];
const isMatrix = (v: Value): v is Matrix => Array.isArray(v);

// ─── Tokens ─────────────────────────────────────────────────────────

export interface RefPart {
  r: number;
  c: number;
  absR: boolean;
  absC: boolean;
}
export type Token =
  | { t: "num"; v: number; raw: string }
  | { t: "str"; v: string; raw: string }
  | { t: "bool"; v: boolean; raw: string }
  | { t: "err"; v: string; raw: string }
  | { t: "ref"; sheet?: string; sheetRaw?: string; a: RefPart; b?: RefPart; kind: "cell" | "cols" | "rows"; raw: string }
  | { t: "fn"; v: string; raw: string }
  | { t: "name"; v: string; raw: string }
  | { t: "op"; v: string; raw: string }
  | { t: "ws"; raw: string };

const SHEET = String.raw`(?:('(?:[^']|'')+'|[A-Za-z_À-￿][\w.À-￿]*)!)?`;
const CELL = String.raw`\$?[A-Za-z]{1,3}\$?\d{1,7}`;
const RE_CELL = new RegExp(`^${SHEET}(${CELL})(?::(${CELL}))?(?![\\w(!])`);
const RE_COLS = new RegExp(String.raw`^${SHEET}(\$?[A-Za-z]{1,3}):(\$?[A-Za-z]{1,3})(?![\w(])`);
const RE_ROWS = new RegExp(String.raw`^${SHEET}(\$?\d{1,7}):(\$?\d{1,7})(?![\w(])`);
const ERRORS = ["#DIV/0!", "#N/A", "#VALUE!", "#REF!", "#NAME?", "#NUM!", "#NULL!", "#CALC!", "#SPILL!"];

function cellPart(s: string): RefPart {
  const m = s.match(/^(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/)!;
  return { absC: !!m[1], c: colIndex(m[2]), absR: !!m[3], r: Number(m[4]) - 1 };
}

const unquote = (s: string | undefined) => (s === undefined ? undefined : s.startsWith("'") ? s.slice(1, -1).replace(/''/g, "'") : s);

export function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    const ch = src[i];
    let m: RegExpMatchArray | null;
    if (/\s/.test(ch)) {
      const ws = rest.match(/^\s+/)![0];
      out.push({ t: "ws", raw: ws });
      i += ws.length;
    } else if (ch === '"') {
      let j = i + 1;
      let v = "";
      for (; j < src.length; j++) {
        if (src[j] === '"') {
          if (src[j + 1] === '"') {
            v += '"';
            j++;
          } else break;
        } else v += src[j];
      }
      if (j >= src.length) throw err("#NAME?");
      out.push({ t: "str", v, raw: src.slice(i, j + 1) });
      i = j + 1;
    } else if (ch === "#") {
      const e = ERRORS.find((x) => rest.toUpperCase().startsWith(x));
      if (!e) throw err("#NAME?");
      out.push({ t: "err", v: e, raw: rest.slice(0, e.length) });
      i += e.length;
    } else if ((m = rest.match(RE_CELL))) {
      const a = cellPart(m[2]);
      const b = m[3] ? cellPart(m[3]) : undefined;
      out.push({ t: "ref", kind: "cell", sheet: unquote(m[1]), sheetRaw: m[1], a, b, raw: m[0] });
      i += m[0].length;
    } else if ((m = rest.match(RE_COLS))) {
      const pa = (s: string): RefPart => ({ absC: s.startsWith("$"), c: colIndex(s.replace("$", "")), absR: true, r: 0 });
      const a = pa(m[2]);
      const b = { ...pa(m[3]), r: MAX_ROWS - 1 };
      out.push({ t: "ref", kind: "cols", sheet: unquote(m[1]), sheetRaw: m[1], a, b, raw: m[0] });
      i += m[0].length;
    } else if ((m = rest.match(RE_ROWS))) {
      const pr = (s: string): RefPart => ({ absR: s.startsWith("$"), r: Number(s.replace("$", "")) - 1, absC: true, c: 0 });
      const a = pr(m[2]);
      const b = { ...pr(m[3]), c: MAX_COLS - 1 };
      out.push({ t: "ref", kind: "rows", sheet: unquote(m[1]), sheetRaw: m[1], a, b, raw: m[0] });
      i += m[0].length;
    } else if ((m = rest.match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i))) {
      out.push({ t: "num", v: Number(m[0]), raw: m[0] });
      i += m[0].length;
    } else if ((m = rest.match(/^(TRUE|FALSE)(?![\w(.])/i))) {
      out.push({ t: "bool", v: m[1].toUpperCase() === "TRUE", raw: m[0] });
      i += m[0].length;
    } else if ((m = rest.match(/^[A-Za-z_\\][\w.]*(?=\s*\()/))) {
      out.push({ t: "fn", v: m[0].toUpperCase().replace(/^_XLFN\./, "").replace(/^_XLWS\./, ""), raw: m[0] });
      i += m[0].length;
    } else if ((m = rest.match(/^[A-Za-z_\\][\w.]*/))) {
      out.push({ t: "name", v: m[0], raw: m[0] });
      i += m[0].length;
    } else if ((m = rest.match(/^(<=|>=|<>|[-+*/^&=<>%(),;:{}])/))) {
      out.push({ t: "op", v: m[0] === ";" ? "," : m[0], raw: m[0] });
      i += m[0].length;
    } else throw err("#NAME?");
  }
  return out;
}

// ─── Parser ─────────────────────────────────────────────────────────

export type Node =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "bool"; v: boolean }
  | { k: "err"; v: string }
  | { k: "empty" }
  | { k: "ref"; sheet?: string; a: RefPart; b?: RefPart }
  | { k: "name"; v: string }
  | { k: "un"; op: string; a: Node }
  | { k: "pct"; a: Node }
  | { k: "bin"; op: string; a: Node; b: Node }
  | { k: "fn"; name: string; args: Node[] };

export function parse(src: string): Node {
  const toks = tokenize(src).filter((t) => t.t !== "ws");
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === "op" && (peek() as { v: string }).v === v;
  const expect = (v: string) => {
    if (!isOp(v)) throw err("#NAME?");
    p++;
  };
  const level = (ops: string[], next: () => Node) => (): Node => {
    let a = next();
    while (peek()?.t === "op" && ops.includes((peek() as { v: string }).v)) {
      const op = (toks[p++] as { v: string }).v;
      a = { k: "bin", op, a, b: next() };
    }
    return a;
  };
  const primary = (): Node => {
    const t = toks[p++];
    if (!t) throw err("#NAME?");
    switch (t.t) {
      case "num":
        return { k: "num", v: t.v };
      case "str":
        return { k: "str", v: t.v };
      case "bool":
        return { k: "bool", v: t.v };
      case "err":
        return { k: "err", v: t.v };
      case "ref":
        return { k: "ref", sheet: t.sheet, a: t.a, b: t.b };
      case "name":
        return { k: "name", v: t.v };
      case "fn": {
        expect("(");
        const args: Node[] = [];
        if (!isOp(")")) {
          for (;;) {
            args.push(isOp(",") || isOp(")") ? { k: "empty" } : comparison());
            if (isOp(",")) {
              p++;
              continue;
            }
            break;
          }
        }
        expect(")");
        return { k: "fn", name: t.v, args };
      }
      case "op":
        if (t.v === "(") {
          const e = comparison();
          expect(")");
          return e;
        }
        if (t.v === "-" || t.v === "+") return { k: "un", op: t.v, a: unary() };
    }
    throw err("#NAME?");
  };
  const postfix = (): Node => {
    let a = primary();
    while (isOp("%")) {
      p++;
      a = { k: "pct", a };
    }
    return a;
  };
  const unary = (): Node => {
    if (isOp("-") || isOp("+")) {
      const op = (toks[p++] as { v: string }).v;
      return { k: "un", op, a: unary() };
    }
    return postfix();
  };
  const power = level(["^"], unary);
  const mult = level(["*", "/"], power);
  const add = level(["+", "-"], mult);
  const concat = level(["&"], add);
  const comparison = level(["=", "<>", "<", ">", "<=", ">="], concat);
  const tree = comparison();
  if (p < toks.length) throw err("#NAME?");
  return tree;
}

// ─── Evaluation ─────────────────────────────────────────────────────

export interface EvalContext {
  /** Sheet the formula lives in. */
  sheet: number;
  row: number;
  col: number;
  sheetIndex: (name: string) => number;
  /** Computed value of a cell (null when empty). */
  cell: (sheet: number, r: number, c: number) => Scalar | Error;
  /** Used area of a sheet, to bound whole-column / whole-row ranges. */
  bounds: (sheet: number) => { rows: number; cols: number };
}

function toNumber(v: Scalar | Error): number | Error {
  if (isErr(v)) return v;
  if (v === null) return 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return v;
  const t = v.trim();
  if (t === "") return err("#VALUE!");
  const pct = t.match(/^([-+]?[\d.]+)%$/);
  if (pct) return Number(pct[1]) / 100;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : err("#VALUE!");
}

const toText = (v: Scalar): string => (v === null ? "" : typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : typeof v === "number" ? general(v) : v);

function compare(a: Scalar, b: Scalar): number {
  const rank = (v: Scalar) => (typeof v === "number" ? 0 : typeof v === "string" ? 1 : 2);
  if (a === null) a = typeof b === "string" ? "" : typeof b === "boolean" ? false : 0;
  if (b === null) b = typeof a === "string" ? "" : typeof a === "boolean" ? false : 0;
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (typeof a === "string") return a.toLowerCase().localeCompare((b as string).toLowerCase());
  return Number(a) - Number(b);
}

function scalar(v: Value): Scalar | Error {
  if (!isMatrix(v)) return v;
  return v.length === 1 && v[0].length === 1 ? v[0][0] : err("#VALUE!");
}

/** Apply a scalar operation, element by element when either side is a range. */
function lift(a: Value, b: Value, fn: (x: Scalar | Error, y: Scalar | Error) => Scalar | Error): Value {
  if (!isMatrix(a) && !isMatrix(b)) return fn(a, b);
  const A = isMatrix(a) ? a : [[a]];
  const B = isMatrix(b) ? b : [[b]];
  const rows = Math.max(A.length, B.length);
  const cols = Math.max(A[0]?.length ?? 0, B[0]?.length ?? 0);
  const pick = (M: Matrix, r: number, c: number) => (M.length === 1 && M[0].length === 1 ? M[0][0] : (M[r]?.[c] ?? err("#N/A")));
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => fn(pick(A, r, c), pick(B, r, c))));
}

const arith = (op: string) => (x: Scalar | Error, y: Scalar | Error): Scalar | Error => {
  const a = toNumber(x);
  if (isErr(a)) return a;
  const b = toNumber(y);
  if (isErr(b)) return b;
  let r: number;
  if (op === "+") r = a + b;
  else if (op === "-") r = a - b;
  else if (op === "*") r = a * b;
  else if (op === "/") {
    if (b === 0) return err("#DIV/0!");
    r = a / b;
  } else r = Math.pow(a, b);
  return Number.isFinite(r) ? r : err("#NUM!");
};

const SPECIAL: Record<string, (args: Node[], ev: (n: Node) => Value, ctx: EvalContext) => Value> = {
  IF: (args, ev) => {
    const c = scalar(ev(args[0] ?? { k: "empty" }));
    if (isErr(c)) return c;
    const n = toNumber(c === null ? false : c);
    if (isErr(n)) return n;
    const branch = n !== 0 ? args[1] : args[2];
    return branch ? ev(branch) : n !== 0 ? true : false;
  },
  IFERROR: (args, ev) => {
    const v = ev(args[0]);
    const s = isMatrix(v) ? v : scalar(v);
    return isErr(s) ? ev(args[1] ?? { k: "str", v: "" }) : v;
  },
  IFNA: (args, ev) => {
    const v = ev(args[0]);
    const s = isMatrix(v) ? v : scalar(v);
    return isErr(s) && s.message === "#N/A" ? ev(args[1] ?? { k: "str", v: "" }) : v;
  },
  IFS: (args, ev) => {
    for (let i = 0; i + 1 < args.length; i += 2) {
      const c = scalar(ev(args[i]));
      if (isErr(c)) return c;
      if (c) return ev(args[i + 1]);
    }
    return err("#N/A");
  },
  ROW: (args, _ev, ctx) => (args[0]?.k === "ref" ? args[0].a.r + 1 : ctx.row + 1),
  COLUMN: (args, _ev, ctx) => (args[0]?.k === "ref" ? args[0].a.c + 1 : ctx.col + 1),
  ROWS: (args, ev) => {
    const v = ev(args[0]);
    return isMatrix(v) ? v.length : 1;
  },
  COLUMNS: (args, ev) => {
    const v = ev(args[0]);
    return isMatrix(v) ? (v[0]?.length ?? 0) : 1;
  },
  NOW: () => {
    const d = new Date();
    return dateToSerial(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
  },
  TODAY: () => {
    const d = new Date();
    return dateToSerial(d.getFullYear(), d.getMonth() + 1, d.getDate());
  },
  TEXT: (args, ev) => {
    const v = scalar(ev(args[0]));
    const f = scalar(ev(args[1] ?? { k: "str", v: "General" }));
    if (isErr(v)) return v;
    if (isErr(f)) return f;
    const n = typeof v === "string" ? toNumber(v) : v;
    return formatValue(isErr(n) ? v : n, toText(f));
  },
  ISBLANK: (args, ev) => scalar(ev(args[0])) === null,
};

function resolveFn(name: string): ((...a: unknown[]) => unknown) | null {
  let cur: unknown = fjs;
  for (const part of name.split(".")) {
    cur = (cur as Record<string, unknown>)?.[part];
    if (cur === undefined) return null;
  }
  if (typeof cur === "function") return cur as (...a: unknown[]) => unknown;
  // e.g. "NORM" is an object with DIST/INV; "STDEV" is callable.
  return null;
}

function normalize(r: unknown): Value {
  if (r instanceof Date) {
    return dateToSerial(r.getFullYear(), r.getMonth() + 1, r.getDate(), r.getHours(), r.getMinutes(), r.getSeconds());
  }
  if (isErr(r)) return CANON[r.message] ?? r;
  if (typeof r === "number") return Number.isFinite(r) ? r : err("#NUM!");
  if (typeof r === "string" || typeof r === "boolean") return r;
  if (r === null || r === undefined) return 0;
  if (Array.isArray(r)) return (Array.isArray(r[0]) ? r : [r]).map((row: unknown[]) => row.map((x) => scalar(normalize(x))));
  return err("#VALUE!");
}

export function evaluate(node: Node, ctx: EvalContext): Value {
  const ev = (n: Node): Value => evaluate(n, ctx);
  switch (node.k) {
    case "num":
      return node.v;
    case "str":
      return node.v;
    case "bool":
      return node.v;
    case "err":
      return err(node.v);
    case "empty":
      return null;
    case "name":
      return err("#NAME?");
    case "ref": {
      const s = node.sheet === undefined ? ctx.sheet : ctx.sheetIndex(node.sheet);
      if (s < 0) return err("#REF!");
      if (!node.b) return ctx.cell(s, node.a.r, node.a.c);
      const bounds = ctx.bounds(s);
      const r1 = Math.min(node.a.r, node.b.r);
      const c1 = Math.min(node.a.c, node.b.c);
      // Whole columns/rows only go as far as the data does.
      const r2 = Math.min(Math.max(node.a.r, node.b.r), Math.max(r1, bounds.rows));
      const c2 = Math.min(Math.max(node.a.c, node.b.c), Math.max(c1, bounds.cols));
      const m: Matrix = [];
      for (let r = r1; r <= r2; r++) {
        const row: (Scalar | Error)[] = [];
        for (let c = c1; c <= c2; c++) row.push(ctx.cell(s, r, c));
        m.push(row);
      }
      return m;
    }
    case "pct":
      return lift(ev(node.a), 100, arith("/"));
    case "un": {
      const v = ev(node.a);
      return node.op === "-" ? lift(v, -1, arith("*")) : lift(v, 0, arith("+"));
    }
    case "bin": {
      const a = ev(node.a);
      const b = ev(node.b);
      if (node.op === "&") return lift(a, b, (x, y) => (isErr(x) ? x : isErr(y) ? y : toText(x) + toText(y)));
      if (["=", "<>", "<", ">", "<=", ">="].includes(node.op))
        return lift(a, b, (x, y) => {
          if (isErr(x)) return x;
          if (isErr(y)) return y;
          const d = compare(x, y);
          return node.op === "=" ? d === 0 : node.op === "<>" ? d !== 0 : node.op === "<" ? d < 0 : node.op === ">" ? d > 0 : node.op === "<=" ? d <= 0 : d >= 0;
        });
      return lift(a, b, arith(node.op));
    }
    case "fn": {
      const special = SPECIAL[node.name];
      if (special) return special(node.args, ev, ctx);
      const fn = resolveFn(node.name);
      if (!fn) return err("#NAME?");
      const args = node.args.map((a) => (a.k === "empty" ? undefined : ev(a)));
      try {
        return normalize(fn(...args));
      } catch {
        return err("#VALUE!");
      }
    }
  }
}

// ─── Reference rewriting ────────────────────────────────────────────

const refText = (p: RefPart, kind: "cell" | "cols" | "rows") =>
  kind === "cols" ? `${p.absC ? "$" : ""}${colName(p.c)}` : kind === "rows" ? `${p.absR ? "$" : ""}${p.r + 1}` : `${p.absC ? "$" : ""}${colName(p.c)}${p.absR ? "$" : ""}${p.r + 1}`;

/**
 * Rebuild a formula with every reference passed through `fn`. `fn` gets the
 * sheet name the reference names (undefined = the formula's own sheet) and
 * returns new corner positions, or null for #REF!.
 */
export function rewriteRefs(formula: string, fn: (sheet: string | undefined, a: RefPart, b: RefPart | undefined, kind: "cell" | "cols" | "rows") => { a: RefPart; b?: RefPart } | null): string {
  let toks: Token[];
  try {
    toks = tokenize(formula);
  } catch {
    return formula;
  }
  return toks
    .map((t) => {
      if (t.t !== "ref") return t.raw;
      const res = fn(t.sheet, t.a, t.b, t.kind);
      if (!res) return "#REF!";
      const prefix = t.sheetRaw ? `${t.sheetRaw}!` : "";
      return `${prefix}${refText(res.a, t.kind)}${res.b ? `:${refText(res.b, t.kind)}` : ""}`;
    })
    .join("");
}

/** Copying a formula by (dr, dc) moves its relative references (A1 → B2), not $A$1. */
export function translateFormula(formula: string, dr: number, dc: number): string {
  const move = (p: RefPart, kind: "cell" | "cols" | "rows"): RefPart | null => {
    const r = p.absR || kind === "cols" ? p.r : p.r + dr;
    const c = p.absC || kind === "rows" ? p.c : p.c + dc;
    return r < 0 || c < 0 || r >= MAX_ROWS || c >= MAX_COLS ? null : { ...p, r, c };
  };
  return rewriteRefs(formula, (_s, a, b, kind) => {
    const na = move(a, kind);
    const nb = b ? move(b, kind) : undefined;
    return na && nb !== null ? { a: na, b: nb } : null;
  });
}

/**
 * Update references after inserting (count > 0) or deleting (count < 0)
 * rows/columns at `at` on sheet `target`. `own` is the formula's sheet name.
 */
export function shiftForStructure(formula: string, own: string, target: string, axis: "row" | "col", at: number, count: number): string {
  const key = axis === "row" ? "r" : "c";
  const move = (v: number): number | null => {
    if (count > 0) return v >= at ? v + count : v;
    const end = at - count; // first index after the deleted block
    if (v < at) return v;
    if (v >= end) return v + count;
    return null;
  };
  return rewriteRefs(formula, (sheet, a, b, kind) => {
    if ((sheet ?? own).toLowerCase() !== target.toLowerCase()) return { a, b };
    if ((axis === "row" && kind === "cols") || (axis === "col" && kind === "rows")) return { a, b };
    if (!b) {
      const v = move(a[key]);
      return v === null ? null : { a: { ...a, [key]: v } };
    }
    // Ranges shrink or grow; only a range deleted completely becomes #REF!.
    const lo = Math.min(a[key], b[key]);
    const hi = Math.max(a[key], b[key]);
    let nlo = move(lo);
    let nhi = move(hi);
    if (count < 0) {
      nlo ??= at;
      nhi ??= at - 1;
      if (nhi < nlo) return null;
    }
    return { a: { ...a, [key]: nlo! }, b: { ...b, [key]: nhi! } };
  });
}

// ─── Engine: computed values for a workbook ─────────────────────────

const DATE_FNS = new Set(["DATE", "TODAY", "NOW", "EDATE", "EOMONTH", "WORKDAY", "WORKDAY.INTL", "DATEVALUE", "TIME", "TIMEVALUE"]);
const AST = new Map<string, Node | Error>();

function parsed(f: string): Node | Error {
  let n = AST.get(f);
  if (!n) {
    try {
      n = parse(f);
    } catch (e) {
      n = isErr(e) ? e : err("#NAME?");
    }
    if (AST.size > 20_000) AST.clear();
    AST.set(f, n);
  }
  return n;
}

export class Engine {
  private cache = new Map<string, Scalar | Error>();
  private busy = new Set<string>();
  private boundsCache = new Map<number, { rows: number; cols: number }>();

  constructor(readonly wb: Workbook) {}

  /** The value a cell shows (formulas computed). */
  value(s: number, r: number, c: number): Scalar | Error {
    const k = `${s}:${r},${c}`;
    const hit = this.cache.get(k);
    if (hit !== undefined) return hit;
    const cell = this.wb.sheets[s]?.cells[`${r},${c}`];
    let v: Scalar | Error;
    if (!cell) v = null;
    else if (cell.f !== undefined) {
      if (this.busy.has(k)) return err("#CALC!");
      this.busy.add(k);
      try {
        v = this.compute(s, r, c, cell);
      } finally {
        this.busy.delete(k);
      }
    } else v = cell.e ? err(cell.e) : (cell.v ?? null);
    this.cache.set(k, v);
    return v;
  }

  private compute(s: number, r: number, c: number, cell: Cell): Scalar | Error {
    const node = parsed(cell.f!);
    if (isErr(node)) return node;
    const ctx: EvalContext = {
      sheet: s,
      row: r,
      col: c,
      sheetIndex: (name) => this.wb.sheets.findIndex((x) => x.name.toLowerCase() === name.toLowerCase()),
      cell: (si, rr, cc) => this.value(si, rr, cc),
      bounds: (si) => this.bounds(si),
    };
    try {
      const v = scalar(evaluate(node, ctx));
      return v === null ? 0 : v;
    } catch (e) {
      // Very deep chains of references can exhaust the stack.
      return e instanceof RangeError ? err("#CALC!") : err("#VALUE!");
    }
  }

  bounds(s: number) {
    let b = this.boundsCache.get(s);
    if (!b) {
      b = { rows: -1, cols: -1 };
      for (const k in this.wb.sheets[s]?.cells ?? {}) {
        const i = k.indexOf(",");
        const r = Number(k.slice(0, i));
        const c = Number(k.slice(i + 1));
        if (r > b.rows) b.rows = r;
        if (c > b.cols) b.cols = c;
      }
      this.boundsCache.set(s, b);
    }
    return b;
  }

  /**
   * Compute every formula top-to-bottom first, so long chains (running
   * totals) resolve from cache instead of recursing thousands deep.
   */
  warm(s: number) {
    const keys = Object.keys(this.wb.sheets[s]?.cells ?? {}).filter((k) => this.wb.sheets[s].cells[k].f !== undefined);
    keys.sort((x, y) => {
      const [xr, xc] = x.split(",").map(Number);
      const [yr, yc] = y.split(",").map(Number);
      return xr - yr || xc - yc;
    });
    for (const k of keys) {
      const [r, c] = k.split(",").map(Number);
      this.value(s, r, c);
    }
  }

  /** Whether a formula result should show as a date when its cell has no format. */
  looksLikeDate(s: number, cell: Cell): boolean {
    if (cell.f === undefined) return false;
    const node = parsed(cell.f);
    if (isErr(node)) return false;
    if (node.k === "fn") return DATE_FNS.has(node.name);
    if (node.k === "bin" && (node.op === "+" || node.op === "-")) {
      const refDate = (n: Node) => {
        if (n.k !== "ref" || n.b) return false;
        const si = n.sheet === undefined ? s : this.wb.sheets.findIndex((x) => x.name === n.sheet);
        return isDateFormat(this.wb.sheets[si]?.cells[`${n.a.r},${n.a.c}`]?.s?.fmt);
      };
      return node.op === "+" ? refDate(node.a) || refDate(node.b) : refDate(node.a) && !refDate(node.b);
    }
    return false;
  }
}
