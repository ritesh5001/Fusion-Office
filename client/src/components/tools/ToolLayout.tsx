import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ShieldCheck, Server, Sparkles } from "lucide-react";
import { Nav } from "../landing/Nav";
import { CATEGORY_TINT, ToolIcon } from "./icons";
import { RUNS_LABEL, type ToolDef } from "@/lib/tools/registry";

/** Page frame for a single tool: site nav, title block, content. */
export function ToolLayout({ tool, children }: { tool: ToolDef; children: ReactNode }) {
  const RunsIcon = tool.runs === "browser" ? ShieldCheck : tool.runs === "ai" ? Sparkles : Server;
  return (
    <div className="landing min-h-dvh">
      <Nav />
      <main id="main" className="mx-auto max-w-[1100px] px-5 pb-24 pt-8 md:px-8">
        <Link href="/tools" className="inline-flex items-center gap-1 text-[13px] text-ink-soft hover:text-ink">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> All tools
        </Link>
        <header className="mt-6 flex flex-col items-center text-center">
          <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${CATEGORY_TINT[tool.category]}`}>
            <ToolIcon name={tool.icon} className="h-7 w-7" />
          </span>
          <h1 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.035em]">{tool.name}</h1>
          <p className="mt-3 max-w-[52ch] text-[16px] leading-relaxed text-ink-soft">{tool.description}</p>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[12px] text-ink-soft ring-1 ring-rule">
            <RunsIcon className={`h-3.5 w-3.5 ${tool.runs === "browser" ? "text-emerald-600" : "text-ink-soft"}`} aria-hidden="true" />
            {RUNS_LABEL[tool.runs]}
          </p>
        </header>
        <div className="mt-10">{children}</div>
      </main>
    </div>
  );
}
