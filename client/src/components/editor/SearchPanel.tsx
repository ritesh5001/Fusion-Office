"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { searchPages } from "@/lib/pdf/text";
import { editorEvents } from "@/lib/editor/events";
import { IconButton } from "../ui/primitives";

export function SearchPanel() {
  const open = useEditor((s) => s.searchOpen);
  const hits = useEditor((s) => s.searchHits);
  const active = useEditor((s) => s.activeHit);
  const setSearch = useEditor((s) => s.setSearch);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const runId = useRef(0);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.select(), 0);
    else setSearch({ searchHits: [], activeHit: -1 });
  }, [open, setSearch]);

  // Debounced search as you type.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setSearch({ searchHits: [], activeHit: -1 });
      setSearched("");
      return;
    }
    const id = ++runId.current;
    const t = setTimeout(async () => {
      setBusy(true);
      const pages = useEditor.getState().doc?.pages ?? [];
      const onProgress = (partial: typeof hits) => {
        if (runId.current === id) setSearch({ searchHits: partial });
      };
      try {
        const result = await searchPages(pages, q, onProgress);
        if (runId.current !== id) return;
        setSearch({ searchHits: result, activeHit: result.length ? 0 : -1 });
        setSearched(q);
        if (result[0]) editorEvents.emit("scroll-to-page", { pageId: result[0].pageId, rect: result[0].rects[0] });
      } finally {
        if (runId.current === id) setBusy(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open, setSearch]);

  const goTo = (i: number) => {
    if (!hits.length) return;
    const n = (i + hits.length) % hits.length;
    setSearch({ activeHit: n });
    editorEvents.emit("scroll-to-page", { pageId: hits[n].pageId, rect: hits[n].rects[0] });
  };

  if (!open) return null;

  // Group results by page for the list.
  const byPage = new Map<number, { i: number; snippet: string }[]>();
  hits.forEach((h, i) => {
    const arr = byPage.get(h.pageNumber) ?? [];
    arr.push({ i, snippet: h.snippet });
    byPage.set(h.pageNumber, arr);
  });

  return (
    <div className="absolute right-4 top-3 z-30 flex max-h-[70%] w-80 flex-col overflow-hidden rounded-xl border border-line-strong bg-overlay shadow-pop">
      <div className="flex items-center gap-1 border-b border-line p-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") goTo(active + (e.shiftKey ? -1 : 1));
            if (e.key === "Escape") setSearch({ searchOpen: false });
          }}
          placeholder="Find in document"
          aria-label="Find in document"
          className="h-8 min-w-0 flex-1 rounded-md bg-sunken px-2.5 text-[13px] text-fg outline-none ring-brand-500/25 focus:ring-2"
        />
        <span className="w-14 text-center text-[11px] tabular-nums text-fg-muted">
          {busy ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : hits.length ? `${active + 1}/${hits.length}` : searched ? "0" : ""}
        </span>
        <IconButton size="sm" label="Previous match" disabled={!hits.length} onClick={() => goTo(active - 1)}>
          <ChevronUp className="h-4 w-4" />
        </IconButton>
        <IconButton size="sm" label="Next match" disabled={!hits.length} onClick={() => goTo(active + 1)}>
          <ChevronDown className="h-4 w-4" />
        </IconButton>
        <IconButton size="sm" label="Close search" onClick={() => setSearch({ searchOpen: false })}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>
      {searched && !busy && hits.length === 0 && (
        <p className="px-3 py-3 text-[12px] text-fg-muted">
          No matches for “{searched}”. Scanned pages without a text layer can&apos;t be searched until OCR is added.
        </p>
      )}
      {hits.length > 0 && (
        <div className="thin-scroll overflow-y-auto py-1">
          {[...byPage].map(([pageNumber, items]) => (
            <div key={pageNumber}>
              <div className="px-3 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                Page {pageNumber} · {items.length}
              </div>
              {items.slice(0, 50).map(({ i, snippet }) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  className={`block w-full truncate px-3 py-1 text-left text-[12px] ${i === active ? "bg-brand-500/15 text-brand-200" : "text-fg-muted hover:bg-raised"}`}
                >
                  <Snippet text={snippet} query={searched} />
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Snippet({ text, query }: { text: string; query: string }) {
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-yellow-200 px-0.5 text-[#111827]">{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  );
}
