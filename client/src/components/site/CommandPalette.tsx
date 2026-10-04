"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search, Server, Sparkles, X } from "lucide-react";
import { TOOLS, toolBySlug, type ToolDef } from "@/lib/tools/registry";
import { searchTools } from "@/lib/tools/search";
import { toolPath } from "@/lib/tools/handoff";
import { isReducedMotion, useScrollLock } from "@/lib/motion";
import { ToolTile } from "../tools/icons";
import { CATEGORY_META } from "./categories";
import { cn } from "@/lib/cn";

/** What the palette suggests before anything is typed. */
const SUGGESTED = ["edit-pdf", "merge-pdf", "compress-pdf", "pdf-to-word", "word-to-pdf", "jpg-to-pdf", "compress-image", "sign-pdf"];

/** Opens the palette from anywhere (the header's search button). */
export const openCommandPalette = () => window.dispatchEvent(new Event("fo-open-palette"));

/**
 * Tool search as a command palette: "/" or Ctrl/⌘+K from any page, arrow keys
 * to move, Enter to open. The chosen tool zooms forward as its page opens.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const id = useId();

  const ready = useMemo(() => TOOLS.filter((t) => t.status === "ready"), []);
  const results = useMemo<ToolDef[]>(
    () => (query.trim() ? searchTools(ready, query).slice(0, 8) : SUGGESTED.map(toolBySlug).filter((t): t is ToolDef => !!t)),
    [query, ready],
  );

  const show = () => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setQuery("");
    setActive(0);
    setChosen(null);
    setClosing(false);
    setOpen(true);
  };
  const hide = (refocus = true) => {
    const done = () => {
      setOpen(false);
      setClosing(false);
      if (refocus) returnFocus.current?.focus?.();
    };
    if (isReducedMotion()) return done();
    setClosing(true);
    setTimeout(done, 160);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        show();
      }
    };
    const onOpen = () => show();
    window.addEventListener("keydown", onKey);
    window.addEventListener("fo-open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("fo-open-palette", onOpen);
    };
  }, []);

  // While open: focus the field and keep the page behind from scrolling.
  useScrollLock(open);
  useEffect(() => {
    if (open) input.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (t: ToolDef) => {
    setChosen(t.slug);
    const go = () => {
      router.push(toolPath(t));
      hide(false);
    };
    if (isReducedMotion()) go();
    else setTimeout(go, 200);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search tools">
      <div aria-hidden="true" onClick={() => hide()} className={cn("absolute inset-0 bg-[#05060a]/60 backdrop-blur-sm", closing ? "fo-fade-out" : "fo-intro-fade [animation-duration:200ms]")} />
      <div
        className={cn(
          "relative w-full max-w-[620px] overflow-hidden rounded-[22px] border border-line-strong bg-overlay shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8),0_0_0_1px_rgb(139_124_246/0.15)]",
          closing ? "fo-palette-out" : "fo-palette-in",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-line px-5">
          <Search className="h-5 w-5 shrink-0 text-fg-subtle" aria-hidden="true" />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                choose(results[active]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                hide();
              }
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={results[active] ? `${id}-${results[active].slug}` : undefined}
            aria-autocomplete="list"
            placeholder="What do you want to do with your file?"
            className="h-full min-w-0 flex-1 bg-transparent text-[17px] text-fg outline-none placeholder:text-fg-subtle"
          />
          <button type="button" onClick={() => hide()} aria-label="Close search" className="fo-press flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:bg-raised hover:text-fg">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="px-5 pb-1 pt-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">{query.trim() ? `${results.length ? "Best matches" : "No matches"}` : "Suggested"}</p>
        <ul ref={list} id={`${id}-list`} role="listbox" aria-label="Tools" className="thin-scroll max-h-[min(420px,55vh)] overflow-y-auto px-2 pb-2">
          {results.map((t, i) => {
            const on = i === active;
            return (
              <li
                key={`${query}-${t.slug}`}
                id={`${id}-${t.slug}`}
                data-i={i}
                role="option"
                aria-selected={on}
                onMouseMove={() => setActive(i)}
                onClick={() => choose(t)}
                style={{ animationDelay: `${i * 40}ms` }}
                className={cn(
                  "fo-rise flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150",
                  on ? "bg-raised" : "",
                  chosen === t.slug && "fo-zoom-forward bg-raised ring-1 ring-brand-400/60",
                  chosen && chosen !== t.slug && "opacity-40",
                )}
              >
                {/* The active result's icon plays a short "preview" of the tool. */}
                <span key={on ? "on" : "off"} className={cn(on && "fo-preview")}>
                  <ToolTile tool={t} size="md" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[14.5px] font-semibold text-fg">{t.name}</span>
                    {t.runs !== "browser" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sunken px-1.5 py-0.5 text-[10.5px] font-medium text-fg-muted">
                        {t.runs === "ai" ? <Sparkles className="h-2.5 w-2.5" aria-hidden="true" /> : <Server className="h-2.5 w-2.5" aria-hidden="true" />}
                        {t.runs === "ai" ? "AI" : "Server"}
                      </span>
                    )}
                  </span>
                </span>
                <span className={cn("hidden shrink-0 text-[11.5px] text-fg-subtle sm:block", on && "text-fg-muted")}>{CATEGORY_META[t.category].short}</span>
                <CornerDownLeft className={cn("h-4 w-4 shrink-0 text-fg-subtle transition-opacity", on ? "opacity-100" : "opacity-0")} aria-hidden="true" />
              </li>
            );
          })}
          {!results.length && <li className="px-3 py-8 text-center text-[14px] text-fg-muted">Try a simpler word, like “pdf”, “image” or “convert”.</li>}
        </ul>

        <div className="hidden items-center gap-4 border-t border-line px-5 py-2.5 text-[12px] text-fg-subtle sm:flex">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> to move
          </span>
          <span>
            <Kbd>↵</Kbd> to open
          </span>
          <span>
            <Kbd>esc</Kbd> to close
          </span>
          <span className="ml-auto">
            <Kbd>/</Kbd> opens search anywhere
          </span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-sunken px-1 font-mono text-[10.5px] text-fg-muted">{children}</kbd>;
}
