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
      { href: "/tools", label: "All tools" },
      { href: "/#privacy", label: "Privacy" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#faq", label: "FAQ" },
      { href: "/dashboard", label: "My documents" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-app">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-12 lg:px-8">
        <div className="md:col-span-4">
          <Link href="/" className="flex items-center gap-2.5 font-display text-[17px] font-bold tracking-[-0.02em] text-fg">
            <Logo className="h-7 w-7" /> Fusion Office
          </Link>
          <p className="mt-3 max-w-[36ch] text-[14px] leading-relaxed text-fg-muted">
            Free tools for PDFs, Office documents and images. Most of them run in your browser, so your files stay with you.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-8">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="eyebrow">{c.title}</p>
              <ul className="mt-3 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[14px] text-fg-muted transition-colors hover:text-fg">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-1 border-t border-line px-4 py-5 text-[13px] text-fg-subtle sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} Fusion Office</p>
        <p>No sign-up. No watermarks.</p>
      </div>
    </footer>
  );
}
