/** Presentation model for the PowerPoint editor. Sizes and positions are CSS pixels (96 per inch). */
import type { JSONContent } from "@tiptap/core";

export type { JSONContent };

export type ShapeKind =
  | "rect" | "roundRect" | "ellipse" | "triangle" | "rtTriangle" | "diamond" | "pentagon" | "hexagon" | "octagon" | "star5"
  | "rightArrow" | "leftArrow" | "upArrow" | "downArrow" | "chevron" | "parallelogram" | "trapezoid" | "heart" | "line";

interface Base {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees clockwise. */
  rot: number;
  flipH?: boolean;
  flipV?: boolean;
  /** Came from the slide master/layout: not selectable until unlocked. */
  locked?: boolean;
}

export interface BoxEl extends Base {
  type: "box";
  shape: ShapeKind | "none";
  fill: string | null;
  /** 0–1 */
  fillAlpha?: number;
  stroke: string | null;
  strokeW: number;
  /** Rich text (TipTap JSON), or null for a plain shape. */
  text: JSONContent | null;
  valign: "top" | "middle" | "bottom";
  /** Inner padding: left, top, right, bottom. */
  pad: [number, number, number, number];
  /** Hint shown while the text is empty ("Click to add title"). */
  hint?: string;
  /** Base text colour, size (pt) and font for text without its own. */
  color?: string;
  size?: number;
  font?: string;
}

export interface ImageEl extends Base {
  type: "image";
  src: string;
}

export interface TableCell {
  text: string;
  fill?: string;
  color?: string;
  bold?: boolean;
  align?: "left" | "center" | "right";
  colspan?: number;
  rowspan?: number;
  /** Covered by a merged cell. */
  merged?: boolean;
}

export interface TableEl extends Base {
  type: "table";
  cols: number[];
  rows: { h: number; cells: TableCell[] }[];
  border: string;
  size: number;
  font?: string;
}

/** Something the editor can't edit (a chart, SmartArt): shown as a labelled box, not saved. */
export interface PlaceholderEl extends Base {
  type: "unsupported";
  label: string;
}

export type El = BoxEl | ImageEl | TableEl | PlaceholderEl;

export interface Slide {
  id: string;
  background: { color?: string; image?: string };
  elements: El[];
  notes: string;
  hidden?: boolean;
}

export interface DeckTheme {
  id: string;
  name: string;
  heading: string;
  body: string;
  bg: string;
  text: string;
  accent: string;
  muted: string;
}

export interface Deck {
  width: number;
  height: number;
  theme: DeckTheme;
  slides: Slide[];
}

let n = 0;
export const uid = (p = "e") => `${p}${Date.now().toString(36)}${(n++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const THEMES: DeckTheme[] = [
  { id: "clean", name: "Clean", heading: "Aptos Display, Calibri, Arial, sans-serif", body: "Aptos, Calibri, Arial, sans-serif", bg: "#ffffff", text: "#1b1f2a", accent: "#2f54eb", muted: "#5b6170" },
  { id: "midnight", name: "Midnight", heading: "Georgia, serif", body: "Calibri, Arial, sans-serif", bg: "#0f172a", text: "#f8fafc", accent: "#fbbf24", muted: "#94a3b8" },
  { id: "sand", name: "Sand", heading: "Georgia, 'Times New Roman', serif", body: "Calibri, Arial, sans-serif", bg: "#f7f1e8", text: "#3b2f25", accent: "#c2410c", muted: "#7c6a58" },
  { id: "forest", name: "Forest", heading: "Trebuchet MS, Arial, sans-serif", body: "Trebuchet MS, Arial, sans-serif", bg: "#0f3d2e", text: "#ecfdf5", accent: "#34d399", muted: "#a7f3d0" },
];

export const WIDE = { width: 1280, height: 720 };
export const STANDARD = { width: 960, height: 720 };

const para = (text: string, marks?: JSONContent["marks"], align?: string): JSONContent => ({
  type: "paragraph",
  ...(align ? { attrs: { textAlign: align } } : {}),
  ...(text ? { content: [marks ? { type: "text", text, marks } : { type: "text", text }] } : {}),
});
export const textDoc = (...paras: JSONContent[]): JSONContent => ({ type: "doc", content: paras.length ? paras : [{ type: "paragraph" }] });
export const bullets = (items: string[]): JSONContent => ({ type: "doc", content: [{ type: "bulletList", content: items.map((t) => ({ type: "listItem", content: [para(t)] })) }] });

export function textBox(x: number, y: number, w: number, h: number, text: JSONContent | null, extra: Partial<BoxEl> = {}): BoxEl {
  return { id: uid(), type: "box", shape: "none", fill: null, stroke: null, strokeW: 0, x, y, w, h, rot: 0, text: text ?? textDoc(), valign: "top", pad: [10, 5, 10, 5], ...extra };
}

export const LAYOUTS = ["title", "content", "section", "two", "titleOnly", "blank"] as const;
export type LayoutId = (typeof LAYOUTS)[number];
export const LAYOUT_NAMES: Record<LayoutId, string> = { title: "Title slide", content: "Title and content", section: "Section header", two: "Two columns", titleOnly: "Title only", blank: "Blank" };

/** A new slide with placeholder boxes for a layout, sized to the deck. */
export function layoutSlide(deck: Pick<Deck, "width" | "height" | "theme">, layout: LayoutId): Slide {
  const { width: W, height: H, theme: t } = deck;
  const m = W * 0.06;
  const title = (y: number, h: number, size: number, extra: Partial<BoxEl> = {}) =>
    textBox(m, y, W - 2 * m, h, textDoc(), { hint: "Click to add title", size, font: t.heading, color: t.text, valign: "bottom", ...extra });
  const body = (x: number, w: number) => textBox(x, H * 0.27, w, H * 0.63, { type: "doc", content: [{ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph" }] }] }] }, { hint: "Click to add text", size: 24, font: t.body, color: t.text });
  const els: El[] = [];
  if (layout === "title") {
    els.push(title(H * 0.26, H * 0.26, 48, { valign: "bottom", text: textDoc(para("", undefined, "center")) }));
    els.push(textBox(m * 2, H * 0.55, W - 4 * m, H * 0.16, textDoc(para("", undefined, "center")), { hint: "Click to add subtitle", size: 24, font: t.body, color: t.muted }));
    els.push({ id: uid(), type: "box", shape: "rect", fill: t.accent, stroke: null, strokeW: 0, x: W / 2 - 40, y: H * 0.535, w: 80, h: 4, rot: 0, text: null, valign: "middle", pad: [0, 0, 0, 0] });
  } else if (layout === "content") {
    els.push(title(H * 0.05, H * 0.18, 36));
    els.push(body(m, W - 2 * m));
  } else if (layout === "section") {
    els.push(title(H * 0.3, H * 0.24, 44));
    els.push(textBox(m, H * 0.56, W - 2 * m, H * 0.12, textDoc(), { hint: "Click to add text", size: 22, font: t.body, color: t.muted }));
  } else if (layout === "two") {
    els.push(title(H * 0.05, H * 0.18, 36));
    const gap = W * 0.04;
    const colW = (W - 2 * m - gap) / 2;
    els.push(body(m, colW), body(m + colW + gap, colW));
  } else if (layout === "titleOnly") {
    els.push(title(H * 0.05, H * 0.18, 36));
  }
  return { id: uid("s"), background: { color: t.bg }, elements: els, notes: "" };
}

export function newDeck(theme: DeckTheme = THEMES[0], size = WIDE): Deck {
  const deck: Deck = { ...size, theme, slides: [] };
  deck.slides.push(layoutSlide(deck, "title"));
  return deck;
}

/** Plain text of a TipTap document (for "is it empty" checks and notes). */
export function plainText(doc: JSONContent | null | undefined): string {
  if (!doc) return "";
  if (doc.type === "text") return doc.text ?? "";
  const inner = (doc.content ?? []).map(plainText);
  return ["paragraph", "heading", "listItem"].includes(doc.type ?? "") ? `${inner.join("")}\n` : inner.join("");
}
