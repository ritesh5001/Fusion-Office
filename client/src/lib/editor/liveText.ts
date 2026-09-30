/**
 * The text box being edited on the page, so the properties panel can format
 * just the selected letters (bold, italic, underline, colour) instead of the
 * whole box.
 */
import type { Textbox } from "fabric";
import { cssFont, type FabricCharStyle } from "./fabricAdapter";
import type { TextObject } from "./types";

interface LiveText {
  id: string;
  tb: Textbox;
  /** Save the textbox (text, styles, width) to the document. */
  commit: (label?: string) => void;
}

let live: LiveText | null = null;

export const setLiveText = (v: LiveText | null) => {
  live = v;
};

/**
 * Save the text box being edited, if any. Call before exporting: typing and
 * panel changes are otherwise only saved when editing ends, and focus may be
 * in the panel (so Esc never reached the text).
 */
export function flushLiveText() {
  if (live?.tb.isEditing) live.commit("Edit text");
}

export type SelectionStyle = { kind: "bold" | "italic" | "underline" } | { kind: "color"; value: string };

/**
 * Apply a style to the selected letters of text object `o`. Returns false when
 * nothing is selected (the caller then styles the whole box).
 */
export function styleSelection(o: TextObject, style: SelectionStyle): boolean {
  if (!live || live.id !== o.id) return false;
  const { tb } = live;
  const start = Math.min(tb.selectionStart, tb.selectionEnd);
  const end = Math.max(tb.selectionStart, tb.selectionEnd);
  if (!tb.isEditing || start === end) return false;

  const current = tb.getSelectionStyles(start, end, true) as FabricCharStyle[];
  const bold = (c: FabricCharStyle) => c.foBold ?? o.bold;
  const italic = (c: FabricCharStyle) => c.foItalic ?? o.italic;
  const underline = (c: FabricCharStyle) => c.foUnderline ?? o.underline;
  // Toggle: if every selected letter already has it, take it off.
  const on =
    style.kind === "bold" ? !current.every(bold) : style.kind === "italic" ? !current.every(italic) : style.kind === "underline" ? !current.every(underline) : true;

  current.forEach((c, i) => {
    let patch: FabricCharStyle;
    if (style.kind === "bold" || style.kind === "italic") {
      const b = style.kind === "bold" ? on : bold(c);
      const it = style.kind === "italic" ? on : italic(c);
      // Restyled letters use the standard font, which has real bold and italic.
      patch = {
        foFont: "",
        foBold: b,
        foItalic: it,
        fontFamily: cssFont("", o.fontFamily),
        fontWeight: b ? "bold" : "normal",
        fontStyle: it ? "italic" : "normal",
      };
    } else if (style.kind === "underline") {
      patch = { underline: on, foUnderline: on };
    } else if (style.kind === "color") {
      patch = { fill: style.value, foColor: style.value };
    } else return;
    tb.setSelectionStyles(patch, start + i, start + i + 1);
  });
  tb.initDimensions();
  tb.setCoords();
  tb.canvas?.requestRenderAll();
  live.commit("Format text");
  return true;
}
