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
  iphone: "heic",
  heif: "heic",
  tif: "tiff",
  bg: "background",
  transparent: "background",
  cutout: "background",
  visa: "passport",
  kyc: "aadhaar",
  hra: "rent",
  landlord: "rent",
  payslip: "salary",
  payroll: "salary",
  quote: "quotation",
  estimate: "quotation",
  dispatch: "challan",
  passbook: "statement",
  tally: "statement",
  skew: "straighten",
  deskew: "straighten",
  tilt: "straighten",
  whitespace: "margins",
  empty: "blank",
  markup: "annotations",
  toc: "bookmarks",
  contents: "bookmarks",
  outline: "bookmarks",
  barcode: "qr",
  seal: "stamp",
  bw: "grayscale",
  mono: "grayscale",
  backwards: "reverse",
  tile: "poster",
  banner: "poster",
  enlarge: "poster",
  target: "exact",
  "50kb": "50",
  "100kb": "100",
  "200kb": "200",
};

/** Does `text` contain the word, or one of its synonyms? */
export const hit = (text: string, w: string) => text.includes(w) || (SYNONYMS[w] ?? "").split(" ").some((s) => s && text.includes(s));

/** Filler words that say nothing about which tool you want ("convert my jpg to pdf"). */
const FILLER = new Set(["a", "an", "the", "to", "into", "in", "my", "of", "for", "and", "with", "from", "on", "file", "files", "online", "free", "convert", "converter", "tool", "how", "i", "want"]);

/** The words of a query worth matching (lower case, filler removed; falls back to all words). */
export function queryWords(query: string) {
  const all = query.toLowerCase().replace(/[^\p{L}\p{N}\s.+-]/gu, " ").split(/\s+/).filter(Boolean);
  const useful = all.filter((w) => !FILLER.has(w));
  return useful.length ? useful : all;
}

// Each tool's searchable text, built once.
const HAY = new WeakMap<ToolDef, { name: string; all: string; tokens: string[] }>();
function hay(t: ToolDef) {
  let h = HAY.get(t);
  if (!h) {
    const name = t.name.toLowerCase();
    const all = `${name} ${t.description} ${CATEGORIES.find((c) => c.id === t.category)?.label ?? ""}`.toLowerCase();
    h = { name, all, tokens: all.split(/[^\p{L}\p{N}]+/u).filter((x) => x.length > 2) };
    HAY.set(t, h);
  }
  return h;
}

/** At most one letter added, missing or changed (a typo), for words of 4+ letters. */
function nearlyEqual(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Does one query word match this text: directly, through a synonym, or with one typo? */
function wordHits(t: ToolDef, w: string) {
  const h = hay(t);
  if (hit(h.all, w)) return true;
  // A typo: compare with the tool's words, or with their beginning ("compres" → "compress").
  return w.length >= 4 && h.tokens.some((tok) => nearlyEqual(w, tok) || (tok.length > w.length && nearlyEqual(w, tok.slice(0, w.length))));
}

/** Every word must match the tool's name, description or category (directly, through a synonym, or with one typo). */
export function matches(t: ToolDef, words: string[]) {
  return words.every((w) => wordHits(t, w));
}

/**
 * Lower is better: the exact name, then names starting with what you typed,
 * then every word in the name in the order you typed them, then in any order,
 * then description matches; ready tools before "soon" ones. `raw` is the query
 * as typed, so "pdf to jpg" and "jpg to pdf" find different tools first.
 */
export function rank(t: ToolDef, words: string[], raw = words.join(" ")) {
  const name = hay(t).name;
  const phrase = raw.trim().toLowerCase().replace(/\s+/g, " ");
  const inName = words.every((w) => hit(name, w));
  const inOrder = inName && words.reduce((at, w) => (at < 0 ? -1 : name.indexOf(w, at) < 0 ? -1 : name.indexOf(w, at) + w.length), 0) >= 0;
  const tier = name === phrase ? 0 : name.startsWith(phrase) ? 1 : inOrder ? 2 : inName ? 3 : words.some((w) => hit(name, w)) ? 4 : 5;
  return tier * 2 + (t.status === "soon" ? 1 : 0);
}

/** Tools matching a free-text query, best first. */
export function searchTools(tools: ToolDef[], query: string) {
  const words = queryWords(query);
  if (!words.length) return tools;
  return tools.filter((t) => matches(t, words)).sort((a, b) => rank(a, words, query) - rank(b, words, query));
}
