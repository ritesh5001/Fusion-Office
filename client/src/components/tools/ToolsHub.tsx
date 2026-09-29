"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Server, Sparkles, X } from "lucide-react";
import { CATEGORIES, TOOLS, toolBySlug, type Category, type ToolDef } from "@/lib/tools/registry";
import { CATEGORY_TINT, ToolIcon } from "./icons";
import { cn } from "../ui/primitives";

/** Shown under the search box: the tools people reach for most. */
const POPULAR = ["edit-pdf", "merge-pdf", "compress-pdf", "pdf-to-word", "word-to-pdf", "compress-image"];

/** Words people type that don't appear in the tool names. */
const SYNONYMS: Record<string, string> = {
  combine: "merge",
  join: "merge",
  shrink: "compress",
  reduce: "compress",
  smaller: "compress",
  size: "compress resize",
  docx: "word",
  doc: "word",
  xlsx: "excel",
  xls: "excel",
  csv: "excel",
  spreadsheet: "excel",
  pptx: "powerpoint",
  ppt: "powerpoint",
  slides: "powerpoint",
  presentation: "powerpoint",
  jpeg: "jpg",
  png: "jpg image",
  photo: "image jpg",
  picture: "image jpg",
  password: "protect unlock",
  encrypt: "protect",
  decrypt: "unlock",
  signature: "sign",
  esign: "sign",
  delete: "organize remove",
  reorder: "organize",
  scan: "scan ocr",
  text: "ocr edit",
  number: "page numbers",
  ai: "summarizer translate",
  summary: "summarizer",
  hide: "redact",
  kb: "compress resize",
};

/** Shorter names for the category bar, so it fits on one row. */
const TAB_LABEL: Partial<Record<Category, string>> = { office: "Office" };

const href = (t: ToolDef) => t.href ?? `/tools/${t.slug}`;

/** Every word must match the tool's name, description or category (directly or through a synonym). */
function matches(t: ToolDef, words: string[]) {
  const hay = `${t.name} ${t.description} ${CATEGORIES.find((c) => c.id === t.category)?.label ?? ""}`.toLowerCase();
  return words.every((w) => hay.includes(w) || (SYNONYMS[w] ?? "").split(" ").some((s) => s && hay.includes(s)));
}

/** Name matches first, then ready tools before "soon". */
function rank(t: ToolDef, words: string[]) {
  const name = t.name.toLowerCase();
  return (words.every((w) => name.includes(w)) ? 0 : 1) * 2 + (t.status === "soon" ? 1 : 0);
}

export function ToolsHub({ showSearch = true }: { showSearch?: boolean }) {
  const router = useRouter();
  const [cat, setCat] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = useMemo(() => {
    const inCat = TOOLS.filter((t) => cat === "all" || t.category === cat);
    return words.length ? inCat.filter((t) => matches(t, words)).sort((a, b) => rank(a, words) - rank(b, words)) : inCat;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, query]);

  // "/" jumps to search from anywhere on the page, like most tool sites.
  useEffect(() => {
    if (!showSearch) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSearch]);

  const firstReady = results.find((t) => t.status === "ready");
  const grouped = cat === "all" && !words.length;

  return (
    <div>
      {showSearch && (
        <div>
          <form
            className="mx-auto max-w-[640px]"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (words.length && firstReady) router.push(href(firstReady));
            }}
          >
            <label htmlFor="tool-search" className="sr-only">
              Search tools
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
              <input
                ref={input}
                id="tool-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                placeholder="Search tools: merge, compress, jpg…"
                autoComplete="off"
                enterKeyHint="go"
                className="h-14 w-full rounded-2xl bg-white pl-13 pr-14 text-[16px] text-ink shadow-[0_10px_30px_-18px_rgb(16_19_26/0.35)] ring-1 ring-ink/10 outline-none transition placeholder:text-ink-soft/80 focus-visible:outline-none focus:ring-2 focus:ring-brand-600 [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    input.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-soft hover:bg-paper-deep hover:text-ink"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md bg-paper-deep px-2 py-0.5 font-mono text-[12px] text-ink-soft ring-1 ring-rule sm:block">/</kbd>
              )}
            </div>
          </form>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[13px]">
            <span className="text-ink-soft">Popular:</span>
            {POPULAR.map((slug) => {
              const t = toolBySlug(slug);
              return t ? (
                <Link key={slug} href={href(t)} className="rounded-full bg-white px-3 py-1.5 text-ink ring-1 ring-rule transition hover:ring-brand-600 hover:text-brand-700">
                  {t.name}
                </Link>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Category bar: stays under the header while scrolling through the tools. */}
      <div className="sticky top-16 z-30 mx-[calc(50%-50vw)] mt-12 border-b border-rule bg-paper/90 py-3 backdrop-blur-md">
        <div role="tablist" aria-label="Tool categories" className="-my-1 overflow-x-auto px-5 py-1 [scrollbar-width:none] md:px-8">
          <div className="mx-auto flex w-max gap-2">
          {[{ id: "all" as const, label: "All tools" }, ...CATEGORIES].map((c) => {
            const count = c.id === "all" ? TOOLS.length : TOOLS.filter((t) => t.category === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={cat === c.id}
                onClick={() => setCat(c.id)}
                className={cn(
                  "h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-colors",
                  cat === c.id ? "bg-ink text-paper" : "bg-white text-ink ring-1 ring-rule hover:ring-rule-strong",
                )}
              >
                {c.id === "all" ? c.label : (TAB_LABEL[c.id] ?? c.label)}
                <span className={cn("ml-1.5 tabular-nums", cat === c.id ? "text-paper/60" : "text-ink-soft")}>{count}</span>
              </button>
            );
          })}
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {words.length ? `${results.length} tools match “${query}”` : ""}
      </p>

      <div className="mt-8">
        {results.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-14 text-center ring-1 ring-ink/10">
            <p className="text-[16px] font-medium">No tool matches “{query}”.</p>
            <p className="mt-1 text-[14px] text-ink-soft">Try a simpler word, like “pdf”, “image” or “convert”.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCat("all");
              }}
              className="mt-5 h-10 rounded-full bg-ink px-5 text-[14px] font-medium text-paper hover:bg-ink/85"
            >
              Show all tools
            </button>
          </div>
        ) : grouped ? (
          <div className="space-y-12">
            {CATEGORIES.map((c) => {
              const list = results.filter((t) => t.category === c.id);
              return list.length ? (
                <section key={c.id} aria-labelledby={`cat-${c.id}`}>
                  <h2 id={`cat-${c.id}`} className="flex items-baseline gap-2 text-[15px] font-semibold tracking-[-0.01em]">
                    {c.label}
                    <span className="text-[13px] font-normal text-ink-soft">{list.length}</span>
                  </h2>
                  <ToolGrid tools={list} />
                </section>
              ) : null;
            })}
            <WorkflowCard />
          </div>
        ) : (
          <ToolGrid tools={results} />
        )}
      </div>
    </div>
  );
}

function ToolGrid({ tools }: { tools: ToolDef[] }) {
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tools.map((t) => (
        <li key={t.slug}>
          <ToolCard tool={t} />
        </li>
      ))}
    </ul>
  );
}

function ToolCard({ tool: t }: { tool: ToolDef }) {
  const soon = t.status === "soon";
  const body = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${CATEGORY_TINT[t.category]}`}>
        <ToolIcon name={t.icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{t.name}</span>
          {soon ? (
            <span className="rounded-full bg-paper-deep px-2 py-0.5 text-[11px] font-medium text-ink-soft">Soon</span>
          ) : t.runs !== "browser" ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-paper-deep px-2 py-0.5 text-[11px] text-ink-soft"
              title={t.runs === "ai" ? "Uses AI on our server" : "Converted on our server, then deleted"}
            >
              {t.runs === "ai" ? <Sparkles className="h-3 w-3" aria-hidden="true" /> : <Server className="h-3 w-3" aria-hidden="true" />}
              {t.runs === "ai" ? "AI" : "Server"}
            </span>
          ) : null}
        </span>
        <span className="mt-1 line-clamp-2 block text-[13px] leading-snug text-ink-soft">{t.description}</span>
      </span>
    </>
  );
  const cls = "flex h-full items-start gap-3.5 rounded-2xl bg-white p-4 ring-1 ring-ink/10 transition";
  return soon ? (
    <div className={cn(cls, "opacity-60")} aria-disabled="true">
      {body}
    </div>
  ) : (
    <Link href={href(t)} className={cn(cls, "hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-18px_rgb(16_19_26/0.45)] hover:ring-brand-600/50")}>
      {body}
    </Link>
  );
}

function WorkflowCard() {
  return (
    <Link
      href="/tools/workflows"
      className="flex flex-col items-start gap-4 rounded-2xl bg-ink p-5 text-paper transition hover:bg-ink/90 sm:flex-row sm:items-center"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <ToolIcon name="Workflow" className="h-5 w-5" />
      </span>
      <span className="flex-1">
        <span className="block text-[15px] font-semibold">Do the same steps often?</span>
        <span className="mt-0.5 block text-[13px] text-white/65">Chain tools into a workflow, save it, and run it on any PDF in one go.</span>
      </span>
      <span className="rounded-full bg-white px-4 py-2 text-[13px] font-medium text-ink">Create a workflow</span>
    </Link>
  );
}
