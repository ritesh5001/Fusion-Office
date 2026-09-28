"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Server, Sparkles } from "lucide-react";
import { CATEGORIES, TOOLS, type Category } from "@/lib/tools/registry";
import { CATEGORY_TINT, ToolIcon } from "./icons";
import { cn } from "../ui/primitives";

export function ToolsHub() {
  const [cat, setCat] = useState<Category | "all">("all");
  const list = TOOLS.filter((t) => cat === "all" || t.category === cat);
  return (
    <>
      <div role="tablist" aria-label="Tool categories" className="flex flex-wrap justify-center gap-2">
        {[{ id: "all" as const, label: "All" }, ...CATEGORIES].map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={cat === c.id}
            onClick={() => setCat(c.id)}
            className={cn("h-9 rounded-full px-4 text-[13px] transition-colors", cat === c.id ? "bg-ink text-paper" : "bg-white text-ink ring-1 ring-rule hover:ring-rule-strong")}
          >
            {c.label}
          </button>
        ))}
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((t) => {
          const soon = t.status === "soon";
          const body = (
            <>
              <div className="flex items-start justify-between">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${CATEGORY_TINT[t.category]}`}>
                  <ToolIcon name={t.icon} className="h-5 w-5" />
                </span>
                {soon ? (
                  <span className="rounded-full bg-paper-deep px-2 py-0.5 text-[11px] font-medium text-ink-soft">Soon</span>
                ) : t.runs !== "browser" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-paper-deep px-2 py-0.5 text-[11px] text-ink-soft" title={t.runs === "ai" ? "Uses AI on our server" : "Converted on our server"}>
                    {t.runs === "ai" ? <Sparkles className="h-3 w-3" aria-hidden="true" /> : <Server className="h-3 w-3" aria-hidden="true" />}
                    {t.runs === "ai" ? "AI" : "Server"}
                  </span>
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-ink-soft opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                )}
              </div>
              <h2 className="mt-4 text-[16px] font-semibold tracking-[-0.01em]">{t.name}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{t.description}</p>
            </>
          );
          const cls = "group block h-full rounded-2xl bg-white p-5 ring-1 ring-ink/10 transition";
          return (
            <li key={t.slug}>
              {soon ? (
                <div className={cn(cls, "opacity-60")}>{body}</div>
              ) : (
                <Link href={t.href ?? `/tools/${t.slug}`} className={cn(cls, "hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-18px_rgb(16_19_26/0.4)] hover:ring-ink/20")}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
        {cat === "all" && (
          <li>
            <Link href="/tools/workflows" className="group block h-full rounded-2xl bg-ink p-5 text-paper transition hover:-translate-y-0.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                <ToolIcon name="Workflow" className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-[16px] font-semibold">Create a workflow</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-white/65">Chain tools together, save the recipe, and run it on any PDF.</p>
            </Link>
          </li>
        )}
      </ul>
    </>
  );
}
