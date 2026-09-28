"use client";

import {
  ActiveSelection,
  Canvas,
  Ellipse,
  FabricImage,
  FabricObject,
  Group,
  Path,
  Rect,
  Textbox,
  Triangle,
  util,
} from "fabric";
import type {
  CommentObject,
  EditorObject,
  EditorPage,
  FontFamily,
  ImageObject,
  MarkupObject,
  PathObject,
  Rect as R,
  ShapeObject,
  TextObject,
} from "./types";
import { linePath } from "../pdf/geometry";
import { objectBounds } from "./objects";

/** Fabric objects carry a back-reference to the model object they render. */
export type Tagged = FabricObject & { editorId?: string; __model?: EditorObject };

export const CSS_FONTS: Record<FontFamily, string> = {
  Helvetica: "Helvetica, Arial, sans-serif",
  Times: '"Times New Roman", Times, serif',
  Courier: '"Courier New", Courier, monospace',
};

const SELECTION_STYLE = {
  borderColor: "#2f54eb",
  cornerColor: "#ffffff",
  cornerStrokeColor: "#2f54eb",
  cornerStyle: "circle" as const,
  cornerSize: 10,
  transparentCorners: false,
  borderScaleFactor: 1.5,
  padding: 2,
};

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image failed to load"));
      img.src = src;
    });
    imageCache.set(src, p);
  }
  return p;
}

const positioned = (o: { cx: number; cy: number; angle: number; opacity: number }) => ({
  left: o.cx,
  top: o.cy,
  originX: "center" as const,
  originY: "center" as const,
  angle: o.angle,
  opacity: o.opacity,
});

function markupGroup(o: MarkupObject): Group {
  const parts: FabricObject[] = [];
  for (const r of o.rects) {
    // Transparent hit area so thin underline/strike marks are easy to select.
    parts.push(new Rect({ left: r.x, top: r.y, width: r.w, height: r.h, fill: "rgba(0,0,0,0.001)", strokeWidth: 0 }));
    if (o.style === "highlight") {
      parts.push(
        new Rect({
          left: r.x,
          top: r.y,
          width: r.w,
          height: r.h,
          fill: o.color,
          opacity: o.opacity,
          strokeWidth: 0,
          globalCompositeOperation: "multiply",
        }),
      );
    } else {
      const t = Math.max(0.8, r.h * 0.07);
      const y = o.style === "underline" ? r.y + r.h * 0.88 - t : r.y + r.h * 0.55 - t / 2;
      parts.push(new Rect({ left: r.x, top: y, width: r.w, height: t, fill: o.color, strokeWidth: 0 }));
    }
  }
  return new Group(parts, {
    lockMovementX: true,
    lockMovementY: true,
    lockRotation: true,
    lockScalingX: true,
    lockScalingY: true,
    hasControls: false,
    hoverCursor: "pointer",
    subTargetCheck: false,
  });
}

function commentGroup(o: CommentObject): Group {
  const box = new Rect({
    left: -11,
    top: -11,
    width: 22,
    height: 22,
    rx: 4,
    ry: 4,
    fill: o.color,
    stroke: "#a16207",
    strokeWidth: 1,
    shadow: undefined,
  });
  const lines = [0, 1, 2].map(
    (i) => new Rect({ left: -6, top: -5 + i * 4, width: i === 2 ? 8 : 12, height: 1.6, fill: "#713f12", strokeWidth: 0 }),
  );
  return new Group([box, ...lines], {
    ...positioned({ cx: o.cx, cy: o.cy, angle: 0, opacity: 1 }),
    hasControls: false,
    lockRotation: true,
    lockScalingX: true,
    lockScalingY: true,
    hoverCursor: "pointer",
  });
}

export async function createFabricObject(o: EditorObject): Promise<Tagged> {
  let fo: FabricObject;
  switch (o.type) {
    case "text":
      fo = new Textbox(o.text, {
        ...positioned(o),
        width: o.width,
        fontSize: o.fontSize,
        fontFamily: CSS_FONTS[o.fontFamily],
        fontWeight: o.bold ? "bold" : "normal",
        fontStyle: o.italic ? "italic" : "normal",
        underline: o.underline,
        fill: o.color,
        textAlign: o.align,
        lineHeight: o.lineHeight,
        charSpacing: o.letterSpacing,
        splitByGrapheme: false,
        editingBorderColor: "#2f54eb",
        cursorColor: "#2f54eb",
        lockScalingFlip: true,
      });
      break;
    case "image": {
      const el = await loadImage(o.src);
      fo = new FabricImage(el, {
        ...positioned(o),
        scaleX: o.width / el.naturalWidth,
        scaleY: o.height / el.naturalHeight,
        flipX: o.flipX,
        flipY: o.flipY,
        lockScalingFlip: true,
      });
      break;
    }
    case "shape":
      fo = shapeObject(o);
      break;
    case "path":
      fo = new Path(o.d, {
        ...positioned(o),
        scaleX: o.scaleX,
        scaleY: o.scaleY,
        fill: "",
        stroke: o.stroke,
        strokeWidth: o.strokeWidth,
        strokeLineCap: "round",
        strokeLineJoin: "round",
        globalCompositeOperation: o.mode === "highlighter" ? "multiply" : "source-over",
      });
      break;
    case "markup":
      fo = markupGroup(o);
      break;
    case "comment":
      fo = commentGroup(o);
      break;
    case "redact":
    case "whiteout": {
      const r = o.rect;
      fo = new Rect({
        left: r.x + r.w / 2,
        top: r.y + r.h / 2,
        originX: "center",
        originY: "center",
        width: r.w,
        height: r.h,
        fill: o.type === "redact" ? "#0b0b0b" : o.color,
        stroke: o.type === "redact" ? "#ef4444" : undefined,
        strokeWidth: o.type === "redact" ? 1 : 0,
        strokeDashArray: o.type === "redact" ? [4, 3] : undefined,
        strokeUniform: true,
        lockRotation: true,
      });
      fo.setControlVisible("mtr", false);
      break;
    }
  }
  fo.set(SELECTION_STYLE);
  const tagged = fo as Tagged;
  tagged.editorId = o.id;
  tagged.__model = o;
  return tagged;
}

function shapeObject(o: ShapeObject): FabricObject {
  const common = {
    ...positioned(o),
    fill: o.fill === "transparent" ? "" : o.fill,
    stroke: o.stroke === "transparent" ? undefined : o.stroke,
    strokeWidth: o.strokeWidth,
    strokeUniform: true,
    lockScalingFlip: true,
  };
  switch (o.shape) {
    case "rect":
      return new Rect({ ...common, width: o.width, height: o.height });
    case "ellipse":
      return new Ellipse({ ...common, rx: o.width / 2, ry: o.height / 2 });
    case "triangle":
      return new Triangle({ ...common, width: o.width, height: o.height });
    case "line":
    case "arrow": {
      const p = new Path(linePath(o.shape, o.width, o.strokeWidth), {
        ...common,
        fill: "",
        stroke: o.stroke,
        strokeLineCap: "round",
        strokeLineJoin: "round",
        lockScalingY: true,
        padding: 6,
      });
      p.setControlsVisibility({ mt: false, mb: false, tl: false, tr: false, bl: false, br: false });
      return p;
    }
  }
}

const round = (n: number, p = 2) => Math.round(n * 10 ** p) / 10 ** p;

/**
 * Read an object's transform back into the model. Works for objects inside an
 * ActiveSelection too (uses the full transform matrix, not left/top).
 */
export function readFabricObject(fo: Tagged): EditorObject {
  const model = fo.__model!;
  const d = util.qrDecompose(fo.calcTransformMatrix());
  const cx = round(d.translateX);
  const cy = round(d.translateY);
  const angle = round(((d.angle % 360) + 360) % 360);
  const sx = Math.abs(d.scaleX);
  const sy = Math.abs(d.scaleY);

  switch (model.type) {
    case "text": {
      const tb = fo as Textbox;
      const scaled = Math.abs(sx - 1) > 0.001 || Math.abs(sy - 1) > 0.001;
      const out: TextObject = {
        ...model,
        text: tb.text ?? "",
        cx,
        cy,
        angle,
        width: round(tb.width * sx),
        height: round(tb.height * sy),
        fontSize: scaled ? round(model.fontSize * sy, 1) : model.fontSize,
      };
      return out;
    }
    case "image": {
      const out: ImageObject = {
        ...model,
        cx,
        cy,
        angle,
        width: round(fo.width * sx),
        height: round(fo.height * sy),
        flipX: !!fo.flipX,
        flipY: !!fo.flipY,
      };
      return out;
    }
    case "shape": {
      const baseW = model.shape === "ellipse" ? (fo as Ellipse).rx * 2 : model.shape === "line" || model.shape === "arrow" ? model.width : fo.width;
      const baseH = model.shape === "ellipse" ? (fo as Ellipse).ry * 2 : fo.height;
      // Line paths are created at the model width, so fo.scaleX is relative.
      const lineScale = model.shape === "line" || model.shape === "arrow" ? sx : null;
      return {
        ...model,
        cx,
        cy,
        angle,
        width: round(lineScale !== null ? baseW * lineScale : baseW * sx),
        height: model.shape === "line" || model.shape === "arrow" ? 0 : round(baseH * sy),
      };
    }
    case "path": {
      const out: PathObject = { ...model, cx, cy, angle, scaleX: round(sx, 4), scaleY: round(sy, 4), width: round(fo.width * sx), height: round(fo.height * sy) };
      return out;
    }
    case "markup": {
      const b = objectBounds(model);
      const dx = cx - (b.x + b.w / 2);
      const dy = cy - (b.y + b.h / 2);
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return model;
      return { ...model, rects: model.rects.map((r) => ({ ...r, x: round(r.x + dx), y: round(r.y + dy) })) };
    }
    case "comment":
      return { ...model, cx, cy };
    case "redact":
    case "whiteout": {
      const w = round(fo.width * sx);
      const h = round(fo.height * sy);
      const rect: R = { x: round(cx - w / 2), y: round(cy - h / 2), w, h };
      return { ...model, rect };
    }
  }
}

/** Convert a freehand Fabric path into a centered, model-friendly SVG path. */
export function pathToLocalD(path: Path): { d: string; cx: number; cy: number; width: number; height: number } {
  const off = path.pathOffset;
  const d = (path.path as unknown as (string | number)[][])
    .map((seg) => {
      const [cmd, ...nums] = seg as [string, ...number[]];
      const rel = nums.map((n, i) => round(n - (i % 2 === 0 ? off.x : off.y), 2));
      return `${cmd} ${rel.join(" ")}`;
    })
    .join(" ");
  const center = path.getCenterPoint();
  return { d, cx: round(center.x), cy: round(center.y), width: path.width, height: path.height };
}

// ─── Reconciliation ─────────────────────────────────────────────────

type SyncCanvas = Canvas & { __syncChain?: Promise<void>; __syncQueued?: boolean };

/**
 * Bring the Fabric canvas in line with the page model. Objects whose model
 * reference is unchanged are left alone; changed ones are recreated.
 * Calls are serialized per canvas and coalesced.
 */
export function syncCanvas(
  canvas: Canvas,
  getPage: () => EditorPage | undefined,
  after?: (canvas: Canvas) => void,
): Promise<void> {
  const c = canvas as SyncCanvas;
  if (c.__syncQueued) return c.__syncChain ?? Promise.resolve();
  c.__syncQueued = true;
  c.__syncChain = (c.__syncChain ?? Promise.resolve()).then(async () => {
    c.__syncQueued = false;
    const page = getPage();
    if (!page || (canvas as unknown as { disposed?: boolean }).disposed) return;
    await reconcile(canvas, page);
    after?.(canvas);
  }).catch((err) => console.error("[fabric sync]", err));
  return c.__syncChain;
}

async function reconcile(canvas: Canvas, page: EditorPage) {
  const current = canvas.getObjects() as Tagged[];
  const byId = new Map(current.map((o) => [o.editorId, o]));
  const wanted = new Set(page.objects.map((o) => o.id));

  const stale = current.filter((o) => !o.editorId || !wanted.has(o.editorId) || o.__model !== page.objects.find((m) => m.id === o.editorId));
  if (stale.length === 0 && current.length === page.objects.length && current.every((o, i) => o.editorId === page.objects[i].id)) {
    return; // nothing to do
  }

  // Changing objects inside a multi-selection would corrupt group coordinates.
  const active = canvas.getActiveObject();
  const editing = active instanceof Textbox && active.isEditing ? active : null;
  if (active instanceof ActiveSelection && active.getObjects().some((o) => stale.includes(o as Tagged))) {
    canvas.discardActiveObject();
  }

  // Build replacements first (image creation is async).
  const created = new Map<string, Tagged>();
  await Promise.all(
    page.objects.map(async (m) => {
      const existing = byId.get(m.id);
      if (existing && existing.__model === m) return;
      if (existing && existing === editing) {
        // Don't yank a textbox out from under the user mid-edit.
        existing.__model = m;
        return;
      }
      try {
        created.set(m.id, await createFabricObject(m));
      } catch (err) {
        console.warn("Could not render object", m.id, err);
      }
    }),
  );

  const wasActiveId = (canvas.getActiveObject() as Tagged | undefined)?.editorId;
  for (const o of current) {
    if (!o.editorId || !wanted.has(o.editorId) || created.has(o.editorId)) {
      if (canvas.getActiveObject() === o) canvas.discardActiveObject();
      canvas.remove(o);
    }
  }
  for (const [, fo] of created) canvas.add(fo);

  // Enforce z-order to match the model.
  page.objects.forEach((m, i) => {
    const fo = created.get(m.id) ?? byId.get(m.id);
    if (fo && canvas.getObjects().indexOf(fo) !== i) canvas.moveObjectTo(fo, i);
  });

  if (wasActiveId && created.has(wasActiveId)) canvas.setActiveObject(created.get(wasActiveId)!);
  canvas.requestRenderAll();
}

export function findById(canvas: Canvas, id: string): Tagged | undefined {
  return (canvas.getObjects() as Tagged[]).find((o) => o.editorId === id);
}
