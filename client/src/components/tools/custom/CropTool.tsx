"use client";

import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toToolFile, downloadFile, derived, selectPages, PDF, type ToolFile } from "@/lib/tools/files";
import { openPdf, renderToCanvas } from "@/lib/tools/pdfjs";
import { cropPdf, type CropRect } from "@/lib/tools/processors/crop";
import { Dropzone } from "../Dropzone";
import { PagesField, Segmented } from "../controls";

type Handle = "move" | "nw" | "ne" | "sw" | "se";

export function CropTool() {
  const [file, setFile] = useState<(ToolFile & { pages: number; preview: string; ratio: number }) | null>(null);
  const [rect, setRect] = useState<CropRect>({ x: 0.08, y: 0.08, w: 0.84, h: 0.84 });
  const [scope, setScope] = useState<"all" | "first" | "custom">("all");
  const [pages, setPages] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ handle: Handle; start: CropRect; x: number; y: number } | null>(null);

  const load = async ([f]: File[]) => {
    if (!f) return;
    setError(null);
    setBusy(true);
    try {
      const tf = await toToolFile(f);
      const doc = await openPdf(tf.bytes);
      const canvas = await renderToCanvas(doc, 0, 1.4);
      setFile({ ...tf, pages: doc.numPages, preview: canvas.toDataURL("image/jpeg", 0.85), ratio: canvas.width / canvas.height });
      await doc.destroy();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onPointerDown = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragging.current = { handle, start: rect, x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragging.current;
    const el = box.current;
    if (!d || !el) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - d.x) / r.width;
    const dy = (e.clientY - d.y) / r.height;
    const s = d.start;
    const min = 0.05;
    let { x, y, w, h } = s;
    if (d.handle === "move") {
      x = Math.min(Math.max(0, s.x + dx), 1 - s.w);
      y = Math.min(Math.max(0, s.y + dy), 1 - s.h);
    } else {
      if (d.handle.includes("w")) {
        x = Math.min(Math.max(0, s.x + dx), s.x + s.w - min);
        w = s.x + s.w - x;
      }
      if (d.handle.includes("e")) w = Math.min(Math.max(min, s.w + dx), 1 - s.x);
      if (d.handle.includes("n")) {
        y = Math.min(Math.max(0, s.y + dy), s.y + s.h - min);
        h = s.y + s.h - y;
      }
      if (d.handle.includes("s")) h = Math.min(Math.max(min, s.h + dy), 1 - s.y);
    }
    setRect({ x, y, w, h });
  };

  const save = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const targets = scope === "first" ? [0] : scope === "custom" ? selectPages(pages, file.pages) : undefined;
      downloadFile({ name: derived(file.name, "cropped"), bytes: await cropPdf(file.bytes, rect, targets), type: PDF });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!file) {
    return busy ? (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-fg-muted" aria-label="Loading" />
      </div>
    ) : (
      <Dropzone accept="application/pdf,.pdf" multiple={false} onFiles={load} label="Select PDF file" />
    );
  }

  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
  const handle = (h: Handle, style: React.CSSProperties) => (
    <span
      onPointerDown={onPointerDown(h)}
      className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-white bg-brand-600 shadow"
      style={{ ...style, cursor: `${h}-resize` }}
    />
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex justify-center rounded-2xl bg-sunken p-6">
        <div ref={box} className="relative w-full max-w-[520px] select-none" style={{ aspectRatio: file.ratio }} onPointerMove={onPointerMove} onPointerUp={() => (dragging.current = null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={file.preview} alt="First page" className="absolute inset-0 h-full w-full shadow-md" draggable={false} />
          {/* Shade outside the crop */}
          <div className="pointer-events-none absolute inset-0" style={{ background: "rgb(16 19 26 / 0.45)", clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${pct(rect.y)}, ${pct(rect.x)} ${pct(rect.y)}, ${pct(rect.x)} ${pct(rect.y + rect.h)}, ${pct(rect.x + rect.w)} ${pct(rect.y + rect.h)}, ${pct(rect.x + rect.w)} ${pct(rect.y)}, 0 ${pct(rect.y)})` }} />
          <div
            onPointerDown={onPointerDown("move")}
            className="absolute touch-none cursor-move border-2 border-brand-500"
            style={{ left: pct(rect.x), top: pct(rect.y), width: pct(rect.w), height: pct(rect.h) }}
          />
          {handle("nw", { left: pct(rect.x), top: pct(rect.y) })}
          {handle("ne", { left: pct(rect.x + rect.w), top: pct(rect.y) })}
          {handle("sw", { left: pct(rect.x), top: pct(rect.y + rect.h) })}
          {handle("se", { left: pct(rect.x + rect.w), top: pct(rect.y + rect.h) })}
        </div>
      </div>
      <aside className="h-fit space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
        <p className="text-[13px] leading-relaxed text-fg-muted">Drag the box or its corners. Content outside it is hidden on the cropped pages.</p>
        <Segmented
          label="Quick margins"
          value={-1}
          onChange={(m) => setRect({ x: m, y: m, w: 1 - 2 * m, h: 1 - 2 * m })}
          options={[
            { value: 0.03, label: "3%" },
            { value: 0.06, label: "6%" },
            { value: 0.1, label: "10%" },
          ]}
        />
        <Segmented label="Apply to" value={scope} onChange={setScope} options={[{ value: "all", label: "All pages" }, { value: "first", label: "First page" }, { value: "custom", label: "Choose" }]} />
        {scope === "custom" && <PagesField value={pages} onChange={setPages} />}
        {error && (
          <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
            {error}
          </p>
        )}
        <button type="button" onClick={save} disabled={busy} className="btn inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-medium text-on-accent hover:bg-accent-hover">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />} Crop and download
        </button>
      </aside>
    </div>
  );
}
