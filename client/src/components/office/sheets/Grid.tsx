"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { addr, colName, DEFAULT_COL, DEFAULT_ROW, key, MAX_COLS, MAX_ROWS, mergeAt, norm, type Cell, type Range, type Sheet } from "@/lib/office/sheets/model";
import { formatValue } from "@/lib/office/sheets/format";
import type { Engine } from "@/lib/office/sheets/formula";
import { cellsIn, parseTsv, type Clip } from "@/lib/office/sheets/ops";
import { selRange, useSheets, type Selection } from "@/lib/office/sheets/store";

const HW = 46; // row header width
const HH = 24; // column header height
const GRID = "#e3e6ea";
const FONT = "Calibri, Carlito, 'Segoe UI', Arial, sans-serif";
export const DEFAULT_DATE = typeof navigator !== "undefined" && /^en-US$/i.test(navigator.language) ? "mm/dd/yyyy" : "dd/mm/yyyy";

/** Offsets of each column/row edge: offsets[i] = left edge of i. */
function prefix(count: number, size: (i: number) => number): Float64Array {
  const out = new Float64Array(count + 1);
  for (let i = 0; i < count; i++) out[i + 1] = out[i] + size(i);
  return out;
}

/** Largest i with offsets[i] <= v. */
function find(offsets: Float64Array, v: number): number {
  let lo = 0;
  let hi = offsets.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= v) lo = mid;
    else hi = mid - 1;
  }
  return Math.max(0, lo);
}

/** The text a cell shows. */
export function display(engine: Engine, si: number, sheet: Sheet, r: number, c: number): { text: string; value: ReturnType<Engine["value"]> } {
  const cell = sheet.cells[key(r, c)];
  if (!cell) return { text: "", value: null };
  const value = engine.value(si, r, c);
  const fmt = cell.s?.fmt ?? (typeof value === "number" && engine.looksLikeDate(si, cell) ? DEFAULT_DATE : undefined);
  return { text: formatValue(value, fmt), value };
}

/** What the formula bar and in-cell editor show for a cell. */
export function rawText(cell: Cell | undefined): string {
  if (!cell) return "";
  if (cell.f !== undefined) return `=${cell.f}`;
  if (cell.e) return cell.e;
  const v = cell.v;
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") {
    const fmt = cell.s?.fmt;
    if (fmt && /[dmy]/i.test(fmt.replace(/"[^"]*"|\[[^\]]*\]/g, "")) && !/[0#]/.test(fmt)) return formatValue(v, /h|s/i.test(fmt) ? `${DEFAULT_DATE} hh:mm` : DEFAULT_DATE);
    if (fmt && /%/.test(fmt)) return `${Number((v * 100).toPrecision(12))}%`;
    return String(Number(v.toPrecision(15)));
  }
  return v;
}

/** Whether clicking a cell while editing should insert a reference. */
function pointable(text: string, caret: number): boolean {
  if (!text.startsWith("=")) return false;
  const before = text.slice(0, caret).trimEnd();
  return before === "=" || /[=+\-*/^&,(<>:;]$/.test(before);
}

interface Menu {
  x: number;
  y: number;
  kind: "cell" | "col" | "row";
}

export function Grid({ engine, onMenu }: { engine: Engine; onMenu: (m: Menu | null) => void }) {
  const wb = useSheets((s) => s.wb);
  const active = useSheets((s) => s.active);
  const sel = useSheets((s) => s.sel);
  const edit = useSheets((s) => s.edit);
  const clip = useSheets((s) => s.clip);
  const st = useSheets.getState;
  const sheet = wb.sheets[active];

  const scroller = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const [view, setView] = useState({ w: 1000, h: 600, x: 0, y: 0 });
  const [extra, setExtra] = useState({ rows: 0, cols: 0 });
  const [resize, setResize] = useState<{ axis: "row" | "col"; index: number; size: number } | null>(null);
  const [fillTo, setFillTo] = useState<Range | null>(null);
  const refInsert = useRef<{ start: number; end: number; anchor: { r: number; c: number } } | null>(null);

  const used = engine.bounds(active);
  const selG = selRange(sel);
  const rowCount = Math.min(MAX_ROWS, Math.max(200, used.rows + 100, Math.min(selG.r2, 100_000) + 30) + extra.rows);
  const colCount = Math.min(MAX_COLS, Math.max(26, used.cols + 10, Math.min(selG.c2, 1000) + 5) + extra.cols);
  const colSize = useCallback((c: number) => (resize?.axis === "col" && resize.index === c ? resize.size : (sheet.cols[c] ?? DEFAULT_COL)), [sheet.cols, resize]);
  // Rows without a set height grow to fit large text, as in Excel.
  const autoRows = useMemo(() => {
    const m = new Map<number, number>();
    for (const k in sheet.cells) {
      const size = sheet.cells[k].s?.size;
      if (!size || size <= 12) continue;
      const r = Number(k.slice(0, k.indexOf(",")));
      m.set(r, Math.max(m.get(r) ?? DEFAULT_ROW, Math.ceil(((size * 4) / 3) * 1.4)));
    }
    return m;
  }, [sheet.cells]);
  const rowSize = useCallback((r: number) => (resize?.axis === "row" && resize.index === r ? resize.size : (sheet.rows[r] ?? autoRows.get(r) ?? DEFAULT_ROW)), [sheet.rows, resize, autoRows]);
  const colX = useMemo(() => prefix(colCount, colSize), [colCount, colSize]);
  const rowY = useMemo(() => prefix(rowCount, rowSize), [rowCount, rowSize]);
  const fr = Math.min(sheet.freeze?.rows ?? 0, rowCount - 1);
  const fc = Math.min(sheet.freeze?.cols ?? 0, colCount - 1);
  const frozenW = colX[fc];
  const frozenH = rowY[fr];

  // Viewport size.
  useLayoutEffect(() => {
    const el = scroller.current!;
    const ro = new ResizeObserver(() => setView((v) => ({ ...v, w: el.clientWidth, h: el.clientHeight })));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = () => {
    const el = scroller.current!;
    setView((v) => ({ ...v, x: el.scrollLeft, y: el.scrollTop }));
    // Keep growing the sheet as the user scrolls towards its end.
    if (el.scrollTop + el.clientHeight > el.scrollHeight - 400) setExtra((e) => ({ ...e, rows: e.rows + 200 }));
    if (el.scrollLeft + el.clientWidth > el.scrollWidth - 300) setExtra((e) => ({ ...e, cols: e.cols + 10 }));
  };

  // Positions in viewport ("canvas") coordinates.
  const colLeft = (c: number) => (c < fc ? HW + colX[c] : HW + frozenW + colX[c] - colX[fc] - view.x);
  const rowTop = (r: number) => (r < fr ? HH + rowY[r] : HH + frozenH + rowY[r] - rowY[fr] - view.y);
  const mainW = Math.max(0, view.w - HW - frozenW);
  const mainH = Math.max(0, view.h - HH - frozenH);
  const cs = find(colX, colX[fc] + view.x);
  const ce = Math.min(colCount - 1, find(colX, colX[fc] + view.x + mainW) + 1);
  const rs = find(rowY, rowY[fr] + view.y);
  const re = Math.min(rowCount - 1, find(rowY, rowY[fr] + view.y + mainH) + 1);

  /** Cell under a point in canvas coordinates. */
  const cellAt = (px: number, py: number) => {
    const vx = px - HW;
    const vy = py - HH;
    const c = vx < frozenW ? find(colX, Math.max(0, vx)) : find(colX, colX[fc] + vx - frozenW + view.x);
    const r = vy < frozenH ? find(rowY, Math.max(0, vy)) : find(rowY, rowY[fr] + vy - frozenH + view.y);
    return { r: Math.min(r, rowCount - 1), c: Math.min(c, colCount - 1) };
  };

  // Keep the active cell in view when moving with the keyboard.
  const reveal = useCallback(
    (r: number, c: number) => {
      const el = scroller.current;
      if (!el) return;
      if (c >= fc) {
        const left = colX[c] - colX[fc];
        const right = colX[c + 1] - colX[fc];
        if (left < el.scrollLeft) el.scrollLeft = left;
        else if (right > el.scrollLeft + mainW) el.scrollLeft = right - mainW;
      }
      if (r >= fr) {
        const top = rowY[r] - rowY[fr];
        const bottom = rowY[r + 1] - rowY[fr];
        if (top < el.scrollTop) el.scrollTop = top;
        else if (bottom > el.scrollTop + mainH) el.scrollTop = bottom - mainH;
      }
    },
    [colX, rowY, fc, fr, mainW, mainH],
  );

  // Scroll the moving corner of the selection into view (find, name box, keyboard).
  useEffect(() => {
    const whole = (sel.ar === 0 && sel.fr === MAX_ROWS - 1) || (sel.ac === 0 && sel.fc === MAX_COLS - 1);
    if (!whole) reveal(sel.fr, sel.fc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel.fr, sel.fc, active]);

  // Focus the grid (so typing goes into cells) whenever not editing.
  useEffect(() => {
    if (!edit) scroller.current?.focus({ preventScroll: true });
  }, [edit, active]);

  // ── Editing ──

  const startEdit = (mode: "enter" | "edit", text?: string) => {
    const cell = sheet.cells[key(sel.ar, sel.ac)];
    st().setEdit({ r: sel.ar, c: sel.ac, mode, text: text ?? rawText(cell) });
    refInsert.current = null;
  };
  const commitAndMove = (dr: number, dc: number) => {
    st().commitEdit();
    move(dr, dc, false);
  };

  const move = (dr: number, dc: number, extend: boolean, jump = false) => {
    const s = st().sel;
    let r = extend ? s.fr : s.ar;
    let c = extend ? s.fc : s.ac;
    if (jump) {
      // Ctrl+arrow: to the edge of the data.
      const filled = (rr: number, cc: number) => !!sheet.cells[key(rr, cc)];
      const step = () => ((r += dr), (c += dc));
      const inside = () => r + dr >= 0 && c + dc >= 0 && r + dr < MAX_ROWS && c + dc < MAX_COLS;
      if (filled(r, c) && inside() && filled(r + dr, c + dc)) while (inside() && filled(r + dr, c + dc)) step();
      else {
        while (inside() && !filled(r + dr, c + dc) && (dr ? r + dr <= used.rows + 1 : c + dc <= used.cols + 1)) step();
        if (inside()) step();
      }
      r = Math.max(0, Math.min(r, MAX_ROWS - 1));
      c = Math.max(0, Math.min(c, MAX_COLS - 1));
    } else {
      // Step over merged areas.
      const m = mergeAt(sheet, r, c);
      if (m && !extend) {
        if (dr > 0) r = m.r2;
        if (dc > 0) c = m.c2;
        if (dr < 0) r = m.r1;
        if (dc < 0) c = m.c1;
      }
      r = Math.max(0, Math.min(MAX_ROWS - 1, r + dr));
      c = Math.max(0, Math.min(MAX_COLS - 1, c + dc));
      const m2 = mergeAt(sheet, r, c);
      if (m2 && !extend) {
        r = m2.r1;
        c = m2.c1;
      }
    }
    st().select(extend ? { ...s, fr: r, fc: c } : { ar: r, ac: c, fr: r, fc: c });
    reveal(r, c);
  };

  const onGridKey = (e: React.KeyboardEvent) => {
    if (edit) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key;
    const page = Math.max(1, re - rs - 2);
    if (k === "ArrowDown" || k === "ArrowUp" || k === "ArrowLeft" || k === "ArrowRight") {
      e.preventDefault();
      move(k === "ArrowDown" ? 1 : k === "ArrowUp" ? -1 : 0, k === "ArrowRight" ? 1 : k === "ArrowLeft" ? -1 : 0, e.shiftKey, mod);
    } else if (k === "Enter") {
      e.preventDefault();
      move(e.shiftKey ? -1 : 1, 0, false);
    } else if (k === "Tab") {
      e.preventDefault();
      move(0, e.shiftKey ? -1 : 1, false);
    } else if (k === "PageDown" || k === "PageUp") {
      e.preventDefault();
      move(k === "PageDown" ? page : -page, 0, e.shiftKey);
    } else if (k === "Home") {
      e.preventDefault();
      st().select(mod ? { ar: 0, ac: 0, fr: 0, fc: 0 } : { ar: sel.ar, ac: 0, fr: sel.ar, fc: 0 });
      reveal(mod ? 0 : sel.ar, 0);
    } else if (k === "F2") {
      e.preventDefault();
      startEdit("edit");
    } else if (k === "Delete" || k === "Backspace") {
      e.preventDefault();
      st().clear("contents");
    } else if (k === "Escape") st().setClip(null);
    else if (mod && k.toLowerCase() === "a") {
      e.preventDefault();
      st().select({ ar: 0, ac: 0, fr: MAX_ROWS - 1, fc: MAX_COLS - 1 });
    } else if (mod && k.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) st().redo();
      else st().undo();
    } else if (mod && k.toLowerCase() === "y") {
      e.preventDefault();
      st().redo();
    } else if (mod && ["b", "i", "u"].includes(k.toLowerCase())) {
      e.preventDefault();
      const prop = k.toLowerCase() as "b" | "i" | "u";
      const on = !sheet.cells[key(sel.ar, sel.ac)]?.s?.[prop];
      st().setStyle({ [prop]: on });
    } else if (!mod && !e.altKey && k.length === 1) {
      e.preventDefault();
      startEdit("enter", k);
    }
  };

  const onEditorKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!edit) return;
    const k = e.key;
    if (k === "Enter" && !e.altKey) {
      e.preventDefault();
      commitAndMove(e.shiftKey ? -1 : 1, 0);
    } else if (k === "Enter" && e.altKey) {
      e.preventDefault();
      const t = e.currentTarget;
      const pos = t.selectionStart;
      st().setEdit({ ...edit, text: `${edit.text.slice(0, pos)}\n${edit.text.slice(t.selectionEnd)}` });
      requestAnimationFrame(() => t.setSelectionRange(pos + 1, pos + 1));
    } else if (k === "Tab") {
      e.preventDefault();
      commitAndMove(0, e.shiftKey ? -1 : 1);
    } else if (k === "Escape") {
      e.preventDefault();
      st().setEdit(null);
    } else if (edit.mode === "enter" && ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(k)) {
      e.preventDefault();
      commitAndMove(k === "ArrowDown" ? 1 : k === "ArrowUp" ? -1 : 0, k === "ArrowRight" ? 1 : k === "ArrowLeft" ? -1 : 0);
    }
  };

  // Put the caret at the end when an edit starts.
  useEffect(() => {
    const t = editor.current;
    if (edit && t && document.activeElement !== t && !document.activeElement?.closest("[data-formula-bar]")) {
      t.focus();
      t.setSelectionRange(t.value.length, t.value.length);
    }
  }, [edit]);

  // ── Clipboard ──

  useEffect(() => {
    const grid = scroller.current!;
    const copy = (e: ClipboardEvent, cut: boolean) => {
      if (document.activeElement !== grid) return;
      e.preventDefault();
      const g = selRange(st().sel);
      const bounded: Range = { ...g, r2: Math.min(g.r2, Math.max(g.r1, used.rows)), c2: Math.min(g.c2, Math.max(g.c1, used.cols)) };
      const cells: (Cell | undefined)[][] = [];
      const lines: string[] = [];
      const html: string[] = [];
      for (let r = bounded.r1; r <= bounded.r2; r++) {
        const row: (Cell | undefined)[] = [];
        const texts: string[] = [];
        for (let c = bounded.c1; c <= bounded.c2; c++) {
          row.push(sheet.cells[key(r, c)]);
          texts.push(display(engine, active, sheet, r, c).text);
        }
        cells.push(row);
        lines.push(texts.map((t) => (/[\t\n"]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t)).join("\t"));
        html.push(`<tr>${texts.map((t) => `<td>${t.replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]!)}</td>`).join("")}</tr>`);
      }
      const text = lines.join("\n");
      e.clipboardData?.setData("text/plain", text);
      e.clipboardData?.setData("text/html", `<table>${html.join("")}</table>`);
      st().setClip({ sheet: active, range: bounded, cells, cut, text } satisfies Clip);
    };
    const onCopy = (e: ClipboardEvent) => copy(e, false);
    const onCut = (e: ClipboardEvent) => copy(e, true);
    const onPaste = (e: ClipboardEvent) => {
      if (document.activeElement !== grid) return;
      e.preventDefault();
      const text = e.clipboardData?.getData("text/plain") ?? "";
      const own = st().clip;
      if (own && own.text === text) st().paste(own);
      else if (text) st().pasteText(parseTsv(text));
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
    };
  }, [active, engine, sheet, used.rows, used.cols, st]);

  // ── Mouse ──

  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const drag = (onMove: (p: { x: number; y: number }) => void, onUp?: () => void) => {
    const mv = (e: PointerEvent) => {
      const p = local(e);
      // Scroll when dragging past the edges.
      const el = scroller.current!;
      if (p.x > view.w - 10) el.scrollLeft += 24;
      else if (p.x < HW + frozenW && p.x > 0 && el.scrollLeft > 0) el.scrollLeft -= 24;
      if (p.y > view.h - 10) el.scrollTop += 24;
      else if (p.y < HH + frozenH && p.y > 0 && el.scrollTop > 0) el.scrollTop -= 24;
      onMove(p);
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      onUp?.();
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  const expandForMerges = (g: Range): Range => {
    let out = g;
    for (const m of sheet.merges) if (!(m.r2 < out.r1 || m.r1 > out.r2 || m.c2 < out.c1 || m.c1 > out.c2)) out = norm({ r1: Math.min(out.r1, m.r1), c1: Math.min(out.c1, m.c1), r2: Math.max(out.r2, m.r2), c2: Math.max(out.c2, m.c2) });
    return out;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    onMenu(null);
    const p = local(e);
    const { r, c } = cellAt(p.x, p.y);
    // Corner: select everything.
    if (p.x < HW && p.y < HH) {
      st().select({ ar: 0, ac: 0, fr: MAX_ROWS - 1, fc: MAX_COLS - 1 });
      return;
    }
    // Column header: resize at an edge, otherwise select columns.
    if (p.y < HH) {
      const right = colLeft(c) + colSize(c);
      const edgeCol = Math.abs(p.x - right) <= 4 ? c : p.x - colLeft(c) <= 3 && c > 0 ? c - 1 : -1;
      if (edgeCol >= 0) {
        e.preventDefault();
        const startX = p.x;
        const start = colSize(edgeCol);
        let size = start;
        drag(
          (q) => setResize({ axis: "col", index: edgeCol, size: (size = Math.max(8, start + q.x - startX)) }),
          () => {
            setResize(null);
            if (size !== start) st().setSize("col", edgeCol, size);
          },
        );
        return;
      }
      if (edit) st().commitEdit();
      const a = e.shiftKey ? sel.ac : c;
      st().select({ ar: 0, ac: a, fr: MAX_ROWS - 1, fc: c });
      drag((q) => st().select({ ar: 0, ac: a, fr: MAX_ROWS - 1, fc: cellAt(q.x, HH + 1).c }));
      return;
    }
    if (p.x < HW) {
      const bottom = rowTop(r) + rowSize(r);
      const edgeRow = Math.abs(p.y - bottom) <= 3 ? r : p.y - rowTop(r) <= 2 && r > 0 ? r - 1 : -1;
      if (edgeRow >= 0) {
        e.preventDefault();
        const startY = p.y;
        const start = rowSize(edgeRow);
        let size = start;
        drag(
          (q) => setResize({ axis: "row", index: edgeRow, size: (size = Math.max(6, start + q.y - startY)) }),
          () => {
            setResize(null);
            if (size !== start) st().setSize("row", edgeRow, size);
          },
        );
        return;
      }
      if (edit) st().commitEdit();
      const a = e.shiftKey ? sel.ar : r;
      st().select({ ar: a, ac: 0, fr: r, fc: MAX_COLS - 1 });
      drag((q) => st().select({ ar: a, ac: 0, fr: cellAt(HW + 1, q.y).r, fc: MAX_COLS - 1 }));
      return;
    }

    // Fill handle.
    const g = expandForMerges(selRange(sel));
    const hx = colLeft(g.c2) + colSize(g.c2);
    const hy = rowTop(g.r2) + rowSize(g.r2);
    if (!edit && Math.abs(p.x - hx) <= 5 && Math.abs(p.y - hy) <= 5) {
      e.preventDefault();
      let target: Range | null = null;
      drag(
        (q) => {
          const t = cellAt(q.x, q.y);
          const dr = t.r > g.r2 ? t.r - g.r2 : t.r < g.r1 ? t.r - g.r1 : 0;
          const dc = t.c > g.c2 ? t.c - g.c2 : t.c < g.c1 ? t.c - g.c1 : 0;
          if (!dr && !dc) target = null;
          else if (Math.abs(dr) >= Math.abs(dc)) target = dr > 0 ? { ...g, r2: t.r } : { ...g, r1: t.r };
          else target = dc > 0 ? { ...g, c2: t.c } : { ...g, c1: t.c };
          setFillTo(target);
        },
        () => {
          setFillTo(null);
          if (target) st().fill(target);
        },
      );
      return;
    }

    // While typing a formula, clicking a cell inserts its address.
    const t = editor.current;
    if (edit && t && pointable(edit.text, refInsert.current ? refInsert.current.start : t.selectionStart)) {
      e.preventDefault();
      const insertRef = (a: { r: number; c: number }, b: { r: number; c: number }) => {
        const cur = st().edit;
        if (!cur) return;
        const g2 = norm({ r1: a.r, c1: a.c, r2: b.r, c2: b.c });
        const ref = g2.r1 === g2.r2 && g2.c1 === g2.c2 ? addr(g2.r1, g2.c1) : `${addr(g2.r1, g2.c1)}:${addr(g2.r2, g2.c2)}`;
        const start = refInsert.current?.start ?? t.selectionStart;
        const end = refInsert.current?.end ?? t.selectionEnd;
        const text = cur.text.slice(0, start) + ref + cur.text.slice(end);
        refInsert.current = { start, end: start + ref.length, anchor: a };
        st().setEdit({ ...cur, mode: "edit", text });
        requestAnimationFrame(() => {
          t.focus();
          t.setSelectionRange(start + ref.length, start + ref.length);
        });
      };
      const anchor = e.shiftKey && refInsert.current ? refInsert.current.anchor : { r, c };
      if (!e.shiftKey) refInsert.current = refInsert.current && t.selectionStart === refInsert.current.end ? { ...refInsert.current, anchor } : null;
      insertRef(anchor, { r, c });
      drag((q) => insertRef(anchor, cellAt(q.x, q.y)));
      return;
    }

    if (edit) st().commitEdit();
    e.preventDefault();
    scroller.current?.focus({ preventScroll: true });
    const m = mergeAt(sheet, r, c);
    const ar = e.shiftKey ? sel.ar : (m?.r1 ?? r);
    const ac = e.shiftKey ? sel.ac : (m?.c1 ?? c);
    st().select({ ar, ac, fr: e.shiftKey ? r : (m?.r2 ?? r), fc: e.shiftKey ? c : (m?.c2 ?? c) });
    drag((q) => {
      const t2 = cellAt(q.x, q.y);
      st().select({ ar, ac, fr: t2.r, fc: t2.c });
    });
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const p = local(e);
    if (p.y < HH && p.x > HW) {
      // Double-click a column edge: fit to contents.
      const { c } = cellAt(p.x, p.y);
      const right = colLeft(c) + colSize(c);
      const edgeCol = Math.abs(p.x - right) <= 4 ? c : p.x - colLeft(c) <= 3 && c > 0 ? c - 1 : -1;
      if (edgeCol >= 0) autofit(edgeCol);
      return;
    }
    if (p.x > HW && p.y > HH) startEdit("edit");
  };

  const measure = useMemo(() => (typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null), []);
  const textWidth = (text: string, cell: Cell | undefined) => {
    if (!measure) return text.length * 7;
    const s = cell?.s;
    measure.font = `${s?.i ? "italic " : ""}${s?.b ? "700 " : ""}${((s?.size ?? 11) * 4) / 3}px ${s?.font ? `"${s.font}", ` : ""}${FONT}`;
    return measure.measureText(text).width;
  };

  const autofit = (c: number) => {
    let w = 24;
    for (const [r, , cell] of cellsIn(sheet, { r1: 0, c1: c, r2: used.rows, c2: c })) {
      w = Math.max(w, textWidth(display(engine, active, sheet, r, c).text, cell) + 12);
    }
    st().setSize("col", c, Math.min(600, w));
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const p = local(e);
    const { r, c } = cellAt(p.x, p.y);
    const g = selRange(sel);
    const kind: Menu["kind"] = p.y < HH ? "col" : p.x < HW ? "row" : "cell";
    // Right-click outside the selection moves it.
    if (!(r >= g.r1 && r <= g.r2 && c >= g.c1 && c <= g.c2)) {
      if (kind === "col") st().select({ ar: 0, ac: c, fr: MAX_ROWS - 1, fc: c });
      else if (kind === "row") st().select({ ar: r, ac: 0, fr: r, fc: MAX_COLS - 1 });
      else st().select({ ar: r, ac: c, fr: r, fc: c });
    }
    onMenu({ x: e.clientX, y: e.clientY, kind });
  };

  // ── Rendering ──

  const panes: { key: string; left: number; top: number; width: number; height: number; rows: [number, number]; cols: [number, number] }[] = [
    { key: "main", left: HW + frozenW, top: HH + frozenH, width: mainW, height: mainH, rows: [Math.max(rs, fr), re], cols: [Math.max(cs, fc), ce] },
  ];
  if (fr) panes.push({ key: "top", left: HW + frozenW, top: HH, width: mainW, height: frozenH, rows: [0, fr - 1], cols: [Math.max(cs, fc), ce] });
  if (fc) panes.push({ key: "left", left: HW, top: HH + frozenH, width: frozenW, height: mainH, rows: [Math.max(rs, fr), re], cols: [0, fc - 1] });
  if (fr && fc) panes.push({ key: "corner", left: HW, top: HH, width: frozenW, height: frozenH, rows: [0, fr - 1], cols: [0, fc - 1] });

  const selExp = expandForMerges(selG);
  const renderPane = (p: (typeof panes)[number]) => {
    const [r1, r2] = p.rows;
    const [c1, c2] = p.cols;
    const bg: ReactNode[] = [];
    const text: ReactNode[] = [];
    const covered = new Set<string>();
    const merges = sheet.merges.filter((m) => !(m.r2 < r1 || m.r1 > r2 || m.c2 < c1 || m.c1 > c2));
    for (const m of merges) for (let r = m.r1; r <= m.r2; r++) for (let c = m.c1; c <= m.c2; c++) covered.add(key(r, c));

    const box = (r: number, c: number, w: number, h: number) => {
      const k = key(r, c);
      const cell = sheet.cells[k];
      const s = cell?.s;
      const x = colLeft(c) - p.left;
      const y = rowTop(r) - p.top;
      const b = s?.border;
      bg.push(
        <div
          key={k}
          className="absolute"
          style={{
            left: x,
            top: y,
            width: w,
            height: h,
            background: s?.fill,
            borderRight: `1px solid ${b?.r ?? (s?.fill ? "transparent" : GRID)}`,
            borderBottom: `1px solid ${b?.b ?? (s?.fill ? "transparent" : GRID)}`,
            borderTop: b?.t ? `1px solid ${b.t}` : undefined,
            borderLeft: b?.l ? `1px solid ${b.l}` : undefined,
          }}
        />,
      );
      if (!cell) return;
      const { text: t, value } = display(engine, active, sheet, r, c);
      if (!t) return;
      const align = s?.h ?? (typeof value === "number" ? "right" : typeof value === "boolean" || value instanceof Error ? "center" : "left");
      let width = w;
      // Left-aligned text runs over empty neighbours, like Excel.
      if (align === "left" && !s?.wrap && typeof value === "string") {
        for (let cc = c + 1; cc <= Math.min(c2, c + 20) && textWidth(t, cell) + 8 > width; cc++) {
          const n = sheet.cells[key(r, cc)];
          if ((n && (n.v !== undefined && n.v !== null && n.v !== "" || n.f !== undefined)) || covered.has(key(r, cc))) break;
          width += colSize(cc);
        }
      }
      const style: CSSProperties = {
        left: x,
        top: y,
        width,
        height: h,
        justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start",
        alignItems: s?.v === "top" ? "flex-start" : s?.v === "middle" ? "center" : "flex-end",
        fontWeight: s?.b ? 700 : undefined,
        fontStyle: s?.i ? "italic" : undefined,
        textDecoration: [s?.u && "underline", s?.s && "line-through"].filter(Boolean).join(" ") || undefined,
        color: value instanceof Error ? "#c92a2a" : s?.color,
        fontSize: `${s?.size ?? 11}pt`,
        fontFamily: s?.font ? `"${s.font}", ${FONT}` : undefined,
        whiteSpace: s?.wrap ? "pre-wrap" : "pre",
        textAlign: align,
      };
      text.push(
        <div key={k} className={`absolute flex overflow-hidden px-[3px] pb-[2px] leading-[1.25] ${s?.wrap ? "break-words" : ""}`} style={style}>
          <span className={s?.wrap ? "w-full" : undefined}>{t}</span>
        </div>,
      );
    };

    for (let r = r1; r <= r2; r++) {
      const h = rowSize(r);
      for (let c = c1; c <= c2; c++) if (!covered.has(key(r, c))) box(r, c, colSize(c), h);
    }
    for (const m of merges) box(m.r1, m.c1, colX[m.c2 + 1] - colX[m.c1], rowY[m.r2 + 1] - rowY[m.r1]);

    // Selection, copy marquee and fill preview, clipped to this pane.
    const rect = (g: Range) => {
      const ir1 = Math.max(g.r1, r1);
      const ir2 = Math.min(g.r2, r2);
      const ic1 = Math.max(g.c1, c1);
      const ic2 = Math.min(g.c2, c2);
      if (ir1 > ir2 || ic1 > ic2) return null;
      const x = colLeft(g.c1 < c1 ? ic1 : g.c1) - p.left - (g.c1 < c1 ? 2000 : 0);
      const y = rowTop(g.r1 < r1 ? ir1 : g.r1) - p.top - (g.r1 < r1 ? 2000 : 0);
      const right = colLeft(Math.min(g.c2, c2)) + colSize(Math.min(g.c2, c2)) - p.left + (g.c2 > c2 ? 2000 : 0);
      const bottom = rowTop(Math.min(g.r2, r2)) + rowSize(Math.min(g.r2, r2)) - p.top + (g.r2 > r2 ? 2000 : 0);
      return { left: x, top: y, width: right - x, height: bottom - y };
    };
    const selRect = rect(selExp);
    const am = mergeAt(sheet, sel.ar, sel.ac) ?? { r1: sel.ar, c1: sel.ac, r2: sel.ar, c2: sel.ac };
    const activeRect = rect(am);
    const clipRect = clip && clip.sheet === active ? rect(clip.range) : null;
    const fillRect = fillTo ? rect(fillTo) : null;
    const multi = selExp.r1 !== selExp.r2 || selExp.c1 !== selExp.c2;

    return (
      <div key={p.key} className="absolute overflow-hidden" style={{ left: p.left, top: p.top, width: p.width, height: p.height }}>
        {bg}
        {text}
        {selRect && multi && <div className="pointer-events-none absolute border border-brand-600 bg-brand-600/[0.08]" style={selRect} />}
        {activeRect && <div className="pointer-events-none absolute border-2 border-brand-600" style={{ ...activeRect, left: activeRect.left - 1, top: activeRect.top - 1, width: activeRect.width + 1, height: activeRect.height + 1 }} />}
        {clipRect && <div className="fo-marquee pointer-events-none absolute" style={clipRect} />}
        {fillRect && <div className="pointer-events-none absolute border border-dashed border-slate-500" style={fillRect} />}
        {selRect && !edit && selExp.r2 <= r2 && selExp.c2 <= c2 && (
          <div className="pointer-events-none absolute h-[7px] w-[7px] border border-white bg-brand-600" style={{ left: selRect.left + selRect.width - 4, top: selRect.top + selRect.height - 4 }} />
        )}
      </div>
    );
  };

  // Headers.
  const colHeads: ReactNode[] = [];
  const headCol = (c: number, frozen: boolean) => {
    const on = c >= selExp.c1 && c <= selExp.c2;
    const whole = selG.r1 === 0 && selG.r2 === MAX_ROWS - 1 && on;
    colHeads.push(
      <div
        key={`c${c}`}
        className={`absolute flex items-center justify-center border-b border-r border-slate-200 text-[11px] ${whole ? "bg-brand-600 text-white" : on ? "bg-brand-50 font-semibold text-brand-700" : "bg-slate-50 text-slate-500"}`}
        style={{ left: frozen ? colX[c] : frozenW + colX[c] - colX[fc] - view.x, top: 0, width: colSize(c), height: HH }}
      >
        {colName(c)}
      </div>,
    );
  };
  for (let c = Math.max(cs, fc); c <= ce; c++) headCol(c, false);
  for (let c = 0; c < fc; c++) headCol(c, true);
  const rowHeads: ReactNode[] = [];
  const headRow = (r: number, frozen: boolean) => {
    const on = r >= selExp.r1 && r <= selExp.r2;
    const whole = selG.c1 === 0 && selG.c2 === MAX_COLS - 1 && on;
    rowHeads.push(
      <div
        key={`r${r}`}
        className={`absolute flex items-center justify-center border-b border-r border-slate-200 text-[11px] tabular-nums ${whole ? "bg-brand-600 text-white" : on ? "bg-brand-50 font-semibold text-brand-700" : "bg-slate-50 text-slate-500"}`}
        style={{ left: 0, top: frozen ? rowY[r] : frozenH + rowY[r] - rowY[fr] - view.y, width: HW, height: rowSize(r) }}
      >
        {r + 1}
      </div>,
    );
  };
  for (let r = Math.max(rs, fr); r <= re; r++) headRow(r, false);
  for (let r = 0; r < fr; r++) headRow(r, true);

  // In-cell editor.
  let editorBox: ReactNode = null;
  if (edit) {
    const m = mergeAt(sheet, edit.r, edit.c);
    const w = m ? colX[m.c2 + 1] - colX[m.c1] : colSize(edit.c);
    const h = m ? rowY[m.r2 + 1] - rowY[m.r1] : rowSize(edit.r);
    const cell = sheet.cells[key(edit.r, edit.c)];
    const lines = edit.text.split("\n");
    const want = Math.max(w, ...lines.map((l) => textWidth(l, cell) + 16));
    const x = colLeft(edit.c);
    editorBox = (
      <textarea
        ref={editor}
        aria-label={`Edit ${addr(edit.r, edit.c)}`}
        value={edit.text}
        onChange={(e) => {
          refInsert.current = null;
          st().setEdit({ ...edit, text: e.target.value });
        }}
        onKeyDown={onEditorKey}
        spellCheck={false}
        className="absolute z-30 resize-none overflow-hidden border-2 border-brand-600 bg-white px-[3px] py-0 leading-[1.25] outline-none shadow-lg"
        style={{
          left: x - 1,
          top: rowTop(edit.r) - 1,
          width: Math.min(want, view.w - x - 4) + 2,
          height: Math.max(h, lines.length * 18 + 4) + 2,
          fontSize: `${cell?.s?.size ?? 11}pt`,
          fontFamily: cell?.s?.font ? `"${cell.s.font}", ${FONT}` : FONT,
          fontWeight: cell?.s?.b ? 700 : undefined,
          fontStyle: cell?.s?.i ? "italic" : undefined,
        }}
      />
    );
  }

  return (
    <div
      ref={scroller}
      tabIndex={0}
      role="grid"
      aria-label={`${sheet.name} grid`}
      aria-rowcount={rowCount}
      aria-colcount={colCount}
      onScroll={onScroll}
      onKeyDown={onGridKey}
      className="fo-grid relative min-h-0 flex-1 overflow-auto bg-white outline-none"
      style={{ fontFamily: FONT, fontSize: "11pt", color: "#111" }}
    >
      <div
        ref={canvas}
        className="sticky left-0 top-0 z-10 select-none overflow-hidden"
        style={{ width: view.w, height: view.h, cursor: resize ? (resize.axis === "col" ? "col-resize" : "row-resize") : undefined }}
        onPointerDown={onPointerDown}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        onMouseMove={(e) => {
          const p = local(e);
          const el = canvas.current!;
          if (p.y < HH && p.x > HW) {
            const { c } = cellAt(p.x, p.y);
            const right = colLeft(c) + colSize(c);
            el.style.cursor = Math.abs(p.x - right) <= 4 || (p.x - colLeft(c) <= 3 && c > 0) ? "col-resize" : "s-resize";
          } else if (p.x < HW && p.y > HH) {
            const { r } = cellAt(p.x, p.y);
            const bottom = rowTop(r) + rowSize(r);
            el.style.cursor = Math.abs(p.y - bottom) <= 3 || (p.y - rowTop(r) <= 2 && r > 0) ? "row-resize" : "e-resize";
          } else el.style.cursor = "cell";
        }}
      >
        {panes.map(renderPane)}
        {(fr > 0 || fc > 0) && (
          <>
            {fr > 0 && <div className="pointer-events-none absolute z-10 h-[2px] bg-slate-400/70" style={{ left: HW, top: HH + frozenH - 1, width: view.w - HW }} />}
            {fc > 0 && <div className="pointer-events-none absolute z-10 w-[2px] bg-slate-400/70" style={{ left: HW + frozenW - 1, top: HH, height: view.h - HH }} />}
          </>
        )}
        <div className="absolute overflow-hidden" style={{ left: HW, top: 0, width: view.w - HW, height: HH }}>
          {colHeads}
        </div>
        <div className="absolute overflow-hidden" style={{ left: 0, top: HH, width: HW, height: view.h - HH }}>
          {rowHeads}
        </div>
        <div className="absolute left-0 top-0 border-b border-r border-slate-300 bg-slate-100" style={{ width: HW, height: HH }} title="Select all" />
        {editorBox}
      </div>
      {/* Scroll area: as big as the sheet so the scrollbars are right. */}
      <div style={{ width: HW + colX[colCount], height: HH + rowY[rowCount], marginTop: -view.h }} aria-hidden="true" />
    </div>
  );
}

export type { Menu as GridMenu, Selection };
