import type { Category } from "@/lib/tools/registry";

/** How each category is named and drawn in navigation (rail, menus, tabs). */
export const CATEGORY_META: Record<Category, { short: string; title: string; icon: string }> = {
  office: { short: "Office", title: "Word, Excel, PowerPoint", icon: "FileText" },
  organize: { short: "Organize", title: "Organize PDF", icon: "LayoutGrid" },
  optimize: { short: "Optimize", title: "Optimize PDF", icon: "Minimize2" },
  "convert-to": { short: "To PDF", title: "Convert to PDF", icon: "FileType" },
  "convert-from": { short: "From PDF", title: "Convert from PDF", icon: "ArrowLeftRight" },
  edit: { short: "Edit & sign", title: "Edit & sign PDF", icon: "PenLine" },
  security: { short: "Secure", title: "PDF security & privacy", icon: "Lock" },
  intelligence: { short: "AI", title: "AI & compare", icon: "Sparkles" },
  image: { short: "Images", title: "Image tools", icon: "Image" },
};
