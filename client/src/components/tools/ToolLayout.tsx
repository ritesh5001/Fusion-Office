import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Server, ShieldCheck, Sparkles } from "lucide-react";
import { SiteShell } from "../site/SiteShell";
import { CATEGORY_META } from "../site/categories";
import { ToolTile } from "./icons";
import { TOOLS, type ToolDef } from "@/lib/tools/registry";
import { cn } from "@/lib/cn";

const RUNS_BADGE = {
  browser: { icon: ShieldCheck, title: "Works in your browser", text: "No file upload needed", tint: "bg-emerald-500/10 text-emerald-300" },
  server: { icon: Server, title: "Converted on our server", text: "Files are deleted right after", tint: "bg-sky-500/10 text-sky-300" },
  ai: { icon: Sparkles, title: "Uses AI", text: "Text is processed, not stored", tint: "bg-violet-500/10 text-violet-300" },
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

/** Steps for tools that don't follow "add a file, choose settings, download". */
const CUSTOM_STEPS: Record<string, { title: string; text: string }[]> = {
  "chat-with-pdf": [
    { title: "Add your PDF", text: "Its text is read on your device." },
    { title: "Ask a question", text: "In your own words, or pick a suggestion." },
    { title: "Get the answer", text: "With the pages it comes from." },
  ],
  "pdf-to-audio": [
    { title: "Add your PDF", text: "Its text is read on your device." },
    { title: "Choose a voice and speed", text: "Your browser's own voices." },
    { title: "Press play", text: "Tap any sentence to jump there." },
  ],
  "gst-invoice": [
    { title: "Fill in both parties", text: "GSTINs are checked as you type." },
    { title: "Add the items", text: "CGST/SGST or IGST is worked out for you." },
    { title: "Download the PDF", text: "The next invoice number is ready." },
  ],
};

function steps(tool: ToolDef) {
  if (CUSTOM_STEPS[tool.slug]) return CUSTOM_STEPS[tool.slug];
  const what = acceptLabel(tool);
  return [
    tool.accept
      ? { title: `Add your ${tool.multiple ? "files" : "file"}`, text: `Choose or drop ${what}.` }
      : tool.slug === "html-to-pdf"
        ? { title: "Enter the address", text: "Paste the link of the web page." }
        : { title: "Type your text", text: "Type or paste what you want to turn into a PDF." },
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

/** Page frame for a single tool: breadcrumb, title, the tool, then help and related tools. */
export function ToolLayout({ tool, children }: { tool: ToolDef; children: ReactNode }) {
  const badge = RUNS_BADGE[tool.runs];
  const category = CATEGORY_META[tool.category];

  return (
    <SiteShell active={tool.category}>
      <main id="main" className="px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb">
          <ol className="flex min-w-0 items-center gap-1.5 text-[13px] text-fg-subtle">
            <li className="shrink-0">
              <Link href="/#all-tools" className="hover:text-fg">
                All tools
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li className="shrink-0">
              <Link href={`/#cat-${tool.category}`} className="hover:text-fg">
                {category.short}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li aria-current="page" className="truncate font-medium text-fg-muted">
              {tool.name}
            </li>
          </ol>
        </nav>

        <header className="mt-5 flex flex-col gap-4 border-b border-line pb-7 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <ToolTile tool={tool} size="xl" />
            <div className="min-w-0">
              <h1 className="font-display text-[clamp(1.6rem,3.2vw,2.25rem)] font-bold leading-[1.1] tracking-[-0.03em] text-fg">{tool.name}</h1>
              <p className="mt-1 max-w-[62ch] text-[15px] leading-relaxed text-fg-muted">{tool.description}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 self-start rounded-xl border border-line bg-surface px-3.5 py-2.5 md:self-auto">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", badge.tint)}>
              <badge.icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[13px] font-semibold text-fg">{badge.title}</span>
              <span className="block text-[12px] text-fg-muted">{badge.text}</span>
            </span>
          </div>
        </header>

        <div className="mt-8">{children}</div>

        <div className="mt-14 grid gap-3 md:grid-cols-2">
          <section aria-labelledby="how-title" className="card p-5">
            <h2 id="how-title" className="text-[15px] font-semibold text-fg">
              How it works
            </h2>
            <ol className="mt-4 space-y-4">
              {steps(tool).map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-raised font-mono text-[12px] font-medium text-fg ring-1 ring-inset ring-line-strong">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-[14px] font-semibold text-fg">{s.title}</span>
                    <span className="block text-[13px] text-fg-muted">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="related-title" className="card p-5">
            <h2 id="related-title" className="text-[15px] font-semibold text-fg">
              Related tools
            </h2>
            <ul className="-mx-2 mt-3">
              {related(tool).map((t) => (
                <li key={t.slug}>
                  <Link href={t.href ?? `/tools/${t.slug}`} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-raised">
                    <ToolTile tool={t} size="sm" />
                    <span className="flex-1 text-[14px] font-medium text-fg">{t.name}</span>
                    <ChevronRight className="h-4 w-4 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
