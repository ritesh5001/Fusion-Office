import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Server, ShieldCheck, Sparkles } from "lucide-react";
import { Nav } from "../landing/Nav";
import { Footer } from "../landing/Footer";
import { ToolTile } from "./icons";
import { isCustomTool } from "@/lib/tools/custom";
import { TOOLS, type ToolDef } from "@/lib/tools/registry";
import { cn } from "@/lib/cn";

const RUNS_BADGE = {
  browser: { icon: ShieldCheck, title: "Works in your browser", text: "No file upload needed", tint: "bg-emerald-50 text-emerald-600" },
  server: { icon: Server, title: "Converted on our server", text: "Files are deleted right after", tint: "bg-sky-50 text-sky-600" },
  ai: { icon: Sparkles, title: "Uses AI", text: "Text is processed, not stored", tint: "bg-violet-50 text-violet-600" },
} as const;

/** What the tool takes, in plain words ("PDF files", "images"). */
function acceptLabel(tool: Pick<ToolDef, "accept" | "multiple">): string {
  const a = tool.accept;
  const many = tool.multiple;
  if (!a) return "a web address";
  if (a.includes("pdf")) return many ? "PDF files" : "a PDF file";
  if (a.includes(".doc")) return many ? "Word documents" : "a Word document";
  if (a.includes(".xls")) return many ? "spreadsheets" : "a spreadsheet";
  if (a.includes(".ppt")) return many ? "presentations" : "a presentation";
  if (a.includes("image")) return many ? "images" : "an image";
  return many ? "files" : "a file";
}

function steps(tool: ToolDef) {
  const what = acceptLabel(tool);
  return [
    tool.accept
      ? { title: `Add your ${tool.multiple ? "files" : "file"}`, text: `Choose or drop ${what}.` }
      : { title: "Enter the address", text: "Paste the link of the web page." },
    { title: "Choose your settings", text: "Pick the options you need, or keep the defaults." },
    { title: "Download", text: "Get the result straight away." },
  ];
}

/** Other tools in the same category, topped up with popular ones. */
function related(tool: ToolDef) {
  const same = TOOLS.filter((t) => t.category === tool.category && t.slug !== tool.slug && t.status === "ready");
  const popular = ["merge-pdf", "compress-pdf", "edit-pdf", "pdf-to-word"]
    .map((s) => TOOLS.find((t) => t.slug === s)!)
    .filter((t) => t && t.slug !== tool.slug && !same.includes(t));
  return [...same, ...popular].slice(0, 4);
}

/** Page frame for a single tool: breadcrumb, title, the tool, and help on the side. */
export function ToolLayout({ tool, children }: { tool: ToolDef; children: ReactNode }) {
  const badge = RUNS_BADGE[tool.runs];
  const wide = isCustomTool(tool.slug);

  const panels = (
    <>
      <section aria-labelledby="how-title" className="rounded-2xl bg-white p-5 ring-1 ring-ink/10">
        <h2 id="how-title" className="text-[15px] font-bold">
          How it works
        </h2>
        <ol className="mt-4 space-y-4">
          {steps(tool).map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[13px] font-bold text-brand-700">{i + 1}</span>
              <span>
                <span className="block text-[14px] font-semibold">{s.title}</span>
                <span className="block text-[13px] text-ink-soft">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="related-title" className="rounded-2xl bg-white p-5 ring-1 ring-ink/10">
        <h2 id="related-title" className="text-[15px] font-bold">
          Related tools
        </h2>
        <ul className="mt-3 -mx-2">
          {related(tool).map((t) => (
            <li key={t.slug}>
              <Link href={t.href ?? `/tools/${t.slug}`} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-paper">
                <ToolTile tool={t} size="sm" />
                <span className="flex-1 text-[14px] font-medium">{t.name}</span>
                <ChevronRight className="h-4 w-4 text-ink-soft transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );

  return (
    <div className="landing relative min-h-dvh overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[linear-gradient(180deg,#eef3ff_0%,transparent_100%)]" aria-hidden="true" />
      <div className="relative z-10">
        <Nav />
        <main id="main" className="mx-auto max-w-[1280px] px-5 pb-24 pt-6 md:px-8">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-[13px] text-ink-soft">
              <li>
                <Link href="/#all-tools" className="hover:text-ink">
                  All tools
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
              <li aria-current="page" className="font-medium text-ink">
                {tool.name}
              </li>
            </ol>
          </nav>

          <header className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <ToolTile tool={tool} size="lg" className="h-16 w-16 rounded-[18px] [&_svg]:h-8 [&_svg]:w-8" />
              <div>
                <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-extrabold leading-[1.05] tracking-[-0.035em]">{tool.name}</h1>
                <p className="mt-1.5 max-w-[60ch] text-[15px] leading-relaxed text-ink-soft">{tool.description}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-ink/10">
              <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", badge.tint)}>
                <badge.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[13px] font-semibold">{badge.title}</span>
                <span className="block text-[12px] text-ink-soft">{badge.text}</span>
              </span>
            </div>
          </header>

          {wide ? (
            <>
              <div className="mt-8">{children}</div>
              <div className="mt-10 grid gap-6 md:grid-cols-2">{panels}</div>
            </>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0">{children}</div>
              <aside className="space-y-6">{panels}</aside>
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}
