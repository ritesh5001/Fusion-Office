/** Document model shared by the Word editor, the DOCX reader and the DOCX writer. */
import type { JSONContent } from "@tiptap/core";

export type { JSONContent };

export interface PageSetup {
  /** Page size and margins in points (1/72 inch). */
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
}

export interface DocMeta {
  page: PageSetup;
  /** Body font and size (pt) used where the text doesn't set its own. */
  font: string;
  fontSize: number;
}

export interface WordDoc {
  meta: DocMeta;
  content: JSONContent;
}

export const A4: PageSetup = { width: 595.3, height: 841.9, margin: { top: 72, right: 72, bottom: 72, left: 72 } };
export const LETTER: PageSetup = { width: 612, height: 792, margin: { top: 72, right: 72, bottom: 72, left: 72 } };

export const DEFAULT_META: DocMeta = { page: A4, font: "Calibri", fontSize: 11 };

export const emptyDoc = (): JSONContent => ({ type: "doc", content: [{ type: "paragraph" }] });

/** Word's highlight colour names → hex. */
export const HIGHLIGHT_HEX: Record<string, string> = {
  yellow: "#ffff00", green: "#00ff00", cyan: "#00ffff", magenta: "#ff00ff", blue: "#0000ff", red: "#ff0000",
  darkBlue: "#000080", darkCyan: "#008080", darkGreen: "#008000", darkMagenta: "#800080", darkRed: "#800000",
  darkYellow: "#808000", darkGray: "#808080", lightGray: "#c0c0c0", black: "#000000", white: "#ffffff",
};
