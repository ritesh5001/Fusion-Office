import {
  Archive, ArrowLeftRight, BadgeCheck, Brush, Camera, ClipboardList, Combine, Crop, Eraser, EyeOff, FileCode, FileSpreadsheet, FileText, FlipHorizontal2, GitCompare,
  Globe, Image, ImageDown, ImagePlus, Languages, LayoutGrid, ListOrdered, Lock, Minimize2, PenLine, Presentation, RotateCw, Scaling,
  MonitorSmartphone, ScanText, Scissors, ShieldCheck, Signature, SlidersHorizontal, Sparkles, Stamp, Unlock, Workflow, Wrench, type LucideIcon,
} from "lucide-react";
import type { Category, ToolDef } from "@/lib/tools/registry";
import { cn } from "@/lib/cn";

const ICONS: Record<string, LucideIcon> = {
  Archive, ArrowLeftRight, BadgeCheck, Brush, Camera, ClipboardList, Combine, Crop, Eraser, EyeOff, FileCode, FileSpreadsheet, FileText, FlipHorizontal2, GitCompare,
  Globe, Image, ImageDown, ImagePlus, Languages, LayoutGrid, ListOrdered, Lock, Minimize2, PenLine, Presentation, RotateCw, Scaling,
  MonitorSmartphone, ScanText, Scissors, ShieldCheck, Signature, SlidersHorizontal, Sparkles, Stamp, Unlock, Workflow, Wrench,
};

/** One muted accent per category (small inline marks). */
export const CATEGORY_TINT: Record<Category, string> = {
  office: "bg-blue-50 text-blue-700",
  organize: "bg-orange-50 text-orange-600",
  optimize: "bg-emerald-50 text-emerald-600",
  "convert-to": "bg-amber-50 text-amber-700",
  "convert-from": "bg-sky-50 text-sky-600",
  edit: "bg-violet-50 text-violet-600",
  security: "bg-slate-100 text-slate-700",
  intelligence: "bg-rose-50 text-rose-600",
  image: "bg-cyan-50 text-cyan-700",
};

export function ToolIcon({ name, className, strokeWidth }: { name: string; className?: string; strokeWidth?: number }) {
  const Icon = ICONS[name] ?? FileText;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

/* ── App-style tiles ─────────────────────────────────────────────── */

/** Saturated gradients with a matching glow; literal classes so Tailwind keeps them. */
const SWATCH = {
  red: "from-[#ff6b5f] to-[#e3262f] shadow-red-500/35",
  rose: "from-[#ff6f91] to-[#e11d5a] shadow-rose-500/35",
  orange: "from-[#ffa24a] to-[#f25c05] shadow-orange-500/35",
  amber: "from-[#ffcd4a] to-[#f59e0b] shadow-amber-500/35",
  green: "from-[#3ddc84] to-[#12a150] shadow-green-500/35",
  emerald: "from-[#34d6a0] to-[#059669] shadow-emerald-500/35",
  teal: "from-[#2dd4bf] to-[#0d9488] shadow-teal-500/35",
  sky: "from-[#4cc3ff] to-[#0284c7] shadow-sky-500/35",
  blue: "from-[#5b8cff] to-[#2447e6] shadow-blue-600/35",
  indigo: "from-[#8a8cff] to-[#4f46e5] shadow-indigo-500/35",
  violet: "from-[#b18cff] to-[#7c3aed] shadow-violet-500/35",
  pink: "from-[#ff7ad9] to-[#db2777] shadow-pink-500/35",
  ink: "from-[#4b5563] to-[#111827] shadow-slate-700/35",
} as const;
export type Swatch = keyof typeof SWATCH;

const CATEGORY_SWATCH: Record<Category, Swatch> = {
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
  "split-pdf": "rose",
  "organize-pdf": "violet",
  "rotate-pdf": "orange",
  "compress-pdf": "red",
  "repair-pdf": "amber",
  "ocr-pdf": "green",
  "jpg-to-pdf": "amber",
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
  "edit-pdf": "violet",
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
  "image-editor": "pink",
  "compress-image": "emerald",
  "resize-image": "sky",
  "crop-image": "orange",
  "convert-image": "violet",
  "remove-watermark-image": "pink",
  "rotate-image": "teal",
  workflows: "indigo",
};

/** Word, Excel and PowerPoint get their familiar letter marks. */
const LETTER: Record<string, { letter: string; swatch: Swatch }> = {
  "word-editor": { letter: "W", swatch: "blue" },
  "excel-editor": { letter: "X", swatch: "green" },
  "powerpoint-editor": { letter: "P", swatch: "orange" },
};

const SIZES = {
  sm: { box: "h-8 w-8 rounded-[10px]", icon: "h-4 w-4", letter: "text-[15px]" },
  md: { box: "h-11 w-11 rounded-[13px]", icon: "h-[22px] w-[22px]", letter: "text-[21px]" },
  lg: { box: "h-14 w-14 rounded-[16px]", icon: "h-7 w-7", letter: "text-[27px]" },
} as const;

export const swatchFor = (tool: Pick<ToolDef, "slug" | "category">): Swatch =>
  LETTER[tool.slug]?.swatch ?? TOOL_SWATCH[tool.slug] ?? CATEGORY_SWATCH[tool.category];

/** A glossy gradient tile with a white glyph, like an app icon. */
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
        // Callers may position the tile themselves (absolute); otherwise it anchors its own highlight.
        /\b(absolute|fixed)\b/.test(className ?? "") ? "" : "relative",
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br text-white shadow-lg ring-1 ring-inset ring-white/25",
        SWATCH[swatch],
        s.box,
        className,
      )}
    >
      {/* Top highlight gives the tile a little depth. */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />
      {letter ? (
        <span className={cn("relative font-display font-extrabold leading-none tracking-tight drop-shadow-sm", s.letter, letterClassName)}>{letter}</span>
      ) : (
        <ToolIcon name={icon ?? "FileText"} strokeWidth={2.4} className={cn("relative drop-shadow-sm", s.icon)} />
      )}
    </span>
  );
}

/** The tile for a catalogue tool. */
export function ToolTile({ tool, size = "md", className }: { tool: Pick<ToolDef, "slug" | "category" | "icon">; size?: keyof typeof SIZES; className?: string }) {
  const letter = LETTER[tool.slug];
  return <Tile swatch={swatchFor(tool)} icon={tool.icon} letter={letter?.letter} size={size} className={className} />;
}
