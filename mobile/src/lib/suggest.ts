import type { PickedFile } from "./files";
import { NATIVE } from "./native";
import { TOOLS, accepts, type FileKind, type ToolDef } from "./tools";

/** Best first choices per kind of file; anything else that fits follows. */
export const PREFERRED: Record<FileKind, string[]> = {
  pdf: ["edit-pdf", "merge-pdf", "compress-pdf", "pdf-to-word", "split-pdf", "sign-pdf", "rotate-pdf", "page-numbers"],
  image: ["jpg-to-pdf", "compress-image", "resize-image", "image-editor", "convert-image", "crop-image"],
  document: ["word-to-pdf", "excel-to-pdf", "powerpoint-to-pdf", "word-editor", "excel-editor", "powerpoint-editor"],
};

/** Tools that can take these files, best first (the viewers are left out). */
export function toolsFor(files: PickedFile[]): ToolDef[] {
  if (!files.length) return [];
  const order = PREFERRED[files[0].kind];
  const at = (t: ToolDef) => (order.includes(t.slug) ? order.indexOf(t.slug) : order.length + TOOLS.indexOf(t));
  // The app's own image and PDF tools take any photo (HEIC too) or PDF, not just the website's formats.
  const fits = (t: ToolDef, f: PickedFile) => accepts(t, f.name, f.mimeType) || (NATIVE[t.slug] && NATIVE[t.slug].pick !== "document" && NATIVE[t.slug].pick === f.kind);
  return TOOLS.filter((t) => t.status === "ready" && t.category !== "view" && (files.length === 1 || t.multiple) && files.every((f) => fits(t, f))).sort((a, b) => at(a) - at(b));
}
