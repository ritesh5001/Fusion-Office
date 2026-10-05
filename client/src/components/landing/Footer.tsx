import Link from "next/link";
import { ArrowUpRight, ChevronDown, Instagram, Mail, MessageCircle } from "lucide-react";
import { Logo } from "../Logo";
import { COMPANY } from "@/lib/company";
import { MotionToggle } from "../site/MotionToggle";
import { AppBanner } from "../site/AppBanner";

const COLUMNS = [
  {
    title: "Apps",
    links: [
      { href: "/tools/edit-pdf", label: "PDF editor" },
      { href: "/tools/word-editor", label: "Word editor" },
      { href: "/tools/excel-editor", label: "Excel editor" },
      { href: "/tools/powerpoint-editor", label: "PowerPoint editor" },
      { href: "/tools/image-editor", label: "Image editor" },
    ],
  },
  {
    title: "Popular tools",
    links: [
      { href: "/tools/merge-pdf", label: "Merge PDF" },
      { href: "/tools/compress-pdf", label: "Compress PDF" },
      { href: "/tools/pdf-to-word", label: "PDF to Word" },
      { href: "/tools/word-to-pdf", label: "Word to PDF" },
      { href: "/tools/compress-image", label: "Compress image" },
    ],
  },
  {
    title: "Categories",
    links: [
      { href: "/pdf-tools", label: "PDF tools" },
      { href: "/pdf-converter", label: "PDF converter" },
      { href: "/office-tools", label: "Office tools" },
      { href: "/image-tools", label: "Image tools" },
      { href: "/ai-pdf-tools", label: "AI PDF tools" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/tools", label: "All tools" },
      { href: "/guides", label: "Guides" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/how-we-built-it", label: "How we built it" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/contact", label: "Contact us" },
      { href: "/pay-it-forward", label: "Pay it forward" },
      { href: "/#privacy", label: "Privacy" },
      { href: "#feedback", label: "Send feedback" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="site-chrome border-t border-line bg-app">
      <AppBanner />
      <div className="mx-auto grid gap-12 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:px-8">
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left lg:col-span-4">
          <Link href="/" className="flex items-center gap-2.5 font-display text-[17px] font-bold tracking-[-0.02em] text-fg">
            <Logo className="h-7 w-7" /> Fusion Office
          </Link>
          <p className="mt-3 max-w-[36ch] text-[14px] leading-relaxed text-fg-muted">
            Free tools for PDFs, Office documents and images. Most of them run in your browser, so your files stay with you.
          </p>

          {/* The team behind it. */}
          <div className="group relative mt-6 w-full max-w-[380px] overflow-hidden rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong">
            <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgb(139_124_246/0.28),transparent_70%)] transition-transform duration-500 group-hover:scale-125" />
            <p className="relative text-[11.5px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">A product by</p>
            <a href={COMPANY.url} target="_blank" rel="noopener" className="relative mt-1 inline-flex items-center gap-1 font-display text-[19px] font-bold tracking-[-0.02em]">
              <span className="bg-[linear-gradient(90deg,#b6adff,#cdf564)] bg-clip-text text-transparent">NextGen Fusion</span>
              <ArrowUpRight className="h-4 w-4 text-fg-subtle transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden="true" />
            </a>
            <p className="relative mt-1.5 text-[13.5px] leading-relaxed text-fg-muted">
              Our Team Develops Websites, online stores, apps and custom software.
            </p>
            <div className="relative mt-4 flex items-center justify-center gap-2 sm:justify-start">
              <a href={COMPANY.url} target="_blank" rel="noopener" className="btn btn-secondary btn-sm">
                Work with us
              </a>
              {[
                { href: `mailto:${COMPANY.email}`, label: `Email ${COMPANY.email}`, icon: Mail },
                { href: COMPANY.whatsapp, label: "WhatsApp NextGen Fusion", icon: MessageCircle },
                { href: COMPANY.instagram, label: "NextGen Fusion on Instagram", icon: Instagram },
              ].map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  {...(c.href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}
                  aria-label={c.label}
                  title={c.label}
                  className="fo-press flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted ring-1 ring-inset ring-line transition-colors hover:bg-raised hover:text-fg"
                >
                  <c.icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>
        {/* Phones: one row per section that opens in place, centred. */}
        <nav aria-label="Footer" className="-mx-1 divide-y divide-line border-y border-line sm:hidden">
          {COLUMNS.map((c) => (
            <details key={c.title} className="fo-faq group">
              <summary className="flex h-14 cursor-pointer list-none items-center justify-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-fg-muted transition-colors hover:text-fg group-open:text-fg [&::-webkit-details-marker]:hidden">
                {c.title}
                <ChevronDown className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
              </summary>
              <ul className="flex flex-col items-center gap-3.5 pb-5 pt-1">
                {c.links.map((l) =>
                  l.href.startsWith("#") ? (
                    <li key={l.label}>
                      <a href={l.href} className="text-[15px] text-fg-muted hover:text-fg">
                        {l.label}
                      </a>
                    </li>
                  ) : (
                    <li key={l.label}>
                      <Link href={l.href} className="text-[15px] text-fg-muted hover:text-fg">
                        {l.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </details>
          ))}
        </nav>
        <nav aria-label="Footer" className="hidden gap-x-6 gap-y-9 sm:grid sm:grid-cols-3 lg:col-span-8 lg:grid-cols-5">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="eyebrow">{c.title}</p>
              <ul className="mt-4 space-y-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith("#") ? (
                      // In-page action (opens the feedback form): a plain link fires the hash change it listens for.
                      <a href={l.href} className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 text-[14px] text-fg-muted transition-[color,background-size] duration-200 hover:bg-[length:100%_1px] hover:text-fg">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 text-[14px] text-fg-muted transition-[color,background-size] duration-200 hover:bg-[length:100%_1px] hover:text-fg">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="mx-auto flex flex-col items-center gap-4 border-t border-line px-4 py-5 text-[13px] text-fg-subtle sm:px-6 lg:flex-row lg:justify-between lg:px-8">
        <p>
          © {new Date().getFullYear()} Fusion Office ·{" "}
          <a
            href="https://nextgenfusion.in"
            target="_blank"
            rel="noopener"
            className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 font-medium text-fg-muted transition-[color,background-size] duration-200 hover:bg-[length:100%_1px] hover:text-fg"
          >
            nextgenfusion.in
          </a>
        </p>
        <p className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[14px] text-fg-muted shadow-[0_0_24px_-8px_rgb(139_124_246/0.6)] transition-shadow duration-200 hover:shadow-[0_0_28px_-6px_rgb(205_245_100/0.45)]">
          Made with
          <svg viewBox="0 0 24 24" className="fo-heartbeat h-4 w-4 fill-[#ff5a6e] drop-shadow-[0_0_6px_rgb(255_90_110/0.7)]" role="img" aria-label="love">
            <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.5c2.2 0 3.6 1.2 4.4 2.5.8-1.3 2.2-2.5 4.4-2.5 3.7 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z" />
          </svg>
          by
          <a
            href="https://nextgenfusion.in"
            target="_blank"
            rel="noopener"
            className="bg-[linear-gradient(90deg,#b6adff,#cdf564)] bg-clip-text font-bold tracking-[-0.01em] text-transparent transition-[filter] duration-200 hover:brightness-125"
          >
            NextGen Fusion
          </a>
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <MotionToggle />
          <p>No sign-up. No watermarks.</p>
        </div>
      </div>
    </footer>
  );
}
