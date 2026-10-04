"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronRight, FileText, Search, Server, Sparkles, Workflow, X } from "lucide-react";
import { CATEGORIES, TOOLS, type Category, type ToolDef } from "@/lib/tools/registry";
import { accepts, appPath, handFiles, toolPath } from "@/lib/tools/handoff";
import { formatBytes } from "@/lib/tools/files";
import { matches, rank } from "@/lib/tools/search";
import { ToolTile } from "./icons";
import { Mascot } from "../mascot/Mascot";
import { CATEGORY_COLOR, CATEGORY_META } from "../site/categories";
import { useReveal } from "@/lib/motion";
import { cn } from "../ui/primitives";

/** Can every staged file go to this tool? */
export function fitsFiles(t: ToolDef, files: File[]) {
  if (t.status !== "ready") return false;
  if (files.length > 1 && !t.multiple) return false;
  return files.every((f) => accepts(t, f));
}

/**
 * The tool finder: search, category filters and every tool, grouped by
 * category. When the homepage holds dropped files, only tools that can open
 * them are listed, and picking one hands the files over.
 */
export function ToolsHub({
  title = "All tools",
  subtitle,
  staged,
  onClearStaged,
}: {
  title?: string;
  subtitle?: string;
  staged?: File[] | null;
  onClearStaged?: () => void;
}) {
  const router = useRouter();
  const [cat, setCat] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLElement>(null);

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const pool = useMemo(() => (staged?.length ? TOOLS.filter((t) => fitsFiles(t, staged)) : TOOLS), [staged]);
  const results = useMemo(() => {
    const inCat = pool.filter((t) => cat === "all" || t.category === cat);
    return words.length ? inCat.filter((t) => matches(t, words)).sort((a, b) => rank(a, words) - rank(b, words)) : inCat;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, query, pool]);

  // Links into the page (#search from the header, #cat-… from the menus) show the full list first.
  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash;
      if (hash === "#search") {
        input.current?.focus({ preventScroll: true });
        input.current?.scrollIntoView({ block: "center" });
      } else if (hash.startsWith("#cat-")) {
        setCat("all");
        setQuery("");
        requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
      }
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Measure the active tab so the pill can slide to it.
  const tabsRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = tabsRef.current?.querySelector<HTMLElement>(`[data-tab="${cat}"]`);
      setPill(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [cat, pool]);

  const show = (c: Category | "all") => {
    setCat(c);
    list.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const firstReady = results.find((t) => t.status === "ready");
  const grouped = cat === "all" && !words.length;
  const open = (t: ToolDef) => {
    if (staged?.length) handFiles(appPath(t), staged);
    router.push(staged?.length ? appPath(t) : toolPath(t));
  };

  return (
    <section ref={list} aria-labelledby="all-tools" className="scroll-mt-16">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="all-tools" className="scroll-mt-24 font-display text-[clamp(1.375rem,2.4vw,1.75rem)] font-bold tracking-[-0.025em] text-fg">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-[14px] text-fg-muted">{subtitle}</p>}
        </div>
        <form
          id="search"
          role="search"
          className="w-full scroll-mt-28 lg:max-w-[520px]"
          onSubmit={(e) => {
            e.preventDefault();
            if (words.length && firstReady) open(firstReady);
          }}
        >
          <label htmlFor="tool-search" className="sr-only">
            Search tools
          </label>
          <div className="relative flex h-12 items-center rounded-xl border border-line-strong bg-surface transition focus-within:border-brand-500 focus-within:ring-[3px] focus-within:ring-brand-500/20">
            <Search className="pointer-events-none ml-4 h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden="true" />
            <input
              ref={input}
              id="tool-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setQuery("")}
              placeholder="What do you want to do with your file?"
              autoComplete="off"
              enterKeyHint="search"
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] text-fg outline-none placeholder:text-fg-subtle focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  input.current?.focus();
                }}
                className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted hover:bg-raised hover:text-fg"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
            <button type="submit" aria-label="Open the best match" className="mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-fg-muted hover:bg-raised hover:text-fg">
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>

      {staged && staged.length > 0 && (
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-accent/25 bg-accent/[0.05] px-4 py-3.5 sm:flex-row sm:items-center">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-on-accent">
            <FileText className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <p className="min-w-0 flex-1 text-[14px] text-fg">
            <span className="break-all font-semibold">{staged.length === 1 ? staged[0].name : `${staged.length} files`}</span>
            <span className="text-fg-muted">
              {" "}
              · {formatBytes(staged.reduce((n, f) => n + f.size, 0))} · {pool.length} tool{pool.length === 1 ? "" : "s"} can open {staged.length === 1 ? "it" : "them"}. Pick one and your
              file goes straight in.
            </span>
          </p>
          {onClearStaged && (
            <button type="button" onClick={onClearStaged} className="btn btn-ghost btn-sm self-start sm:self-auto">
              <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear file
            </button>
          )}
        </div>
      )}

      {/* Category filters: stay under the header while scrolling. */}
      <div className="sticky top-16 z-30 -mx-4 mt-5 border-b border-line bg-app/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div ref={tabsRef} role="tablist" aria-label="Tool categories" className="relative -my-1 flex gap-1.5 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* The active pill slides between tabs instead of fading. */}
          <span
            aria-hidden="true"
            className={cn("absolute top-1 h-9 rounded-full bg-fg transition-[transform,width] duration-[250ms] ease-[cubic-bezier(.3,.7,.2,1)]", !pill && "opacity-0")}
            style={pill ? { width: pill.width, transform: `translateX(${pill.left}px)` } : undefined}
          />
          {[{ id: "all" as const, label: "All tools" }, ...CATEGORIES.map((c) => ({ id: c.id, label: CATEGORY_META[c.id].short }))].map((c) => {
            const count = c.id === "all" ? pool.length : pool.filter((t) => t.category === c.id).length;
            const on = cat === c.id;
            if (!count && c.id !== "all") return null;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                data-tab={c.id}
                aria-selected={on}
                onClick={() => setCat(c.id)}
                className={cn(
                  "fo-press relative inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium transition-colors duration-[250ms]",
                  on ? "text-app" : "text-fg-muted ring-1 ring-inset ring-line hover:bg-raised hover:text-fg",
                )}
              >
                <span className="whitespace-nowrap">{c.label}</span>
                <span className={cn("text-[12px] tabular-nums", on ? "text-app/60" : "text-fg-subtle")}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {words.length ? `${results.length} tools match “${query}”` : ""}
      </p>

      <div className="mt-6">
        {results.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-12 text-center">
            <Mascot mood="confused" size={80} />
            <p className="mt-4 text-[16px] font-semibold text-fg">{query ? <>No tool matches “{query}”.</> : "No tool here can open this file."}</p>
            <p className="mt-1 text-[14px] text-fg-muted">{query ? "Try a simpler word, like “pdf”, “image” or “convert”." : "Try another category, or clear the file."}</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCat("all");
              }}
              className="btn btn-secondary mt-5"
            >
              Show all tools
            </button>
          </div>
        ) : grouped ? (
          <div className="space-y-10">
            {CATEGORIES.map((c) => {
              const inCat = results.filter((t) => t.category === c.id);
              return inCat.length ? (
                <RevealGroup key={c.id} id={`cat-${c.id}`} labelledBy={`cat-${c.id}-title`}>
                  <div className="fo-r-head flex items-center justify-between gap-4">
                    <h3 id={`cat-${c.id}-title`} className="text-[16px] font-semibold tracking-[-0.01em] text-fg">
                      {CATEGORY_META[c.id].title}
                      <span className="ml-2 text-[13px] font-normal text-fg-subtle">{inCat.length}</span>
                    </h3>
                    <button type="button" onClick={() => show(c.id)} className="inline-flex items-center gap-1 text-[13px] font-medium text-fg-muted hover:text-fg">
                      View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <ToolGrid tools={inCat} staged={staged} reveal />
                </RevealGroup>
              ) : null;
            })}
            {!staged?.length && <WorkflowCard />}
          </div>
        ) : (
          <ToolGrid tools={results} staged={staged} />
        )}
      </div>
    </section>
  );
}

/** A category block that reveals itself (heading, then cards) as it scrolls into view. */
function RevealGroup({ id, labelledBy, children }: { id: string; labelledBy: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const state = useReveal(ref);
  return (
    <section ref={ref} id={id} aria-labelledby={labelledBy} data-reveal={state} className="scroll-mt-36">
      {children}
    </section>
  );
}

function ToolGrid({ tools, staged, reveal = false }: { tools: ToolDef[]; staged?: File[] | null; reveal?: boolean }) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 2xl:grid-cols-4">
      {tools.map((t, i) => (
        // Cards cascade 50ms apart; past the sixth they arrive together, so no more than six move at once.
        <li key={t.slug} className={cn("min-w-0", reveal && "fo-r-item")} data-late={reveal && i > 5 ? "" : undefined} style={reveal ? ({ "--i": Math.min(i, 5) } as React.CSSProperties) : undefined}>
          <ToolCard tool={t} staged={staged} />
        </li>
      ))}
    </ul>
  );
}

/** One row card: tile, name with where it runs, description. */
export function ToolCard({ tool: t, staged }: { tool: ToolDef; staged?: File[] | null }) {
  const router = useRouter();
  const soon = t.status === "soon";
  const badge = soon ? (
    <span className="rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium text-fg-subtle">Soon</span>
  ) : t.runs !== "browser" ? (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium text-fg-muted"
      title={t.runs === "ai" ? "Uses AI on our server" : "Converted on our server, then deleted"}
    >
      {t.runs === "ai" ? <Sparkles className="h-3 w-3" aria-hidden="true" /> : <Server className="h-3 w-3" aria-hidden="true" />}
      {t.runs === "ai" ? "AI" : "Server"}
    </span>
  ) : null;
  const body = (
    <>
      <ToolTile tool={t} size="md" className="transition-[rotate,scale] duration-200 ease-[cubic-bezier(.34,1.56,.64,1)] group-hover:-rotate-6 group-hover:scale-110" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[14px] font-semibold leading-tight tracking-[-0.01em] text-fg sm:text-[14.5px]">{t.name}</span>
          {badge}
        </span>
        <span className="mt-1 line-clamp-3 text-[12.5px] leading-snug text-fg-muted sm:line-clamp-2 sm:text-[13px]">{t.description}</span>
      </span>
      {!soon && <ChevronRight className="absolute right-3 top-4 h-4 w-4 shrink-0 text-fg-subtle sm:static sm:mt-0.5 transition-[translate,color] duration-200 group-hover:translate-x-1 group-hover:text-fg" aria-hidden="true" />}
    </>
  );
  // Phones show two cards per row, so the icon sits above the text; from sm up it's a row.
  const cls = "group relative flex h-full min-h-[44px] flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 transition-[border-color,background-color,box-shadow] duration-200 sm:flex-row sm:gap-3.5 sm:p-4";
  return soon ? (
    <div className={cn(cls, "opacity-55")} aria-disabled="true">
      {body}
    </div>
  ) : (
    <Link
      href={toolPath(t)}
      onClick={(e) => {
        // With files waiting, go straight to where the tool runs and hand them over.
        if (!staged?.length) return;
        e.preventDefault();
        handFiles(appPath(t), staged);
        router.push(appPath(t));
      }}
      // The border lights up in the tool's category colour.
      style={{ "--cat": CATEGORY_COLOR[t.category] } as React.CSSProperties}
      className={cn(cls, "hover:border-[color:var(--cat)] hover:bg-raised hover:shadow-[0_10px_30px_-18px_var(--cat)]")}
    >
      {body}
    </Link>
  );
}

function WorkflowCard() {
  return (
    <Link
      href="/tools/workflows"
      className="group flex flex-col items-start gap-4 rounded-2xl border border-brand-500/25 bg-[linear-gradient(100deg,rgb(139_124_246/0.12),rgb(139_124_246/0.03)_60%)] p-5 transition-colors hover:border-brand-500/45 sm:flex-row sm:items-center sm:p-6"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[13px] bg-[#b7a2ff] text-[#0d0f14]">
        <Workflow className="h-6 w-6" aria-hidden="true" />
      </span>
      <span className="flex-1">
        <span className="block text-[16px] font-semibold text-fg">Do the same steps often?</span>
        <span className="mt-0.5 block text-[14px] text-fg-muted">Chain tools into a workflow, save it, and run it on any PDF in one go.</span>
      </span>
      <span className="btn btn-secondary">
        Create a workflow <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
