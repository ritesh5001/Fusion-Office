import {
  Archive, ArrowLeftRight, BadgeCheck, Brush, Camera, ClipboardList, Combine, Crop, Eraser, EyeOff, FileCode, FileSpreadsheet, FileText, FlipHorizontal2, GitCompare,
  Globe, Image, ImageDown, ImagePlus, Languages, LayoutGrid, ListOrdered, Lock, Minimize2, PenLine, Presentation, RotateCw, Scaling,
  MonitorSmartphone, ScanText, Scissors, ShieldCheck, Signature, SlidersHorizontal, Sparkles, Stamp, Unlock, Workflow, Wrench,
  Bookmark, BookOpen, BookText, Code, Headphones, MessagesSquare, ReceiptIndianRupee, Columns2, Contrast, FileArchive, FileCode2, FileCog, FileType, Fingerprint, Grid2x2, Hash, Images, Layers, LockOpen, NotebookPen, PanelTop, PenTool, Receipt, Scale, ScanSearch, Sheet, ShieldOff, Shuffle, Table, TextSearch, type LucideIcon,
} from "lucide-react";
import type { Category, ToolDef } from "@/lib/tools/registry";
import { cn } from "@/lib/cn";

const ICONS: Record<string, LucideIcon> = {
  Archive, ArrowLeftRight, BadgeCheck, Brush, Camera, ClipboardList, Combine, Crop, Eraser, EyeOff, FileCode, FileSpreadsheet, FileText, FlipHorizontal2, GitCompare,
  Globe, Image, ImageDown, ImagePlus, Languages, LayoutGrid, ListOrdered, Lock, Minimize2, PenLine, Presentation, RotateCw, Scaling,
  MonitorSmartphone, ScanText, Scissors, ShieldCheck, Signature, SlidersHorizontal, Sparkles, Stamp, Unlock, Workflow, Wrench,
  Bookmark, BookOpen, BookText, Code, Headphones, MessagesSquare, ReceiptIndianRupee, Columns2, Contrast, FileArchive, FileCode2, FileCog, FileType, Fingerprint, Grid2x2, Hash, Images, Layers, LockOpen, NotebookPen, PanelTop, PenTool, Receipt, Scale, ScanSearch, Sheet, ShieldOff, Shuffle, Table, TextSearch,
};

/** One muted accent per category (small inline marks). */
export const CATEGORY_TINT: Record<Category, string> = {
  office: "bg-blue-500/10 text-blue-300",
  organize: "bg-orange-500/10 text-orange-300",
  optimize: "bg-emerald-500/10 text-emerald-300",
  "convert-to": "bg-amber-500/10 text-amber-300",
  "convert-from": "bg-sky-500/10 text-sky-300",
  edit: "bg-violet-500/10 text-violet-300",
  security: "bg-raised text-fg-muted",
  intelligence: "bg-rose-500/10 text-rose-300",
  image: "bg-cyan-500/10 text-cyan-300",
};

export function ToolIcon({ name, className, strokeWidth }: { name: string; className?: string; strokeWidth?: number }) {
  const Icon = ICONS[name] ?? FileText;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

/* ── App-style tiles ─────────────────────────────────────────────── */

/**
 * Flat, slightly desaturated fills with a dark glyph: calm on a dark UI and
 * still easy to tell apart. Literal classes so Tailwind keeps them.
 */
const SWATCH = {
  red: "bg-[#ff7b70]",
  rose: "bg-[#ff86a6]",
  orange: "bg-[#ffa365]",
  amber: "bg-[#ffcb66]",
  lime: "bg-[#cdf564]",
  green: "bg-[#79e29a]",
  emerald: "bg-[#62dbb2]",
  teal: "bg-[#63d5cf]",
  sky: "bg-[#72c6ff]",
  blue: "bg-[#80a6ff]",
  indigo: "bg-[#a3a3ff]",
  violet: "bg-[#b7a2ff]",
  pink: "bg-[#f592dc]",
  ink: "bg-[#c4cad6]",
} as const;
export type Swatch = keyof typeof SWATCH;

export const CATEGORY_SWATCH: Record<Category, Swatch> = {
  office: "blue",
  organize: "orange",
  optimize: "emerald",
  "convert-to": "amber",
  "convert-from": "sky",
  edit: "violet",
  security: "ink",
  intelligence: "indigo",
  image: "teal",
};

/** Per-tool colours, so neighbouring tiles differ and file types keep their usual colour. */
const TOOL_SWATCH: Record<string, Swatch> = {
  "merge-pdf": "red",
  "split-pdf": "violet",
  "organize-pdf": "violet",
  "rotate-pdf": "orange",
  "compress-pdf": "lime",
  "repair-pdf": "amber",
  "ocr-pdf": "amber",
  "jpg-to-pdf": "orange",
  "scan-to-pdf": "teal",
  "word-to-pdf": "blue",
  "powerpoint-to-pdf": "orange",
  "excel-to-pdf": "green",
  "html-to-pdf": "indigo",
  "pdf-to-jpg": "amber",
  "pdf-to-word": "blue",
  "pdf-to-powerpoint": "orange",
  "pdf-to-excel": "green",
  "pdf-to-markdown": "ink",
  "pdf-to-pdfa": "ink",
  "edit-pdf": "teal",
  "sign-pdf": "indigo",
  "watermark-pdf": "sky",
  "page-numbers": "teal",
  "remove-watermark": "pink",
  "crop-pdf": "orange",
  "pdf-forms": "blue",
  "protect-pdf": "ink",
  "unlock-pdf": "emerald",
  "redact-pdf": "ink",
  "compare-pdf": "sky",
  "summarize-pdf": "violet",
  "translate-pdf": "indigo",
  "image-editor": "violet",
  "compress-image": "lime",
  "resize-image": "sky",
  "crop-image": "orange",
  "convert-image": "violet",
  "remove-watermark-image": "pink",
  "rotate-image": "teal",
  workflows: "indigo",
  "alternate-mix": "violet",
  "pages-per-sheet": "teal",
  "flip-pdf": "sky",
  "split-in-half": "rose",
  "split-by-size": "amber",
  "split-by-bookmarks": "indigo",
  "split-by-text": "pink",
  "pdf-to-zip": "ink",
  "gst-filing-prep": "orange",
  "bates-numbering": "ink",
  "header-footer": "sky",
  "flatten-pdf": "teal",
  "edit-metadata": "ink",
  "invert-colours": "ink",
  "text-to-handwriting": "blue",
  "pdf-to-handwriting": "violet",
  "markdown-to-pdf": "ink",
  "csv-to-pdf": "green",
  "ebook-to-pdf": "orange",
  "pdf-to-html": "orange",
  "pdf-to-epub": "pink",
  "pdf-to-csv": "green",
  "extract-text": "sky",
  "extract-images": "teal",
  "remove-restrictions": "emerald",
  "auto-redact-pii": "red",
  "privacy-scanner": "indigo",
  "file-fingerprint": "violet",
  "thumbmark-maker": "blue",
  "chat-with-pdf": "violet",
  "pdf-to-audio": "pink",
  "gst-invoice": "orange",
};

/** Word, Excel and PowerPoint get their familiar letter marks. */
const LETTER: Record<string, { letter: string; swatch: Swatch }> = {
  "word-editor": { letter: "W", swatch: "blue" },
  "excel-editor": { letter: "X", swatch: "green" },
  "powerpoint-editor": { letter: "P", swatch: "orange" },
};

const SIZES = {
  xs: { box: "h-6 w-6 rounded-[7px]", icon: "h-3.5 w-3.5", letter: "text-[11px]" },
  sm: { box: "h-8 w-8 rounded-[9px]", icon: "h-4 w-4", letter: "text-[14px]" },
  md: { box: "h-10 w-10 rounded-[11px]", icon: "h-5 w-5", letter: "text-[18px]" },
  lg: { box: "h-12 w-12 rounded-[13px]", icon: "h-6 w-6", letter: "text-[22px]" },
  xl: { box: "h-14 w-14 rounded-[15px]", icon: "h-7 w-7", letter: "text-[26px]" },
} as const;

export const swatchFor = (tool: Pick<ToolDef, "slug" | "category">): Swatch =>
  LETTER[tool.slug]?.swatch ?? TOOL_SWATCH[tool.slug] ?? CATEGORY_SWATCH[tool.category];

/** A flat colour tile with a dark glyph, like an app icon. */
export function Tile({
  swatch,
  icon,
  letter,
  size = "md",
  className,
  letterClassName,
}: {
  swatch: Swatch;
  icon?: string;
  letter?: string;
  size?: keyof typeof SIZES;
  className?: string;
  letterClassName?: string;
}) {
  const s = SIZES[size];
  return (
    <span
      aria-hidden="true"
      className={cn(
        // Callers may position the tile themselves (absolute); otherwise it anchors itself.
        /(absolute|fixed)/.test(className ?? "") ? "" : "relative",
        "inline-flex shrink-0 items-center justify-center text-[#0d0f14] ring-1 ring-inset ring-black/10",
        SWATCH[swatch],
        s.box,
        className,
      )}
    >
      {letter ? (
        <span className={cn("relative font-display font-extrabold leading-none tracking-tight", s.letter, letterClassName)}>{letter}</span>
      ) : (
        <ToolIcon name={icon ?? "FileText"} strokeWidth={2} className={cn("relative", s.icon)} />
      )}
    </span>
  );
}

/** The tile for a catalogue tool. */
export function ToolTile({ tool, size = "md", className }: { tool: Pick<ToolDef, "slug" | "category" | "icon">; size?: keyof typeof SIZES; className?: string }) {
  const letter = LETTER[tool.slug];
  return <Tile swatch={swatchFor(tool)} icon={tool.icon} letter={letter?.letter} size={size} className={className} />;
}
