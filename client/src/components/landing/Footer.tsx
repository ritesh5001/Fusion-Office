import Link from "next/link";
import { Logo } from "../Logo";

const COLUMNS = [
  {
    title: "Apps",
    links: [
      { href: "/editor", label: "PDF editor" },
      { href: "/write", label: "Word editor" },
      { href: "/sheets", label: "Excel editor" },
      { href: "/slides", label: "PowerPoint editor" },
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
    title: "Fusion Office",
    links: [
      { href: "/#tools", label: "All tools" },
      { href: "/#faq", label: "FAQ" },
      { href: "/dashboard", label: "My documents" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-rule bg-white/60">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-12 md:grid-cols-12 md:px-8">
        <div className="md:col-span-4">
          <Link href="/" className="flex items-center gap-2.5 font-display text-[17px] font-semibold tracking-tight">
            <Logo className="h-7 w-7" /> Fusion Office
          </Link>
          <p className="mt-3 max-w-[36ch] text-[14px] leading-relaxed text-ink-soft">
            Free tools for PDFs, Office documents and images. Most of them run in your browser, so your files stay with you.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-8">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="text-[13px] font-semibold text-ink">{c.title}</p>
              <ul className="mt-3 space-y-2">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[14px] text-ink-soft transition-colors hover:text-brand-700">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="mx-auto flex max-w-[1280px] flex-col gap-1 border-t border-rule px-5 py-5 text-[13px] text-ink-soft sm:flex-row sm:justify-between md:px-8">
        <p>© {new Date().getFullYear()} Fusion Office</p>
        <p>No sign-up. No watermarks.</p>
      </div>
    </footer>
  );
}
