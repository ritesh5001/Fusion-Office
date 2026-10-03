"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { ToolIcon, ToolTile } from "../tools/icons";
import { CATEGORY_META } from "../site/categories";
import { CATEGORIES, TOOLS, type Category } from "@/lib/tools/registry";
import { cn } from "@/lib/cn";
import { categoryHref } from "@/lib/seo/clusters";

const ready = TOOLS.filter((t) => t.status === "ready");
const toolHref = (t: (typeof TOOLS)[number]) => `/tools/${t.slug}`;

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
    <div className="mx-auto grid max-w-[1440px] grid-cols-[260px_minmax(0,1fr)] px-8">
      {/* Categories */}
      <div className="flex flex-col border-r border-line py-5 pr-4">
        <p className="eyebrow px-3 pb-2">Categories</p>
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
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] font-medium transition-colors",
                  on ? "bg-raised text-fg" : "text-fg-muted hover:bg-raised/60 hover:text-fg",
                )}
              >
                <ToolIcon name={CATEGORY_META[c.id].icon} className={cn("h-4 w-4 shrink-0", on ? "text-accent" : "text-fg-subtle")} />
                <span className="flex-1">{CATEGORY_META[c.id].title}</span>
                <span className="text-[12px] tabular-nums text-fg-subtle">{count}</span>
              </button>
            );
          })}
        </div>
        <Link href="/tools" onClick={onNavigate} className="mt-auto flex items-center justify-between rounded-lg px-3 pt-4 text-[13px] font-semibold text-brand-300 hover:text-brand-200">
          Browse all {TOOLS.length} tools <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {/* Tools of the chosen category */}
      <div id="tools-menu-panel" role="tabpanel" aria-label={CATEGORY_META[active].title} className="py-5 pl-6">
        <div className="flex items-baseline justify-between px-2 pb-3">
          <p className="text-[15px] font-semibold text-fg">
            {CATEGORY_META[active].title} <span className="ml-1 text-[13px] font-normal text-fg-subtle">{tools.length} tools</span>
          </p>
          <Link href={categoryHref(active)} onClick={onNavigate} className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-300 hover:text-brand-200">
            All {CATEGORY_META[active].title} tools <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <ul className="grid grid-cols-3 gap-1">
          {tools.map((t) => (
            <li key={t.slug}>
              <Link href={toolHref(t)} onClick={onNavigate} className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-raised">
                <ToolTile tool={t} size="sm" />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold leading-tight text-fg">{t.name}</span>
                  <span className="mt-0.5 line-clamp-1 text-[12px] leading-snug text-fg-subtle" title={t.description}>
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
