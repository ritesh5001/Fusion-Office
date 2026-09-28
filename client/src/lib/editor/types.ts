/**
 * Editor data model.
 *
 * The original PDF bytes are never mutated while editing. The editor keeps a
 * list of pages (each pointing at a page in a source PDF, or a blank page) and
 * a list of user objects per page. Export combines the two with pdf-lib.
 *
 * Coordinate system ("view space"): PDF points (1/72 in), origin at the
 * top-left of the page *as displayed* (after rotation), y pointing down.
 * Positioned objects are stored by their center (cx, cy) plus an angle in
 * degrees clockwise — this makes page rotation and export transforms simple.
 */

export type ToolId =
  | "select"
  | "edittext"
  | "text"
  | "image"
  | "rect"
  | "ellipse"
  | "triangle"
  | "line"
  | "arrow"
  | "draw"
  | "highlighter"
  | "eraser"
  | "highlight"
  | "underline"
  | "strikeout"
  | "comment"
  | "signature"
  | "redact"
  | "whiteout";

export type FontFamily = "Helvetica" | "Times" | "Courier";
export type TextAlign = "left" | "center" | "right";

interface Positioned {
  id: string;
  cx: number;
  cy: number;
  width: number;
  height: number;
  /** degrees, clockwise */
  angle: number;
  /** 0..1 */
  opacity: number;
}

export interface TextObject extends Positioned {
  type: "text";
  text: string;
  fontFamily: FontFamily;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  align: TextAlign;
  lineHeight: number;
  /** 1/1000 em, same unit as Fabric's charSpacing */
  letterSpacing: number;
  /** Set when this text replaces a line that already exists in the PDF. */
  replaces?: ReplacedText;
}

/** The original text a replacement stands in for. */
export interface ReplacedText {
  original: string;
  /** Area of the original glyphs in the source page's PDF user space [x0, y0, x1, y1]. */
  userRect: [number, number, number, number];
  /** Same area in view space; follows page rotation. */
  rect: Rect;
  /** Colour behind the original text, used to hide it while editing. */
  background: string;
}

export interface ImageObject extends Positioned {
  type: "image";
  /** data: URL (PNG or JPEG) */
  src: string;
  flipX: boolean;
  flipY: boolean;
  /** signature images are regular images with a flag, for UI labelling */
  isSignature?: boolean;
}

export type ShapeKind = "rect" | "ellipse" | "triangle" | "line" | "arrow";

export interface ShapeObject extends Positioned {
  type: "shape";
  shape: ShapeKind;
  /** hex or "transparent" */
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface PathObject extends Positioned {
  type: "path";
  /** SVG path data, relative to the object's center, unscaled */
  d: string;
  scaleX: number;
  scaleY: number;
  stroke: string;
  strokeWidth: number;
  mode: "pen" | "highlighter";
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Highlight / underline / strikeout attached to text runs on the page. */
export interface MarkupObject {
  id: string;
  type: "markup";
  style: "highlight" | "underline" | "strikeout";
  rects: Rect[];
  color: string;
  opacity: number;
}

export interface CommentObject {
  id: string;
  type: "comment";
  cx: number;
  cy: number;
  text: string;
  author?: string;
  color: string;
  createdAt: number;
}

/** Redaction: the content under it is REMOVED on export (page is rasterized). */
export interface RedactObject {
  id: string;
  type: "redact";
  rect: Rect;
}

/** Whiteout: a visual cover. Underlying content remains in the file. */
export interface WhiteoutObject {
  id: string;
  type: "whiteout";
  rect: Rect;
  color: string;
}

export type EditorObject =
  | TextObject
  | ImageObject
  | ShapeObject
  | PathObject
  | MarkupObject
  | CommentObject
  | RedactObject
  | WhiteoutObject;

export type ObjectType = EditorObject["type"];

export type PageSource =
  | { kind: "pdf"; sourceId: string; pageIndex: number }
  | { kind: "blank" };

export interface EditorPage {
  id: string;
  source: PageSource;
  /** Unrotated page box size in points (the PDF's CropBox) */
  width: number;
  height: number;
  /** Rotation already present in the source PDF (/Rotate) */
  baseRotation: number;
  /** Rotation added by the user, multiple of 90 */
  rotation: number;
  objects: EditorObject[];
}

export interface SourceMeta {
  id: string;
  name: string;
  size: number;
}

export interface DocumentState {
  id: string;
  name: string;
  sources: SourceMeta[];
  pages: EditorPage[];
}

export const totalRotation = (p: Pick<EditorPage, "baseRotation" | "rotation">) =>
  (((p.baseRotation + p.rotation) % 360) + 360) % 360;

/** Page size as displayed (after rotation), in points. */
export const viewSize = (p: EditorPage) => {
  const r = totalRotation(p);
  return r === 90 || r === 270
    ? { width: p.height, height: p.width }
    : { width: p.width, height: p.height };
};
