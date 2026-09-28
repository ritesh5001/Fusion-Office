import type { RenderTask } from "pdfjs-dist";
import { getPdfDocument } from "./sources";
import { totalRotation, viewSize, type EditorPage } from "../editor/types";

export interface RenderHandle {
  promise: Promise<void>;
  cancel: () => void;
}

/**
 * Render a page into a canvas at `scale` CSS pixels per PDF point.
 * The backing store is multiplied by devicePixelRatio for crisp output.
 */
export function renderPage(
  page: EditorPage,
  canvas: HTMLCanvasElement,
  scale: number,
  opts: { pixelRatio?: number; background?: string } = {},
): RenderHandle {
  const ratio = opts.pixelRatio ?? (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
  const view = viewSize(page);
  const cssW = view.width * scale;
  const cssH = view.height * scale;
  let task: RenderTask | null = null;
  let cancelled = false;

  const promise = (async () => {
    // Guard against huge backing stores on very large pages (browser limits).
    const maxPixels = 16_000_000;
    let r = ratio;
    if (cssW * cssH * r * r > maxPixels) r = Math.sqrt(maxPixels / (cssW * cssH));

    const ctx = canvas.getContext("2d")!;
    if (page.source.kind === "blank") {
      canvas.width = Math.floor(cssW * r);
      canvas.height = Math.floor(cssH * r);
      ctx.fillStyle = opts.background ?? "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const pdf = await getPdfDocument(page.source.sourceId);
    if (cancelled) return;
    const pdfPage = await pdf.getPage(page.source.pageIndex + 1);
    if (cancelled) return;
    const viewport = pdfPage.getViewport({ scale: scale * r, rotation: totalRotation(page) });
    // Render off-screen first so the visible canvas never flashes blank.
    const off = document.createElement("canvas");
    off.width = Math.floor(viewport.width);
    off.height = Math.floor(viewport.height);
    const offCtx = off.getContext("2d")!;
    offCtx.fillStyle = "#ffffff";
    offCtx.fillRect(0, 0, off.width, off.height);
    task = pdfPage.render({ canvasContext: offCtx, viewport });
    try {
      await task.promise;
    } catch (err) {
      if ((err as { name?: string })?.name === "RenderingCancelledException") return;
      throw err;
    }
    if (cancelled) return;
    canvas.width = off.width;
    canvas.height = off.height;
    ctx.drawImage(off, 0, 0);
  })();

  return {
    promise,
    cancel: () => {
      cancelled = true;
      task?.cancel();
    },
  };
}

const thumbCache = new Map<string, string>();

const thumbKey = (p: EditorPage, width: number) =>
  `${p.source.kind === "pdf" ? `${p.source.sourceId}:${p.source.pageIndex}` : `blank:${p.width}x${p.height}`}:${totalRotation(p)}:${width}`;

/** Render a small thumbnail as a data URL. Results are cached. */
export async function renderThumbnail(page: EditorPage, width = 160): Promise<string> {
  const key = thumbKey(page, width);
  const cached = thumbCache.get(key);
  if (cached) return cached;
  const view = viewSize(page);
  const canvas = document.createElement("canvas");
  await renderPage(page, canvas, width / view.width, { pixelRatio: 2 }).promise;
  const url = canvas.toDataURL("image/jpeg", 0.8);
  thumbCache.set(key, url);
  return url;
}
