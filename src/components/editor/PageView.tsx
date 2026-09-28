"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  ActiveSelection,
  Canvas,
  FabricObject,
  Group,
  Path,
  PencilBrush,
  Rect as FRect,
  Textbox,
  type TPointerEventInfo,
  type TPointerEvent,
} from "fabric";
import { useEditor } from "@/lib/editor/store";
import { viewSize, totalRotation, type EditorPage, type Rect, type ToolId } from "@/lib/editor/types";
import { renderPage } from "@/lib/pdf/renderer";
import { textRectsBetween } from "@/lib/pdf/text";
import { createLine, createShape, createText, newId } from "@/lib/editor/objects";
import { findById, pathToLocalD, readFabricObject, syncCanvas, type Tagged } from "@/lib/editor/fabricAdapter";
import { linePath } from "@/lib/pdf/geometry";

const DRAG_TOOLS: ToolId[] = ["rect", "ellipse", "triangle", "line", "arrow", "redact", "whiteout", "highlight", "underline", "strikeout"];
const MARKUP_TOOLS: ToolId[] = ["highlight", "underline", "strikeout"];
/** Tools that return to Select after one use. */
const ONE_SHOT: ToolId[] = ["rect", "ellipse", "triangle", "line", "arrow", "text", "comment"];

const hexA = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

interface Props {
  page: EditorPage;
  index: number;
  zoom: number;
}

/** A page slot. Heavy content (PDF raster + Fabric canvas) mounts only near the viewport. */
export const PageView = memo(function PageView({ page, index, zoom }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(index < 3);
  const view = viewSize(page);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: "1200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={ref}
        data-page-id={page.id}
        className="relative bg-white shadow-[0_1px_3px_rgba(15,23,42,0.12),0_8px_24px_-12px_rgba(15,23,42,0.25)]"
        style={{ width: view.width * zoom, height: view.height * zoom }}
      >
        {near && <PageSurface page={page} zoom={zoom} />}
      </div>
      <div className="text-[11px] tabular-nums text-slate-500">{index + 1}</div>
    </div>
  );
});

function PageSurface({ page, zoom }: { page: EditorPage; zoom: number }) {
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const pageRef = useRef(page);
  pageRef.current = page;
  const view = viewSize(page);
  const rotation = totalRotation(page);
  const sourceKey = page.source.kind === "pdf" ? `${page.source.sourceId}:${page.source.pageIndex}` : "blank";

  // ── PDF raster (debounced on zoom so pinch/ctrl-wheel stays smooth) ──
  const firstRender = useRef(true);
  useEffect(() => {
    const canvas = pdfCanvasRef.current;
    if (!canvas) return;
    let handle: ReturnType<typeof renderPage> | null = null;
    const run = () => {
      handle = renderPage(pageRef.current, canvas, zoom);
      handle.promise.catch((err) => console.error("[render]", err));
    };
    const delay = firstRender.current ? 0 : 140;
    firstRender.current = false;
    const t = setTimeout(run, delay);
    return () => {
      clearTimeout(t);
      handle?.cancel();
    };
  }, [sourceKey, rotation, zoom, page.width, page.height]);

  // ── Fabric canvas lifecycle ──
  useEffect(() => {
    const host = hostRef.current!;
    const el = document.createElement("canvas");
    host.appendChild(el);
    const { width, height } = viewSize(pageRef.current);
    const z = useEditor.getState().zoom;
    const canvas = new Canvas(el, {
      width: width * z,
      height: height * z,
      preserveObjectStacking: true,
      selectionColor: "rgba(79,70,229,0.08)",
      selectionBorderColor: "#4f46e5",
      selectionLineWidth: 1,
      enableRetinaScaling: true,
      targetFindTolerance: 4,
    });
    canvas.setZoom(z);
    fabricRef.current = canvas;
    const cleanup = attachInteractions(canvas, () => pageRef.current);
    syncCanvas(canvas, () => pageRef.current, afterSync);
    return () => {
      cleanup();
      fabricRef.current = null;
      canvas.dispose().catch(() => {});
      host.innerHTML = "";
    };
  }, []);

  // ── Zoom / page size ──
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setDimensions({ width: view.width * zoom, height: view.height * zoom });
    canvas.setZoom(zoom);
    canvas.requestRenderAll();
  }, [zoom, view.width, view.height]);

  // ── Model → canvas ──
  useEffect(() => {
    const canvas = fabricRef.current;
    if (canvas) syncCanvas(canvas, () => pageRef.current, afterSync);
  }, [page.objects]);

  // ── Tool + selection → canvas ──
  const tool = useEditor((s) => s.tool);
  const toolOptions = useEditor((s) => s.toolOptions);
  const selection = useEditor((s) => s.selection);
  useEffect(() => {
    const canvas = fabricRef.current;
    if (canvas) applyTool(canvas);
  }, [tool, toolOptions]);
  useEffect(() => {
    const canvas = fabricRef.current;
    if (canvas) applySelection(canvas, pageRef.current.id);
  }, [selection]);

  const hits = useEditor((s) => s.searchHits);
  const activeHit = useEditor((s) => s.activeHit);
  const pageHits = hits.map((h, i) => ({ h, i })).filter(({ h }) => h.pageId === page.id);

  return (
    <>
      <canvas ref={pdfCanvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      <div ref={hostRef} className="page-host absolute inset-0" />
      {pageHits.length > 0 && (
        <div className="pointer-events-none absolute inset-0">
          {pageHits.flatMap(({ h, i }) =>
            h.rects.map((r, j) => (
              <div
                key={`${i}-${j}`}
                className={
                  i === activeHit
                    ? "search-hit-active absolute rounded-[2px] bg-orange-400/45 ring-2 ring-orange-500"
                    : "absolute rounded-[2px] bg-yellow-300/45"
                }
                style={{ left: r.x * zoom, top: r.y * zoom, width: r.w * zoom, height: r.h * zoom }}
              />
            )),
          )}
        </div>
      )}
    </>
  );
}

// ─── Canvas configuration helpers ──────────────────────────────────────

function afterSync(canvas: Canvas) {
  applyTool(canvas);
  const st = useEditor.getState();
  if (st.pendingEditId) {
    const fo = findById(canvas, st.pendingEditId);
    if (fo instanceof Textbox) {
      st.setPendingEdit(null);
      canvas.setActiveObject(fo);
      fo.enterEditing();
      fo.selectAll();
      canvas.requestRenderAll();
      return;
    }
  }
  const pageId = (canvas as Canvas & { __pageId?: string }).__pageId;
  if (pageId) applySelection(canvas, pageId);
}

let suppressSelectionEvents = false;

function applySelection(canvas: Canvas, pageId: string) {
  const sel = useEditor.getState().selection;
  const active = canvas.getActiveObject();
  if (active instanceof Textbox && active.isEditing) return;
  const current = (canvas.getActiveObjects() as Tagged[]).map((o) => o.editorId).sort().join(",");
  const wanted = sel?.pageId === pageId ? [...sel.ids].sort().join(",") : "";
  if (current === wanted) return;
  suppressSelectionEvents = true;
  try {
    canvas.discardActiveObject();
    if (sel?.pageId === pageId) {
      const objs = sel.ids.map((id) => findById(canvas, id)).filter((o): o is Tagged => !!o && o.selectable !== false);
      if (objs.length === 1) canvas.setActiveObject(objs[0]);
      else if (objs.length > 1) canvas.setActiveObject(new ActiveSelection(objs, { canvas }));
    }
  } finally {
    suppressSelectionEvents = false;
  }
  canvas.requestRenderAll();
}

function applyTool(canvas: Canvas) {
  const { tool, toolOptions: o } = useEditor.getState();
  const drawing = tool === "draw" || tool === "highlighter";
  canvas.isDrawingMode = drawing;
  if (drawing) {
    const brush = new PencilBrush(canvas);
    brush.color = tool === "draw" ? o.penColor : hexA(o.highlighterColor, 0.35);
    brush.width = tool === "draw" ? o.penWidth : o.highlighterWidth;
    brush.strokeLineCap = tool === "draw" ? "round" : "square";
    brush.decimate = 0.8;
    canvas.freeDrawingBrush = brush;
  }
  const select = tool === "select";
  canvas.selection = select;
  canvas.skipTargetFind = !(select || tool === "eraser" || tool === "text");
  canvas.defaultCursor = select ? "default" : tool === "text" ? "text" : tool === "eraser" ? "cell" : "crosshair";
  for (const obj of canvas.getObjects() as Tagged[]) {
    const isText = obj.__model?.type === "text";
    const erasable = obj.__model?.type === "path" || obj.__model?.type === "markup";
    obj.selectable = select;
    obj.evented = select || (tool === "eraser" && erasable) || (tool === "text" && isText);
    obj.hoverCursor = select ? "move" : tool === "eraser" ? "pointer" : tool === "text" ? "text" : "crosshair";
  }
  if (!select) {
    const active = canvas.getActiveObject();
    if (!(active instanceof Textbox && active.isEditing)) canvas.discardActiveObject();
  }
  canvas.requestRenderAll();
}

// ─── Pointer interactions ──────────────────────────────────────────────

function attachInteractions(canvas: Canvas, getPage: () => EditorPage) {
  (canvas as Canvas & { __pageId?: string }).__pageId = getPage().id;
  const st = () => useEditor.getState();
  let drag: { tool: ToolId; start: { x: number; y: number }; preview?: FabricObject; token: number } | null = null;
  let erasing: Set<string> | null = null;
  let markupToken = 0;

  const point = (opt: TPointerEventInfo<TPointerEvent>) => {
    const p = (opt as unknown as { scenePoint?: { x: number; y: number } }).scenePoint ?? canvas.getScenePoint(opt.e);
    const { width, height } = viewSize(getPage());
    return { x: Math.min(Math.max(p.x, 0), width), y: Math.min(Math.max(p.y, 0), height) };
  };

  const finishOneShot = (tool: ToolId) => {
    if (ONE_SHOT.includes(tool)) st().setTool("select");
  };

  const eraseTarget = (target: FabricObject | undefined) => {
    const t = target as Tagged | undefined;
    if (!t?.editorId || !erasing || erasing.has(t.editorId)) return;
    if (t.__model?.type !== "path" && t.__model?.type !== "markup") return;
    erasing.add(t.editorId);
    st().deleteObjects(getPage().id, [t.editorId]);
  };

  const onDown = (opt: TPointerEventInfo<TPointerEvent>) => {
    const { tool, toolOptions } = st();
    const page = getPage();
    if (st().currentPageId !== page.id) st().setCurrentPage(page.id);
    const p = point(opt);

    if (tool === "text") {
      const target = opt.target as Tagged | undefined;
      const targetId = target?.editorId;
      if (target instanceof Textbox && targetId) {
        st().setTool("select");
        st().setSelection({ pageId: page.id, ids: [targetId] });
        setTimeout(() => {
          canvas.setActiveObject(target);
          target.enterEditing();
          canvas.requestRenderAll();
        });
        return;
      }
      // Default box is 260pt wide, shrunk (or shifted left) to stay on the page.
      const pageW = viewSize(page).width;
      const width = Math.min(260, Math.max(120, pageW - p.x - 12), pageW - 24);
      const x = Math.max(12, Math.min(p.x, pageW - width - 12));
      const obj = createText(x, p.y - toolOptions.fontSize * 0.7, {
        fontSize: toolOptions.fontSize,
        color: toolOptions.textColor,
        width,
      });
      st().addObject(page.id, obj, { edit: true });
      finishOneShot(tool);
      return;
    }

    if (tool === "comment") {
      st().addObject(page.id, { id: newId(), type: "comment", cx: p.x, cy: p.y, text: "", color: "#fde047", createdAt: Date.now() });
      finishOneShot(tool);
      return;
    }

    if (tool === "eraser") {
      erasing = new Set();
      eraseTarget(opt.target);
      return;
    }

    if (DRAG_TOOLS.includes(tool)) {
      drag = { tool, start: p, token: ++markupToken };
    }
  };

  const updatePreview = (p: { x: number; y: number }) => {
    if (!drag) return;
    const { tool, start } = drag;
    const { toolOptions } = st();
    if (drag.preview) canvas.remove(drag.preview);
    const r: Rect = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) };
    let preview: FabricObject;
    if (tool === "line" || tool === "arrow") {
      const len = Math.hypot(p.x - start.x, p.y - start.y);
      preview = new Path(linePath(tool, Math.max(len, 1), toolOptions.strokeWidth), {
        left: (start.x + p.x) / 2,
        top: (start.y + p.y) / 2,
        originX: "center",
        originY: "center",
        angle: (Math.atan2(p.y - start.y, p.x - start.x) * 180) / Math.PI,
        stroke: toolOptions.stroke,
        strokeWidth: toolOptions.strokeWidth,
        fill: "",
        strokeLineCap: "round",
      });
    } else if (MARKUP_TOOLS.includes(tool)) {
      // Live text-snapped preview (async); show the drag box meanwhile.
      preview = new FRect({ left: r.x, top: r.y, width: r.w, height: r.h, fill: "rgba(79,70,229,0.06)", stroke: "rgba(79,70,229,0.5)", strokeDashArray: [3, 3], strokeWidth: 1, strokeUniform: true });
      const token = drag.token;
      const page = getPage();
      void textRectsBetween(page, start, p).then((rects) => {
        if (!drag || drag.token !== token || !rects.length) return;
        const color = toolOptions.markupColor;
        const parts = rects.map((rr) =>
          tool === "highlight"
            ? new FRect({ left: rr.x, top: rr.y, width: rr.w, height: rr.h, fill: hexA(color, 0.4), strokeWidth: 0 })
            : new FRect({ left: rr.x, top: tool === "underline" ? rr.y + rr.h * 0.82 : rr.y + rr.h * 0.5, width: rr.w, height: Math.max(1, rr.h * 0.07), fill: color, strokeWidth: 0 }),
        );
        if (drag.preview) canvas.remove(drag.preview);
        drag.preview = new Group(parts, { selectable: false, evented: false });
        canvas.add(drag.preview);
        canvas.requestRenderAll();
      });
    } else {
      const isRedact = tool === "redact";
      const isWhiteout = tool === "whiteout";
      const common = {
        left: r.x,
        top: r.y,
        width: r.w,
        height: r.h,
        fill: isRedact ? "rgba(0,0,0,0.75)" : isWhiteout ? "#ffffff" : toolOptions.fill === "transparent" ? "" : toolOptions.fill,
        stroke: isRedact ? "#ef4444" : isWhiteout ? "#94a3b8" : toolOptions.stroke,
        strokeWidth: isRedact || isWhiteout ? 1 : toolOptions.strokeWidth,
        strokeDashArray: isRedact || isWhiteout ? [4, 3] : undefined,
        strokeUniform: true,
      };
      preview =
        tool === "ellipse"
          ? new FRect({ ...common, rx: r.w / 2, ry: r.h / 2 })
          : new FRect(common);
    }
    preview.selectable = false;
    preview.evented = false;
    drag.preview = preview;
    canvas.add(preview);
    canvas.requestRenderAll();
  };

  const onMove = (opt: TPointerEventInfo<TPointerEvent>) => {
    if (erasing) return eraseTarget(opt.target);
    if (drag) updatePreview(point(opt));
  };

  const onUp = async (opt: TPointerEventInfo<TPointerEvent>) => {
    erasing = null;
    if (!drag) return;
    const { tool, start, preview } = drag;
    drag = null;
    if (preview) canvas.remove(preview);
    canvas.requestRenderAll();
    const end = point(opt);
    const page = getPage();
    const { toolOptions } = st();
    const r: Rect = { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), w: Math.abs(end.x - start.x), h: Math.abs(end.y - start.y) };
    const tiny = r.w < 4 && r.h < 4;

    if (MARKUP_TOOLS.includes(tool)) {
      let rects = await textRectsBetween(page, start, end);
      if (!rects.length) {
        if (r.w < 6 || r.h < 4) return;
        rects = [r]; // no text under the pointer (e.g. scanned page): mark the area
      }
      st().addObject(
        page.id,
        {
          id: newId(),
          type: "markup",
          style: tool as "highlight" | "underline" | "strikeout",
          rects,
          color: toolOptions.markupColor,
          opacity: tool === "highlight" ? 0.4 : 1,
        },
        { select: false },
      );
      return;
    }

    if (tool === "redact" || tool === "whiteout") {
      if (tiny) return;
      st().addObject(
        page.id,
        tool === "redact" ? { id: newId(), type: "redact", rect: r } : { id: newId(), type: "whiteout", rect: r, color: "#ffffff" },
        { select: false },
      );
      return;
    }

    const style = { stroke: toolOptions.stroke, strokeWidth: toolOptions.strokeWidth, fill: toolOptions.fill };
    if (tool === "line" || tool === "arrow") {
      const [x2, y2] = tiny ? [start.x + 120, start.y] : [end.x, end.y];
      st().addObject(page.id, createLine(tool, start.x, start.y, x2, y2, { stroke: style.stroke, strokeWidth: style.strokeWidth }));
    } else {
      const rect = tiny ? { x: start.x - 60, y: start.y - 40, w: 120, h: 80 } : r;
      st().addObject(page.id, createShape(tool as "rect" | "ellipse" | "triangle", rect, style));
    }
    finishOneShot(tool);
  };

  const onPathCreated = (opt: { path: Path }) => {
    const { tool, toolOptions } = st();
    const path = opt.path;
    canvas.remove(path);
    const local = pathToLocalD(path);
    const highlighter = tool === "highlighter";
    st().addObject(
      getPage().id,
      {
        id: newId(),
        type: "path",
        d: local.d,
        cx: local.cx,
        cy: local.cy,
        width: local.width,
        height: local.height,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: highlighter ? 0.35 : 1,
        stroke: highlighter ? toolOptions.highlighterColor : toolOptions.penColor,
        strokeWidth: highlighter ? toolOptions.highlighterWidth : toolOptions.penWidth,
        mode: highlighter ? "highlighter" : "pen",
      },
      { select: false },
    );
  };

  const onModified = (opt: { target?: FabricObject }) => {
    const t = opt.target;
    if (!t) return;
    const objs = (t instanceof ActiveSelection ? t.getObjects() : [t]) as Tagged[];
    const models = objs.filter((o) => o.__model).map((o) => {
      const m = readFabricObject(o);
      // Keep the live object for everything except text, which is rebuilt so
      // a corner-scale turns into a real font size.
      if (m.type !== "text") o.__model = m;
      return m;
    });
    if (models.length) st().replaceObjects(getPage().id, models);
  };

  const onEditingExited = (opt: { target: FabricObject }) => {
    const t = opt.target as Tagged;
    const model = t.__model;
    if (!model || model.type !== "text") return;
    const next = readFabricObject(t);
    if (next.type !== "text") return;
    if (!next.text.trim()) {
      st().deleteObjects(getPage().id, [model.id]);
    } else if (next.text !== model.text || Math.abs(next.height - model.height) > 0.5) {
      st().replaceObjects(getPage().id, [next], "Edit text");
    }
  };

  const onSelection = () => {
    if (suppressSelectionEvents) return;
    const ids = (canvas.getActiveObjects() as Tagged[]).map((o) => o.editorId).filter((x): x is string => !!x);
    const pageId = getPage().id;
    const cur = st().selection;
    const same = cur?.pageId === pageId && cur.ids.length === ids.length && cur.ids.every((id) => ids.includes(id));
    if (!same) st().setSelection(ids.length ? { pageId, ids } : null);
    if (ids.length && st().currentPageId !== pageId) st().setCurrentPage(pageId);
  };
  const onCleared = () => {
    if (suppressSelectionEvents) return;
    if (st().selection?.pageId === getPage().id) st().setSelection(null);
  };

  canvas.on("mouse:down", onDown);
  canvas.on("mouse:move", onMove);
  canvas.on("mouse:up", onUp);
  canvas.on("path:created", onPathCreated as never);
  canvas.on("object:modified", onModified);
  canvas.on("text:editing:exited", onEditingExited as never);
  canvas.on("selection:created", onSelection);
  canvas.on("selection:updated", onSelection);
  canvas.on("selection:cleared", onCleared);

  return () => {
    canvas.off();
  };
}
