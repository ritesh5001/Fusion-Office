"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Maximize, MoveHorizontal, ZoomIn, ZoomOut } from "lucide-react";
import { useEditor, ZOOM_STEPS } from "@/lib/editor/store";
import { editorEvents } from "@/lib/editor/events";
import { IconButton, Divider, cn } from "../ui/primitives";
import { MOD, zoomIn, zoomOut } from "./TopBar";

export function BottomBar() {
  const zoom = useEditor((s) => s.zoom);
  const fitMode = useEditor((s) => s.fitMode);
  const pageCount = useEditor((s) => s.doc!.pages.length);
  const index = useEditor((s) => Math.max(0, s.doc!.pages.findIndex((p) => p.id === s.currentPageId)));
  const selection = useEditor((s) => s.selection);
  const setZoom = useEditor((s) => s.setZoom);
  const [draft, setDraft] = useState(String(index + 1));
  useEffect(() => setDraft(String(index + 1)), [index]);

  const go = (i: number) => {
    const pages = useEditor.getState().doc!.pages;
    const target = pages[Math.min(Math.max(i, 0), pages.length - 1)];
    if (target) editorEvents.emit("scroll-to-page", { pageId: target.id });
  };

  return (
    <footer className="flex h-9 shrink-0 items-center gap-1 border-t border-line bg-surface px-2 text-[12px] text-fg-muted">
      <IconButton size="sm" label="Previous page" disabled={index === 0} onClick={() => go(index - 1)}>
        <ChevronUp className="h-4 w-4" />
      </IconButton>
      <IconButton size="sm" label="Next page" disabled={index >= pageCount - 1} onClick={() => go(index + 1)}>
        <ChevronDown className="h-4 w-4" />
      </IconButton>
      <div className="flex items-center gap-1.5 pl-1">
        <input
          aria-label="Current page"
          className="h-6 w-10 rounded-md border border-line-strong bg-sunken text-center tabular-nums text-fg outline-none focus:border-brand-500"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              go(Number(draft) - 1);
              e.currentTarget.blur();
            }
          }}
          onBlur={() => setDraft(String(index + 1))}
        />
        <span className="tabular-nums text-fg-subtle">of {pageCount}</span>
      </div>
      {selection && (
        <span className="ml-3 hidden text-fg-subtle sm:inline">
          {selection.ids.length} selected · arrow keys to nudge · Shift for 10pt
        </span>
      )}

      <div className="ml-auto flex items-center gap-0.5">
        <IconButton size="sm" label="Fit width" active={fitMode === "width"} onClick={() => setZoom(zoom, "width")}>
          <MoveHorizontal className="h-4 w-4" />
        </IconButton>
        <IconButton size="sm" label="Fit page" active={fitMode === "page"} onClick={() => setZoom(zoom, "page")}>
          <Maximize className="h-3.5 w-3.5" />
        </IconButton>
        <Divider />
        <IconButton size="sm" label="Zoom out" shortcut={`${MOD}−`} onClick={zoomOut}>
          <ZoomOut className="h-4 w-4" />
        </IconButton>
        <select
          aria-label="Zoom level"
          className={cn("h-6 cursor-pointer rounded border border-transparent bg-transparent px-1 text-center tabular-nums hover:border-line")}
          value={String(zoom)}
          onChange={(e) => setZoom(Number(e.target.value))}
        >
          {!ZOOM_STEPS.includes(zoom) && <option value={String(zoom)}>{Math.round(zoom * 100)}%</option>}
          {ZOOM_STEPS.map((z) => (
            <option key={z} value={String(z)}>
              {Math.round(z * 100)}%
            </option>
          ))}
        </select>
        <IconButton size="sm" label="Zoom in" shortcut={`${MOD}+`} onClick={zoomIn}>
          <ZoomIn className="h-4 w-4" />
        </IconButton>
      </div>
    </footer>
  );
}
