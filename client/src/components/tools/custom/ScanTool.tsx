"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Download, ImagePlus, Loader2, RotateCw, Trash2 } from "lucide-react";
import { downloadFile, PDF } from "@/lib/tools/files";
import { canvasToBytes } from "@/lib/tools/pdfjs";
import { imagesToPdf } from "@/lib/tools/processors/images";
import { Segmented } from "../controls";

type Filter = "color" | "gray" | "bw";
interface Shot {
  id: string;
  canvas: HTMLCanvasElement;
  url: string;
  rotate: number;
}

let n = 0;

/** Apply rotation + clean-up filter to a captured page. */
function processShot(shot: Shot, filter: Filter): HTMLCanvasElement {
  const src = shot.canvas;
  const swap = shot.rotate % 180 !== 0;
  const out = document.createElement("canvas");
  out.width = swap ? src.height : src.width;
  out.height = swap ? src.width : src.height;
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate((shot.rotate * Math.PI) / 180);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (filter !== "color") {
    const img = ctx.getImageData(0, 0, out.width, out.height);
    const d = img.data;
    // Stretch contrast using the brightest/darkest percentiles (paper → white).
    const hist = new Uint32Array(256);
    for (let i = 0; i < d.length; i += 4) hist[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
    const total = d.length / 4;
    let lo = 0;
    let hi = 255;
    for (let acc = 0; lo < 255 && (acc += hist[lo]) < total * 0.02; lo++);
    for (let acc = 0; hi > 0 && (acc += hist[hi]) < total * 0.1; hi--);
    const range = Math.max(1, hi - lo);
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      let v = Math.min(255, Math.max(0, ((l - lo) / range) * 255));
      if (filter === "bw") v = v > 150 ? 255 : v < 90 ? 0 : (v - 90) * (255 / 60);
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
  }
  return out;
}

export function ScanTool() {
  const video = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [filter, setFilter] = useState<Filter>("gray");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => () => stream?.getTracks().forEach((t) => t.stop()), [stream]);
  useEffect(() => {
    if (video.current && stream) video.current.srcObject = stream;
  }, [stream]);

  const start = async () => {
    setCameraError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 2560 }, height: { ideal: 1920 } }, audio: false });
      setStream(s);
    } catch (e) {
      setCameraError(
        (e as Error).name === "NotAllowedError"
          ? "Camera access was blocked. Allow it in your browser's site settings, or add photos instead."
          : "No camera is available here. You can add photos of your pages instead.",
      );
    }
  };

  const stop = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  const addCanvas = (canvas: HTMLCanvasElement) =>
    setShots((s) => [...s, { id: `s${++n}`, canvas, url: canvas.toDataURL("image/jpeg", 0.6), rotate: 0 }]);

  const capture = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    addCanvas(c);
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
  };

  const addPhotos = async (files: FileList | null) => {
    for (const f of Array.from(files ?? [])) {
      const bmp = await createImageBitmap(f);
      const c = document.createElement("canvas");
      c.width = bmp.width;
      c.height = bmp.height;
      c.getContext("2d")!.drawImage(bmp, 0, 0);
      addCanvas(c);
    }
  };

  const build = async () => {
    setBusy(true);
    try {
      const files = [];
      for (const s of shots) {
        const c = processShot(s, filter);
        files.push({ name: `${s.id}.jpg`, bytes: await canvasToBytes(c, "image/jpeg", filter === "bw" ? 0.8 : 0.85), type: "image/jpeg" });
      }
      const bytes = await imagesToPdf(files, { pageSize: "a4", orientation: "auto", margin: 0 });
      downloadFile({ name: `scan-${new Date().toISOString().slice(0, 10)}.pdf`, bytes, type: PDF });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-fg">
          {stream ? (
            <>
              <video ref={video} autoPlay playsInline muted className="h-full w-full object-contain" />
              <div className="pointer-events-none absolute inset-[8%] rounded-lg border-2 border-dashed border-white/50" aria-hidden="true" />
              {flash && <div className="absolute inset-0 bg-white/70" aria-hidden="true" />}
              <button type="button" onClick={capture} aria-label="Capture page" className="absolute bottom-5 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full border-4 border-white bg-white/30 shadow-lg transition hover:bg-white/50" />
              <button type="button" onClick={stop} className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-[12px] text-white">
                <CameraOff className="h-3.5 w-3.5" aria-hidden="true" /> Stop camera
              </button>
            </>
          ) : (
            <div className="px-6 text-center text-white">
              <Camera className="mx-auto h-10 w-10 opacity-70" aria-hidden="true" />
              <p className="mt-3 text-[15px]">Place the page on a dark surface in good light.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={start} className="btn btn-primary h-11 rounded-full px-5">
                  <Camera className="h-4 w-4" aria-hidden="true" /> Start camera
                </button>
                <label className="btn inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-5 text-[14px] font-medium text-white ring-1 ring-white/40">
                  <ImagePlus className="h-4 w-4" aria-hidden="true" /> Add photos
                  <input type="file" accept="image/*" multiple capture="environment" className="sr-only" onChange={(e) => addPhotos(e.target.files)} />
                </label>
              </div>
              {cameraError && <p className="mx-auto mt-4 max-w-[40ch] text-[13px] text-red-300">{cameraError}</p>}
            </div>
          )}
        </div>
        {shots.length > 0 && (
          <ol className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {shots.map((s, i) => (
              <li key={s.id} className="rounded-xl bg-surface p-1.5 ring-1 ring-line">
                <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md bg-sunken">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.url} alt={`Scanned page ${i + 1}`} className="max-h-full max-w-full" style={{ transform: `rotate(${s.rotate}deg)`, filter: filter === "color" ? undefined : filter === "gray" ? "grayscale(1) contrast(1.3)" : "grayscale(1) contrast(3)" }} />
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="pl-1 text-[12px] text-fg-muted">{i + 1}</span>
                  <span className="flex">
                    <button type="button" aria-label="Rotate" onClick={() => setShots((all) => all.map((x) => (x.id === s.id ? { ...x, rotate: (x.rotate + 90) % 360 } : x)))} className="rounded-md p-1.5 text-fg-muted hover:bg-raised">
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" aria-label="Delete" onClick={() => setShots((all) => all.filter((x) => x.id !== s.id))} className="rounded-md p-1.5 text-fg-muted hover:bg-raised">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
      <aside className="h-fit space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line lg:sticky lg:top-24">
        <p className="text-[13px] text-fg-muted">
          {shots.length} page{shots.length === 1 ? "" : "s"} captured
        </p>
        <Segmented
          label="Clean-up"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "color", label: "Colour", hint: "As photographed" },
            { value: "gray", label: "Document", hint: "Grey, brighter paper" },
            { value: "bw", label: "Black & white", hint: "Sharpest text" },
          ]}
        />
        <button type="button" onClick={build} disabled={!shots.length || busy} className="btn inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-medium text-on-accent hover:bg-accent-hover disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />} Create PDF
        </button>
        <p className="text-[12px] leading-relaxed text-fg-muted">Want searchable text? Run the result through OCR PDF.</p>
      </aside>
    </div>
  );
}
