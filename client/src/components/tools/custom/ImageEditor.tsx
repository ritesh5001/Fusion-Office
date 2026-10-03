"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, Crop, Download, FlipHorizontal2, FlipVertical2, ImagePlus, Italic, Loader2, Palette, Plus, Redo2,
  RotateCcw, RotateCw, SlidersHorizontal, Trash2, Type, Undo2, Wand2,
} from "lucide-react";
import { downloadFile, formatBytes, toToolFile, type ToolFile } from "@/lib/tools/files";
import { FORMAT_INFO, formatFor, outputName, parseSize, type Format } from "@/lib/image/encode";
import { centeredCrop, clampRect, cropPixels, resizeDims, turned, type FracRect, type Size } from "@/lib/image/geometry";
import { FILTERS, NO_ADJUSTMENTS, type Adjustments } from "@/lib/image/pixels";
import {
  adjust, copyCanvas, crop, decodeImage, drawTexts, EMPTY_EDIT, editedSize, exportCanvas, flipTransform, fontCss, FONTS, orient,
  previewOf, render, resample, rotateTransform, type Decoded, type EditState, type TextLayer,
} from "@/lib/image/canvas";
import { Dropzone } from "../Dropzone";
import { NumberField, Segmented, Slider, Toggle } from "../controls";
import { Chips, TargetSize } from "../imageSpecs";
import { cn } from "../../ui/primitives";

type Panel = "crop" | "adjust" | "filters" | "text" | "save";
type Handle = "move" | "nw" | "ne" | "sw" | "se";

const PREVIEW_MAX = 1600;
const ACCEPT = "image/*,.heic,.heif,.avif";

const PANELS: { id: Panel; label: string; icon: ReactNode }[] = [
  { id: "crop", label: "Crop", icon: <Crop className="h-4 w-4" /> },
  { id: "adjust", label: "Adjust", icon: <SlidersHorizontal className="h-4 w-4" /> },
  { id: "filters", label: "Filters", icon: <Wand2 className="h-4 w-4" /> },
  { id: "text", label: "Text", icon: <Type className="h-4 w-4" /> },
  { id: "save", label: "Resize & save", icon: <Download className="h-4 w-4" /> },
];

const ASPECTS: { id: string; label: string; ratio: number | null }[] = [
  { id: "free", label: "Free", ratio: null },
  { id: "1:1", label: "Square", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:2", label: "3:2", ratio: 3 / 2 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
  { id: "passport", label: "Passport 35×45", ratio: 35 / 45 },
];

const ADJUST_SLIDERS: { key: keyof Adjustments; label: string; min: number }[] = [
  { key: "exposure", label: "Exposure", min: -100 },
  { key: "brightness", label: "Brightness", min: -100 },
  { key: "contrast", label: "Contrast", min: -100 },
  { key: "highlights", label: "Highlights", min: -100 },
  { key: "shadows", label: "Shadows", min: -100 },
  { key: "saturation", label: "Saturation", min: -100 },
  { key: "warmth", label: "Warmth", min: -100 },
  { key: "vignette", label: "Vignette", min: 0 },
  { key: "sharpen", label: "Sharpen", min: 0 },
  { key: "blur", label: "Blur", min: 0 },
];

const SWATCHES = ["#ffffff", "#111111", "#ef4444", "#f59e0b", "#facc15", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

let seq = 0;

// ─── Undo / redo ────────────────────────────────────────────────────

/** State with undo history. Rapid changes (slider drags) settle into one step. */
function useHistory<T>(initial: T) {
  const [state, setState] = useState(initial);
  const [, bump] = useState(0);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const committed = useRef(initial);

  useEffect(() => {
    if (state === committed.current) return;
    const id = setTimeout(() => {
      past.current = [...past.current.slice(-60), committed.current];
      future.current = [];
      committed.current = state;
      bump((n) => n + 1);
    }, 350);
    return () => clearTimeout(id);
  }, [state]);

  const flush = () => {
    if (state !== committed.current) {
      past.current = [...past.current, committed.current];
      future.current = [];
      committed.current = state;
    }
  };
  const undo = () => {
    flush();
    const prev = past.current.pop();
    if (prev === undefined) return;
    future.current.push(committed.current);
    committed.current = prev;
    setState(prev);
    bump((n) => n + 1);
  };
  const redo = () => {
    const next = future.current.pop();
    if (next === undefined) return;
    past.current.push(committed.current);
    committed.current = next;
    setState(next);
    bump((n) => n + 1);
  };
  const reset = (value: T) => {
    past.current = [];
    future.current = [];
    committed.current = value;
    setState(value);
  };
  return { state, set: setState, undo, redo, reset, canUndo: past.current.length > 0 || state !== committed.current, canRedo: future.current.length > 0 };
}

// ─── Editor ─────────────────────────────────────────────────────────

export function ImageEditor({ mode = "editor" }: { mode?: "editor" | "crop" }) {
  const cropOnly = mode === "crop";
  const panels = cropOnly ? PANELS.filter((p) => p.id === "crop" || p.id === "save") : PANELS;
  const [file, setFile] = useState<ToolFile | null>(null);
  const [img, setImg] = useState<Decoded | null>(null);
  const [preview, setPreview] = useState<Decoded | null>(null);
  const history = useHistory<EditState>(EMPTY_EDIT);
  const edit = history.state;
  const t = edit.transform;
  const setEdit = history.set;
  const [panel, setPanel] = useState<Panel>("crop");
  const [aspect, setAspect] = useState("free");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      setError(null);
      setLoading(true);
      try {
        const tf = await toToolFile(f);
        const decoded = await decodeImage(tf);
        setFile(tf);
        setImg((old) => (old?.close(), decoded));
        setPreview(previewOf(decoded, PREVIEW_MAX));
        history.reset(cropOnly ? { ...EMPTY_EDIT, transform: { ...EMPTY_EDIT.transform, crop: { x: 0.05, y: 0.05, w: 0.9, h: 0.9 } } } : EMPTY_EDIT);
        setPanel(cropOnly ? "crop" : "adjust");
        setAspect("free");
        setSelected(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cropOnly],
  );

  // Paste an image from the clipboard.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.files ?? [])].find((x) => x.type.startsWith("image/"));
      if (item) load([item]);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [load]);

  const cropping = panel === "crop";
  const orientedSize = img ? turned(img, t.quarter) : null;

  // Preview pipeline: orient (cheap, on the small copy) → crop → adjust → text.
  const oriented = useMemo(
    () => (preview ? orient(preview, { ...t, crop: null }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preview, t.quarter, t.flipH, t.flipV, t.straighten],
  );
  const adjustDeferred = useDeferredValue(edit.adjust);
  const filterDeferred = useDeferredValue(edit.filter);
  const adjusted = useMemo(() => {
    if (!oriented) return null;
    const base = copyCanvas(cropping ? oriented : crop(oriented, t.crop));
    return adjust(base, adjustDeferred, filterDeferred);
  }, [oriented, cropping, t.crop, adjustDeferred, filterDeferred]);

  const display = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = display.current;
    if (!c || !adjusted) return;
    c.width = adjusted.width;
    c.height = adjusted.height;
    c.getContext("2d")!.drawImage(adjusted, 0, 0);
    if (!cropping) drawTexts(c, edit.texts);
  }, [adjusted, edit.texts, cropping]);

  // Filter thumbnails from the current (cropped) picture.
  const filterThumbs = useMemo(() => {
    if (!oriented || panel !== "filters") return null;
    const base = crop(oriented, t.crop);
    const s = 96 / Math.max(base.width, base.height);
    const small = resample(base, { sx: 0, sy: 0, sw: base.width, sh: base.height }, base.width * s, base.height * s);
    return FILTERS.map((f) => ({ ...f, url: adjust(copyCanvas(small), NO_ADJUSTMENTS, f.id).toDataURL("image/jpeg", 0.8) }));
  }, [oriented, t.crop, panel]);

  // Keyboard: undo/redo, delete selected text.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea, select");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected && !typing) {
        e.preventDefault();
        setEdit((s) => ({ ...s, texts: s.texts.filter((x) => x.id !== selected) }));
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!img || !file || !orientedSize) {
    return (
      <div>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-fg-muted" aria-label="Loading image" />
          </div>
        ) : (
          <Dropzone accept={ACCEPT} multiple={false} onFiles={load} label="Select image" />
        )}
        <p className="mt-3 text-center text-[13px] text-fg-muted">JPG, PNG, WEBP, GIF, AVIF, SVG or HEIC. You can also paste an image.</p>
        {error && (
          <p role="alert" className="mt-4 rounded-md bg-red-500/10 px-3 py-2 text-center text-[13px] text-red-300">
            {error}
          </p>
        )}
      </div>
    );
  }

  const size = editedSize(img, t);
  const updateText = (id: string, patch: Partial<TextLayer>) => setEdit((s) => ({ ...s, texts: s.texts.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const setCrop = (r: FracRect | null) => setEdit((s) => ({ ...s, transform: { ...s.transform, crop: r } }));
  const ratio = ASPECTS.find((a) => a.id === aspect)?.ratio ?? null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto min-w-0 truncate text-[13px] text-fg-muted">
            <span className="font-medium text-fg">{file.name}</span> · {size.width} × {size.height} px
          </span>
          <ToolbarBtn label="Undo (Ctrl+Z)" onClick={history.undo} disabled={!history.canUndo}>
            <Undo2 className="h-4 w-4" />
          </ToolbarBtn>
          <ToolbarBtn label="Redo (Ctrl+Shift+Z)" onClick={history.redo} disabled={!history.canRedo}>
            <Redo2 className="h-4 w-4" />
          </ToolbarBtn>
          <button type="button" onClick={() => (setEdit(EMPTY_EDIT), setSelected(null))} className="h-9 rounded-full px-3 text-[13px] ring-1 ring-line-strong hover:bg-raised">
            Reset all
          </button>
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] ring-1 ring-line-strong hover:bg-raised">
            <ImagePlus className="h-4 w-4" aria-hidden="true" /> Open another
            <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => e.target.files && load([...e.target.files])} />
          </label>
        </div>

        <div className="flex min-h-[420px] items-center justify-center rounded-2xl bg-[repeating-conic-gradient(#1a1e27_0%_25%,#12151c_0%_50%)] bg-[length:20px_20px] p-4 md:p-8">
          <Stage
            canvasRef={display}
            cropping={cropping}
            rect={t.crop ?? { x: 0, y: 0, w: 1, h: 1 }}
            onCrop={setCrop}
            ratio={ratio ? (ratio * orientedSize.height) / orientedSize.width : null}
            texts={panel === "text" ? edit.texts : []}
            selected={selected}
            onSelect={setSelected}
            onMoveText={(id, x, y) => updateText(id, { x, y })}
          />
        </div>
        {cropping && t.crop && (
          <p className="text-center text-[12px] text-fg-muted">
            Crop: {cropPixels(orientedSize, t.crop).width} × {cropPixels(orientedSize, t.crop).height} px · drag the box or its corners
          </p>
        )}
      </div>

      <aside className="h-fit rounded-2xl bg-surface ring-1 ring-line lg:sticky lg:top-24">
        <div role="tablist" aria-label="Editor panels" className="grid border-b border-line" style={{ gridTemplateColumns: `repeat(${panels.length}, minmax(0, 1fr))` }}>
          {panels.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={panel === p.id}
              onClick={() => setPanel(p.id)}
              className={cn("flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] transition-colors", panel === p.id ? "text-brand-300 shadow-[inset_0_-2px_0] shadow-brand-600" : "text-fg-muted hover:text-fg")}
            >
              {p.icon}
              {p.id === "save" && !cropOnly ? "Save" : p.label}
            </button>
          ))}
        </div>
        <div className="thin-scroll max-h-[calc(100dvh-220px)] space-y-4 overflow-y-auto p-5">
          {panel === "crop" && (
            <>
              <fieldset>
                <legend className="mb-1.5 text-[13px] font-medium">Shape</legend>
                <div className="flex flex-wrap gap-1.5">
                  {ASPECTS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      aria-pressed={aspect === a.id}
                      onClick={() => {
                        setAspect(a.id);
                        if (a.ratio) setCrop(centeredCrop(orientedSize, a.ratio, 0.9));
                      }}
                      className={cn("h-8 rounded-full px-3 text-[12px] ring-1", aspect === a.id ? "bg-brand-500/15 font-medium text-brand-300 ring-brand-500" : "bg-sunken ring-line-strong hover:ring-line-strong")}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div>
                <p className="mb-1.5 text-[13px] font-medium">Rotate and flip</p>
                <div className="grid grid-cols-4 gap-1.5">
                  <PanelBtn label="Rotate left" onClick={() => setEdit((s) => ({ ...s, transform: rotateTransform(s.transform, false) }))}>
                    <RotateCcw className="h-4 w-4" />
                  </PanelBtn>
                  <PanelBtn label="Rotate right" onClick={() => setEdit((s) => ({ ...s, transform: rotateTransform(s.transform, true) }))}>
                    <RotateCw className="h-4 w-4" />
                  </PanelBtn>
                  <PanelBtn label="Flip horizontally" onClick={() => setEdit((s) => ({ ...s, transform: flipTransform(s.transform, true) }))}>
                    <FlipHorizontal2 className="h-4 w-4" />
                  </PanelBtn>
                  <PanelBtn label="Flip vertically" onClick={() => setEdit((s) => ({ ...s, transform: flipTransform(s.transform, false) }))}>
                    <FlipVertical2 className="h-4 w-4" />
                  </PanelBtn>
                </div>
              </div>
              <Slider label="Straighten" value={t.straighten} onChange={(straighten) => setEdit((s) => ({ ...s, transform: { ...s.transform, straighten } }))} min={-45} max={45} step={0.5} format={(v) => `${v > 0 ? "+" : ""}${v}°`} />
              <button
                type="button"
                onClick={() => {
                  setAspect("free");
                  setEdit((s) => ({ ...s, transform: { ...s.transform, crop: null, straighten: 0 } }));
                }}
                className="text-[13px] font-medium text-brand-300 hover:underline"
              >
                Reset crop and straighten
              </button>
            </>
          )}

          {panel === "adjust" && (
            <>
              {ADJUST_SLIDERS.map((s) => (
                <Slider
                  key={s.key}
                  label={s.label}
                  value={edit.adjust[s.key]}
                  onChange={(v) => setEdit((e) => ({ ...e, adjust: { ...e.adjust, [s.key]: v } }))}
                  min={s.min}
                  max={100}
                  format={(v) => (v > 0 && s.min < 0 ? `+${v}` : `${v}`)}
                />
              ))}
              <button type="button" onClick={() => setEdit((e) => ({ ...e, adjust: NO_ADJUSTMENTS }))} className="text-[13px] font-medium text-brand-300 hover:underline">
                Reset adjustments
              </button>
            </>
          )}

          {panel === "filters" && (
            <div className="grid grid-cols-3 gap-2">
              {filterThumbs?.map((f) => (
                <button key={f.id} type="button" aria-pressed={edit.filter === f.id} onClick={() => setEdit((e) => ({ ...e, filter: f.id }))} className="group text-center">
                  <span className={cn("flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-sunken ring-2", edit.filter === f.id ? "ring-brand-600" : "ring-transparent group-hover:ring-line-strong")}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt="" className="max-h-full max-w-full" />
                  </span>
                  <span className={cn("mt-1 block text-[12px]", edit.filter === f.id ? "font-medium text-brand-300" : "text-fg-muted")}>{f.label}</span>
                </button>
              ))}
            </div>
          )}

          {panel === "text" && (
            <TextPanel
              texts={edit.texts}
              selected={selected}
              onSelect={setSelected}
              onAdd={() => {
                // New texts start centered, then step around it so they don't stack.
                const layer: TextLayer = { id: `t${++seq}`, text: "Your text", x: 0.5, y: [0.5, 0.62, 0.38, 0.74, 0.26][edit.texts.length % 5], size: 0.08, color: "#ffffff", font: "sans", bold: true, italic: false, align: "center", outline: false, shadow: true, background: null };
                setEdit((s) => ({ ...s, texts: [...s.texts, layer] }));
                setSelected(layer.id);
              }}
              onChange={updateText}
              onDelete={(id) => {
                setEdit((s) => ({ ...s, texts: s.texts.filter((x) => x.id !== id) }));
                setSelected(null);
              }}
            />
          )}

          {panel === "save" && <SavePanel img={img} file={file} edit={edit} size={size} suffix={cropOnly ? "cropped" : "edited"} />}
        </div>
      </aside>
    </div>
  );
}

// ─── Preview stage: canvas + crop box + draggable text ─────────────

function Stage({
  canvasRef,
  cropping,
  rect,
  onCrop,
  ratio,
  texts,
  selected,
  onSelect,
  onMoveText,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cropping: boolean;
  rect: FracRect;
  onCrop: (r: FracRect) => void;
  /** Width/height of the crop in fractions of the image (null = free). */
  ratio: number | null;
  texts: TextLayer[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onMoveText: (id: string, x: number, y: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ kind: "crop"; handle: Handle; start: FracRect; x: number; y: number } | { kind: "text"; id: string; sx: number; sy: number; x: number; y: number } | null>(null);
  const [shown, setShown] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setShown({ width: el.clientWidth, height: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasRef]);

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = box.current;
    if (!d || !el) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - d.x) / r.width;
    const dy = (e.clientY - d.y) / r.height;
    if (d.kind === "text") {
      onMoveText(d.id, Math.min(1, Math.max(0, d.sx + dx)), Math.min(1, Math.max(0, d.sy + dy)));
      return;
    }
    const s = d.start;
    if (d.handle === "move") return onCrop(clampRect({ ...s, x: s.x + dx, y: s.y + dy }));
    const east = d.handle.includes("e");
    const south = d.handle.includes("s");
    // The corner opposite the one being dragged stays put.
    const ax = east ? s.x : s.x + s.w;
    const ay = south ? s.y : s.y + s.h;
    const maxW = east ? 1 - ax : ax;
    const maxH = south ? 1 - ay : ay;
    let w = Math.min(maxW, Math.max(0.03, s.w + (east ? dx : -dx)));
    let h = Math.min(maxH, Math.max(0.03, s.h + (south ? dy : -dy)));
    if (ratio) {
      w = Math.min(w, maxH * ratio);
      h = w / ratio;
    }
    onCrop({ x: east ? ax : ax - w, y: south ? ay : ay - h, w, h });
  };

  const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
  const start = (e: React.PointerEvent, d: NonNullable<typeof drag.current>) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = d;
  };

  return (
    <div
      ref={box}
      className="relative inline-block max-w-full select-none leading-[0]"
      onPointerMove={move}
      onPointerUp={() => (drag.current = null)}
      onPointerDown={() => !cropping && onSelect(null)}
    >
      <canvas ref={canvasRef} className="block max-h-[68vh] max-w-full shadow-[0_12px_40px_-16px_rgb(16_19_26/0.45)]" aria-label="Image preview" />
      {cropping && (
        <>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "rgb(16 19 26 / 0.5)", clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${pct(rect.y)}, ${pct(rect.x)} ${pct(rect.y)}, ${pct(rect.x)} ${pct(rect.y + rect.h)}, ${pct(rect.x + rect.w)} ${pct(rect.y + rect.h)}, ${pct(rect.x + rect.w)} ${pct(rect.y)}, 0 ${pct(rect.y)})` }}
          />
          <div
            onPointerDown={(e) => start(e, { kind: "crop", handle: "move", start: rect, x: e.clientX, y: e.clientY })}
            className="absolute cursor-move touch-none border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.3)]"
            style={{ left: pct(rect.x), top: pct(rect.y), width: pct(rect.w), height: pct(rect.h) }}
          >
            {/* Rule-of-thirds guides */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className="border-[0.5px] border-white/35" />
              ))}
            </div>
          </div>
          {(["nw", "ne", "sw", "se"] as const).map((h) => (
            <span
              key={h}
              role="slider"
              aria-label={`Crop corner ${h}`}
              aria-valuenow={0}
              onPointerDown={(e) => start(e, { kind: "crop", handle: h, start: rect, x: e.clientX, y: e.clientY })}
              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-white bg-brand-600 shadow"
              style={{ left: pct(h.includes("w") ? rect.x : rect.x + rect.w), top: pct(h.includes("n") ? rect.y : rect.y + rect.h), cursor: `${h}-resize` }}
            />
          ))}
        </>
      )}
      {texts.map((t) => (
        <div
          key={t.id}
          onPointerDown={(e) => {
            onSelect(t.id);
            start(e, { kind: "text", id: t.id, sx: t.x, sy: t.y, x: e.clientX, y: e.clientY });
          }}
          className={cn("absolute cursor-move touch-none whitespace-pre rounded-sm px-1 text-transparent", selected === t.id ? "outline outline-2 outline-offset-2 outline-brand-500" : "outline-dashed outline-1 outline-white/70 hover:outline-white")}
          style={{ left: pct(t.x), top: pct(t.y), transform: "translate(-50%, -50%)", font: fontCss(t, Math.max(4, t.size * shown.height)), lineHeight: 1.2, textAlign: t.align }}
          aria-label={`Text: ${t.text}`}
        >
          {t.text || " "}
        </div>
      ))}
    </div>
  );
}

// ─── Text panel ─────────────────────────────────────────────────────

function TextPanel({
  texts,
  selected,
  onSelect,
  onAdd,
  onChange,
  onDelete,
}: {
  texts: TextLayer[];
  selected: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onChange: (id: string, patch: Partial<TextLayer>) => void;
  onDelete: (id: string) => void;
}) {
  const t = texts.find((x) => x.id === selected);
  return (
    <>
      <button type="button" onClick={onAdd} className="btn inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-fg text-[14px] font-medium text-app hover:bg-fg/85">
        <Plus className="h-4 w-4" aria-hidden="true" /> Add text
      </button>
      {texts.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {texts.map((x, i) => (
            <button key={x.id} type="button" onClick={() => onSelect(x.id)} className={cn("h-7 max-w-[140px] truncate rounded-full px-2.5 text-[12px] ring-1", x.id === selected ? "bg-brand-500/15 text-brand-300 ring-brand-500" : "bg-sunken ring-line-strong")}>
              {x.text.split("\n")[0] || `Text ${i + 1}`}
            </button>
          ))}
        </div>
      )}
      {!t ? (
        <p className="text-[13px] leading-relaxed text-fg-muted">{texts.length ? "Click a text on the image to edit it. Drag to move it." : "Add a caption, a title or a label. Drag it into place on the image."}</p>
      ) : (
        <>
          <label className="block space-y-1.5">
            <span className="text-[13px] font-medium">Text</span>
            <textarea value={t.text} onChange={(e) => onChange(t.id, { text: e.target.value })} rows={2} className="w-full resize-y rounded-lg bg-sunken px-3 py-2 text-[14px] text-fg ring-1 ring-line-strong outline-none focus:ring-2 focus:ring-brand-500" />
          </label>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium">Font</legend>
            <div className="flex flex-wrap gap-1.5">
              {FONTS.map((f) => (
                <button key={f.id} type="button" aria-pressed={t.font === f.id} onClick={() => onChange(t.id, { font: f.id })} className={cn("h-8 rounded-lg px-2.5 text-[13px] ring-1", t.font === f.id ? "bg-brand-500/15 text-brand-300 ring-brand-500" : "bg-sunken ring-line-strong")} style={{ fontFamily: f.css }}>
                  {f.label}
                </button>
              ))}
            </div>
          </fieldset>
          <Slider label="Size" value={Math.round(t.size * 100)} onChange={(v) => onChange(t.id, { size: v / 100 })} min={2} max={30} format={(v) => `${v}%`} />
          <div className="flex items-center gap-1.5">
            <ToggleBtn label="Bold" on={t.bold} onClick={() => onChange(t.id, { bold: !t.bold })}>
              <Bold className="h-4 w-4" />
            </ToggleBtn>
            <ToggleBtn label="Italic" on={t.italic} onClick={() => onChange(t.id, { italic: !t.italic })}>
              <Italic className="h-4 w-4" />
            </ToggleBtn>
            <span className="mx-1 h-5 w-px bg-line" />
            {(["left", "center", "right"] as const).map((a) => (
              <ToggleBtn key={a} label={`Align ${a}`} on={t.align === a} onClick={() => onChange(t.id, { align: a })}>
                {a === "left" ? <AlignLeft className="h-4 w-4" /> : a === "center" ? <AlignCenter className="h-4 w-4" /> : <AlignRight className="h-4 w-4" />}
              </ToggleBtn>
            ))}
          </div>
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium">Colour</legend>
            <div className="flex flex-wrap items-center gap-1.5">
              {SWATCHES.map((c) => (
                <button key={c} type="button" aria-label={`Colour ${c}`} aria-pressed={t.color === c} onClick={() => onChange(t.id, { color: c })} className={cn("h-7 w-7 rounded-full ring-1 ring-line", t.color === c && "ring-2 ring-brand-400 ring-offset-2 ring-offset-surface")} style={{ background: c }} />
              ))}
              <label className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full ring-1 ring-line" title="Custom colour">
                <Palette className="h-3.5 w-3.5 text-fg-muted" aria-hidden="true" />
                <input type="color" value={t.color} onChange={(e) => onChange(t.id, { color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Custom colour" />
              </label>
            </div>
          </fieldset>
          <Toggle label="Shadow" checked={t.shadow} onChange={(shadow) => onChange(t.id, { shadow })} />
          <Toggle label="Outline" hint="Bold edge that reads on any background." checked={t.outline} onChange={(outline) => onChange(t.id, { outline })} />
          <div className="flex items-center justify-between gap-3">
            <Toggle label="Background box" checked={!!t.background} onChange={(on) => onChange(t.id, { background: on ? (t.color.toLowerCase() === "#ffffff" ? "#111111" : "#ffffff") : null })} />
            {t.background && <input type="color" value={t.background} onChange={(e) => onChange(t.id, { background: e.target.value })} className="h-8 w-10 cursor-pointer rounded" aria-label="Background colour" />}
          </div>
          <button type="button" onClick={() => onDelete(t.id)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-red-300 hover:underline">
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete this text
          </button>
        </>
      )}
    </>
  );
}

// ─── Save panel ─────────────────────────────────────────────────────

function SavePanel({ img, file, edit, size, suffix }: { img: Decoded; file: ToolFile; edit: EditState; size: Size; suffix: string }) {
  const [resizeMode, setResizeMode] = useState<"original" | "percent" | "pixels">("original");
  const [percent, setPercent] = useState(50);
  const [dims, setDims] = useState({ width: size.width, height: size.height });
  const [format, setFormat] = useState<Format>(formatFor(file.type));
  const [quality, setQuality] = useState(90);
  const [limit, setLimit] = useState(false);
  const [target, setTarget] = useState("100");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ name: string; bytes: number; width: number; height: number; fits: boolean } | null>(null);

  // Keep the pixel fields in step with crops made in other panels.
  useEffect(() => setDims({ width: size.width, height: size.height }), [size.width, size.height]);

  const ratio = size.width / size.height;
  const out =
    resizeMode === "percent" ? resizeDims(size, { mode: "percent", percent }) : resizeMode === "pixels" ? resizeDims(size, { mode: "pixels", width: dims.width, height: dims.height, keepRatio: true }) : size;
  const lossy = FORMAT_INFO[format].lossy;

  const save = async () => {
    const maxBytes = limit ? parseSize(target) : null;
    if (limit && !maxBytes) return setError("Enter a maximum size, like 50 (KB) or 1.5 MB.");
    setError(null);
    setBusy(true);
    setSaved(null);
    try {
      // Let the button show its busy state before the heavy work starts.
      await new Promise((r) => setTimeout(r, 30));
      const canvas = render(img, edit, { size: out.width === size.width && out.height === size.height ? undefined : out });
      const r = await exportCanvas(canvas, outputName(file.name, format, suffix), { format, quality: quality / 100, maxBytes });
      downloadFile(r);
      setSaved({ name: r.name, bytes: r.bytes.length, width: r.width, height: r.height, fits: r.fits });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Segmented
        label="Size"
        value={resizeMode}
        onChange={setResizeMode}
        options={[
          { value: "original", label: "As edited" },
          { value: "percent", label: "Percent" },
          { value: "pixels", label: "Pixels" },
        ]}
      />
      {resizeMode === "percent" && (
        <>
          <Slider label="Scale" value={percent} onChange={setPercent} min={1} max={200} format={(v) => `${v}%`} />
          <Chips items={[10, 25, 50, 75]} label={(p) => `${p}%`} onPick={setPercent} />
        </>
      )}
      {resizeMode === "pixels" && (
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Width" value={dims.width} onChange={(w) => setDims({ width: w, height: Math.round(w / ratio) })} min={1} suffix="px" />
          <NumberField label="Height" value={dims.height} onChange={(h) => setDims({ height: h, width: Math.round(h * ratio) })} min={1} suffix="px" />
        </div>
      )}
      <p className="rounded-lg bg-sunken px-3 py-2 text-[12px] text-fg-muted">
        Output: <span className="font-medium text-fg">{out.width} × {out.height} px</span>
      </p>
      <Segmented
        label="Format"
        value={format}
        onChange={setFormat}
        options={[
          { value: "jpeg", label: "JPG" },
          { value: "png", label: "PNG" },
          { value: "webp", label: "WEBP" },
        ]}
      />
      <Toggle label="Limit the file size" hint="Finds the best quality under your limit, e.g. 50 KB for a form." checked={limit} onChange={setLimit} />
      {limit ? <TargetSize label="Maximum size" value={target} onChange={setTarget} /> : lossy && <Slider label="Quality" value={quality} onChange={setQuality} min={30} max={100} format={(v) => `${v}%`} />}
      {error && (
        <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
          {error}
        </p>
      )}
      <button type="button" onClick={save} disabled={busy} className="btn inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-medium text-on-accent shadow-sm hover:bg-accent-hover disabled:opacity-80">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        {busy ? "Saving…" : "Download image"}
      </button>
      {saved && (
        <p role="status" className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[12px] leading-relaxed text-emerald-200">
          Saved <span className="font-medium">{saved.name}</span> · {saved.width} × {saved.height} px · {formatBytes(saved.bytes)}
          {!saved.fits && ". It couldn't get under the limit without becoming unusable, so this is the smallest version."}
        </p>
      )}
    </>
  );
}

// ─── Small buttons ──────────────────────────────────────────────────

function ToolbarBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-line-strong hover:bg-raised disabled:opacity-35">
      {children}
    </button>
  );
}

function PanelBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="flex h-10 items-center justify-center rounded-lg ring-1 ring-line hover:bg-raised">
      {children}
    </button>
  );
}

function ToggleBtn({ label, on, onClick, children }: { label: string; on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} aria-pressed={on} title={label} onClick={onClick} className={cn("flex h-9 w-9 items-center justify-center rounded-lg ring-1", on ? "bg-brand-500/15 text-brand-300 ring-brand-500" : "ring-line hover:bg-raised")}>
      {children}
    </button>
  );
}
