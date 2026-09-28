"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Logo } from "../Logo";
import { AccountLinks } from "../home/AccountLinks";

// Absolute paths so the links work from every page, not just the homepage.
const LINKS = [
  { href: "/tools", label: "All tools" },
  { href: "/#editor", label: "PDF editor" },
  { href: "/write", label: "Word" },
  { href: "/sheets", label: "Excel" },
  { href: "/slides", label: "PowerPoint" },
  { href: "/tools/image-editor", label: "Images" },
  { href: "/#privacy", label: "Privacy" },
  { href: "/#faq", label: "FAQ" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled ? "border-b border-rule bg-paper/85 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1280px] items-center gap-8 px-5 md:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-display text-[17px] font-semibold tracking-tight text-ink">
          <Logo className="h-7 w-7" />
          Fusion Office
        </Link>
        <ul className="hidden items-center gap-5 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-[14px] text-ink-soft transition-colors hover:text-ink">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <AccountLinks />
          <Link
            href="/editor"
            className="btn group inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[14px] font-medium text-paper transition-colors hover:bg-ink/85"
          >
            Open editor
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
