/**
 * What the document viewer can show, decided from a file's name and type.
 * Everything is read in the browser; only old Office formats (.doc, .xls,
 * .ppt, OpenDocument) are converted to the modern one on the server first.
 */
export type ViewKind = "pdf" | "image" | "docx" | "xlsx" | "csv" | "pptx" | "markdown" | "text";

const EXT_KIND: Record<string, ViewKind> = {
  pdf: "pdf",
  jpg: "image", jpeg: "image", png: "image", webp: "image", gif: "image", bmp: "image", svg: "image", avif: "image", ico: "image", heic: "image", heif: "image",
  docx: "docx", doc: "docx", odt: "docx", rtf: "docx",
  xlsx: "xlsx", xlsm: "xlsx", xls: "xlsx", ods: "xlsx",
  csv: "csv", tsv: "csv",
  pptx: "pptx", ppt: "pptx", odp: "pptx",
  md: "markdown", markdown: "markdown",
  txt: "text", log: "text", json: "text", xml: "text", yaml: "text", yml: "text", ini: "text", html: "text", htm: "text", css: "text", js: "text", ts: "text",
};

const MIME_KIND: Record<string, ViewKind> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "docx",
  "application/vnd.oasis.opendocument.text": "docx",
  "application/rtf": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xlsx",
  "application/vnd.oasis.opendocument.spreadsheet": "xlsx",
  "text/csv": "csv",
  "text/tab-separated-values": "csv",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-powerpoint": "pptx",
  "application/vnd.oasis.opendocument.presentation": "pptx",
  "text/markdown": "markdown",
  "application/json": "text",
};

export const extOf = (name: string) => (name.includes(".") ? (name.split(".").pop() ?? "").toLowerCase() : "");

/** How to show a file, or null when the viewer can't open it. Extension wins over a generic MIME type. */
export function viewKind(name: string, mime = ""): ViewKind | null {
  const byExt = EXT_KIND[extOf(name)];
  if (byExt) return byExt;
  const type = mime.toLowerCase().split(";")[0].trim();
  if (MIME_KIND[type]) return MIME_KIND[type];
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("text/")) return "text";
  return null;
}

/** File picker filter: every extension the viewer opens. */
export const VIEWER_ACCEPT = Object.keys(EXT_KIND)
  .map((e) => `.${e}`)
  .join(",");

/** Plain-words label for the file type, shown in the header. */
export const KIND_LABEL: Record<ViewKind, string> = {
  pdf: "PDF",
  image: "Image",
  docx: "Word document",
  xlsx: "Spreadsheet",
  csv: "CSV table",
  pptx: "Presentation",
  markdown: "Markdown",
  text: "Text",
};

/** The editor that can change this kind of file, if there is one. */
export const EDITOR_FOR: Partial<Record<ViewKind, { href: string; label: string }>> = {
  pdf: { href: "/editor", label: "Edit PDF" },
  docx: { href: "/write", label: "Edit in Word editor" },
  xlsx: { href: "/sheets", label: "Edit in Excel editor" },
  csv: { href: "/sheets", label: "Edit in Excel editor" },
  pptx: { href: "/slides", label: "Edit in PowerPoint editor" },
};

/** Files larger than this aren't read as text (a browser tab would struggle). */
export const MAX_TEXT_BYTES = 5 * 1024 * 1024;

/**
 * Only http(s) links can be opened with ?url=. Returns the cleaned URL or null.
 * The file is fetched by the browser, so the other site must allow it (CORS).
 */
export function safeDocUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** A file name for a document opened from a link. */
export function nameFromUrl(url: string, fallback = "document"): string {
  try {
    const last = decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).pop() ?? "");
    return last || fallback;
  } catch {
    return fallback;
  }
}
