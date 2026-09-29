import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { ToolsHub } from "@/components/tools/ToolsHub";
import { TOOLS } from "@/lib/tools/registry";

export const metadata: Metadata = {
  title: "All tools",
  description: "Merge, split, compress, convert, edit, sign, protect and redact PDFs, open Word, Excel and PowerPoint files, and edit, compress, resize and crop images. Most tools run privately in your browser.",
};

export default function ToolsPage() {
  const inBrowser = TOOLS.filter((t) => t.runs === "browser" && t.status === "ready").length;
  return (
    <div className="landing relative min-h-dvh overflow-x-clip">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[linear-gradient(180deg,#eef3ff_0%,#f4f6fb_70%,transparent_100%)]"
        aria-hidden="true"
      />
      <div className="relative z-10">
        <Nav />
        <main id="main">
          <ToolsHub
            intro={
              <header>
                <p className="text-[13px] font-medium text-brand-700">
                  {TOOLS.length} tools · {inBrowser} run on your device
                </p>
                <h1 className="mx-auto mt-3 max-w-[20ch] text-balance font-display text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.04em]">
                  Every PDF, Office and image tool
                </h1>
              </header>
            }
          />
        </main>
        <Footer />
      </div>
    </div>
  );
}
