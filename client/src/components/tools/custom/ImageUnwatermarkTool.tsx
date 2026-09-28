"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Brush, Download, Eraser, Eye, Loader2, Pipette, RotateCcw, Square, Undo2, Wand2 } from "lucide-react";
import { downloadFile, formatBytes, toToolFile, type ToolFile } from "@/lib/tools/files";
import { decodeImage, exportCanvas, newCanvas, resample } from "@/lib/image/canvas";
import { formatFor, outputName } from "@/lib/image/encode";
import { dilate, maskCount, refineByColor } from "@/lib/image/inpaint";
import type { InpaintJob } from "@/lib/image/inpaint.worker";
import { Dropzone } from "../Dropzone";
import { Segmented, Slider } from "../controls";
import { cn } from "../../ui/primitives";

type Mode = "brush" | "box" | "erase" | "pick";
const MAX_PIXELS = 24_000_000;
const ACCEPT = "image/*,.heic,.heif,.avif";

export function ImageUnwatermarkTool() {
  const [file, setFile] = useState<ToolFile | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [mode, setMode] = useState<Mode>("brush");
  const [brush, setBrush] = useState(28);
  const [tolerance, setTolerance] = useState(10);
  const [method, setMethod] = useState<"patch" | "smooth">("patch");
  const [grow, setGrow] = useState(2);
  const [grain, setGrain] = useState(35);
  const [pick, setPick] = useState<[number, number, number] | null>(null);
  const [masked, setMasked] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [history, setHistory] = useState(0);
  const [note, setNote] = useState<string | null>(null);

  const work = useRef<HTMLCanvasElement | null>(null);
  const original = useRef<HTMLCanvasElement | null>(null);
  const mask = useRef<Uint8Array>(new Uint8Array(0));
  const undo = useRef<ImageData[]>([]);
  const view = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [box, setBoxState] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  // Pointer-up reads the latest box even before React re-renders.
  const boxRef = useRef<typeof box>(null);
  const setBox = (b: typeof box | ((prev: typeof box) => typeof box)) => {
    boxRef.current = typeof b === "function" ? b(boxRef.current) : b;
    setBoxState(boxRef.current);
  };

  const load = async ([f]: File[]) => {
    if (!f) return;
    setError(null);
    setBusy("Opening…");
    try {
      const tf = await toToolFile(f);
      const img = await decodeImage(tf);
      const s = Math.min(1, Math.sqrt(MAX_PIXELS / (img.width * img.height)));
      const c = resample(img.source, { sx: 0, sy: 0, sw: img.width, sh: img.height }, img.width * s, img.height * s);
      img.close();
      setNote(s < 1 ? `Very large image: working at ${c.width} × ${c.height} px.` : null);
      work.current = c;
      const o = newCanvas(c.width, c.height);
      o.getContext("2d")!.drawImage(c, 0, 0);
      original.current = o;
      mask.current = new Uint8Array(c.width * c.height);
      undo.current = [];
      setHistory(0);
      setMasked(0);
      setPick(null);
      setSize({ w: c.width, h: c.height });
      setFile(tf);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  // Fit the view to the available width.
  const fit = useCallback(() => {
    const el = view.current?.parentElement;
    if (!el || !size.w) return;
    const s = Math.min(1, (el.clientWidth - 2) / size.w, (window.innerHeight * 0.68) / size.h);
    setScale(s);
  }, [size]);
  useEffect(() => {
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit]);

  const redraw = useCallback(() => {
    const v = view.current;
    const o = overlay.current;
    if (!v || !o || !work.current) return;
    const w = Math.max(1, Math.round(size.w * scale));
    const h = Math.max(1, Math.round(size.h * scale));
    v.width = o.width = w;
    v.height = o.height = h;
    const ctx = v.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(comparing && original.current ? original.current : work.current, 0, 0, w, h);
    // Mask overlay, sampled down to the view size.
    const oc = o.getContext("2d")!;
    const img = oc.createImageData(w, h);
    const m = mask.current;
    for (let y = 0; y < h; y++) {
      const sy = Math.min(size.h - 1, Math.floor(y / scale));
      for (let x = 0; x < w; x++) {
        if (m[sy * size.w + Math.min(size.w - 1, Math.floor(x / scale))]) {
          const k = (y * w + x) * 4;
          img.data[k] = 239;
          img.data[k + 1] = 68;
          img.data[k + 2] = 68;
          img.data[k + 3] = comparing ? 0 : 130;
        }
      }
    }
    oc.putImageData(img, 0, 0);
  }, [size, scale, comparing]);
  useEffect(() => redraw(), [redraw, history]);

  /** Paint (or erase) a disc into the full-size mask and onto the overlay. */
  const stamp = (vx: number, vy: number, on: boolean) => {
    const r = brush / 2 / scale;
    const cx = vx / scale;
    const cy = vy / scale;
    const m = mask.current;
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(size.h - 1, Math.ceil(cy + r)); y++) {
      const dy = y - cy;
      const half = Math.sqrt(Math.max(0, r * r - dy * dy));
      const x0 = Math.max(0, Math.floor(cx - half));
      const x1 = Math.min(size.w - 1, Math.ceil(cx + half));
      m.fill(on ? 1 : 0, y * size.w + x0, y * size.w + x1 + 1);
    }
    const oc = overlay.current?.getContext("2d");
    if (oc) {
      oc.save();
      oc.globalCompositeOperation = on ? "source-over" : "destination-out";
      oc.fillStyle = "rgba(239,68,68,0.51)";
      oc.beginPath();
      oc.arc(vx, vy, brush / 2, 0, Math.PI * 2);
      oc.fill();
      oc.restore();
    }
  };

  const local = (e: React.PointerEvent) => {
    const r = overlay.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onDown = (e: React.PointerEvent) => {
    if (busy) return;
    const p = local(e);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    if (mode === "pick") {
      // Average a 3×3 patch of the real image.
      const x = Math.round(p.x / scale);
      const y = Math.round(p.y / scale);
      const d = work.current!.getContext("2d")!.getImageData(Math.max(0, x - 1), Math.max(0, y - 1), 3, 3).data;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let i = 0; i < d.length; i += 4) {
        r += d[i];
        g += d[i + 1];
        b += d[i + 2];
      }
      const n = d.length / 4;
      setPick([Math.round(r / n), Math.round(g / n), Math.round(b / n)]);
      setMode("brush");
      return;
    }
    drag.current = p;
    if (mode === "box") setBox({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    else stamp(p.x, p.y, mode === "brush");
  };

  const onMove = (e: React.PointerEvent) => {
    const last = drag.current;
    if (!last) return;
    const p = local(e);
    if (mode === "box") return setBox((b) => (b ? { ...b, x1: p.x, y1: p.y } : b));
    // Fill the gap between pointer events.
    const steps = Math.max(1, Math.ceil(Math.hypot(p.x - last.x, p.y - last.y) / Math.max(2, brush / 4)));
    for (let i = 1; i <= steps; i++) stamp(last.x + ((p.x - last.x) * i) / steps, last.y + ((p.y - last.y) * i) / steps, mode === "brush");
    drag.current = p;
  };

  const onUp = () => {
    const box = boxRef.current;
    if (mode === "box" && box) {
      const x0 = Math.max(0, Math.floor(Math.min(box.x0, box.x1) / scale));
      const x1 = Math.min(size.w - 1, Math.ceil(Math.max(box.x0, box.x1) / scale));
      const y0 = Math.max(0, Math.floor(Math.min(box.y0, box.y1) / scale));
      const y1 = Math.min(size.h - 1, Math.ceil(Math.max(box.y0, box.y1) / scale));
      for (let y = y0; y <= y1; y++) mask.current.fill(1, y * size.w + x0, y * size.w + x1 + 1);
      setBox(null);
      redraw();
    }
    drag.current = null;
    setMasked(maskCount(mask.current));
  };

  const clearMask = () => {
    mask.current.fill(0);
    setMasked(0);
    redraw();
  };

  const refine = () => {
    if (!pick || !work.current) return;
    const data = work.current.getContext("2d")!.getImageData(0, 0, size.w, size.h).data;
    mask.current = refineByColor(data, size.w, size.h, mask.current, pick, tolerance, 1);
    const n = maskCount(mask.current);
    setMasked(n);
    redraw();
    if (!n) setError("No pixels of that colour inside the painted area. Raise the tolerance or pick the colour again.");
    else setError(null);
  };

  const remove = async () => {
    if (!masked || !work.current) return;
    setError(null);
    setBusy("Filling in…");
    await new Promise((r) => setTimeout(r, 30));
    try {
      const ctx = work.current.getContext("2d", { willReadFrequently: true })!;
      const img = ctx.getImageData(0, 0, size.w, size.h);
      undo.current = [...undo.current.slice(-3), new ImageData(new Uint8ClampedArray(img.data), size.w, size.h)];
      const m = dilate(mask.current, size.w, size.h, grow);
      // Bigger holes need a wider neighbourhood (smooth fill).
      const radius = Math.max(4, Math.min(12, Math.round(Math.sqrt(maskCount(m) / Math.max(1, size.w * size.h)) * 60)));
      const pixels = await new Promise<Uint8ClampedArray>((resolve, reject) => {
        const worker = new Worker(new URL("../../../lib/image/inpaint.worker.ts", import.meta.url));
        worker.onmessage = (ev: MessageEvent<{ progress?: number; pixels?: Uint8ClampedArray; error?: string }>) => {
          if (ev.data.progress !== undefined) return setBusy(`Filling in… ${Math.round(ev.data.progress * 100)}%`);
          worker.terminate();
          if (ev.data.pixels) resolve(ev.data.pixels);
          else reject(new Error(ev.data.error ?? "Filling failed."));
        };
        worker.onerror = (err) => {
          worker.terminate();
          reject(new Error(err.message || "Filling failed."));
        };
        const job: InpaintJob = { pixels: new Uint8ClampedArray(img.data), width: size.w, height: size.h, mask: m, method, radius, grain: grain / 100 };
        worker.postMessage(job, [job.pixels.buffer, job.mask.buffer]);
      });
      ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels), size.w, size.h), 0, 0);
      mask.current.fill(0);
      setMasked(0);
      setHistory((h) => h + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const stepBack = () => {
    const prev = undo.current.pop();
    if (!prev || !work.current) return;
    work.current.getContext("2d")!.putImageData(prev, 0, 0);
    setHistory((h) => h + 1);
  };

  const download = async () => {
    if (!file || !work.current) return;
    setBusy("Saving…");
    try {
      const format = formatFor(file.type);
      const out = await exportCanvas(work.current, outputName(file.name, format, "clean"), { format, quality: 0.95 });
      downloadFile(out);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  // Shortcuts: [ ] brush size, Ctrl+Z undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      if (e.key === "[") setBrush((b) => Math.max(4, b - 4));
      else if (e.key === "]") setBrush((b) => Math.min(200, b + 4));
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        stepBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!file) {
    return (
      <div>
        {busy ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-ink-soft" aria-label="Loading" />
          </div>
        ) : (
          <Dropzone accept={ACCEPT} multiple={false} onFiles={load} label="Select image" />
        )}
        {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-center text-[13px] text-red-700">{error}</p>}
        <p className="mt-4 text-center text-[12px] text-ink-soft">For photos and images you own or have permission to edit.</p>
      </div>
    );
  }

  const ToolBtn = ({ m, label, icon }: { m: Mode; label: string; icon: React.ReactNode }) => (
    <button type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={cn("flex h-10 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] ring-1", mode === m ? "bg-brand-50 text-brand-700 ring-brand-500" : "ring-rule hover:bg-paper")}>
      {icon}
      {label}
    </button>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-2">
        <p className="text-[13px] text-ink-soft">
          <span className="font-medium text-ink">{file.name}</span> · {size.w} × {size.h} px · {formatBytes(file.bytes.length)}
          {note && <span className="ml-2 text-amber-700">{note}</span>}
        </p>
        <div className="flex justify-center rounded-2xl bg-[repeating-conic-gradient(#ebe8e1_0%_25%,#f6f4ef_0%_50%)] bg-[length:20px_20px] p-3">
          <div className="relative" style={{ width: Math.round(size.w * scale), height: Math.round(size.h * scale) }}>
            <canvas ref={view} className="absolute inset-0 block" aria-label="Image" />
            <canvas
              ref={overlay}
              className="absolute inset-0 block touch-none"
              style={{ cursor: mode === "pick" ? "crosshair" : mode === "box" ? "crosshair" : "none" }}
              onPointerDown={onDown}
              onPointerMove={(e) => {
                onMove(e);
                const c = document.getElementById("fo-brush-cursor");
                if (c && (mode === "brush" || mode === "erase")) {
                  const p = local(e);
                  c.style.transform = `translate(${p.x - brush / 2}px, ${p.y - brush / 2}px)`;
                  c.style.display = "block";
                }
              }}
              onPointerLeave={() => {
                const c = document.getElementById("fo-brush-cursor");
                if (c) c.style.display = "none";
              }}
              onPointerUp={onUp}
            />
            {(mode === "brush" || mode === "erase") && <div id="fo-brush-cursor" className="pointer-events-none absolute left-0 top-0 hidden rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]" style={{ width: brush, height: brush }} />}
            {box && <div className="pointer-events-none absolute border-2 border-dashed border-red-500 bg-red-500/20" style={{ left: Math.min(box.x0, box.x1), top: Math.min(box.y0, box.y1), width: Math.abs(box.x1 - box.x0), height: Math.abs(box.y1 - box.y0) }} />}
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                <Loader2 className="h-7 w-7 animate-spin text-ink" aria-label={busy} />
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl bg-white p-5 ring-1 ring-ink/10 lg:sticky lg:top-24">
        <ol className="list-decimal space-y-1 pl-4 text-[13px] text-ink-soft">
          <li>Paint over the watermark (it turns red).</li>
          <li>Optional: pick its colour to select just the mark.</li>
          <li>Press Remove. Repeat for any leftovers.</li>
        </ol>
        <div className="grid grid-cols-4 gap-1.5">
          <ToolBtn m="brush" label="Brush" icon={<Brush className="h-4 w-4" />} />
          <ToolBtn m="box" label="Box" icon={<Square className="h-4 w-4" />} />
          <ToolBtn m="erase" label="Erase" icon={<Eraser className="h-4 w-4" />} />
          <ToolBtn m="pick" label="Colour" icon={<Pipette className="h-4 w-4" />} />
        </div>
        <Slider label="Brush size" value={brush} onChange={setBrush} min={4} max={200} format={(v) => `${v}px`} />
        {pick && (
          <div className="space-y-2 rounded-lg bg-paper px-3 py-2.5">
            <div className="flex items-center gap-2 text-[13px]">
              <span className="h-5 w-5 rounded ring-1 ring-ink/20" style={{ background: `rgb(${pick.join(",")})` }} /> Watermark colour
            </div>
            <Slider label="Tolerance" value={tolerance} onChange={setTolerance} min={2} max={60} format={(v) => `${v}%`} />
            <button type="button" onClick={refine} disabled={!masked} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[13px] ring-1 ring-rule hover:bg-white disabled:opacity-40">
              <Wand2 className="h-4 w-4" aria-hidden="true" /> Keep only this colour in the red area
            </button>
          </div>
        )}
        <Segmented
          label="Fill"
          value={method}
          onChange={setMethod}
          options={[
            { value: "patch", label: "Smart", hint: "Copies nearby texture" },
            { value: "smooth", label: "Smooth", hint: "Blends colours" },
          ]}
        />
        <details className="text-[13px]">
          <summary className="cursor-pointer text-ink-soft">Fine-tune</summary>
          <div className="mt-3 space-y-3">
            <Slider label="Cover edges" value={grow} onChange={setGrow} min={0} max={6} format={(v) => `${v}px`} />
            {method === "smooth" && <Slider label="Texture" value={grain} onChange={setGrain} min={0} max={100} format={(v) => `${v}%`} />}
          </div>
        </details>
        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>}
        <button type="button" onClick={remove} disabled={!masked || !!busy} className="btn inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 text-[15px] font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wand2 className="h-4 w-4" aria-hidden="true" />}
          {busy ?? (masked ? "Remove" : "Paint over the watermark first")}
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={stepBack} disabled={!undo.current.length} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] ring-1 ring-rule hover:bg-paper disabled:opacity-40">
            <Undo2 className="h-4 w-4" aria-hidden="true" /> Undo
          </button>
          <button type="button" onClick={clearMask} disabled={!masked} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] ring-1 ring-rule hover:bg-paper disabled:opacity-40">
            Clear red
          </button>
          <button
            type="button"
            onPointerDown={() => setComparing(true)}
            onPointerUp={() => setComparing(false)}
            onPointerLeave={() => setComparing(false)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] ring-1 ring-rule hover:bg-paper"
            title="Hold to see the original"
          >
            <Eye className="h-4 w-4" aria-hidden="true" /> Hold to compare
          </button>
        </div>
        <button type="button" onClick={download} disabled={!!busy} className="btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 text-[14px] font-medium text-white hover:bg-emerald-700">
          <Download className="h-4 w-4" aria-hidden="true" /> Download image
        </button>
        <button type="button" onClick={() => setFile(null)} className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Another image
        </button>
        <p className="text-[12px] leading-relaxed text-ink-soft">Works best on marks over plain or gently textured areas. Only use it on images you own or have permission to edit.</p>
      </aside>
    </div>
  );
}
