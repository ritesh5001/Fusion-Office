"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Search, Server, Sparkles, X } from "lucide-react";
import { CATEGORIES, TOOLS, toolBySlug, type Category, type ToolDef } from "@/lib/tools/registry";
import { Tile, ToolTile } from "./icons";
import { Mascot, type Mood } from "../mascot/Mascot";
import { HeroArt } from "../landing/HeroArt";
import { cn } from "../ui/primitives";

/** Shown under the search box: the tools people reach for most. */
const POPULAR = ["edit-pdf", "merge-pdf", "compress-pdf", "pdf-to-word", "compress-image"];

/** Short names for the category tabs. */
const TAB_LABEL: Record<Category, string> = {
  office: "Office",
  organize: "Organize",
  optimize: "Optimize",
  "convert-to": "Convert to PDF",
  "convert-from": "Convert from PDF",
  edit: "Edit",
  security: "Security",
  intelligence: "Intelligence",
  image: "Images",
};

/** Section headings in the full list. */
const HEADING: Record<Category, string> = {
  office: "Word, Excel, PowerPoint",
  organize: "Organize PDF",
  optimize: "Optimize PDF",
  "convert-to": "Convert to PDF",
  "convert-from": "Convert from PDF",
  edit: "Edit & sign PDF",
  security: "PDF security",
  intelligence: "AI & compare",
  image: "Image tools",
};

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

/**
 * The tool finder: hero search (with the page's intro and artwork around it)
 * and the categorised list of every tool. Both share the search state.
 */
/** Folio's mood in the hero, and what it says. */
interface FinderState {
  mood: Mood;
  message: string;
}

export function ToolsHub({
  intro,
  art,
  strip,
  title = "All tools",
}: {
  intro?: ReactNode;
  /** Show Folio next to the search, reacting to it. */
  art?: boolean;
  strip?: ReactNode;
  title?: string;
}) {
  const router = useRouter();
  const [cat, setCat] = useState<Category | "all">("all");
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLElement>(null);
  const [focused, setFocused] = useState(false);
  const [typing, setTyping] = useState(false);

  // "Typing" lasts a moment after the last key, so Folio looks busy while you type.
  useEffect(() => {
    if (!query) return setTyping(false);
    setTyping(true);
    const t = setTimeout(() => setTyping(false), 450);
    return () => clearTimeout(t);
  }, [query]);

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = useMemo(() => {
    const inCat = TOOLS.filter((t) => cat === "all" || t.category === cat);
    return words.length ? inCat.filter((t) => matches(t, words)).sort((a, b) => rank(a, words) - rank(b, words)) : inCat;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, query]);

  // "/" jumps to search from anywhere on the page, like most tool sites.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const show = (c: Category | "all") => {
    setCat(c);
    list.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const firstReady = results.find((t) => t.status === "ready");
  const grouped = cat === "all" && !words.length;

  const finder: FinderState = typing
    ? { mood: "working", message: "Looking…" }
    : words.length && firstReady
      ? {
          mood: "happy",
          message: `Found ${results.length} tool${results.length === 1 ? "" : "s"}! Press Enter to open ${firstReady.name}.`,
        }
      : words.length
        ? { mood: "confused", message: "Hmm, nothing matches. Try “pdf” or “image”." }
        : focused
          ? { mood: "curious", message: "Type what you need: merge, compress, sign…" }
          : { mood: "idle", message: "Hi, I’m Folio! What shall we do today?" };

  return (
    <>
      {/* Hero: with artwork it's a 12-column split (text 7, art 5) sharing one left edge; without, centred. */}
      <section className={cn("mx-auto grid max-w-[1280px] items-center gap-10 px-5 pb-12 pt-10 md:px-8 md:pt-14", art && "lg:grid-cols-12 lg:gap-12 lg:pb-14 lg:pt-16")}>
        <div className={cn("text-center", art && "lg:col-span-7 lg:text-left")}>
          {art && (
            <div className="mb-3 flex justify-center lg:hidden">
              <Mascot mood={finder.mood} size={84} interactive />
            </div>
          )}
          {intro}
          <form
            id="search"
            role="search"
            className={cn("mx-auto mt-8 max-w-[620px] scroll-mt-28", art && "lg:mx-0 lg:max-w-[640px]")}
            onSubmit={(e) => {
              e.preventDefault();
              if (words.length && firstReady) router.push(href(firstReady));
              else list.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <label htmlFor="tool-search" className="sr-only">
              Search tools
            </label>
            <div className="relative flex items-center rounded-2xl bg-white p-1.5 shadow-[0_18px_40px_-24px_rgb(36_71_230/0.45)] ring-1 ring-ink/10 transition focus-within:ring-2 focus-within:ring-brand-600">
              <Search className="pointer-events-none ml-3.5 h-5 w-5 shrink-0 text-ink-soft" aria-hidden="true" />
              <input
                ref={input}
                id="tool-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Search tools, e.g. merge PDF"
                autoComplete="off"
                enterKeyHint="search"
                className="h-11 min-w-0 flex-1 bg-transparent px-3 text-[16px] text-ink outline-none placeholder:text-ink-soft/80 focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    input.current?.focus();
                  }}
                  className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-paper-deep hover:text-ink"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              <button
                type="submit"
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-brand-700 sm:px-5"
              >
                <Search className="h-4 w-4 sm:hidden" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">Search</span>
              </button>
            </div>
          </form>
          <div className={cn("mt-4 flex flex-wrap items-center justify-center gap-2 text-[13px]", art && "lg:max-w-[640px] lg:justify-start")}>
            <span className="font-medium text-ink">Popular:</span>
            {POPULAR.map((slug, i) => {
              const t = toolBySlug(slug);
              return t ? (
                <Link
                  key={slug}
                  href={href(t)}
                  // At laptop widths the split column only fits four chips on one line.
                  className={cn(
                    i === POPULAR.length - 1 && art && "lg:max-xl:hidden",
                    "rounded-lg bg-white px-3 py-1.5 text-ink shadow-sm ring-1 ring-rule transition hover:text-brand-700 hover:ring-brand-600",
                  )}
                >
                  {t.name}
                </Link>
              ) : null;
            })}
          </div>
        </div>
        {art && (
          <div className="hidden lg:col-span-5 lg:block">
            <HeroArt mood={finder.mood} message={finder.message} />
          </div>
        )}
      </section>

      {strip}

      <section ref={list} aria-labelledby="all-tools" className="scroll-mt-16 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 pb-20 pt-12 md:px-8">
          <h2 id="all-tools" className="scroll-mt-24 font-display text-[clamp(1.6rem,3vw,2rem)] font-bold tracking-[-0.03em]">
            {title}
          </h2>

          {/* Category tabs: stay under the header while scrolling. */}
          <div className="sticky top-16 z-30 -mx-5 mt-5 bg-white/95 px-5 py-3 backdrop-blur-md md:-mx-8 md:px-8">
            <div role="tablist" aria-label="Tool categories" className="-my-1 flex gap-2 overflow-x-auto py-1 [scrollbar-width:none]">
              {[{ id: "all" as const, label: "All Tools" }, ...CATEGORIES.map((c) => ({ id: c.id, label: TAB_LABEL[c.id] }))].map((c) => {
                const count = c.id === "all" ? TOOLS.length : TOOLS.filter((t) => t.category === c.id).length;
                const on = cat === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setCat(c.id)}
                    className={cn(
                      "flex min-w-[76px] shrink-0 flex-col items-center justify-center rounded-xl px-3.5 py-2 text-[13px] font-medium leading-tight transition",
                      on ? "bg-brand-600 text-white shadow-[0_8px_18px_-10px_rgb(47_84_235/0.9)]" : "bg-white text-ink ring-1 ring-rule hover:ring-brand-600/60",
                    )}
                  >
                    <span className="whitespace-nowrap">{c.label}</span>
                    <span className={cn("mt-0.5 text-[12px] tabular-nums", on ? "text-white/75" : "text-ink-soft")}>{count}</span>
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
              <div className="rounded-2xl bg-paper px-6 py-12 text-center">
                <Mascot mood="confused" size={96} />
                <p className="mt-3 text-[16px] font-semibold">No tool matches “{query}”.</p>
                <p className="mt-1 text-[14px] text-ink-soft">Try a simpler word, like “pdf”, “image” or “convert”.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCat("all");
                  }}
                  className="mt-5 h-10 rounded-full bg-brand-600 px-5 text-[14px] font-semibold text-white hover:bg-brand-700"
                >
                  Show all tools
                </button>
              </div>
            ) : grouped ? (
              <div className="space-y-12">
                {CATEGORIES.map((c) => {
                  const inCat = results.filter((t) => t.category === c.id);
                  return inCat.length ? (
                    <section key={c.id} id={`cat-${c.id}`} aria-labelledby={`cat-${c.id}-title`} className="scroll-mt-40">
                      <div className="flex items-center justify-between gap-4">
                        <h3 id={`cat-${c.id}-title`} className="text-[20px] font-bold tracking-[-0.02em]">
                          {HEADING[c.id]}
                        </h3>
                        <button type="button" onClick={() => show(c.id)} className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline">
                          View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <ToolGrid tools={inCat} />
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
      </section>
    </>
  );
}

function ToolGrid({ tools }: { tools: ToolDef[] }) {
  return (
    <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
      {tools.map((t) => (
        <li key={t.slug}>
          <ToolCard tool={t} />
        </li>
      ))}
    </ul>
  );
}

/** Square card: icon on top, name and description below. Grows only if a long name needs the room. */
function ToolCard({ tool: t }: { tool: ToolDef }) {
  const soon = t.status === "soon";
  const badge = soon ? (
    <span className="absolute right-3 top-3 rounded-full bg-paper-deep px-2 py-0.5 text-[11px] font-medium text-ink-soft">Soon</span>
  ) : t.runs !== "browser" ? (
    <span
      className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-paper-deep px-2 py-0.5 text-[11px] font-medium text-ink-soft"
      title={t.runs === "ai" ? "Uses AI on our server" : "Converted on our server, then deleted"}
    >
      {t.runs === "ai" ? <Sparkles className="h-3 w-3" aria-hidden="true" /> : <Server className="h-3 w-3" aria-hidden="true" />}
      {t.runs === "ai" ? "AI" : "Server"}
    </span>
  ) : null;
  const body = (
    <>
      {badge}
      <ToolTile
        tool={t}
        size="lg"
        className="h-11 w-11 rounded-[13px] transition-transform duration-200 group-hover:scale-105 sm:h-14 sm:w-14 sm:rounded-[16px] [&_svg]:h-[22px] [&_svg]:w-[22px] sm:[&_svg]:h-7 sm:[&_svg]:w-7"
      />
      <span className="mt-3 line-clamp-2 text-[14px] font-bold sm:mt-3.5 sm:text-[15px] leading-tight tracking-[-0.01em] text-ink">{t.name}</span>
      <span className="mt-1 line-clamp-1 text-[12.5px] leading-snug text-ink-soft sm:mt-1.5 sm:line-clamp-2">{t.description}</span>
      {!soon && (
        <span className="mt-3 hidden items-center gap-1 rounded-lg bg-brand-50 px-3 py-1.5 text-[13px] font-semibold text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white md:inline-flex">
          Open Tool <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      )}
    </>
  );
  const cls = "group relative flex aspect-square h-full flex-col items-center justify-center rounded-2xl bg-white p-4 text-center ring-1 ring-ink/10 transition";
  return soon ? (
    <div className={cn(cls, "opacity-60")} aria-disabled="true">
      {body}
    </div>
  ) : (
    <Link href={href(t)} className={cn(cls, "hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-22px_rgb(16_19_26/0.4)] hover:ring-brand-600/40")}>
      {body}
    </Link>
  );
}

function WorkflowCard() {
  return (
    <Link
      href="/tools/workflows"
      className="group flex flex-col items-start gap-4 rounded-2xl bg-gradient-to-r from-[#1e2a78] to-brand-600 p-6 text-white transition hover:shadow-[0_20px_40px_-20px_rgb(47_84_235/0.8)] sm:flex-row sm:items-center"
    >
      <Tile swatch="indigo" icon="Workflow" size="lg" />
      <span className="flex-1">
        <span className="block text-[17px] font-bold">Do the same steps often?</span>
        <span className="mt-0.5 block text-[14px] text-white/75">Chain tools into a workflow, save it, and run it on any PDF in one go.</span>
      </span>
      <span className="inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2.5 text-[14px] font-semibold text-brand-700">
        Create a workflow <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
