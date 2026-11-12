/**
 * Branded search names: what people type to find each tool, alone ("JPG to
 * PDF") and with the brand ("Fusion Office JPG to PDF"). Every tool page uses
 * these for its H1, a "What is Fusion Office …?" answer and the alternate
 * names in its structured data, so branded searches land on the right tool.
 */
import type { ToolDef } from "@/lib/tools/registry";
import type { ToolSeo } from "./content/types";
import { SITE_NAME } from "./site";

/** Where people search a different phrase than the tool's short name. */
const SEARCH_NAMES: Record<string, string> = {
  "edit-pdf": "PDF Editor",
  "image-editor": "Photo Editor",
  "summarize-pdf": "AI PDF Summarizer",
  "ebook-to-pdf": "EPUB to PDF",
  "convert-image": "Convert Image",
  "watermark-pdf": "Add Watermark to PDF",
  "page-numbers": "Add Page Numbers to PDF",
  "pdf-forms": "Fill PDF Forms",
  "protect-pdf": "Password Protect PDF",
  "header-footer": "Add Header and Footer to PDF",
  "edit-metadata": "Edit PDF Metadata",
  "invert-colours": "Invert PDF Colours",
  "remove-restrictions": "Remove PDF Restrictions",
  "file-fingerprint": "File Hash Checker",
  "remove-watermark-image": "Remove Watermark from Photo",
  "split-in-half": "Split PDF in Half",
  "split-by-size": "Split PDF by Size",
  "split-by-bookmarks": "Split PDF by Bookmarks",
  "split-by-text": "Split PDF by Text",
  "alternate-mix": "Alternate & Mix PDF Pages",
  "gst-invoice": "GST Invoice Generator",
  "gst-filing-prep": "GST Filing Prep",
  "privacy-scanner": "PDF Privacy Scanner",
  "auto-redact-pii": "Auto-Redact PII",
  "delete-pdf-pages": "Delete Pages from PDF",
  "extract-pdf-pages": "Extract Pages from PDF",
  "add-blank-pages": "Add Blank Pages to PDF",
  "booklet-pdf": "PDF Booklet Maker",
  "poster-pdf": "PDF Poster Maker",
  "compress-pdf-to-size": "Compress PDF to 100 KB",
  "remove-blank-pages": "Remove Blank Pages from PDF",
  "deskew-pdf": "Deskew PDF",
  "trim-pdf-margins": "Trim PDF Margins",
  "resize-pdf-pages": "Resize PDF Pages",
  "id-card-to-pdf": "ID Card Front and Back on One Page",
  "bank-statement-to-excel": "Bank Statement PDF to Excel",
  "proforma-invoice": "Proforma Invoice Generator",
  "rent-receipt": "Rent Receipt Generator",
  "salary-slip": "Salary Slip Generator",
  "qr-code-pdf": "Add QR Code to PDF",
  "pdf-bookmarks": "PDF Bookmark Editor",
  "remove-annotations": "Remove Annotations from PDF",
  "remove-background": "Remove Background from Image",
  "passport-photo-maker": "Passport Size Photo Maker",
  "exam-photo-resizer": "Photo & Signature Resizer",
};

const SMALL = new Set(["to", "and", "in", "by", "with", "of", "from", "per", "a"]);

/** "Compress image" → "Compress Image"; keeps PDF, JPG, AI and other capitals. */
const titleCase = (s: string) =>
  s
    .split(" ")
    .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

/** What people search for this tool, e.g. "PDF Editor", "JPG to PDF". */
export const searchName = (tool: Pick<ToolDef, "slug" | "name">) => SEARCH_NAMES[tool.slug] ?? titleCase(tool.name);

/** The branded name, e.g. "Fusion Office PDF Editor". */
export const brandedName = (tool: Pick<ToolDef, "slug" | "name">) => `${SITE_NAME} ${searchName(tool)}`;

/** Other names the tool is known by, for structured data. */
export function alternateNames(tool: Pick<ToolDef, "slug" | "name">) {
  const names = [brandedName(tool), searchName(tool), `${SITE_NAME} ${titleCase(tool.name)}`, titleCase(tool.name)];
  return [...new Set(names)].filter((n) => n !== searchName(tool));
}

const WHERE: Record<ToolDef["runs"], string> = {
  browser: "It runs in your browser, so your files are never uploaded.",
  server: "Files are converted over an encrypted connection and deleted from our server as soon as the result is ready.",
  ai: "Your file stays on your device; only the extracted text is sent to the AI, and nothing is stored.",
};

/** The branded question every tool page answers, first in its FAQ. */
export function brandFaq(tool: Pick<ToolDef, "slug" | "name" | "runs">, content: Pick<ToolSeo, "description">): [string, string] {
  // Keep what the tool does; the free/private claims are said once, below.
  const what = content.description
    .split(/(?<=\.)\s+/)
    .map((x) => x.replace(/^A free online [^:]+:\s*/i, "").replace(/^A free online /i, "").replace(/^(.)/, (c) => c.toUpperCase()))
    .filter((x) => !/\b(free|no sign-?up|no upload|never uploaded|runs in your browser|in your browser|no watermarks?)\b/i.test(x) || x.length > 120)
    .join(" ")
    .trim();
  return [
    `What is ${brandedName(tool)}?`,
    `${brandedName(tool)} is a free online tool from ${SITE_NAME}. ${what} ${WHERE[tool.runs]} No sign-up, no watermark and no limit on how often you use it.`,
  ];
}
