"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { CATEGORY_SWATCH, Tile, ToolTile } from "../tools/icons";
import { CATEGORIES, TOOLS, type Category } from "@/lib/tools/registry";
import { cn } from "@/lib/cn";

/** Icon shown next to each category in the menu. */
const CATEGORY_ICON: Record<Category, string> = {
  office: "FileText",
  organize: "LayoutGrid",
  optimize: "Minimize2",
  "convert-to": "FileType",
  "convert-from": "ArrowLeftRight",
  edit: "PenLine",
  security: "Lock",
  intelligence: "Sparkles",
  image: "Image",
};

const TITLE: Record<Category, string> = {
  office: "Office files",
  organize: "Organize PDF",
  optimize: "Optimize PDF",
  "convert-to": "Convert to PDF",
  "convert-from": "Convert from PDF",
  edit: "Edit & sign PDF",
  security: "PDF security & privacy",
  intelligence: "AI & compare",
  image: "Image tools",
};

const ready = TOOLS.filter((t) => t.status === "ready");
const toolHref = (t: (typeof TOOLS)[number]) => t.href ?? `/tools/${t.slug}`;

/**
 * Tools menu: categories on the left, the chosen category's tools on the
 * right. Hovering or arrowing through categories switches the right side, so
 * the panel stays one tidy size however many tools there are.
 */
export function ToolsMenu({ onNavigate }: { onNavigate: () => void }) {
  const [active, setActive] = useState<Category>("organize");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const tools = ready.filter((t) => t.category === active);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowDown" ? 1 : -1) + CATEGORIES.length) % CATEGORIES.length;
    setActive(CATEGORIES[next].id);
    tabs.current[next]?.focus();
  };

  return (
    <div className="mx-auto grid max-w-[1280px] grid-cols-[270px_minmax(0,1fr)] px-8">
      {/* Categories */}
      <div className="flex flex-col border-r border-rule py-5 pr-4">
        <p className="px-3 pb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-soft">Categories</p>
        <div role="tablist" aria-orientation="vertical" aria-label="Tool categories" className="space-y-0.5">
          {CATEGORIES.map((c, i) => {
            const on = c.id === active;
            const count = ready.filter((t) => t.category === c.id).length;
            return (
              <button
                key={c.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="tools-menu-panel"
                tabIndex={on ? 0 : -1}
                onMouseEnter={() => setActive(c.id)}
                onFocus={() => setActive(c.id)}
                onClick={() => setActive(c.id)}
                onKeyDown={(e) => onKey(e, i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] font-medium transition-colors",
                  on ? "bg-brand-50 text-brand-700" : "text-ink hover:bg-paper",
                )}
              >
                <Tile swatch={CATEGORY_SWATCH[c.id]} icon={CATEGORY_ICON[c.id]} size="sm" className="h-7 w-7 rounded-[9px] shadow-md" />
                <span className="flex-1">{TITLE[c.id]}</span>
                <span className={cn("text-[12px] tabular-nums", on ? "text-brand-700/70" : "text-ink-soft")}>{count}</span>
              </button>
            );
          })}
        </div>
        <Link
          href="/#all-tools"
          onClick={onNavigate}
          className="mt-auto flex items-center justify-between rounded-xl px-3 pt-4 text-[13px] font-semibold text-brand-700 hover:underline"
        >
          Browse all {TOOLS.length} tools <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {/* Tools of the chosen category */}
      <div id="tools-menu-panel" role="tabpanel" aria-label={TITLE[active]} className="py-5 pl-6">
        <div className="flex items-baseline justify-between px-2 pb-3">
          <p className="text-[15px] font-bold text-ink">
            {TITLE[active]} <span className="ml-1 text-[13px] font-normal text-ink-soft">{tools.length} tools</span>
          </p>
          <Link href={`/#cat-${active}`} onClick={onNavigate} className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline">
            See them on the homepage <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <ul className="grid grid-cols-3 gap-1">
          {tools.map((t) => (
            <li key={t.slug}>
              <Link href={toolHref(t)} onClick={onNavigate} className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-paper">
                <ToolTile tool={t} size="sm" className="h-9 w-9 rounded-[11px] shadow-md [&_svg]:h-[18px] [&_svg]:w-[18px]" />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold leading-tight text-ink group-hover:text-brand-700">{t.name}</span>
                  <span className="mt-0.5 line-clamp-1 text-[12px] leading-snug text-ink-soft" title={t.description}>
                    {t.description}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
