"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Menu, Search, X } from "lucide-react";
import { Logo } from "../Logo";
import { AccountLinks } from "../home/AccountLinks";
import { ToolsMenu } from "./ToolsMenu";
import { CATEGORIES } from "@/lib/tools/registry";
import { cn } from "../ui/primitives";

// Absolute paths so the links work from every page, not just the homepage.
const LINKS = [
  { href: "/#cat-organize", label: "PDF" },
  { href: "/#cat-office", label: "Office" },
  { href: "/#cat-image", label: "Images" },
  { href: "/#cat-intelligence", label: "AI" },
];

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState<"tools" | "mobile" | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  return (
    <header
      ref={panel}
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color] duration-300",
        scrolled || menu ? "border-rule bg-white/90 backdrop-blur-md" : "border-transparent bg-transparent",
      )}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1280px] items-center gap-6 px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-display text-[18px] font-bold tracking-tight text-ink">
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
              className={cn(
                "inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[14px] font-medium transition-colors",
                menu === "tools" ? "bg-brand-50 text-brand-700" : "text-ink hover:bg-paper-deep",
              )}
            >
              Tools
              <ChevronDown className={cn("h-4 w-4 transition-transform", menu === "tools" && "rotate-180")} aria-hidden="true" />
            </button>
          </li>
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="inline-flex h-9 items-center rounded-lg px-3 text-[14px] font-medium text-ink transition-colors hover:bg-paper-deep">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <a href="/#search" aria-label="Search tools" className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-paper-deep">
            <Search className="h-[18px] w-[18px]" aria-hidden="true" />
          </a>
          <AccountLinks />
          <Link
            href="/editor"
            className="btn group hidden h-10 items-center gap-1.5 rounded-full bg-brand-600 px-5 text-[14px] font-semibold text-white shadow-[0_8px_20px_-8px_rgb(47_84_235/0.7)] transition-colors hover:bg-brand-700 sm:inline-flex"
          >
            Open Editor
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            aria-label={menu === "mobile" ? "Close menu" : "Open menu"}
            aria-expanded={menu === "mobile"}
            onClick={() => setMenu(menu === "mobile" ? null : "mobile")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-paper-deep lg:hidden"
          >
            {menu === "mobile" ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {menu === "tools" && (
        <div
          id="tools-menu"
          className="absolute inset-x-0 top-full hidden max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-rule bg-white shadow-[0_24px_48px_-24px_rgb(16_19_26/0.25)] lg:block"
        >
          <ToolsMenu onNavigate={() => setMenu(null)} />
        </div>
      )}

      {menu === "mobile" && (
        <div className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-rule bg-white px-5 pb-6 pt-2 lg:hidden">
          <ul className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <a href={`/#cat-${c.id}`} onClick={() => setMenu(null)} className="flex h-11 items-center rounded-xl bg-paper px-3 text-[14px] font-medium text-ink">
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
          <Link href="/editor" className="mt-4 flex h-12 items-center justify-center gap-1.5 rounded-full bg-brand-600 text-[15px] font-semibold text-white">
            Open Editor <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </header>
  );
}
