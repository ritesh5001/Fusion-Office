import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { ToolsHub } from "@/components/tools/ToolsHub";
import { TOOLS } from "@/lib/tools/registry";
import { TOOL_COUNT, pageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = pageMetadata({
  title: `All ${TOOL_COUNT} Free Online Tools – PDF, Office & Image | Fusion Office`,
  description: "The full Fusion Office catalogue: merge, split, compress, convert, edit, sign, protect and redact PDFs, edit Word, Excel and PowerPoint files, and compress, resize and convert images.",
  path: "/tools",
});

export default function ToolsPage() {
  const inBrowser = TOOLS.filter((t) => t.runs === "browser" && t.status === "ready").length;
  return (
    <SiteShell>
      <main id="main" className="px-4 pb-20 pt-10 sm:px-6 md:pt-14 lg:px-8">
        <header className="mb-10 max-w-[680px]">
          <p className="eyebrow">
            {TOOLS.length} tools · {inBrowser} run on your device
          </p>
          <h1 className="mt-3 text-balance font-display text-[clamp(2rem,4.5vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-fg">
            Every PDF, Office and image tool
          </h1>
        </header>
        <ToolsHub title="Browse tools" />
      </main>
    </SiteShell>
  );
}
