/**
 * The tool catalogue. TOOLS, CATEGORIES and search come straight from the
 * website (client/src/lib/tools), so the app always lists the same tools.
 */
import {
  Archive, ArrowLeftRight, BookOpen, BookText, Bookmark, Brush, Camera, ClipboardList, Code, Columns2, Combine, Contrast, Crop, Eraser, Eye, EyeOff,
  FileArchive, FileCode, FileCode2, FileCog, FileSpreadsheet, FileText, FileType, Fingerprint, FlipHorizontal2, GitCompare, Globe, Grid2x2, Hash,
  Headphones, Image, ImageDown, ImagePlus, Images, Languages, Layers, LayoutGrid, ListOrdered, Lock, LockOpen, MessagesSquare, Minimize2, NotebookPen,
  PanelTop, PenLine, PenTool, Presentation, Receipt, ReceiptIndianRupee, RotateCw, Scale, Scaling, ScanSearch, ScanText, Scissors, Sheet, ShieldOff,
  Shuffle, Signature, SlidersHorizontal, Sparkles, Stamp, Table, TextSearch, Unlock, Workflow, Wrench,
  ArrowDownUp, BadgeCheck, Banknote, BookCopy, FileClock, FileImage, FileMinus2, FileOutput, FilePlus2, FileSignature, FileX2, GraduationCap, Grid3x3, House, IdCard, ImageOff, Landmark, ListTree, MessageSquareOff, Palette, Paperclip, Proportions, QrCode, Ruler, Shrink, Smartphone, SquareUser, Target, Truck, Blend, Braces, Copyright, Droplets, FileCheck, FileKey, FileUser, Highlighter, Layers2, LayoutDashboard, ListChecks, Mail, MonitorPlay, NotebookText, Repeat, ScanLine, ScanQrCode, ShieldCheck, Spline, Split, SquareStack, TableProperties, TextCursor, Type, UserCheck, WandSparkles, Zap, type LucideIcon,
} from "lucide-react-native";
import { CATEGORIES, TOOLS, TOOL_COUNT, toolBySlug, type Category, type ToolDef } from "@shared/registry";
import { searchTools } from "@shared/search";

export { CATEGORIES, TOOLS, TOOL_COUNT, toolBySlug, searchTools };
export type { Category, ToolDef };

export const ICONS: Record<string, LucideIcon> = {
  Archive, ArrowLeftRight, BookOpen, BookText, Bookmark, Brush, Camera, ClipboardList, Code, Columns2, Combine, Contrast, Crop, Eraser, Eye, EyeOff,
  FileArchive, FileCode, FileCode2, FileCog, FileSpreadsheet, FileText, FileType, Fingerprint, FlipHorizontal2, GitCompare, Globe, Grid2x2, Hash,
  Headphones, Image, ImageDown, ImagePlus, Images, Languages, Layers, LayoutGrid, ListOrdered, Lock, LockOpen, MessagesSquare, Minimize2, NotebookPen,
  PanelTop, PenLine, PenTool, Presentation, Receipt, ReceiptIndianRupee, RotateCw, Scale, Scaling, ScanSearch, ScanText, Scissors, Sheet, ShieldOff,
  Shuffle, Signature, SlidersHorizontal, Sparkles, Stamp, Table, TextSearch, Unlock, Workflow, Wrench,
  ArrowDownUp, BadgeCheck, Banknote, BookCopy, FileClock, FileImage, FileMinus2, FileOutput, FilePlus2, FileSignature, FileX2, GraduationCap, Grid3x3, House, IdCard, ImageOff, Landmark, ListTree, MessageSquareOff, Palette, Paperclip, Proportions, QrCode, Ruler, Shrink, Smartphone, SquareUser, Target, Truck,
  Blend, Braces, Copyright, Droplets, FileCheck, FileKey, FileUser, Highlighter, Layers2, LayoutDashboard, ListChecks, Mail, MonitorPlay, NotebookText, Repeat, ScanLine, ScanQrCode, ShieldCheck, Spline, Split, SquareStack, TableProperties, TextCursor, Type, UserCheck, WandSparkles, Zap,
};

/** Tile colours, as on the website (components/tools/icons.tsx). */
export const SWATCH = {
  red: "#ff7b70", rose: "#ff86a6", orange: "#ffa365", amber: "#ffcb66", lime: "#cdf564", green: "#79e29a", emerald: "#62dbb2",
  teal: "#63d5cf", sky: "#72c6ff", blue: "#80a6ff", indigo: "#a3a3ff", violet: "#b7a2ff", pink: "#f592dc", ink: "#c4cad6",
} as const;
type Swatch = keyof typeof SWATCH;

const CATEGORY_SWATCH: Record<Category, Swatch> = {
  view: "lime", office: "blue", organize: "orange", optimize: "emerald", "convert-to": "amber", "convert-from": "sky", edit: "violet", security: "ink", intelligence: "indigo", image: "teal",
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
  "document-viewer": "lime", "cdr-converter": "green", "jpg-to-svg": "violet",
  "pdf-viewer": "red", "word-viewer": "blue", "excel-viewer": "green", "csv-viewer": "emerald", "powerpoint-viewer": "orange", "image-viewer": "teal",
  "heic-viewer": "amber", "tiff-viewer": "ink", "json-viewer": "violet", "xml-viewer": "indigo", "email-viewer": "sky", "zip-viewer": "amber",
  "epub-viewer": "pink", "markdown-viewer": "ink", "text-viewer": "lime",
  "delete-pdf-pages": "red", "extract-pdf-pages": "sky", "add-blank-pages": "ink", "reverse-pdf": "amber", "booklet-pdf": "indigo", "poster-pdf": "pink",
  "compress-pdf-to-size": "lime", "remove-blank-pages": "rose", "deskew-pdf": "teal", "trim-pdf-margins": "orange", "resize-pdf-pages": "sky", "grayscale-pdf": "ink",
  "id-card-to-pdf": "blue", "heic-to-pdf": "orange", "bank-statement-to-excel": "green", "quotation-maker": "sky", "proforma-invoice": "amber", "delivery-challan": "teal",
  "rent-receipt": "emerald", "salary-slip": "green", "stamp-pdf": "red", "qr-code-pdf": "ink", "pdf-bookmarks": "indigo", "pdf-attachments": "amber",
  "remove-annotations": "rose", "remove-background": "pink", "passport-photo-maker": "blue", "exam-photo-resizer": "amber", "heic-to-jpg": "orange", "webp-to-jpg": "green",
  "png-to-jpg": "sky", "jpg-to-png": "violet", "tiff-to-jpg": "ink",
  "split-by-separator": "pink", "web-optimize-pdf": "amber", "enhance-scan": "teal", "hindi-ocr": "orange", "email-to-pdf": "sky", "pdf-to-png": "violet",
  "pdf-to-tiff": "ink", "pdf-to-svg": "indigo", "pdf-to-json": "ink", "office-converter": "blue", "resume-builder": "emerald", "markdown-editor": "ink",
  "unicode-to-krutidev": "orange", "krutidev-to-unicode": "amber", "annotate-pdf": "lime", "overlay-pdf": "sky", "sanitize-pdf": "emerald", "sign-pdf-certificate": "indigo",
  "verify-pdf-signature": "green", "quiz-generator": "violet", "flashcard-maker": "pink", "ai-data-extraction": "green", "pdf-to-presentation-ai": "orange", "ats-resume-checker": "blue",
  "image-to-text": "amber", "watermark-image": "sky", "blur-image": "indigo", "photo-collage": "rose", "batch-rename": "ink", "qr-code-generator": "lime",
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
  view: { short: "Viewers", title: "File viewers", color: "#cdf564" },
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
  if (mime?.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|gif|bmp|avif|tiff?)$/.test(n)) return "image";
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
export const API_URL = "https://fusion-office-i5x0.onrender.com";
