/**
 * Hands files dropped on the homepage to the tool the user then picks.
 *
 * Client-side navigation keeps this module alive, so the files never leave
 * memory (nothing is uploaded or stored). The receiving page takes them once,
 * and only if it is the page they were meant for.
 */
import type { ToolDef } from "./registry";

interface Pending {
  path: string;
  files: File[];
  at: number;
}

let pending: Pending | null = null;

/** Files left unclaimed this long (ms) are dropped. */
const TTL = 2 * 60 * 1000;

export function handFiles(path: string, files: File[]) {
  pending = files.length ? { path, files, at: Date.now() } : null;
}

/** Files waiting for the current page, if any. Clears them. */
export function takeFiles(): File[] | null {
  if (!pending || typeof window === "undefined") return null;
  const { path, files, at } = pending;
  if (Date.now() - at > TTL) {
    pending = null;
    return null;
  }
  if (window.location.pathname !== path) return null;
  pending = null;
  return files;
}

/** Tools whose page has no file picker to receive a handed-over file. */
const NO_PICKER = new Set(["scan-to-pdf", "gst-invoice"]);

export const toolPath = (t: Pick<ToolDef, "slug" | "href">) => t.href ?? `/tools/${t.slug}`;

/** Does `tool` take `file` (by extension or MIME type, per its accept list)? */
export function accepts(tool: Pick<ToolDef, "slug" | "accept">, file: File): boolean {
  if (!tool.accept || NO_PICKER.has(tool.slug)) return false;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tool.accept
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .some((a) => (a.startsWith(".") ? name.endsWith(a) : a.endsWith("/*") ? type.startsWith(a.slice(0, -1)) : a === type));
}

/** File kinds the homepage drop area can be narrowed to. */
export type FileKind = "pdf" | "document" | "image";

export const KIND_ACCEPT: Record<FileKind, string> = {
  pdf: "application/pdf,.pdf",
  document: ".docx,.doc,.odt,.rtf,.xlsx,.xls,.ods,.csv,.pptx,.ppt,.odp,.md,.markdown,.txt,.epub,.html,.htm",
  image: "image/*,.heic,.heif,.avif",
};

export function kindOf(file: File): FileKind {
  const n = file.name.toLowerCase();
  if (file.type === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (file.type.startsWith("image/") || /\.(heic|heif|avif)$/.test(n)) return "image";
  return "document";
}
