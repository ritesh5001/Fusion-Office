"use client";

import { create } from "zustand";
import { emptySheet, key, MAX_COLS, MAX_ROWS, norm, uniqueName, unkey, type Cell, type CellStyle, type Range, type Workbook } from "./model";
import { parseInput } from "./format";
import { cellsIn, fillRange, insertAxis, pasteClip, renameSheet, sortRange, updateSheet, withCells, type Clip } from "./ops";
import type { Engine } from "./formula";

export interface Selection {
  /** Anchor (where the selection started) and active cell. */
  ar: number;
  ac: number;
  /** The other corner. */
  fr: number;
  fc: number;
}

export interface EditState {
  r: number;
  c: number;
  text: string;
  /** "enter": started by typing, arrows move to the next cell. "edit": arrows move the caret. */
  mode: "enter" | "edit";
}

interface Snapshot {
  wb: Workbook;
  active: number;
  sel: Selection;
}

export const selRange = (s: Selection): Range => norm({ r1: s.ar, c1: s.ac, r2: s.fr, c2: s.fc });

const dayFirst = () => typeof navigator === "undefined" || !/^en-US$/i.test(navigator.language);

interface SheetsStore {
  wb: Workbook;
  active: number;
  sel: Selection;
  edit: EditState | null;
  clip: Clip | null;
  past: Snapshot[];
  future: Snapshot[];

  load: (wb: Workbook) => void;
  /** Apply a change to the workbook as one undo step. */
  change: (fn: (wb: Workbook, active: number) => Workbook, sel?: Selection) => void;
  undo: () => void;
  redo: () => void;
  setActive: (i: number) => void;
  select: (sel: Selection) => void;
  setEdit: (e: EditState | null) => void;
  /** Write typed text into a cell. */
  commitEdit: () => void;

  setStyle: (patch: Partial<CellStyle> | ((s: CellStyle) => CellStyle), range?: Range) => void;
  clear: (what: "contents" | "formats" | "all", range?: Range) => void;
  setBorders: (kind: "all" | "outside" | "bottom" | "none", color?: string) => void;
  insert: (axis: "row" | "col", where: "before" | "after") => void;
  remove: (axis: "row" | "col") => void;
  merge: () => void;
  unmerge: () => void;
  sort: (asc: boolean, engine: Engine) => void;
  fill: (target: Range) => void;
  setClip: (clip: Clip | null) => void;
  paste: (clip: Clip) => void;
  pasteText: (rows: string[][]) => void;
  setSize: (axis: "row" | "col", index: number, px: number | null) => void;
  freeze: (rows: number, cols: number) => void;

  addSheet: () => void;
  deleteSheet: (i: number) => void;
  duplicateSheet: (i: number) => void;
  renameSheet: (i: number, name: string) => void;
  moveSheet: (i: number, dir: -1 | 1) => void;
}

const START: Selection = { ar: 0, ac: 0, fr: 0, fc: 0 };

/** The selection clipped to the data (a whole-column selection shouldn't touch a million rows). */
function effective(wb: Workbook, si: number, g: Range): Range {
  let rows = 0;
  let cols = 0;
  for (const k in wb.sheets[si].cells) {
    const { r, c } = unkey(k);
    if (r > rows) rows = r;
    if (c > cols) cols = c;
  }
  return { r1: g.r1, c1: g.c1, r2: Math.min(g.r2, Math.max(g.r1, rows)), c2: Math.min(g.c2, Math.max(g.c1, cols)) };
}

export const useSheets = create<SheetsStore>((set, get) => ({
  wb: { sheets: [emptySheet("Sheet1")] },
  active: 0,
  sel: START,
  edit: null,
  clip: null,
  past: [],
  future: [],

  load: (wb) => set({ wb, active: Math.max(0, wb.sheets.findIndex((s) => !s.hidden)), sel: START, edit: null, clip: null, past: [], future: [] }),

  change: (fn, sel) => {
    const { wb, active, sel: cur, past } = get();
    const next = fn(wb, active);
    if (next === wb) return;
    set({ wb: next, past: [...past.slice(-99), { wb, active, sel: cur }], future: [], ...(sel ? { sel } : {}) });
  },

  undo: () => {
    const { past, future, wb, active, sel } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    set({ ...prev, active: Math.min(prev.active, prev.wb.sheets.length - 1), past: past.slice(0, -1), future: [{ wb, active, sel }, ...future], edit: null });
  },

  redo: () => {
    const { past, future, wb, active, sel } = get();
    const next = future[0];
    if (!next) return;
    set({ ...next, past: [...past, { wb, active, sel }], future: future.slice(1), edit: null });
  },

  setActive: (i) => set({ active: i, sel: START, edit: null }),
  select: (sel) => set({ sel }),
  setEdit: (edit) => set({ edit }),

  commitEdit: () => {
    const { edit, active } = get();
    if (!edit) return;
    set({ edit: null });
    get().change((wb) =>
      updateSheet(wb, active, (sheet) => {
        const k = key(edit.r, edit.c);
        const old = sheet.cells[k];
        const p = parseInput(edit.text, dayFirst());
        let cell: Cell | undefined;
        if ("formula" in p) cell = { s: old?.s, f: p.formula };
        else {
          cell = { s: old?.s, v: p.v };
          // "12%" or "28/09/2026" sets the format, unless the cell already has one.
          if (p.fmt && !old?.s?.fmt) cell.s = { ...old?.s, fmt: p.fmt };
        }
        if (!cell.s) delete cell.s;
        if (old && old.f === cell.f && old.v === cell.v && old.s === cell.s) return sheet;
        return withCells(sheet, [[k, cell]]);
      }),
    );
  },

  setStyle: (patch, range) => {
    const { active, sel } = get();
    get().change((wb) => {
      const g = effective(wb, active, range ?? selRange(sel));
      return updateSheet(wb, active, (sheet) => {
        const updates: [string, Cell | undefined][] = [];
        for (let r = g.r1; r <= g.r2; r++)
          for (let c = g.c1; c <= g.c2; c++) {
            const k = key(r, c);
            const cell = sheet.cells[k];
            const s = typeof patch === "function" ? patch(cell?.s ?? {}) : { ...cell?.s, ...patch };
            for (const x of Object.keys(s) as (keyof CellStyle)[]) if (s[x] === undefined || s[x] === false) delete s[x];
            updates.push([k, { ...cell, s: Object.keys(s).length ? s : undefined }]);
          }
        return withCells(sheet, updates);
      });
    });
  },

  clear: (what, range) => {
    const { active, sel } = get();
    get().change((wb) => {
      const g = range ?? selRange(sel);
      return updateSheet(wb, active, (sheet) =>
        withCells(
          sheet,
          cellsIn(sheet, g).map(([r, c, cell]) => [key(r, c), what === "all" ? undefined : what === "formats" ? { ...cell, s: undefined } : cell.s ? { s: cell.s } : undefined]),
        ),
      );
    });
  },

  setBorders: (kind, color = "#000000") => {
    const { active, sel } = get();
    get().change((wb) => {
      const g = effective(wb, active, selRange(sel));
      return updateSheet(wb, active, (sheet) => {
        const updates: [string, Cell | undefined][] = [];
        for (let r = g.r1; r <= g.r2; r++)
          for (let c = g.c1; c <= g.c2; c++) {
            const k = key(r, c);
            const cell = sheet.cells[k];
            const b = { ...cell?.s?.border };
            if (kind === "none") {
              delete b.t;
              delete b.r;
              delete b.b;
              delete b.l;
            } else if (kind === "all") Object.assign(b, { t: color, r: color, b: color, l: color });
            else if (kind === "bottom") {
              if (r === g.r2) b.b = color;
            } else {
              if (r === g.r1) b.t = color;
              if (r === g.r2) b.b = color;
              if (c === g.c1) b.l = color;
              if (c === g.c2) b.r = color;
            }
            const s = { ...cell?.s, border: Object.keys(b).length ? b : undefined };
            if (!s.border) delete s.border;
            updates.push([k, { ...cell, s: Object.keys(s).length ? s : undefined }]);
          }
        return withCells(sheet, updates);
      });
    });
  },

  insert: (axis, where) => {
    const { active, sel } = get();
    const g = selRange(sel);
    const count = axis === "row" ? g.r2 - g.r1 + 1 : g.c2 - g.c1 + 1;
    const at = axis === "row" ? (where === "before" ? g.r1 : g.r2 + 1) : where === "before" ? g.c1 : g.c2 + 1;
    const moved = where === "before" ? (axis === "row" ? { ...sel, ar: sel.ar + count, fr: sel.fr + count } : { ...sel, ac: sel.ac + count, fc: sel.fc + count }) : sel;
    get().change((wb) => {
      const next = insertAxis(wb, active, axis, at, count);
      if (at === 0) return next;
      // New rows/columns take their formatting from the one before them, like Excel.
      return updateSheet(next, active, (sheet) => {
        const updates: [string, Cell | undefined][] = [];
        for (const k in sheet.cells) {
          const { r, c } = unkey(k);
          const s = sheet.cells[k].s;
          if (!s || (axis === "row" ? r !== at - 1 : c !== at - 1)) continue;
          for (let i = 0; i < count; i++) updates.push([axis === "row" ? key(at + i, c) : key(r, at + i), { s }]);
        }
        return updates.length ? withCells(sheet, updates) : sheet;
      });
    }, moved);
  },

  remove: (axis) => {
    const { active, sel } = get();
    const g = selRange(sel);
    const at = axis === "row" ? g.r1 : g.c1;
    const count = axis === "row" ? g.r2 - g.r1 + 1 : g.c2 - g.c1 + 1;
    if (count >= (axis === "row" ? MAX_ROWS : MAX_COLS)) return get().clear("all");
    get().change((wb) => insertAxis(wb, active, axis, at, -count));
  },

  merge: () => {
    const { active, sel } = get();
    const g = selRange(sel);
    if (g.r1 === g.r2 && g.c1 === g.c2) return;
    get().change((wb) =>
      updateSheet(wb, active, (sheet) => {
        // Excel keeps only the top-left value.
        const others: [string, Cell | undefined][] = cellsIn(sheet, g)
          .filter(([r, c]) => r !== g.r1 || c !== g.c1)
          .map(([r, c, cell]) => [key(r, c), cell.s ? { s: cell.s } : undefined]);
        const merges = sheet.merges.filter((m) => m.r2 < g.r1 || m.r1 > g.r2 || m.c2 < g.c1 || m.c1 > g.c2);
        const master = sheet.cells[key(g.r1, g.c1)];
        return { ...withCells(sheet, [...others, [key(g.r1, g.c1), { ...master, s: { ...master?.s, h: master?.s?.h ?? "center" } }]]), merges: [...merges, g] };
      }),
    );
  },

  unmerge: () => {
    const { active, sel } = get();
    const g = selRange(sel);
    get().change((wb) =>
      updateSheet(wb, active, (sheet) => {
        const merges = sheet.merges.filter((m) => m.r2 < g.r1 || m.r1 > g.r2 || m.c2 < g.c1 || m.c1 > g.c2);
        return merges.length === sheet.merges.length ? sheet : { ...sheet, merges };
      }),
    );
  },

  sort: (asc, engine) => {
    const { active, sel, wb } = get();
    let g = selRange(sel);
    const sheet = wb.sheets[active];
    // One cell selected: sort the block of data around it, with a header row if the first row looks like one.
    if (g.r1 === g.r2 && g.c1 === g.c2) g = currentRegion(sheet.cells, g.r1, g.c1);
    g = effective(wb, active, g);
    if (g.r2 <= g.r1) return;
    const val = (r: number, c: number) => {
      const v = engine.value(active, r, c);
      return v instanceof Error ? null : v;
    };
    const firstRowText = Array.from({ length: g.c2 - g.c1 + 1 }, (_, i) => val(g.r1, g.c1 + i)).every((v) => v === null || typeof v === "string");
    const secondRowNumber = Array.from({ length: g.c2 - g.c1 + 1 }, (_, i) => val(g.r1 + 1, g.c1 + i)).some((v) => typeof v === "number");
    const header = sel.ar === sel.fr && firstRowText && secondRowNumber;
    get().change((w) => updateSheet(w, active, (s) => sortRange(s, g, sel.ac, asc, header, val)), { ar: g.r1, ac: sel.ac, fr: g.r2, fc: g.c2 === g.c1 ? sel.ac : g.c2 });
  },

  fill: (target) => {
    const { active, sel } = get();
    const src = selRange(sel);
    get().change((wb) => updateSheet(wb, active, (s) => fillRange(s, src, target)), { ar: Math.min(src.r1, target.r1), ac: Math.min(src.c1, target.c1), fr: Math.max(src.r2, target.r2), fc: Math.max(src.c2, target.c2) });
  },

  setClip: (clip) => set({ clip }),

  paste: (clip) => {
    const { active, sel } = get();
    const g = selRange(sel);
    const rows = clip.cells.length;
    const cols = clip.cells[0]?.length ?? 1;
    get().change(
      (wb) => {
        let next = updateSheet(wb, active, (s) => pasteClip(s, clip, g.r1, g.c1, g));
        // Cut and paste moves: clear the source (except where it overlaps the paste).
        if (clip.cut) {
          next = updateSheet(next, clip.sheet, (s) =>
            withCells(
              s,
              cellsIn(wb.sheets[clip.sheet], clip.range)
                .filter(([r, c]) => clip.sheet !== active || r < g.r1 || r >= g.r1 + rows || c < g.c1 || c >= g.c1 + cols)
                .map(([r, c]) => [key(r, c), undefined]),
            ),
          );
        }
        return next;
      },
      { ar: g.r1, ac: g.c1, fr: g.r1 + Math.max(rows, g.r2 - g.r1 + 1) - 1, fc: g.c1 + Math.max(cols, g.c2 - g.c1 + 1) - 1 },
    );
    if (clip.cut) set({ clip: null });
  },

  pasteText: (rows) => {
    const { active, sel } = get();
    const g = selRange(sel);
    get().change(
      (wb) =>
        updateSheet(wb, active, (sheet) =>
          withCells(
            sheet,
            rows.flatMap((row, i) =>
              row.map((text, j): [string, Cell | undefined] => {
                const k = key(g.r1 + i, g.c1 + j);
                const old = sheet.cells[k];
                const p = parseInput(text, dayFirst());
                if ("formula" in p) return [k, { s: old?.s, f: p.formula }];
                return [k, { s: p.fmt && !old?.s?.fmt ? { ...old?.s, fmt: p.fmt } : old?.s, v: p.v }];
              }),
            ),
          ),
        ),
      { ar: g.r1, ac: g.c1, fr: g.r1 + rows.length - 1, fc: g.c1 + Math.max(...rows.map((r) => r.length)) - 1 },
    );
  },

  setSize: (axis, index, px) => {
    const { active, sel } = get();
    const g = selRange(sel);
    // Resizing one of several selected columns resizes all of them.
    const whole = axis === "col" ? g.r1 === 0 && g.r2 === MAX_ROWS - 1 : g.c1 === 0 && g.c2 === MAX_COLS - 1;
    const [lo, hi] = axis === "col" ? [g.c1, g.c2] : [g.r1, g.r2];
    const targets = whole && index >= lo && index <= hi ? Array.from({ length: hi - lo + 1 }, (_, i) => lo + i) : [index];
    get().change((wb) =>
      updateSheet(wb, active, (s) => {
        const map = { ...(axis === "col" ? s.cols : s.rows) };
        for (const t of targets) {
          if (px === null) delete map[t];
          else map[t] = Math.max(axis === "col" ? 8 : 6, Math.round(px));
        }
        return axis === "col" ? { ...s, cols: map } : { ...s, rows: map };
      }),
    );
  },

  freeze: (rows, cols) => {
    const { active } = get();
    get().change((wb) => updateSheet(wb, active, (s) => ({ ...s, freeze: rows || cols ? { rows, cols } : undefined })));
  },

  addSheet: () => {
    const { wb } = get();
    get().change((w) => ({ sheets: [...w.sheets, emptySheet(uniqueName(w, `Sheet${w.sheets.length + 1}`))] }));
    set({ active: wb.sheets.length, sel: START });
  },

  deleteSheet: (i) => {
    const { wb, active } = get();
    if (wb.sheets.filter((s) => !s.hidden).length <= 1) return;
    get().change((w) => ({ sheets: w.sheets.filter((_, j) => j !== i) }));
    set({ active: Math.max(0, Math.min(active >= i ? active - 1 : active, get().wb.sheets.length - 1)), sel: START });
  },

  duplicateSheet: (i) => {
    get().change((w) => {
      const src = w.sheets[i];
      const copy = { ...src, id: emptySheet("x").id, name: uniqueName(w, src.name), sourceId: undefined };
      return { sheets: [...w.sheets.slice(0, i + 1), copy, ...w.sheets.slice(i + 1)] };
    });
    set({ active: i + 1, sel: START });
  },

  renameSheet: (i, name) => {
    const clean = name.replace(/[\\/?*[\]:]/g, "").trim().slice(0, 31);
    const { wb } = get();
    if (!clean || clean === wb.sheets[i].name || wb.sheets.some((s, j) => j !== i && s.name.toLowerCase() === clean.toLowerCase())) return;
    get().change((w) => renameSheet(w, i, clean));
  },

  moveSheet: (i, dir) => {
    const j = i + dir;
    const { wb } = get();
    if (j < 0 || j >= wb.sheets.length) return;
    get().change((w) => {
      const sheets = [...w.sheets];
      [sheets[i], sheets[j]] = [sheets[j], sheets[i]];
      return { sheets };
    });
    set({ active: j });
  },
}));

/** The block of non-empty cells around (r, c), like Excel's Ctrl+A inside data. */
export function currentRegion(cells: Record<string, Cell>, r: number, c: number): Range {
  const has = (rr: number, cc: number) => rr >= 0 && cc >= 0 && !!cells[key(rr, cc)] && (cells[key(rr, cc)].v !== undefined || cells[key(rr, cc)].f !== undefined);
  let g: Range = { r1: r, c1: c, r2: r, c2: c };
  for (let grew = true; grew; ) {
    grew = false;
    const rowHas = (rr: number) => Array.from({ length: g.c2 - g.c1 + 3 }, (_, i) => g.c1 - 1 + i).some((cc) => has(rr, cc));
    const colHas = (cc: number) => Array.from({ length: g.r2 - g.r1 + 3 }, (_, i) => g.r1 - 1 + i).some((rr) => has(rr, cc));
    if (g.r1 > 0 && rowHas(g.r1 - 1)) (g = { ...g, r1: g.r1 - 1 }), (grew = true);
    if (rowHas(g.r2 + 1)) (g = { ...g, r2: g.r2 + 1 }), (grew = true);
    if (g.c1 > 0 && colHas(g.c1 - 1)) (g = { ...g, c1: g.c1 - 1 }), (grew = true);
    if (colHas(g.c2 + 1)) (g = { ...g, c2: g.c2 + 1 }), (grew = true);
  }
  return g;
}

