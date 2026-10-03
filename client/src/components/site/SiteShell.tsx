"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Nav } from "../landing/Nav";
import { Footer } from "../landing/Footer";
import { ToolIcon } from "../tools/icons";
import { CATEGORY_META } from "./categories";
import { CATEGORIES, type Category } from "@/lib/tools/registry";
import { cn } from "@/lib/cn";

/**
 * Frame for every content page: top navigation, a category rail on wide
 * screens (the way into every tool), the page, and the footer.
 */
export function SiteShell({ children, active, rail = true }: { children: ReactNode; active?: Category; rail?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col bg-app">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        Skip to content
      </a>
      <Nav />
      <div className="mx-auto flex w-full max-w-[1440px] flex-1">
        {rail && <SideRail active={active} />}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <Footer />
    </div>
  );
}

function SideRail({ active }: { active?: Category }) {
  const pathname = usePathname();
  const [inView, setInView] = useState<Category | undefined>(active);

  // On the homepage, follow the category section being read.
  useEffect(() => {
    if (pathname !== "/") return setInView(active);
    const sections = CATEGORIES.map((c) => document.getElementById(`cat-${c.id}`)).filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setInView(e.target.id.slice(4) as Category);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [pathname, active]);

  return (
    <aside aria-label="Tool categories" className="hidden w-[208px] shrink-0 border-r border-line xl:block">
      <div className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col px-3 py-6">
        <p className="eyebrow px-3">Tools</p>
        <ul className="mt-2 space-y-0.5">
          {CATEGORIES.map((c) => {
            const on = inView === c.id;
            return (
              <li key={c.id}>
                <a
                  href={`/#cat-${c.id}`}
                  aria-current={on ? "true" : undefined}
                  className={cn(
                    "group flex h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium transition-colors",
                    on ? "bg-accent text-on-accent" : "text-fg-muted hover:bg-raised hover:text-fg",
                  )}
                >
                  <ToolIcon name={CATEGORY_META[c.id].icon} className={cn("h-[18px] w-[18px] shrink-0", on ? "" : "text-fg-subtle group-hover:text-fg-muted")} strokeWidth={1.8} />
                  <span className="flex-1 truncate">{CATEGORY_META[c.id].short}</span>
                  {on && <ChevronRight className="h-4 w-4" aria-hidden="true" />}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto px-3 pt-6">
          <div className="mb-4 h-px w-6 bg-line-strong" />
          <p className="text-[13px] font-semibold text-accent">Free forever</p>
          <ul className="mt-1 space-y-0.5 text-[13px] leading-relaxed text-fg-muted">
            <li>No sign-up.</li>
            <li>No watermarks.</li>
            <li>Most tools run on-device.</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
