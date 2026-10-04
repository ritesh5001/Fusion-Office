/**
 * The tool catalogue. TOOLS, CATEGORIES and search come straight from the
 * website (client/src/lib/tools), so the app always lists the same 74 tools.
 */
import {
  Archive, ArrowLeftRight, BookOpen, BookText, Bookmark, Brush, Camera, ClipboardList, Code, Columns2, Combine, Contrast, Crop, Eraser, EyeOff,
  FileArchive, FileCode, FileCode2, FileCog, FileSpreadsheet, FileText, FileType, Fingerprint, FlipHorizontal2, GitCompare, Globe, Grid2x2, Hash,
  Headphones, Image, ImageDown, ImagePlus, Images, Languages, Layers, LayoutGrid, ListOrdered, Lock, LockOpen, MessagesSquare, Minimize2, NotebookPen,
  PanelTop, PenLine, PenTool, Presentation, Receipt, ReceiptIndianRupee, RotateCw, Scale, Scaling, ScanSearch, ScanText, Scissors, Sheet, ShieldOff,
  Shuffle, Signature, SlidersHorizontal, Sparkles, Stamp, Table, TextSearch, Unlock, Workflow, Wrench, type LucideIcon,
} from "lucide-react-native";
import { CATEGORIES, TOOLS, toolBySlug, type Category, type ToolDef } from "@shared/registry";
import { searchTools } from "@shared/search";

export { CATEGORIES, TOOLS, toolBySlug, searchTools };
export type { Category, ToolDef };

export const ICONS: Record<string, LucideIcon> = {
  Archive, ArrowLeftRight, BookOpen, BookText, Bookmark, Brush, Camera, ClipboardList, Code, Columns2, Combine, Contrast, Crop, Eraser, EyeOff,
  FileArchive, FileCode, FileCode2, FileCog, FileSpreadsheet, FileText, FileType, Fingerprint, FlipHorizontal2, GitCompare, Globe, Grid2x2, Hash,
  Headphones, Image, ImageDown, ImagePlus, Images, Languages, Layers, LayoutGrid, ListOrdered, Lock, LockOpen, MessagesSquare, Minimize2, NotebookPen,
  PanelTop, PenLine, PenTool, Presentation, Receipt, ReceiptIndianRupee, RotateCw, Scale, Scaling, ScanSearch, ScanText, Scissors, Sheet, ShieldOff,
  Shuffle, Signature, SlidersHorizontal, Sparkles, Stamp, Table, TextSearch, Unlock, Workflow, Wrench,
};

/** Tile colours, as on the website (components/tools/icons.tsx). */
export const SWATCH = {
  red: "#ff7b70", rose: "#ff86a6", orange: "#ffa365", amber: "#ffcb66", lime: "#cdf564", green: "#79e29a", emerald: "#62dbb2",
  teal: "#63d5cf", sky: "#72c6ff", blue: "#80a6ff", indigo: "#a3a3ff", violet: "#b7a2ff", pink: "#f592dc", ink: "#c4cad6",
} as const;
type Swatch = keyof typeof SWATCH;

const CATEGORY_SWATCH: Record<Category, Swatch> = {
  office: "blue", organize: "orange", optimize: "emerald", "convert-to": "amber", "convert-from": "sky", edit: "violet", security: "ink", intelligence: "indigo", image: "teal",
};

const TOOL_SWATCH: Record<string, Swatch> = {
  "merge-pdf": "red", "split-pdf": "violet", "organize-pdf": "violet", "rotate-pdf": "orange", "compress-pdf": "lime", "repair-pdf": "amber", "ocr-pdf": "amber",
  "jpg-to-pdf": "orange", "scan-to-pdf": "teal", "word-to-pdf": "blue", "powerpoint-to-pdf": "orange", "excel-to-pdf": "green", "html-to-pdf": "indigo",
  "pdf-to-jpg": "amber", "pdf-to-word": "blue", "pdf-to-powerpoint": "orange", "pdf-to-excel": "green", "pdf-to-markdown": "ink", "pdf-to-pdfa": "ink",
  "edit-pdf": "teal", "sign-pdf": "indigo", "watermark-pdf": "sky", "page-numbers": "teal", "remove-watermark": "pink", "crop-pdf": "orange", "pdf-forms": "blue",
  "protect-pdf": "ink", "unlock-pdf": "emerald", "redact-pdf": "ink", "compare-pdf": "sky", "summarize-pdf": "violet", "translate-pdf": "indigo",
  "image-editor": "violet", "compress-image": "lime", "resize-image": "sky", "crop-image": "orange", "convert-image": "violet", "remove-watermark-image": "pink",
  "rotate-image": "teal", workflows: "indigo", "alternate-mix": "violet", "pages-per-sheet": "teal", "flip-pdf": "sky", "split-in-half": "rose",
  "split-by-size": "amber", "split-by-bookmarks": "indigo", "split-by-text": "pink", "pdf-to-zip": "ink", "gst-filing-prep": "orange", "bates-numbering": "ink",
  "header-footer": "sky", "flatten-pdf": "teal", "edit-metadata": "ink", "invert-colours": "ink", "text-to-handwriting": "blue", "pdf-to-handwriting": "violet",
  "markdown-to-pdf": "ink", "csv-to-pdf": "green", "ebook-to-pdf": "orange", "pdf-to-html": "orange", "pdf-to-epub": "pink", "pdf-to-csv": "green",
  "extract-text": "sky", "extract-images": "teal", "remove-restrictions": "emerald", "auto-redact-pii": "red", "privacy-scanner": "indigo",
  "file-fingerprint": "violet", "thumbmark-maker": "blue", "chat-with-pdf": "violet", "pdf-to-audio": "pink", "gst-invoice": "orange",
};

const LETTER: Record<string, { letter: string; swatch: Swatch }> = {
  "word-editor": { letter: "W", swatch: "blue" },
  "excel-editor": { letter: "X", swatch: "green" },
  "powerpoint-editor": { letter: "P", swatch: "orange" },
};

export function tileFor(t: Pick<ToolDef, "slug" | "category" | "icon">) {
  const letter = LETTER[t.slug];
  return {
    color: SWATCH[letter?.swatch ?? TOOL_SWATCH[t.slug] ?? CATEGORY_SWATCH[t.category]],
    letter: letter?.letter,
    Icon: ICONS[t.icon] ?? FileText,
  };
}

/** How categories are named and coloured in navigation (as on the website). */
export const CATEGORY_META: Record<Category, { short: string; title: string; color: string }> = {
  office: { short: "Office", title: "Word, Excel, PowerPoint", color: "#80a6ff" },
  organize: { short: "Organize", title: "Organize PDF", color: "#ffa365" },
  optimize: { short: "Optimize", title: "Optimize PDF", color: "#62dbb2" },
  "convert-to": { short: "To PDF", title: "Convert to PDF", color: "#ffcb66" },
  "convert-from": { short: "From PDF", title: "Convert from PDF", color: "#72c6ff" },
  edit: { short: "Edit & sign", title: "Edit & sign PDF", color: "#b7a2ff" },
  security: { short: "Secure", title: "PDF security & privacy", color: "#c4cad6" },
  intelligence: { short: "AI", title: "AI & compare", color: "#a3a3ff" },
  image: { short: "Images", title: "Image tools", color: "#63d5cf" },
};

export type FileKind = "pdf" | "document" | "image";

export function kindOf(name: string, mime?: string | null): FileKind {
  const n = name.toLowerCase();
  if (mime === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (mime?.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|gif|bmp|avif)$/.test(n)) return "image";
  return "document";
}

/** Does a tool's accept list take this file (by extension or MIME)? */
export function accepts(tool: ToolDef, name: string, mime?: string | null) {
  if (!tool.accept) return false;
  const n = name.toLowerCase();
  const type = (mime ?? "").toLowerCase();
  return tool.accept
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .some((a) => (a.startsWith(".") ? n.endsWith(a) : a.endsWith("/*") ? type.startsWith(a.slice(0, -1)) : a === type));
}

export const WEB_URL = "https://www.fusionoffice.online";
export const API_URL = "https://fusion-office.onrender.com";
