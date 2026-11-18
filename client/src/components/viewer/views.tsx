"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Loader2, Maximize2, Minus, Plus, TriangleAlert } from "lucide-react";
import { getPdfjs } from "@/lib/pdf/pdfjs";
import { browserXml } from "@/lib/office/ooxml";
import { convertOnServer, LEGACY } from "@/lib/office/convert";
import { colName, DEFAULT_COL, usedBounds, type Cell, type Sheet, type Workbook } from "@/lib/office/sheets/model";
import type { Deck } from "@/lib/office/slides/model";
import type { WordDoc } from "@/lib/office/docx/model";
import { renderSafeMarkdown } from "@/lib/tools/safeMarkdown";
import { extOf, MAX_TEXT_BYTES } from "@/lib/viewer/detect";
import { formatXml } from "@/lib/viewer/text";
import { cn } from "../ui/primitives";

/* ── Shared ────────────────────────────────────────────────────── */

export type Load<T> = { state: "loading"; note?: string } | { state: "ready"; value: T } | { state: "error"; message: string };

/** Runs an async reader once per file; the result drives loading / error / ready. */
export function useLoad<T>(read: (setNote: (n: string) => void) => Promise<T>, deps: unknown[]): Load<T> {
  const [s, setS] = useState<Load<T>>({ state: "loading" });
  useEffect(() => {
    let live = true;
    setS({ state: "loading" });
    read((note) => live && setS({ state: "loading", note }))
      .then((value) => live && setS({ state: "ready", value }))
      .catch((e: Error) => live && setS({ state: "error", message: e?.message || "This file couldn't be opened." }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return s;
}

export function Center({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">{children}</div>;
}

export function Loading({ note }: { note?: string }) {
  return (
    <Center>
      <Loader2 className="h-7 w-7 animate-spin text-fg-muted" aria-hidden="true" />
      <p className="text-[14px] text-fg-muted" aria-live="polite">
        {note ?? "Opening…"}
      </p>
    </Center>
  );
}

export function Failed({ message }: { message: string }) {
  return (
    <Center>
      <TriangleAlert className="h-8 w-8 text-amber-300" aria-hidden="true" />
      <p className="max-w-[460px] text-[15px] text-fg">{message}</p>
    </Center>
  );
}

function Warnings({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mx-auto mb-4 max-w-[960px] rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-[13px] text-amber-100">
      {items.map((w) => (
        <p key={w}>{w}</p>
      ))}
    </div>
  );
}

/** Width of an element, kept up to date. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Bytes of an Office file, converting old formats (.doc, .xls, .ppt, OpenDocument) on the server first. */
async function officeBytes(file: File, modern: "docx" | "xlsx" | "pptx", setNote: (n: string) => void) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = extOf(file.name);
  if (LEGACY[ext] !== modern) return bytes;
  setNote(`Converting .${ext} to open it…`);
  return convertOnServer(file.name, bytes, modern);
}

const ZOOMS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 3];

export function ZoomBar({ zoom, setZoom, extra }: { zoom: number; setZoom: (z: number) => void; extra?: ReactNode }) {
  const i = ZOOMS.findIndex((z) => z >= zoom - 0.001);
  return (
    <div className="pointer-events-none sticky bottom-4 z-10 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-line-strong bg-surface/95 px-1.5 py-1 shadow-lg backdrop-blur">
        <button type="button" onClick={() => setZoom(ZOOMS[Math.max(0, i - 1)])} disabled={i <= 0} className="flex h-8 w-8 items-center justify-center rounded-full text-fg hover:bg-raised disabled:opacity-40" aria-label="Zoom out">
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="w-12 text-center text-[12.5px] tabular-nums text-fg-muted">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom(ZOOMS[Math.min(ZOOMS.length - 1, i + 1)])} disabled={i >= ZOOMS.length - 1} className="flex h-8 w-8 items-center justify-center rounded-full text-fg hover:bg-raised disabled:opacity-40" aria-label="Zoom in">
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => setZoom(1)} className="flex h-8 w-8 items-center justify-center rounded-full text-fg hover:bg-raised" aria-label="Fit width" title="Fit width">
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </button>
        {extra}
      </div>
    </div>
  );
}

/* ── PDF ───────────────────────────────────────────────────────── */

export function PdfView({ file }: { file: File }) {
  const [zoom, setZoom] = useState(1);
  const [ref, width] = useWidth<HTMLDivElement>();
  const doc = useLoad<{ pdf: PDFDocumentProxy; sizes: { w: number; h: number }[] }>(async () => {
    const pdfjs = await getPdfjs();
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), verbosity: 0 });
    let cancelled = false;
    task.onPassword = (update: (p: string) => void, reason: number) => {
      const p = window.prompt(reason === pdfjs.PasswordResponses.INCORRECT_PASSWORD ? "That password is wrong. Try again:" : "This PDF is protected. Enter its password to open it:");
      if (p === null) {
        cancelled = true;
        void task.destroy();
      } else update(p);
    };
    let pdf: PDFDocumentProxy;
    try {
      pdf = await task.promise;
    } catch (e) {
      if (cancelled || (e as { name?: string })?.name === "PasswordException") throw new Error("This PDF is password protected. Open it again and enter the password.");
      throw new Error("This PDF couldn't be opened. It may be damaged. Try the Repair PDF tool.");
    }
    const sizes: { w: number; h: number }[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const v = (await pdf.getPage(i)).getViewport({ scale: 1 });
      sizes.push({ w: v.width, h: v.height });
    }
    return { pdf, sizes };
  }, [file]);

  useEffect(() => {
    if (doc.state !== "ready") return;
    const pdf = doc.value.pdf;
    return () => void pdf.destroy();
  }, [doc]);

  const base = Math.max(240, Math.min(width - 24, 960));
  return (
    <div ref={ref} className="min-h-full px-3 py-4">
      {doc.state === "loading" ? (
        <Loading note={doc.note} />
      ) : doc.state === "error" ? (
        <Failed message={doc.message} />
      ) : (
        <>
          <p className="mb-3 text-center text-[12px] text-fg-subtle">
            {doc.value.sizes.length} page{doc.value.sizes.length === 1 ? "" : "s"}
          </p>
          <div className="flex flex-col items-center gap-4">
            {width > 0 && doc.value.sizes.map((s, i) => <PdfPage key={i} pdf={doc.value.pdf} index={i} width={Math.round(base * zoom * Math.min(1, s.w / doc.value.sizes[0].w))} size={s} count={doc.value.sizes.length} />)}
          </div>
          <ZoomBar zoom={zoom} setZoom={setZoom} />
        </>
      )}
    </div>
  );
}

/** One page: drawn when it scrolls near the screen, and again after zooming. */
function PdfPage({ pdf, index, width, size, count }: { pdf: PDFDocumentProxy; index: number; width: number; size: { w: number; h: number }; count: number }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false);
  const [drawn, setDrawn] = useState(0);
  const height = Math.round((width * size.h) / size.w);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: "1200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near || drawn === width) return;
    let cancel: (() => void) | null = null;
    let live = true;
    (async () => {
      const page = await pdf.getPage(index + 1);
      if (!live) return;
      let ratio = window.devicePixelRatio || 1;
      // Keep the backing store within browser limits on big zooms.
      const maxPixels = 16_000_000;
      if (width * height * ratio * ratio > maxPixels) ratio = Math.sqrt(maxPixels / (width * height));
      const viewport = page.getViewport({ scale: (width / size.w) * ratio });
      const off = document.createElement("canvas");
      off.width = Math.floor(viewport.width);
      off.height = Math.floor(viewport.height);
      const ctx = off.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, off.width, off.height);
      const task = page.render({ canvasContext: ctx, viewport });
      cancel = () => task.cancel();
      try {
        await task.promise;
      } catch {
        return;
      }
      const c = canvas.current;
      if (!live || !c) return;
      c.width = off.width;
      c.height = off.height;
      c.getContext("2d")!.drawImage(off, 0, 0);
      setDrawn(width);
    })();
    return () => {
      live = false;
      cancel?.();
    };
  }, [near, width, height, pdf, index, size.w, drawn]);

  return (
    <div ref={box} className="relative shrink-0 overflow-hidden rounded-[3px] bg-white shadow-[0_8px_28px_-12px_rgb(0_0_0/0.8)]" style={{ width, height }} role="img" aria-label={`Page ${index + 1} of ${count}`}>
      {!drawn && <div className="absolute inset-0 animate-pulse bg-[#eef0f4]" />}
      <canvas ref={canvas} className="block h-full w-full" />
    </div>
  );
}

/* ── Image ─────────────────────────────────────────────────────── */

/** Formats the browser can't draw (HEIC on most browsers), decoded on this device into a PNG. */
async function decodedImageUrl(file: File): Promise<string> {
  const { decodeImage } = await import("@/lib/image/canvas");
  const img = await decodeImage({ bytes: new Uint8Array(await file.arrayBuffer()), type: file.type, name: file.name });
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  canvas.getContext("2d")!.drawImage(img.source, 0, 0);
  img.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("decode");
  return URL.createObjectURL(blob);
}

export function ImageView({ file }: { file: File }) {
  const direct = useMemo(() => URL.createObjectURL(file), [file]);
  const [url, setUrl] = useState(direct);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [actual, setActual] = useState(false);
  const [state, setState] = useState<"ok" | "decoding" | "broken">("ok");
  useEffect(() => () => URL.revokeObjectURL(direct), [direct]);
  useEffect(() => () => void (url !== direct && URL.revokeObjectURL(url)), [url, direct]);

  const onError = () => {
    if (url !== direct) return setState("broken");
    setState("decoding");
    decodedImageUrl(file)
      .then((u) => (setUrl(u), setState("ok")))
      .catch(() => setState("broken"));
  };
  if (state === "decoding") return <Loading note={/\.(heic|heif)$/i.test(file.name) ? "Decoding the HEIC photo on this device…" : "Decoding the image…"} />;
  if (state === "broken") return <Failed message="This image couldn't be shown. It may be damaged, or a kind of image this viewer doesn't read." />;
  return (
    <div className={cn("relative flex min-h-full p-4", actual ? "items-start justify-start" : "items-center justify-center")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={file.name}
        onError={onError}
        onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        onClick={() => setActual((a) => !a)}
        className={cn("rounded-md bg-[repeating-conic-gradient(#2a2e38_0_25%,#20232b_0_50%)] bg-[length:20px_20px] shadow-lg", actual ? "max-w-none cursor-zoom-out" : "max-h-[calc(100dvh-140px)] max-w-full cursor-zoom-in object-contain")}
        title={actual ? "Click to fit the screen" : "Click for actual size"}
      />
      {size && size.w > 0 && (
        <span className="pointer-events-none fixed bottom-4 right-4 rounded-full border border-line bg-surface/90 px-3 py-1 text-[12px] tabular-nums text-fg-muted backdrop-blur">
          {size.w} × {size.h} px
        </span>
      )}
    </div>
  );
}

/* ── Word ──────────────────────────────────────────────────────── */

const PT_TO_PX = 96 / 72;

export function DocView({ file }: { file: File }) {
  const doc = useLoad<{ html: string; doc: WordDoc; warnings: string[] }>(
    async (setNote) => {
      const bytes = await officeBytes(file, "docx", setNote);
      const [{ readDocx }, { generateHTML }, { wordExtensions }] = await Promise.all([import("@/lib/office/docx/read"), import("@tiptap/core"), import("@/lib/office/docx/extensions")]);
      let read;
      try {
        read = readDocx(bytes, browserXml);
      } catch {
        throw new Error("This document couldn't be opened. It may be damaged, password protected, or not a Word file.");
      }
      // generateHTML only emits nodes and marks from the editor's schema, and escapes text.
      return { html: generateHTML(read.doc.content, wordExtensions("")), doc: read.doc, warnings: read.warnings };
    },
    [file],
  );
  const [zoom, setZoom] = useState(1);
  if (doc.state === "loading") return <Loading note={doc.note} />;
  if (doc.state === "error") return <Failed message={doc.message} />;
  const { meta } = doc.value.doc;
  const m = meta.page.margin;
  const pad = (pt: number) => `min(${pt * PT_TO_PX}px, 7vw)`;
  const style: CSSProperties = {
    width: `min(100%, ${meta.page.width * PT_TO_PX}px)`,
    minHeight: meta.page.height * PT_TO_PX * 0.6,
    padding: `${pad(m.top)} ${pad(m.right)} ${pad(m.bottom)} ${pad(m.left)}`,
    fontFamily: `"${meta.font}", Calibri, Carlito, "Segoe UI", Arial, sans-serif`,
    fontSize: `${meta.fontSize}pt`,
    zoom,
  };
  return (
    <div className="min-h-full px-3 py-5">
      <Warnings items={doc.value.warnings} />
      <article className="paper fo-doc mx-auto bg-white text-[#111] shadow-[0_16px_48px_-16px_rgb(0_0_0/0.8)]" style={style}>
        <div className="ProseMirror" style={{ minHeight: 0 }} dangerouslySetInnerHTML={{ __html: doc.value.html }} />
      </article>
      <ZoomBar zoom={zoom} setZoom={setZoom} />
    </div>
  );
}

/* ── Excel / CSV ───────────────────────────────────────────────── */

const ROW_STEP = 500;
const MAX_COLS_SHOWN = 120;

/** Tab-separated rows (TSV has no quoting; CSV goes through the editor's own parser). */
function parseDelimited(text: string, sep: string): string[][] {
  return text.split(/\r?\n/).filter((l, i, a) => l !== "" || i < a.length - 1).map((l) => l.split(sep));
}

export function SheetView({ file, csv }: { file: File; csv: boolean }) {
  const book = useLoad<{ wb: Workbook; warnings: string[] }>(
    async (setNote) => {
      const x = await import("@/lib/office/sheets/xlsx");
      if (csv) {
        if (file.size > MAX_TEXT_BYTES * 4) throw new Error("This CSV file is too large to show here. Open it in the Excel editor instead.");
        const text = await file.text();
        if (extOf(file.name) === "tsv") {
          const wb: Workbook = { sheets: [{ id: "tsv", name: file.name, cells: {}, cols: {}, rows: {}, merges: [] }] };
          parseDelimited(text, "\t").forEach((row, r) => row.forEach((v, c) => v !== "" && (wb.sheets[0].cells[`${r},${c}`] = { v })));
          return { wb, warnings: [] };
        }
        return { wb: x.csvToWorkbook(text, file.name.replace(/\.[^.]+$/, "")), warnings: [] };
      }
      const { wb, warnings } = await x.readXlsx(await officeBytes(file, "xlsx", setNote));
      return { wb, warnings: warnings.map((w) => w.replace(/, but (it's|they're) kept when you save\./, ".")) };
    },
    [file, csv],
  );
  const [active, setActive] = useState(0);
  if (book.state === "loading") return <Loading note={book.note} />;
  if (book.state === "error") return <Failed message={book.message} />;
  const sheets = book.value.wb.sheets.filter((s) => !s.hidden);
  const sheet = sheets[Math.min(active, sheets.length - 1)] ?? book.value.wb.sheets[0];
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-auto bg-white">
        <SheetTable key={sheet.id} sheet={sheet} />
      </div>
      {book.value.warnings.length > 0 && <p className="shrink-0 border-t border-line bg-surface px-3 py-1.5 text-[12px] text-amber-200">{book.value.warnings.join(" ")}</p>}
      {sheets.length > 1 && (
        <div role="tablist" aria-label="Sheets" className="flex shrink-0 gap-1 overflow-x-auto border-t border-line bg-surface px-2 py-1.5">
          {sheets.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s === sheet}
              type="button"
              onClick={() => setActive(i)}
              className={cn("shrink-0 rounded-md px-3 py-1 text-[13px]", s === sheet ? "bg-raised font-semibold text-fg shadow-[inset_0_-2px_0_var(--color-accent)]" : "text-fg-muted hover:bg-raised")}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function cellStyle(c: Cell | undefined): CSSProperties {
  const s = c?.s;
  const right = !s?.h && typeof c?.v === "number";
  return {
    fontWeight: s?.b ? 700 : undefined,
    fontStyle: s?.i ? "italic" : undefined,
    textDecoration: [s?.u && "underline", s?.s && "line-through"].filter(Boolean).join(" ") || undefined,
    color: s?.color,
    background: s?.fill,
    fontSize: s?.size ? `${s.size}pt` : undefined,
    fontFamily: s?.font,
    textAlign: s?.h ?? (right ? "right" : undefined),
    verticalAlign: s?.v === "middle" ? "middle" : s?.v === "top" ? "top" : "bottom",
    whiteSpace: s?.wrap ? "pre-wrap" : "nowrap",
    borderTop: s?.border?.t ? `1px solid ${s.border.t}` : undefined,
    borderRight: s?.border?.r ? `1px solid ${s.border.r}` : undefined,
    borderBottom: s?.border?.b ? `1px solid ${s.border.b}` : undefined,
    borderLeft: s?.border?.l ? `1px solid ${s.border.l}` : undefined,
  };
}

function SheetTable({ sheet }: { sheet: Sheet }) {
  const [rowsShown, setRowsShown] = useState(ROW_STEP);
  const [fmt, setFmt] = useState<null | { format: typeof import("@/lib/office/sheets/format").formatValue }>(null);
  useEffect(() => {
    import("@/lib/office/sheets/format").then((m) => setFmt({ format: m.formatValue }));
  }, []);
  const bounds = usedBounds(sheet);
  const totalRows = Math.max(bounds.rows + 1, 1);
  const cols = Math.min(Math.max(bounds.cols + 1, 1), MAX_COLS_SHOWN);
  const rows = Math.min(totalRows, rowsShown);

  // Merged cells: the top-left one spans, the rest are skipped.
  const { spans, covered } = useMemo(() => {
    const spans = new Map<string, { rs: number; cs: number }>();
    const covered = new Set<string>();
    for (const g of sheet.merges) {
      spans.set(`${g.r1},${g.c1}`, { rs: g.r2 - g.r1 + 1, cs: g.c2 - g.c1 + 1 });
      for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) if (r !== g.r1 || c !== g.c1) covered.add(`${r},${c}`);
    }
    return { spans, covered };
  }, [sheet]);

  if (!fmt) return <Loading />;
  if (bounds.rows < 0) return <Center><p className="text-[14px] text-[#555]">This sheet is empty.</p></Center>;
  const show = (c: Cell | undefined) => (c ? (c.e ?? fmt.format(c.v ?? null, c.s?.fmt)) : "");

  return (
    <>
      <table className="border-collapse text-[13px] text-[#111]" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: 44 }} />
          {Array.from({ length: cols }, (_, c) => (
            <col key={c} style={{ width: sheet.cols[c] ?? DEFAULT_COL }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-20 border border-[#d5d9e0] bg-[#f1f3f6]" />
            {Array.from({ length: cols }, (_, c) => (
              <th key={c} scope="col" className="sticky top-0 z-10 border border-[#d5d9e0] bg-[#f1f3f6] px-1 py-0.5 text-center text-[11.5px] font-medium text-[#5b6372]">
                {colName(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r} style={{ height: sheet.rows[r] ?? 22 }}>
              <th scope="row" className="sticky left-0 z-10 border border-[#d5d9e0] bg-[#f1f3f6] px-1 text-center text-[11.5px] font-medium text-[#5b6372]">
                {r + 1}
              </th>
              {Array.from({ length: cols }, (_, c) => {
                const k = `${r},${c}`;
                if (covered.has(k)) return null;
                const cell = sheet.cells[k];
                const span = spans.get(k);
                return (
                  <td key={c} rowSpan={span?.rs} colSpan={span?.cs} className="overflow-hidden text-ellipsis border border-[#e3e6eb] px-1.5" style={cellStyle(cell)}>
                    {show(cell)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {(rows < totalRows || bounds.cols + 1 > MAX_COLS_SHOWN) && (
        <div className="sticky left-0 flex flex-wrap items-center gap-3 bg-[#f7f8fa] px-3 py-3 text-[13px] text-[#444]">
          <span>
            Showing {rows.toLocaleString()} of {totalRows.toLocaleString()} rows{bounds.cols + 1 > MAX_COLS_SHOWN ? ` and the first ${MAX_COLS_SHOWN} columns` : ""}.
          </span>
          {rows < totalRows && (
            <button type="button" onClick={() => setRowsShown((n) => n + ROW_STEP * 4)} className="rounded-md bg-[#1f2430] px-3 py-1.5 font-medium text-white">
              Show more rows
            </button>
          )}
        </div>
      )}
    </>
  );
}

/* ── PowerPoint ────────────────────────────────────────────────── */

export function SlidesView({ file }: { file: File }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const deck = useLoad<{ deck: Deck; warnings: string[]; Thumb: typeof import("../office/slides/SlideView").Thumb }>(
    async (setNote) => {
      const bytes = await officeBytes(file, "pptx", setNote);
      const [{ readPptx }, { Thumb }] = await Promise.all([import("@/lib/office/slides/pptxRead"), import("../office/slides/SlideView")]);
      try {
        const { deck, warnings } = await readPptx(bytes, browserXml);
        return { deck, warnings, Thumb };
      } catch {
        throw new Error("This presentation couldn't be opened. It may be damaged, password protected, or not a PowerPoint file.");
      }
    },
    [file],
  );
  const slideWidth = Math.max(240, Math.min(width - 24, 1100));
  return (
    <div ref={ref} className="min-h-full px-3 py-5">
      {deck.state === "loading" ? (
        <Loading note={deck.note} />
      ) : deck.state === "error" ? (
        <Failed message={deck.message} />
      ) : (
        <>
          <Warnings items={deck.value.warnings} />
          <div className="flex flex-col items-center gap-6">
            {width > 0 &&
              deck.value.deck.slides.map((s, i) => (
                <figure key={s.id} className="m-0">
                  <div className="overflow-hidden rounded-md shadow-[0_12px_40px_-16px_rgb(0_0_0/0.8)]">
                    <deck.value.Thumb slide={s} deck={deck.value.deck} width={slideWidth} />
                  </div>
                  <figcaption className="mt-2 flex gap-3 text-[12px] text-fg-subtle" style={{ width: slideWidth }}>
                    <span className="shrink-0 font-semibold">
                      {i + 1} / {deck.value.deck.slides.length}
                    </span>
                    {s.notes && <span className="whitespace-pre-wrap text-fg-muted">{s.notes}</span>}
                  </figcaption>
                </figure>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Text and Markdown ─────────────────────────────────────────── */

export async function readText(file: File) {
  if (file.size > MAX_TEXT_BYTES) throw new Error(`This file is too large to show here (over ${MAX_TEXT_BYTES / 1024 / 1024} MB).`);
  return (await file.text()).replace(/^﻿/, "");
}

const XML_EXT = new Set(["xml", "svg", "plist", "gpx", "kml", "xsd", "xsl", "rss", "atom"]);

export function TextView({ file }: { file: File }) {
  const isXml = XML_EXT.has(extOf(file.name)) || /xml/.test(file.type);
  const text = useLoad(() => readText(file), [file]);
  const [wrap, setWrap] = useState(true);
  // Minified XML (few line breaks) is indented by default.
  const [pretty, setPretty] = useState<boolean | null>(null);
  const shown = useMemo(() => {
    if (text.state !== "ready") return "";
    const t = text.value;
    const lineCount = t.split("\n").length;
    const on = pretty ?? (isXml && (lineCount <= 2 || t.length / lineCount > 200));
    return isXml && on ? formatXml(t) : t;
  }, [text, pretty, isXml]);
  if (text.state === "loading") return <Loading />;
  if (text.state === "error") return <Failed message={text.message} />;
  const lines = shown ? shown.split("\n").length : 0;
  return (
    <div className="mx-auto max-w-[1100px] px-3 py-5">
      <div className="mb-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[12.5px] text-fg-muted">
        <span className="mr-auto tabular-nums text-fg-subtle">{lines.toLocaleString()} lines</span>
        {isXml && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={pretty ?? shown !== text.value} onChange={(e) => setPretty(e.target.checked)} /> Indent XML
          </label>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} /> Wrap lines
        </label>
      </div>
      <pre className={cn("overflow-auto rounded-xl border border-line bg-surface p-4 font-mono text-[13px] leading-relaxed text-fg", wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre")}>{shown || "(This file is empty.)"}</pre>
    </div>
  );
}

export function MarkdownView({ file }: { file: File }) {
  const html = useLoad(async () => renderSafeMarkdown(await readText(file)), [file]);
  if (html.state === "loading") return <Loading />;
  if (html.state === "error") return <Failed message={html.message} />;
  return (
    <div className="px-3 py-5">
      <article className="rich-text mx-auto max-w-[780px] rounded-xl border border-line bg-surface p-6 text-[15px] leading-relaxed text-fg-muted" dangerouslySetInnerHTML={{ __html: html.value }} />
    </div>
  );
}
