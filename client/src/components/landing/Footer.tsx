import Link from "next/link";
import { Logo } from "../Logo";
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
    title: "Fusion Office",
    links: [
      { href: "/tools", label: "All tools" },
      { href: "/guides", label: "Guides" },
      { href: "/#privacy", label: "Privacy" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/how-we-built-it", label: "How we built it" },
      { href: "/about", label: "About us" },
      { href: "/contact", label: "Contact us" },
      { href: "/pay-it-forward", label: "Pay it forward" },
      { href: "/#faq", label: "FAQ" },
      { href: "#feedback", label: "Send feedback" },
      { href: "/dashboard", label: "My documents" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="site-chrome border-t border-line bg-app">
      <AppBanner />
      <div className="mx-auto grid gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-4">
          <Link href="/" className="flex items-center gap-2.5 font-display text-[17px] font-bold tracking-[-0.02em] text-fg">
            <Logo className="h-7 w-7" /> Fusion Office
          </Link>
          <p className="mt-3 max-w-[36ch] text-[14px] leading-relaxed text-fg-muted">
            Free tools for PDFs, Office documents and images. Most of them run in your browser, so your files stay with you.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 lg:col-span-8">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="eyebrow">{c.title}</p>
              <ul className="mt-3 space-y-2.5">
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
