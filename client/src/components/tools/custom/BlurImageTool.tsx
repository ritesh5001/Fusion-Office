"use client";

/**
 * Blur, pixelate or black out parts of a photo: faces, number plates, account
 * numbers, addresses. Drag boxes on the preview; the full-size image is
 * processed on this device.
 */
import { useEffect, useRef, useState } from "react";
import { Download, Loader2, RotateCcw, Undo2 } from "lucide-react";
import { downloadFile, toToolFile, type ToolFile } from "@/lib/tools/files";
import { formatFor, outputName } from "@/lib/image/encode";
import type { FracRect } from "@/lib/image/geometry";
import { Dropzone } from "../Dropzone";
import { Segmented, Slider } from "../controls";

type Mode = "blur" | "pixelate" | "box";

/** Apply the effect to every box on a full-size canvas. */
export function applyBoxes(canvas: HTMLCanvasElement, boxes: FracRect[], mode: Mode, strength: number) {
  const c = canvas.getContext("2d")!;
  const W = canvas.width;
  const H = canvas.height;
  for (const b of boxes) {
    const x = Math.round(b.x * W);
    const y = Math.round(b.y * H);
    const w = Math.max(1, Math.round(b.w * W));
    const h = Math.max(1, Math.round(b.h * H));
    if (mode === "box") {
      c.fillStyle = "#000";
      c.fillRect(x, y, w, h);
      continue;
    }
    const scale = Math.max(W, H) / 1000;
    if (mode === "pixelate") {
      const cell = Math.max(4, Math.round(strength * 0.6 * scale));
      const tw = Math.max(1, Math.round(w / cell));
      const th = Math.max(1, Math.round(h / cell));
      const tmp = document.createElement("canvas");
      tmp.width = tw;
      tmp.height = th;
      tmp.getContext("2d")!.drawImage(canvas, x, y, w, h, 0, 0, tw, th);
      c.save();
      c.imageSmoothingEnabled = false;
      c.drawImage(tmp, 0, 0, tw, th, x, y, w, h);
      c.restore();
    } else {
      // Blur a slightly larger patch and clip it, so the edges blur too; a few passes so it can't be undone by sharpening.
      const pad = Math.round(strength * scale * 2);
      const tmp = document.createElement("canvas");
      tmp.width = w + pad * 2;
      tmp.height = h + pad * 2;
      const t = tmp.getContext("2d")!;
      t.drawImage(canvas, x - pad, y - pad, tmp.width, tmp.height, 0, 0, tmp.width, tmp.height);
      for (let i = 0; i < 3; i++) {
        t.filter = `blur(${Math.max(2, strength * scale * 0.5)}px)`;
        t.drawImage(tmp, 0, 0);
      }
      c.drawImage(tmp, pad, pad, w, h, x, y, w, h);
    }
  }
}

export function BlurImageTool() {
  const [file, setFile] = useState<(ToolFile & { url: string; width: number; height: number }) | null>(null);
  const [boxes, setBoxes] = useState<FracRect[]>([]);
  const [draft, setDraft] = useState<FracRect | null>(null);
  const [mode, setMode] = useState<Mode>("blur");
  const [strength, setStrength] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  // The box being drawn, also kept outside React state: pointerup can arrive before the last move has rendered.
  const drawing = useRef<FracRect | null>(null);
  const preview = useRef<HTMLCanvasElement>(null);

  useEffect(
    () => () => {
      if (file?.url) URL.revokeObjectURL(file.url);
    },
    [file],
  );

  const load = async ([f]: File[]) => {
    if (!f) return;
    setError(null);
    setBusy(true);
    try {
      const tf = await toToolFile(f);
      const { decodeImage, render, EMPTY_EDIT } = await import("@/lib/image/canvas");
      const img = await decodeImage(tf);
      // A preview the browser can always show (HEIC and TIFF included).
      const small = render(img, EMPTY_EDIT, { maxSide: 1600 });
      const blob = await new Promise<Blob | null>((r) => small.toBlob(r, "image/jpeg", 0.9));
      setFile({ ...tf, url: URL.createObjectURL(blob!), width: img.width, height: img.height });
      img.close();
      setBoxes([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Live preview of the effect on the preview image.
  useEffect(() => {
    const cv = preview.current;
    if (!cv || !file) return;
    const img = new Image();
    img.onload = () => {
      cv.width = img.naturalWidth;
      cv.height = img.naturalHeight;
      cv.getContext("2d")!.drawImage(img, 0, 0);
      // Strength is relative to the image size, so the preview matches the full-size result.
      applyBoxes(cv, boxes, mode, strength);
    };
    img.src = file.url;
  }, [file, boxes, mode, strength]);

  const point = (e: React.PointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const down = (e: React.PointerEvent) => {
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      /* capture isn't available for this pointer; dragging still works inside the image */
    }
    start.current = point(e);
    drawing.current = { ...start.current, w: 0, h: 0 };
    setDraft(drawing.current);
  };
  const move = (e: React.PointerEvent) => {
    if (!start.current) return;
    const p = point(e);
    drawing.current = { x: Math.min(p.x, start.current.x), y: Math.min(p.y, start.current.y), w: Math.abs(p.x - start.current.x), h: Math.abs(p.y - start.current.y) };
    setDraft(drawing.current);
  };
  const up = () => {
    const box = drawing.current;
    if (box && box.w > 0.01 && box.h > 0.01) setBoxes((b) => [...b, box]);
    start.current = null;
    drawing.current = null;
    setDraft(null);
  };

  const save = async () => {
    if (!file || !boxes.length) return;
    setBusy(true);
    setError(null);
    try {
      const { decodeImage, render, exportCanvas, EMPTY_EDIT } = await import("@/lib/image/canvas");
      const img = await decodeImage(file);
      const canvas = render(img, EMPTY_EDIT);
      img.close();
      applyBoxes(canvas, boxes, mode, strength);
      const format = formatFor(file.type);
      downloadFile(await exportCanvas(canvas, outputName(file.name, format, mode === "box" ? "redacted" : "blurred"), { format, quality: 0.92 }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!file)
    return (
      <div className="space-y-3">
        {busy ? (
          <div className="card flex items-center justify-center gap-2 py-16 text-fg-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Opening the image…
          </div>
        ) : (
          <Dropzone accept="image/*,.heic,.heif,.avif,.tif,.tiff" multiple={false} onFiles={load} label="Choose an image" />
        )}
        {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-300">{error}</p>}
      </div>
    );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <div
          ref={area}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className="relative mx-auto w-fit max-w-full cursor-crosshair touch-none select-none overflow-hidden rounded-xl ring-1 ring-line"
        >
          <canvas ref={preview} className="block max-h-[70vh] max-w-full" aria-label="Image preview. Drag to mark areas to hide." />
          {[...boxes, ...(draft ? [draft] : [])].map((b, i) => (
            <div key={i} className="pointer-events-none absolute border-2 border-dashed border-accent" style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }} />
          ))}
        </div>
        <p className="mt-2 text-center text-[12px] text-fg-muted">Drag over each face, number or detail to hide. {boxes.length ? `${boxes.length} area${boxes.length === 1 ? "" : "s"} marked.` : ""}</p>
      </div>
      <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-24">
        <Segmented
          label="Hide with"
          value={mode}
          onChange={setMode}
          options={[
            { value: "blur", label: "Blur" },
            { value: "pixelate", label: "Pixelate" },
            { value: "box", label: "Black box", hint: "Safest for numbers" },
          ]}
        />
        {mode !== "box" && <Slider label="Strength" value={strength} min={6} max={50} onChange={setStrength} format={(v) => (v < 15 ? "Light" : v < 30 ? "Strong" : "Very strong")} />}
        <div className="flex gap-2">
          <button type="button" disabled={!boxes.length} onClick={() => setBoxes((b) => b.slice(0, -1))} className="btn btn-ghost btn-sm disabled:opacity-40">
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </button>
          <button type="button" disabled={!boxes.length} onClick={() => setBoxes([])} className="btn btn-ghost btn-sm disabled:opacity-40">
            Clear
          </button>
          <button type="button" onClick={() => setFile(null)} className="btn btn-ghost btn-sm ml-auto">
            <RotateCcw className="h-3.5 w-3.5" /> New image
          </button>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-300">{error}</p>}
        <button type="button" disabled={!boxes.length || busy} onClick={save} className="btn btn-primary btn-lg w-full disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download image
        </button>
        <p className="text-[12px] leading-relaxed text-fg-muted">
          Done on your device at full resolution ({file.width} × {file.height}). For card and account numbers, a black box can&apos;t be reversed; strong blur is fine for faces.
        </p>
      </aside>
    </div>
  );
}
