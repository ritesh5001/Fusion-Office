"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Menu, Search, X } from "lucide-react";
import { Logo } from "../Logo";
import { AccountLinks } from "../home/AccountLinks";
import { ToolsMenu } from "./ToolsMenu";
import { CATEGORY_META } from "../site/categories";
import { ToolIcon } from "../tools/icons";
import { CATEGORIES } from "@/lib/tools/registry";
import { cn } from "../ui/primitives";

// Absolute paths so the links work from every page, not just the homepage.
const LINKS = [
  { href: "/#privacy", label: "Privacy" },
  { href: "/#how-it-works", label: "How it works" },
];

export function Nav() {
  const pathname = usePathname();
  const [menu, setMenu] = useState<"tools" | "mobile" | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Close menus on navigation, Escape, or a click outside.
  useEffect(() => setMenu(null), [pathname]);
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    const onDown = (e: PointerEvent) => {
      if (!panel.current?.contains(e.target as Node)) setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [menu]);

  const link = "inline-flex h-9 items-center rounded-lg px-3 text-[14px] font-medium text-fg-muted transition-colors hover:bg-raised hover:text-fg";

  return (
    <header ref={panel} className="sticky top-0 z-40 border-b border-line bg-app/85 backdrop-blur-xl">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 font-display text-[18px] font-bold tracking-[-0.02em] text-fg">
          <Logo className="h-7 w-7" />
          Fusion Office
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          <li>
            <button
              type="button"
              aria-expanded={menu === "tools"}
              aria-controls="tools-menu"
              onClick={() => setMenu(menu === "tools" ? null : "tools")}
              className={cn(link, "gap-1", menu === "tools" && "bg-raised text-fg")}
            >
              Tools
              <ChevronDown className={cn("h-4 w-4 transition-transform", menu === "tools" && "rotate-180")} aria-hidden="true" />
            </button>
          </li>
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className={link}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 lg:justify-self-end">
          <a href="/#search" aria-label="Search tools" className="flex h-10 w-10 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-raised hover:text-fg">
            <Search className="h-[18px] w-[18px]" aria-hidden="true" />
          </a>
          <AccountLinks />
          <Link href="/editor" className="btn btn-primary group hidden sm:inline-flex">
            Launch workspace
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            aria-label={menu === "mobile" ? "Close menu" : "Open menu"}
            aria-expanded={menu === "mobile"}
            onClick={() => setMenu(menu === "mobile" ? null : "mobile")}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-fg transition-colors hover:bg-raised lg:hidden"
          >
            {menu === "mobile" ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {menu === "tools" && (
        <div
          id="tools-menu"
          className="absolute inset-x-0 top-full hidden max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-surface shadow-pop lg:block"
        >
          <ToolsMenu onNavigate={() => setMenu(null)} />
        </div>
      )}

      {menu === "mobile" && (
        <div className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-surface px-4 pb-6 pt-4 shadow-pop sm:px-6 lg:hidden">
          <p className="eyebrow px-1">Tools</p>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <a
                  href={`/#cat-${c.id}`}
                  onClick={() => setMenu(null)}
                  className="flex h-11 items-center gap-2.5 rounded-xl bg-raised px-3 text-[14px] font-medium text-fg ring-1 ring-line"
                >
                  <ToolIcon name={CATEGORY_META[c.id].icon} className="h-4 w-4 shrink-0 text-fg-muted" />
                  <span className="truncate">{CATEGORY_META[c.id].short}</span>
                </a>
              </li>
            ))}
          </ul>
          <ul className="mt-4 space-y-1 border-t border-line pt-4">
            {[...LINKS, { href: "/dashboard", label: "My documents" }].map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setMenu(null)} className="flex h-10 items-center rounded-lg px-2 text-[15px] font-medium text-fg-muted hover:bg-raised hover:text-fg">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <Link href="/editor" className="btn btn-primary btn-lg mt-4 w-full">
            Launch workspace <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </header>
  );
}
