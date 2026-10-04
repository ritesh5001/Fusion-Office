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
import { categoryHref } from "@/lib/seo/clusters";
import { scrollBehavior } from "@/lib/motion";

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
      <div className="mx-auto flex w-full flex-1">
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

  // On pages that list categories (the homepage, category pages), follow the
  // section being read: the last one whose top has passed a line 35% down the
  // screen. Past the end of the last one (privacy, FAQ…) nothing is marked.
  useEffect(() => {
    setInView(active);
    let frame = 0;
    const update = () => {
      const sections = CATEGORIES.map((c) => document.getElementById(`cat-${c.id}`)).filter((el): el is HTMLElement => !!el);
      if (!sections.length) return setInView(active);
      const line = window.innerHeight * 0.35;
      let current: HTMLElement | null = null;
      for (const el of sections) if (el.getBoundingClientRect().top <= line) current = el;
      const last = sections[sections.length - 1];
      if (!current || (current === last && last.getBoundingClientRect().bottom < line - 80)) return setInView(active);
      setInView(current.id.slice(4) as Category);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname, active]);

  const index = inView ? CATEGORIES.findIndex((c) => c.id === inView) : -1;

  // On a page that lists the category, glide to it instead of reloading.
  const go = (e: React.MouseEvent, id: Category) => {
    const el = document.getElementById(`cat-${id}`);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    history.replaceState(null, "", `#cat-${id}`);
    setInView(id);
  };

  return (
    <aside aria-label="Tool categories" className="hidden w-[208px] shrink-0 border-r border-line xl:block">
      <div className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col px-3 py-6">
        <p className="eyebrow px-3">Tools</p>
        <div className="relative mt-2 pl-2.5">
          {/* Tracking line: where you are in the tool library. */}
          <span aria-hidden="true" className="absolute bottom-1 left-0 top-1 w-px bg-line" />
          <span
            aria-hidden="true"
            className={cn(
              "absolute left-[-0.5px] top-0 h-10 w-[2px] rounded-full bg-accent shadow-[0_0_10px_#cdf564] transition-[transform,opacity] duration-300 ease-[cubic-bezier(.3,.7,.2,1)]",
              index < 0 && "opacity-0",
            )}
            style={{ transform: `translateY(${Math.max(0, index) * 42}px)` }}
          />
          <ul className="space-y-0.5">
            {CATEGORIES.map((c) => {
              const on = inView === c.id;
              return (
                <li key={c.id}>
                  <a
                    href={categoryHref(c.id)}
                    onClick={(e) => go(e, c.id)}
                    aria-current={on ? "true" : undefined}
                    className={cn(
                      "group relative flex h-10 items-center gap-3 overflow-hidden rounded-[10px] px-3 text-[14px] font-medium transition-colors duration-200",
                      on ? "text-on-accent" : "text-fg-muted hover:bg-raised hover:text-fg",
                    )}
                  >
                    {/* The active pill grows in from the left. */}
                    {on && <span key={c.id} aria-hidden="true" className="fo-grow-x absolute inset-0 rounded-[10px] bg-accent shadow-[0_0_18px_rgb(205_245_100/0.35)]" />}
                    <ToolIcon
                      name={CATEGORY_META[c.id].icon}
                      className={cn(
                        "relative h-[18px] w-[18px] shrink-0 transition-[scale,color,rotate] duration-200 group-hover:-rotate-6 group-hover:scale-[1.15]",
                        on ? "" : "text-fg-subtle group-hover:text-accent",
                      )}
                      strokeWidth={1.8}
                    />
                    <span className="relative flex-1 truncate">{CATEGORY_META[c.id].short}</span>
                    {on && <ChevronRight className="relative h-4 w-4" aria-hidden="true" />}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

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
