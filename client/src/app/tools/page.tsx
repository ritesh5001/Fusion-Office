import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { ToolsHub } from "@/components/tools/ToolsHub";
import { TOOLS } from "@/lib/tools/registry";

export const metadata: Metadata = {
  title: "PDF and image tools",
  description: "Merge, split, compress, convert, edit, sign, protect and redact PDFs, plus an image editor and tools to compress, resize, crop and convert images. Most tools run privately in your browser.",
};

export default function ToolsPage() {
  const inBrowser = TOOLS.filter((t) => t.runs === "browser" && t.status === "ready").length;
  return (
    <div className="landing relative min-h-dvh">
      <div className="landing-env" aria-hidden="true" />
      <div className="relative z-10">
        <Nav />
        <main id="main" className="mx-auto max-w-[1280px] px-5 pb-24 pt-14 md:px-8 md:pt-20">
          <header className="text-center">
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-ink-soft">{TOOLS.length} tools · {inBrowser} run on your device</p>
            <h1 className="mx-auto mt-5 max-w-[18ch] text-balance font-display text-[clamp(2.4rem,6vw,4.75rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
              Every PDF and image tool, in one place.
            </h1>
            <p className="mx-auto mt-5 max-w-[56ch] text-[17px] leading-relaxed text-ink-soft">
              Merge, split, convert, sign and protect PDFs. Edit, compress, resize and crop images. Tools marked Server or AI say so up front; everything else never leaves your computer.
            </p>
          </header>
          <div className="mt-12">
            <ToolsHub />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
