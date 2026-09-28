import { nanoid } from "nanoid";
import type {
  EditorObject,
  EditorPage,
  ImageObject,
  Rect,
  ShapeKind,
  ShapeObject,
  TextObject,
} from "./types";
import { viewSize } from "./types";

export const newId = () => nanoid(10);

export const DEFAULT_TEXT: Omit<TextObject, "id" | "cx" | "cy" | "width" | "height"> = {
  type: "text",
  text: "",
  angle: 0,
  opacity: 1,
  fontFamily: "Helvetica",
  fontSize: 16,
  bold: false,
  italic: false,
  underline: false,
  color: "#111827",
  align: "left",
  lineHeight: 1.16,
  letterSpacing: 0,
};

export function createText(x: number, y: number, overrides: Partial<TextObject> = {}): TextObject {
  const width = overrides.width ?? 220;
  const fontSize = overrides.fontSize ?? DEFAULT_TEXT.fontSize;
  const height = fontSize * 1.3;
  return {
    ...DEFAULT_TEXT,
    id: newId(),
    cx: x + width / 2,
    cy: y + height / 2,
    width,
    height,
    ...overrides,
  };
}

export function createShape(shape: ShapeKind, r: Rect, style: Partial<ShapeObject> = {}): ShapeObject {
  return {
    id: newId(),
    type: "shape",
    shape,
    cx: r.x + r.w / 2,
    cy: r.y + r.h / 2,
    width: r.w,
    height: r.h,
    angle: 0,
    opacity: 1,
    fill: "transparent",
    stroke: "#2563eb",
    strokeWidth: 2,
    ...style,
  };
}

/** Line / arrow from two points: stored as a horizontal segment + angle. */
export function createLine(
  shape: "line" | "arrow",
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style: Partial<ShapeObject> = {},
): ShapeObject {
  const len = Math.hypot(x2 - x1, y2 - y1);
  return {
    id: newId(),
    type: "shape",
    shape,
    cx: (x1 + x2) / 2,
    cy: (y1 + y2) / 2,
    width: Math.max(len, 1),
    height: 0,
    angle: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI,
    opacity: 1,
    fill: "transparent",
    stroke: "#2563eb",
    strokeWidth: 2,
    ...style,
  };
}

/** Place an image centered on the page, scaled to fit at most `maxFrac` of it. */
export function createImage(
  page: EditorPage,
  src: string,
  naturalW: number,
  naturalH: number,
  opts: { maxFrac?: number; isSignature?: boolean; center?: { x: number; y: number } } = {},
): ImageObject {
  const view = viewSize(page);
  const maxFrac = opts.maxFrac ?? 0.5;
  const scale = Math.min(1, (view.width * maxFrac) / naturalW, (view.height * maxFrac) / naturalH);
  return {
    id: newId(),
    type: "image",
    src,
    cx: opts.center?.x ?? view.width / 2,
    cy: opts.center?.y ?? view.height / 2,
    width: naturalW * scale,
    height: naturalH * scale,
    angle: 0,
    opacity: 1,
    flipX: false,
    flipY: false,
    isSignature: opts.isSignature,
  };
}

export function cloneObject<T extends EditorObject>(obj: T, offset = 0): T {
  const copy = structuredClone(obj);
  copy.id = newId();
  if (offset) translateObject(copy, offset, offset);
  return copy;
}

export function translateObject(obj: EditorObject, dx: number, dy: number) {
  switch (obj.type) {
    case "markup":
      obj.rects = obj.rects.map((r) => ({ ...r, x: r.x + dx, y: r.y + dy }));
      break;
    case "redact":
    case "whiteout":
      obj.rect = { ...obj.rect, x: obj.rect.x + dx, y: obj.rect.y + dy };
      break;
    default:
      obj.cx += dx;
      obj.cy += dy;
  }
}

/**
 * Rotate an object together with its page. `delta` is +90 (clockwise),
 * -90 or 180. `w`/`h` are the page's view size BEFORE rotation.
 */
export function rotateObjectWithPage(obj: EditorObject, delta: number, w: number, h: number): EditorObject {
  const d = ((delta % 360) + 360) % 360;
  const pt = (x: number, y: number): [number, number] => {
    if (d === 90) return [h - y, x];
    if (d === 180) return [w - x, h - y];
    if (d === 270) return [y, w - x];
    return [x, y];
  };
  const rect = (r: Rect): Rect => {
    const [ax, ay] = pt(r.x, r.y);
    const [bx, by] = pt(r.x + r.w, r.y + r.h);
    return { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) };
  };
  const o = structuredClone(obj);
  switch (o.type) {
    case "markup":
      o.rects = o.rects.map(rect);
      return o;
    case "redact":
    case "whiteout":
      o.rect = rect(o.rect);
      return o;
    case "comment": {
      [o.cx, o.cy] = pt(o.cx, o.cy);
      return o;
    }
    default: {
      [o.cx, o.cy] = pt(o.cx, o.cy);
      o.angle = (((o.angle + d) % 360) + 360) % 360;
      return o;
    }
  }
}

/** Axis-aligned bounds, used for "select all" and search scrolling. */
export function objectBounds(obj: EditorObject): Rect {
  switch (obj.type) {
    case "markup": {
      const xs = obj.rects.flatMap((r) => [r.x, r.x + r.w]);
      const ys = obj.rects.flatMap((r) => [r.y, r.y + r.h]);
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    case "redact":
    case "whiteout":
      return obj.rect;
    case "comment":
      return { x: obj.cx - 12, y: obj.cy - 12, w: 24, h: 24 };
    default:
      return { x: obj.cx - obj.width / 2, y: obj.cy - obj.height / 2, w: obj.width, h: obj.height };
  }
}

export const OBJECT_LABELS: Record<EditorObject["type"], string> = {
  text: "Text",
  image: "Image",
  shape: "Shape",
  path: "Drawing",
  markup: "Markup",
  comment: "Comment",
  redact: "Redaction",
  whiteout: "Whiteout",
};

export const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#facc15" },
  { name: "Green", value: "#4ade80" },
  { name: "Blue", value: "#60a5fa" },
  { name: "Pink", value: "#f472b6" },
  { name: "Orange", value: "#fb923c" },
];
