import {
  Archive, ArrowLeftRight, Brush, Camera, ClipboardList, Combine, Crop, Eraser, EyeOff, FileCode, FileSpreadsheet, FileText, FlipHorizontal2, GitCompare,
  Globe, Image, ImageDown, ImagePlus, Languages, LayoutGrid, ListOrdered, Lock, Minimize2, PenLine, Presentation, RotateCw, Scaling,
  ScanText, Scissors, Signature, SlidersHorizontal, Sparkles, Stamp, Unlock, Workflow, Wrench, type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/tools/registry";

const ICONS: Record<string, LucideIcon> = {
  Archive, ArrowLeftRight, Brush, Camera, ClipboardList, Combine, Crop, Eraser, EyeOff, FileCode, FileSpreadsheet, FileText, FlipHorizontal2, GitCompare,
  Globe, Image, ImageDown, ImagePlus, Languages, LayoutGrid, ListOrdered, Lock, Minimize2, PenLine, Presentation, RotateCw, Scaling,
  ScanText, Scissors, Signature, SlidersHorizontal, Sparkles, Stamp, Unlock, Workflow, Wrench,
};

/** One muted accent per category, so the catalogue scans quickly. */
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

export function ToolIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? FileText;
  return <Icon className={className} aria-hidden="true" />;
}
