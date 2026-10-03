"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type ExcelJSType from "exceljs";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDownAZ, ArrowDownZA, Baseline, Bold, ChevronDown, Download, Eraser, FileSpreadsheet, Grid3x3, Italic, Loader2,
  Merge, PaintBucket, Plus, Redo2, Search, Sigma, Strikethrough, Underline, Undo2, WrapText, X,
} from "lucide-react";
import { addr, key, MAX_COLS, MAX_ROWS, parseRange, rangeAddr, type Workbook } from "@/lib/office/sheets/model";
import { FORMAT_PRESETS, formatValue, stepDecimals } from "@/lib/office/sheets/format";
import { Engine } from "@/lib/office/sheets/formula";
import { cellsIn } from "@/lib/office/sheets/ops";
import { selRange, useSheets } from "@/lib/office/sheets/store";
import { csvToWorkbook, readXlsx, sheetToCsv, writeXlsx } from "@/lib/office/sheets/xlsx";
import { SHEET_TEMPLATES } from "@/lib/office/sheets/templates";
import { loadDraft, newDraftId, type DraftInfo } from "@/lib/office/drafts";
import { convertOnServer, extOf } from "@/lib/office/convert";
import { downloadFile } from "@/lib/tools/files";
import { toast } from "@/lib/editor/events";
import { pickFiles } from "../../editor/filePicker";
import { Toaster } from "../../editor/Toaster";
import { Button, cn } from "../../ui/primitives";
import { OfficeHeader, StartScreen, readOfficeFile, useAutosave, type AppIdentity } from "../OfficeShell";
import { ColorPick, Sep, TB, TSelect } from "../controls";
import { display, Grid, rawText, type GridMenu } from "./Grid";

const APP: AppIdentity = { kind: "sheet", name: "Fusion Sheets", icon: FileSpreadsheet, tint: "bg-[#79e29a] text-[#0d0f14]" };
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ACCEPT = ".xlsx,.xlsm,.xls,.ods,.csv,.tsv,.txt";
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl+";
const FONTS = ["Calibri", "Arial", "Aptos", "Cambria", "Georgia", "Times New Roman", "Verdana", "Tahoma", "Courier New", "Segoe UI"];
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36];

interface Session {
  id: string;
  name: string;
  wb: Workbook;
  sourceBytes: Uint8Array | null;
  source: ExcelJSType.Workbook | null;
  warnings: string[];
}

interface Draft {
  wb: Workbook;
  sourceBytes: Uint8Array | null;
}

export default function SheetsApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async (file: File) => {
    setError(null);
    const ext = extOf(file.name);
    setBusy(["xls", "ods"].includes(ext) ? "Converting on the server…" : "Opening…");
    try {
      if (["xlsx", "xlsm", "xls", "ods"].includes(ext)) {
        const f = await readOfficeFile(file, "xlsx");
        const { wb, source, warnings } = await readXlsx(f.bytes);
        if (ext === "xlsm") warnings.push("Macros can't run here and won't be in the saved .xlsx file.");
        setSession({ id: newDraftId(), name: f.name, wb, source, sourceBytes: f.bytes, warnings });
      } else if (["csv", "tsv", "txt"].includes(ext)) {
        const name = file.name.replace(/\.[^.]+$/, "");
        setSession({ id: newDraftId(), name, wb: csvToWorkbook(await file.text(), name), source: null, sourceBytes: null, warnings: [] });
      } else throw new Error("Open an Excel workbook (.xlsx, .xls, .ods) or a CSV file.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const openDraft = async (d: DraftInfo) => {
    const draft = await loadDraft<Draft>(d.id);
    if (!draft) return;
    const source = draft.data.sourceBytes ? (await readXlsx(draft.data.sourceBytes)).source : null;
    setSession({ id: draft.id, name: draft.name, wb: draft.data.wb, sourceBytes: draft.data.sourceBytes, source, warnings: [] });
  };

  if (!session) {
    return (
      <StartScreen
        app={APP}
        title="Excel spreadsheets"
        subtitle="Open an .xlsx or .csv to edit it, or start a new workbook."
        accept={ACCEPT}
        onFile={open}
        busy={busy}
        error={error}
        onDraft={openDraft}
        templates={SHEET_TEMPLATES.map((t) => ({
          label: t.label,
          hint: t.hint,
          preview: <SheetPreview id={t.id} />,
          onSelect: () => setSession({ id: newDraftId(), name: t.id === "blank" ? "Untitled spreadsheet" : t.label, wb: t.build(), source: null, sourceBytes: null, warnings: [] }),
        }))}
      />
    );
  }
  return (
    <SheetsEditor
      key={session.id}
      session={session}
      onExit={() => setSession(null)}
      onOpen={async () => {
        const [f] = await pickFiles(ACCEPT);
        if (f) {
          setSession(null);
          await open(f);
        }
      }}
    />
  );
}

function SheetPreview({ id }: { id: string }) {
  return (
    <span className="m-3 grid flex-1 grid-cols-4 gap-px self-stretch bg-line p-px">
      {Array.from({ length: 24 }, (_, i) => (
        <span key={i} className={cn("bg-white", id !== "blank" && i < 4 && "bg-emerald-100", id === "invoice" && i === 23 && "bg-emerald-200")} />
      ))}
    </span>
  );
}

// ─── Editor ─────────────────────────────────────────────────────────

function SheetsEditor({ session, onExit, onOpen }: { session: Session; onExit: () => void; onOpen: () => void }) {
  const wb = useSheets((s) => s.wb);
  const active = useSheets((s) => s.active);
  const sel = useSheets((s) => s.sel);
  const edit = useSheets((s) => s.edit);
  const canUndo = useSheets((s) => s.past.length > 0);
  const canRedo = useSheets((s) => s.future.length > 0);
  const st = useSheets.getState;
  const [name, setName] = useState(session.name);
  const [warnings, setWarnings] = useState(session.warnings);
  const [menu, setMenu] = useState<GridMenu | null>(null);
  const [find, setFind] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    st().load(session.wb);
    setLoaded(true);
  }, [session, st]);

  const engine = useMemo(() => {
    const e = new Engine(wb);
    e.warm(active);
    return e;
  }, [wb, active]);

  const draft = useMemo<Draft | null>(() => (loaded ? { wb, sourceBytes: session.sourceBytes } : null), [loaded, wb, session.sourceBytes]);
  const status = useAutosave("sheet", session.id, name, draft);

  const sheet = wb.sheets[active] ?? wb.sheets[0];
  const cell = sheet?.cells[key(sel.ar, sel.ac)];
  const s = cell?.s ?? {};
  const g = selRange(sel);

  const download = async (kind: "xlsx" | "csv" | "pdf") => {
    if (edit) st().commitEdit();
    setBusy(kind === "pdf" ? "Creating PDF…" : "Preparing…");
    try {
      const book = st().wb;
      const eng = new Engine(book);
      if (kind === "csv") {
        const csv = `﻿${sheetToCsv(book, st().active, eng)}`;
        downloadFile({ name: `${name}${book.sheets.length > 1 ? `-${book.sheets[st().active].name}` : ""}.csv`, bytes: new TextEncoder().encode(csv), type: "text/csv" });
      } else {
        const bytes = await writeXlsx(book, eng, session.source);
        if (kind === "xlsx") downloadFile({ name: `${name}.xlsx`, bytes, type: XLSX_MIME });
        else {
          try {
            downloadFile({ name: `${name}.pdf`, bytes: await convertOnServer(`${name}.xlsx`, bytes, "pdf"), type: "application/pdf" });
          } catch (e) {
            toast((e as Error).message, "error");
            return;
          }
        }
      }
      toast(`Downloaded ${name}.${kind}`, "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  // Global shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "s") (e.preventDefault(), download("xlsx"));
      else if (k === "f") (e.preventDefault(), setFind(true));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /** AutoSum and friends: put =FN(range) under the selection, or start typing it in the active cell. */
  const autoFn = (fn: string) => {
    if (g.r1 !== g.r2 || g.c1 !== g.c2) {
      const target = { r: g.r2 + 1, c: g.c1 };
      const src = g.c1 === g.c2 ? rangeAddr(g) : rangeAddr({ ...g, c2: g.c1 });
      st().select({ ar: target.r, ac: target.c, fr: target.r, fc: target.c });
      st().setEdit({ r: target.r, c: target.c, mode: "edit", text: `=${fn}(${src})` });
      return;
    }
    // Numbers directly above, else to the left.
    let r = g.r1 - 1;
    while (r >= 0 && typeof engine.value(active, r, g.c1) === "number") r--;
    let src = r < g.r1 - 1 ? `${addr(r + 1, g.c1)}:${addr(g.r1 - 1, g.c1)}` : "";
    if (!src) {
      let c = g.c1 - 1;
      while (c >= 0 && typeof engine.value(active, g.r1, c) === "number") c--;
      if (c < g.c1 - 1) src = `${addr(g.r1, c + 1)}:${addr(g.r1, g.c1 - 1)}`;
    }
    st().setEdit({ r: g.r1, c: g.c1, mode: "edit", text: `=${fn}(${src})` });
  };

  const fmtValue = s.fmt ?? "General";
  const fmtOptions = FORMAT_PRESETS.some((p) => p.fmt === fmtValue) ? FORMAT_PRESETS : [{ label: `Custom: ${fmtValue}`, fmt: fmtValue }, ...FORMAT_PRESETS];
  const merged = sheet?.merges.some((m) => m.r1 === g.r1 && m.c1 === g.c1 && m.r2 === g.r2 && m.c2 === g.c2);

  const menus = [
    {
      label: "File",
      items: [
        { label: "New spreadsheet", onSelect: onExit },
        { label: "Open…", onSelect: onOpen },
        "divider" as const,
        { label: "Download as Excel (.xlsx)", shortcut: `${MOD}S`, onSelect: () => download("xlsx") },
        { label: "Download as PDF", onSelect: () => download("pdf") },
        { label: "Download this sheet as CSV", onSelect: () => download("csv") },
        "divider" as const,
        { label: "Close", onSelect: onExit },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Undo", shortcut: `${MOD}Z`, disabled: !canUndo, onSelect: () => st().undo() },
        { label: "Redo", shortcut: isMac ? "⇧⌘Z" : "Ctrl+Y", disabled: !canRedo, onSelect: () => st().redo() },
        "divider" as const,
        { label: "Find", shortcut: `${MOD}F`, onSelect: () => setFind(true) },
        { label: "Clear contents", shortcut: "Del", onSelect: () => st().clear("contents") },
        { label: "Clear formatting", onSelect: () => st().clear("formats") },
        { label: "Clear all", onSelect: () => st().clear("all") },
      ],
    },
    {
      label: "Insert",
      items: [
        { label: "Row above", onSelect: () => st().insert("row", "before") },
        { label: "Row below", onSelect: () => st().insert("row", "after") },
        { label: "Column left", onSelect: () => st().insert("col", "before") },
        { label: "Column right", onSelect: () => st().insert("col", "after") },
        "divider" as const,
        { label: "New sheet", onSelect: () => st().addSheet() },
        "divider" as const,
        ...["SUM", "AVERAGE", "COUNT", "MAX", "MIN"].map((fn) => ({ label: `${fn}( )`, onSelect: () => autoFn(fn) })),
      ],
    },
    {
      label: "Data",
      items: [
        { label: "Sort A → Z", onSelect: () => st().sort(true, engine) },
        { label: "Sort Z → A", onSelect: () => st().sort(false, engine) },
        "divider" as const,
        { label: "Delete rows", onSelect: () => st().remove("row") },
        { label: "Delete columns", onSelect: () => st().remove("col") },
      ],
    },
    {
      label: "View",
      items: [
        { label: "Freeze top row", onSelect: () => st().freeze(1, 0) },
        { label: "Freeze first column", onSelect: () => st().freeze(0, 1) },
        { label: `Freeze up to ${addr(sel.ar, sel.ac)}`, onSelect: () => st().freeze(sel.ar, sel.ac) },
        { label: "Unfreeze", onSelect: () => st().freeze(0, 0) },
      ],
    },
  ];

  if (!loaded || !sheet) return <div className="flex h-dvh items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-fg-subtle" /></div>;

  return (
    <div className="flex h-dvh flex-col bg-surface">
      <OfficeHeader
        app={APP}
        docName={name}
        onRename={setName}
        status={status}
        menus={menus}
        actions={
          <>
            <TB label="Find" shortcut={`${MOD}F`} onClick={() => setFind(true)}>
              <Search className="h-4 w-4" />
            </TB>
            <Button variant="primary" size="sm" className="ml-1.5" onClick={() => download("xlsx")} disabled={!!busy} title={`Download .xlsx (${MOD}S)`}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {busy ?? "Download"}
            </Button>
          </>
        }
      />

      {/* Toolbar */}
      <div className="thin-scroll flex items-center gap-0.5 overflow-x-auto border-b border-line px-2 py-1">
        <TB label="Undo" shortcut={`${MOD}Z`} disabled={!canUndo} onClick={() => st().undo()}>
          <Undo2 className="h-4 w-4" />
        </TB>
        <TB label="Redo" disabled={!canRedo} onClick={() => st().redo()}>
          <Redo2 className="h-4 w-4" />
        </TB>
        <Sep />
        <TSelect label="Number format" value={fmtValue} width={150} onChange={(fmt) => st().setStyle({ fmt: fmt === "General" ? undefined : fmt })} options={fmtOptions.map((p) => ({ value: p.fmt, label: p.label }))} />
        <TB label="Fewer decimals" onClick={() => st().setStyle((x) => ({ ...x, fmt: stepDecimals(x.fmt, engine.value(active, sel.ar, sel.ac) as number, -1) }))} className="px-1 text-[11px] font-semibold">
          .0←
        </TB>
        <TB label="More decimals" onClick={() => st().setStyle((x) => ({ ...x, fmt: stepDecimals(x.fmt, engine.value(active, sel.ar, sel.ac) as number, 1) }))} className="px-1 text-[11px] font-semibold">
          .00→
        </TB>
        <Sep />
        <TSelect label="Font" value={s.font ?? ""} width={112} onChange={(font) => st().setStyle({ font: font || undefined })} options={[{ value: "", label: "Calibri" }, ...FONTS.filter((f) => f !== "Calibri").map((f) => ({ value: f, label: f }))]} />
        <TSelect label="Font size" value={String(s.size ?? 11)} width={56} onChange={(v) => st().setStyle({ size: Number(v) === 11 ? undefined : Number(v) })} options={[...new Set([...SIZES, s.size ?? 11])].sort((a, b) => a - b).map((z) => ({ value: String(z), label: String(z) }))} />
        <Sep />
        <TB label="Bold" shortcut={`${MOD}B`} active={!!s.b} onClick={() => st().setStyle({ b: !s.b })}>
          <Bold className="h-4 w-4" />
        </TB>
        <TB label="Italic" shortcut={`${MOD}I`} active={!!s.i} onClick={() => st().setStyle({ i: !s.i })}>
          <Italic className="h-4 w-4" />
        </TB>
        <TB label="Underline" shortcut={`${MOD}U`} active={!!s.u} onClick={() => st().setStyle({ u: !s.u })}>
          <Underline className="h-4 w-4" />
        </TB>
        <TB label="Strikethrough" active={!!s.s} onClick={() => st().setStyle({ s: !s.s })}>
          <Strikethrough className="h-4 w-4" />
        </TB>
        <ColorPick label="Text colour" icon={<Baseline className="h-4 w-4" />} value={s.color ?? "#000000"} resetLabel="Automatic" onChange={(color) => st().setStyle({ color: color ?? undefined })} />
        <ColorPick label="Fill colour" icon={<PaintBucket className="h-4 w-4" />} value={s.fill ?? null} resetLabel="No fill" onChange={(fill) => st().setStyle({ fill: fill ?? undefined })} />
        <BorderMenu />
        <Sep />
        {(
          [
            ["left", AlignLeft],
            ["center", AlignCenter],
            ["right", AlignRight],
          ] as const
        ).map(([h, Icon]) => (
          <TB key={h} label={`Align ${h}`} active={s.h === h} onClick={() => st().setStyle({ h: s.h === h ? undefined : h })}>
            <Icon className="h-4 w-4" />
          </TB>
        ))}
        <TSelect
          label="Vertical alignment"
          value={s.v ?? "bottom"}
          width={78}
          onChange={(v) => st().setStyle({ v: v === "bottom" ? undefined : (v as "top" | "middle") })}
          options={[
            { value: "top", label: "Top" },
            { value: "middle", label: "Middle" },
            { value: "bottom", label: "Bottom" },
          ]}
        />
        <TB label="Wrap text" active={!!s.wrap} onClick={() => st().setStyle({ wrap: !s.wrap })}>
          <WrapText className="h-4 w-4" />
        </TB>
        <TB label={merged ? "Unmerge cells" : "Merge cells"} active={merged} onClick={() => (merged ? st().unmerge() : st().merge())}>
          <Merge className="h-4 w-4" />
        </TB>
        <Sep />
        <TB label="AutoSum" onClick={() => autoFn("SUM")}>
          <Sigma className="h-4 w-4" />
        </TB>
        <TB label="Sort A to Z" onClick={() => st().sort(true, engine)}>
          <ArrowDownAZ className="h-4 w-4" />
        </TB>
        <TB label="Sort Z to A" onClick={() => st().sort(false, engine)}>
          <ArrowDownZA className="h-4 w-4" />
        </TB>
        <TB label="Clear formatting" onClick={() => st().clear("formats")}>
          <Eraser className="h-4 w-4" />
        </TB>
      </div>

      <FormulaBar />

      {warnings.length > 0 && (
        <div className="flex items-start gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[12px] text-amber-200">
          <ul className="flex-1 list-disc pl-4">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <button type="button" aria-label="Dismiss" onClick={() => setWarnings([])} className="rounded p-0.5 hover:bg-amber-500/20">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col">
        {find && <FindBar engine={engine} onClose={() => setFind(false)} />}
        <Grid engine={engine} onMenu={setMenu} />
      </div>

      <footer className="flex h-9 shrink-0 items-center border-t border-line bg-sunken">
        <SheetTabs />
        <Stats engine={engine} />
      </footer>

      {menu && <GridContextMenu menu={menu} engine={engine} onClose={() => setMenu(null)} onFn={autoFn} />}
      <Toaster />
    </div>
  );
}

// ─── Formula bar ────────────────────────────────────────────────────

function FormulaBar() {
  const sel = useSheets((s) => s.sel);
  const edit = useSheets((s) => s.edit);
  const cell = useSheets((s) => s.wb.sheets[s.active]?.cells[key(s.sel.ar, s.sel.ac)]);
  const st = useSheets.getState;
  const g = selRange(sel);
  const [name, setName] = useState("");
  const whole = g.r1 === 0 && g.r2 === MAX_ROWS - 1 && g.c1 === 0 && g.c2 === MAX_COLS - 1;
  const label = whole ? "All" : g.r1 === 0 && g.r2 === MAX_ROWS - 1 ? `${rangeAddr({ ...g, r1: 0, r2: 0 }).replace(/\d+/g, "")}` : rangeAddr(g);
  useEffect(() => setName(label), [label]);
  const value = edit && edit.r === sel.ar && edit.c === sel.ac ? edit.text : rawText(cell);

  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line px-2" data-formula-bar>
      <input
        aria-label="Name box"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          const r = parseRange(name);
          if (r) st().select({ ar: r.r1, ac: r.c1, fr: r.r2, fc: r.c2 });
          else setName(label);
          (document.querySelector(".fo-grid") as HTMLElement | null)?.focus();
        }}
        onBlur={() => setName(label)}
        className="h-7 w-24 rounded border border-line-strong px-2 text-[13px] tabular-nums outline-none focus:border-brand-500 bg-sunken text-fg"
      />
      <span className="font-serif text-[15px] italic text-fg-subtle">fx</span>
      <input
        aria-label="Formula bar"
        value={value}
        onFocus={() => {
          if (!st().edit) st().setEdit({ r: sel.ar, c: sel.ac, mode: "edit", text: rawText(cell) });
        }}
        onChange={(e) => st().setEdit({ r: sel.ar, c: sel.ac, mode: "edit", text: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            st().commitEdit();
            const s = st().sel;
            st().select({ ar: s.ar + 1, ac: s.ac, fr: s.ar + 1, fc: s.ac });
          } else if (e.key === "Escape") {
            st().setEdit(null);
            (document.querySelector(".fo-grid") as HTMLElement | null)?.focus();
          }
        }}
        className="h-7 min-w-0 flex-1 rounded border border-transparent px-2 font-mono text-[13px] outline-none hover:border-line-strong focus:border-brand-500 bg-sunken text-fg"
      />
    </div>
  );
}

// ─── Borders ────────────────────────────────────────────────────────

function BorderMenu() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);
  const pick = (k: "all" | "outside" | "bottom" | "none") => {
    useSheets.getState().setBorders(k);
    setOpen(false);
  };
  return (
    <div ref={root} className="relative">
      <TB label="Borders" onClick={() => setOpen((o) => !o)}>
        <Grid3x3 className="h-4 w-4" />
        <ChevronDown className="h-3 w-3 opacity-60" />
      </TB>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-xl border border-line-strong bg-overlay py-1 text-[13px] shadow-pop">
          {(
            [
              ["all", "All borders"],
              ["outside", "Outside borders"],
              ["bottom", "Bottom border"],
              ["none", "No borders"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(k)} className="block w-full px-3 py-1.5 text-left hover:bg-raised">
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sheet tabs ─────────────────────────────────────────────────────

function SheetTabs() {
  const sheets = useSheets((s) => s.wb.sheets);
  const active = useSheets((s) => s.active);
  const st = useSheets.getState;
  const [renaming, setRenaming] = useState<number | null>(null);
  const [menu, setMenu] = useState<{ i: number; x: number; y: number } | null>(null);
  return (
    <div className="thin-scroll flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-1">
      <TB label="Add sheet" onClick={() => st().addSheet()}>
        <Plus className="h-4 w-4" />
      </TB>
      {sheets.map((s, i) =>
        s.hidden ? null : renaming === i ? (
          <input
            key={s.id}
            autoFocus
            defaultValue={s.name}
            aria-label="Sheet name"
            onBlur={(e) => {
              st().renameSheet(i, e.target.value);
              setRenaming(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setRenaming(null);
            }}
            className="h-7 w-28 rounded-md border border-brand-500 bg-sunken px-2 text-[13px] text-fg outline-none"
          />
        ) : (
          <button
            key={s.id}
            type="button"
            onClick={() => (st().edit && st().commitEdit(), st().setActive(i))}
            onDoubleClick={() => setRenaming(i)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ i, x: e.clientX, y: e.clientY });
            }}
            className={cn("h-7 shrink-0 rounded-md px-3 text-[13px]", i === active ? "bg-raised font-medium text-emerald-300 shadow-sm ring-1 ring-line-strong" : "text-fg-muted hover:bg-raised")}
          >
            {s.name}
          </button>
        ),
      )}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y - 190}
          onClose={() => setMenu(null)}
          items={[
            { label: "Rename", onSelect: () => setRenaming(menu.i) },
            { label: "Duplicate", onSelect: () => st().duplicateSheet(menu.i) },
            { label: "Move left", onSelect: () => st().moveSheet(menu.i, -1) },
            { label: "Move right", onSelect: () => st().moveSheet(menu.i, 1) },
            { label: "Delete", danger: true, disabled: sheets.filter((s) => !s.hidden).length <= 1, onSelect: () => confirm(`Delete "${sheets[menu.i].name}"?`) && st().deleteSheet(menu.i) },
          ]}
        />
      )}
    </div>
  );
}

// ─── Status: sum / average / count ──────────────────────────────────

function Stats({ engine }: { engine: Engine }) {
  const sel = useSheets((s) => s.sel);
  const active = useSheets((s) => s.active);
  const sheet = useSheets((s) => s.wb.sheets[s.active]);
  const g = selRange(sel);
  if (!sheet || (g.r1 === g.r2 && g.c1 === g.c2)) return null;
  let count = 0;
  let nums = 0;
  let sum = 0;
  for (const [r, c] of cellsIn(sheet, g)) {
    const v = engine.value(active, r, c);
    if (v === null || v === "") continue;
    count++;
    if (typeof v === "number") {
      nums++;
      sum += v;
    }
  }
  if (!count) return null;
  const fmt = (n: number) => formatValue(Number(n.toPrecision(12)), undefined);
  return (
    <div className="flex shrink-0 gap-4 px-3 text-[12px] text-fg-muted">
      {nums > 0 && <span>Sum: <b className="font-medium text-fg">{fmt(sum)}</b></span>}
      {nums > 0 && <span>Average: <b className="font-medium text-fg">{fmt(sum / nums)}</b></span>}
      <span>Count: <b className="font-medium text-fg">{count}</b></span>
    </div>
  );
}

// ─── Find ───────────────────────────────────────────────────────────

function FindBar({ engine, onClose }: { engine: Engine; onClose: () => void }) {
  const [term, setTerm] = useState("");
  const [i, setI] = useState(0);
  const active = useSheets((s) => s.active);
  const sheet = useSheets((s) => s.wb.sheets[s.active]);
  const matches = useMemo(() => {
    if (!term || !sheet) return [];
    const t = term.toLowerCase();
    return Object.keys(sheet.cells)
      .map((k) => k.split(",").map(Number) as [number, number])
      .filter(([r, c]) => display(engine, active, sheet, r, c).text.toLowerCase().includes(t) || (sheet.cells[key(r, c)].f ?? "").toLowerCase().includes(t))
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  }, [term, sheet, engine, active]);
  const go = (d: number) => {
    if (!matches.length) return;
    const n = (i + d + matches.length) % matches.length;
    setI(n);
    const [r, c] = matches[n];
    useSheets.getState().select({ ar: r, ac: c, fr: r, fc: c });
  };
  return (
    <div className="absolute right-4 top-2 z-40 flex items-center gap-1.5 rounded-xl bg-overlay p-2 shadow-pop ring-1 ring-line-strong" role="search">
      <input
        autoFocus
        value={term}
        onChange={(e) => (setTerm(e.target.value), setI(-1))}
        onKeyDown={(e) => {
          if (e.key === "Enter") go(e.shiftKey ? -1 : 1);
          if (e.key === "Escape") onClose();
        }}
        placeholder="Find in sheet"
        aria-label="Find in sheet"
        className="h-8 w-52 rounded-md border border-line-strong px-2 text-[13px] outline-none focus:border-brand-500 bg-sunken text-fg"
      />
      <span className="w-12 text-center text-[12px] tabular-nums text-fg-muted">{term ? `${matches.length ? Math.max(0, i) + 1 : 0}/${matches.length}` : ""}</span>
      <Button size="sm" onClick={() => go(1)} disabled={!matches.length}>
        Next
      </Button>
      <TB label="Close" onClick={onClose}>
        <X className="h-4 w-4" />
      </TB>
    </div>
  );
}

// ─── Context menus ──────────────────────────────────────────────────

function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: { label: string; onSelect: () => void; disabled?: boolean; danger?: boolean; divider?: boolean }[]; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && onClose();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [onClose]);
  const left = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 230);
  const top = Math.max(8, Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 800) - items.length * 32 - 16));
  return (
    <div ref={root} role="menu" className="fixed z-50 w-56 rounded-xl border border-line-strong bg-overlay py-1 text-[13px] shadow-pop" style={{ left, top }}>
      {items.map((it, i) => (
        <div key={i}>
          {it.divider && <div className="mx-2 my-1 h-px bg-line" />}
          <button
            type="button"
            role="menuitem"
            disabled={it.disabled}
            onClick={() => {
              onClose();
              it.onSelect();
            }}
            className={cn("block w-full px-3 py-1.5 text-left hover:bg-raised disabled:opacity-40", it.danger && "text-red-300")}
          >
            {it.label}
          </button>
        </div>
      ))}
    </div>
  );
}

function GridContextMenu({ menu, engine, onClose, onFn }: { menu: GridMenu; engine: Engine; onClose: () => void; onFn: (fn: string) => void }) {
  const st = useSheets.getState;
  const clipboard = (cmd: "copy" | "cut") => {
    (document.querySelector(".fo-grid") as HTMLElement | null)?.focus();
    document.execCommand(cmd);
  };
  const paste = async () => {
    (document.querySelector(".fo-grid") as HTMLElement | null)?.focus();
    try {
      const text = await navigator.clipboard.readText();
      const own = st().clip;
      if (own && own.text === text) st().paste(own);
      else if (text) st().pasteText((await import("@/lib/office/sheets/ops")).parseTsv(text));
    } catch {
      toast(`Use ${MOD}V to paste.`);
    }
  };
  const common = [
    { label: "Cut", onSelect: () => clipboard("cut") },
    { label: "Copy", onSelect: () => clipboard("copy") },
    { label: "Paste", onSelect: paste },
  ];
  const items =
    menu.kind === "col"
      ? [
          ...common,
          { label: "Insert column left", divider: true, onSelect: () => st().insert("col", "before") },
          { label: "Insert column right", onSelect: () => st().insert("col", "after") },
          { label: "Delete column", onSelect: () => st().remove("col") },
          { label: "Clear contents", onSelect: () => st().clear("contents") },
          { label: "Sort A → Z", divider: true, onSelect: () => st().sort(true, engine) },
          { label: "Sort Z → A", onSelect: () => st().sort(false, engine) },
          { label: "Reset width", onSelect: () => st().setSize("col", selRange(st().sel).c1, null) },
        ]
      : menu.kind === "row"
        ? [
            ...common,
            { label: "Insert row above", divider: true, onSelect: () => st().insert("row", "before") },
            { label: "Insert row below", onSelect: () => st().insert("row", "after") },
            { label: "Delete row", onSelect: () => st().remove("row") },
            { label: "Clear contents", onSelect: () => st().clear("contents") },
            { label: "Reset height", onSelect: () => st().setSize("row", selRange(st().sel).r1, null) },
          ]
        : [
            ...common,
            { label: "Insert row above", divider: true, onSelect: () => st().insert("row", "before") },
            { label: "Insert column left", onSelect: () => st().insert("col", "before") },
            { label: "Delete row", onSelect: () => st().remove("row") },
            { label: "Delete column", onSelect: () => st().remove("col") },
            { label: "Clear contents", divider: true, onSelect: () => st().clear("contents") },
            { label: "Sort A → Z", onSelect: () => st().sort(true, engine) },
            { label: "Sort Z → A", onSelect: () => st().sort(false, engine) },
            { label: "Insert SUM", divider: true, onSelect: () => onFn("SUM") },
          ];
  return <ContextMenu x={menu.x} y={menu.y} items={items} onClose={onClose} />;
}

