import { CATEGORIES, type ToolDef } from "./registry";

/** Words people type that don't appear in the tool names. */
export const SYNONYMS: Record<string, string> = {
  combine: "merge",
  join: "merge",
  shrink: "compress",
  reduce: "compress",
  smaller: "compress",
  size: "compress resize",
  docx: "word",
  doc: "word",
  xlsx: "excel",
  xls: "excel",
  csv: "excel",
  spreadsheet: "excel",
  pptx: "powerpoint",
  ppt: "powerpoint",
  slides: "powerpoint",
  presentation: "powerpoint",
  jpeg: "jpg",
  png: "jpg image",
  photo: "image jpg",
  picture: "image jpg",
  password: "protect unlock",
  encrypt: "protect",
  decrypt: "unlock",
  signature: "sign",
  esign: "sign",
  delete: "organize remove",
  reorder: "organize",
  scan: "scan ocr",
  text: "ocr edit",
  number: "page numbers",
  ai: "summarizer translate",
  summary: "summarizer",
  hide: "redact",
  kb: "compress resize",
  interleave: "alternate",
  mix: "alternate",
  nup: "pages per sheet",
  booklet: "pages per sheet",
  mirror: "flip",
  half: "split in half",
  chapter: "bookmarks",
  hash: "fingerprint",
  checksum: "fingerprint",
  md5: "fingerprint",
  sha: "fingerprint",
  kindle: "epub",
  ebook: "epub ebook",
  dark: "invert",
  night: "invert",
  aadhar: "aadhaar",
  pii: "aadhaar redact",
  privacy: "privacy redact",
  properties: "metadata",
  author: "metadata",
  title: "metadata",
  footer: "headers",
  header: "headers",
  bates: "bates",
  legal: "bates",
  thumb: "thumbmark",
  fingerprint: "fingerprint thumbmark",
  handwritten: "handwriting",
  notes: "handwriting",
  gst: "gst",
  portal: "gst",
  md: "markdown",
  invoice: "invoice",
  bill: "invoice",
  billing: "invoice",
  tax: "gst",
  chat: "chat",
  ask: "chat",
  question: "chat",
  listen: "audio",
  speak: "audio",
  tts: "audio",
  voice: "audio",
  txt: "text",
};

/** Does `text` contain the word, or one of its synonyms? */
export const hit = (text: string, w: string) => text.includes(w) || (SYNONYMS[w] ?? "").split(" ").some((s) => s && text.includes(s));

/** Every word must match the tool's name, description or category (directly or through a synonym). */
export function matches(t: ToolDef, words: string[]) {
  const hay = `${t.name} ${t.description} ${CATEGORIES.find((c) => c.id === t.category)?.label ?? ""}`.toLowerCase();
  return words.every((w) => hit(hay, w));
}

/** Name matches first (synonyms count: "shrink pdf" finds Compress PDF), then ready tools before "soon". */
export function rank(t: ToolDef, words: string[]) {
  const name = t.name.toLowerCase();
  return (words.every((w) => hit(name, w)) ? 0 : 1) * 2 + (t.status === "soon" ? 1 : 0);
}

/** Tools matching a free-text query, best first. */
export function searchTools(tools: ToolDef[], query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return tools;
  return tools.filter((t) => matches(t, words)).sort((a, b) => rank(a, words) - rank(b, words));
}
