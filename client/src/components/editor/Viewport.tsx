"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useEditor } from "@/lib/editor/store";
import { viewSize } from "@/lib/editor/types";
import { editorEvents } from "@/lib/editor/events";
import { PageView } from "./PageView";

const PAD = 32;

export function Viewport() {
  const pages = useEditor((s) => s.doc!.pages);
  const zoom = useEditor((s) => s.zoom);
  const fitMode = useEditor((s) => s.fitMode);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Fit width / fit page, recomputed on resize ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !fitMode) return;
    const fit = () => {
      const { doc, currentPageId, setZoom } = useEditor.getState();
      if (!doc) return;
      const maxW = Math.max(...doc.pages.map((p) => viewSize(p).width));
      const cur = doc.pages.find((p) => p.id === currentPageId) ?? doc.pages[0];
      const byWidth = (el.clientWidth - PAD * 2) / maxW;
      const z = fitMode === "width" ? Math.min(byWidth, 2) : Math.min(byWidth, (el.clientHeight - PAD * 2 - 24) / viewSize(cur).height);
      setZoom(z, fitMode);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitMode, pages.length]);

  // ── Keep the reading position stable across zoom changes ──
  const prevZoom = useRef(zoom);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || prevZoom.current === zoom) return;
    const ratio = zoom / prevZoom.current;
    const centerY = el.scrollTop + el.clientHeight / 2;
    const centerX = el.scrollLeft + el.clientWidth / 2;
    el.scrollTop = centerY * ratio - el.clientHeight / 2;
    el.scrollLeft = centerX * ratio - el.clientWidth / 2;
    prevZoom.current = zoom;
  }, [zoom]);

  // ── Ctrl/⌘ + wheel (and trackpad pinch) zoom ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const { zoom, setZoom } = useEditor.getState();
      setZoom(zoom * Math.exp(-e.deltaY * 0.0025));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Track the page under the reading line ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const line = el.getBoundingClientRect().top + el.clientHeight * 0.35;
        const nodes = el.querySelectorAll<HTMLElement>("[data-page-id]");
        for (const node of nodes) {
          const r = node.getBoundingClientRect();
          if (r.bottom + 12 >= line) {
            const id = node.dataset.pageId!;
            const st = useEditor.getState();
            if (st.currentPageId !== id && !st.selection) st.setCurrentPage(id);
            break;
          }
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // ── Programmatic scrolling (thumbnails, search results, page nav) ──
  useEffect(
    () =>
      editorEvents.on("scroll-to-page", ({ pageId, rect, smooth }) => {
        const el = scrollRef.current;
        const node = el?.querySelector<HTMLElement>(`[data-page-id="${pageId}"]`);
        if (!el || !node) return;
        const z = useEditor.getState().zoom;
        const top = node.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop;
        const target = rect ? top + rect.y * z - el.clientHeight / 3 : top - 16;
        el.scrollTo({ top: Math.max(0, target), behavior: smooth === false ? "auto" : "smooth" });
        useEditor.getState().setCurrentPage(pageId);
      }),
    [],
  );

  return (
    <div
      ref={scrollRef}
      className="thin-scroll relative h-full overflow-auto bg-canvas"
      onMouseDown={(e) => {
        // Clicking the grey area around pages clears the selection.
        if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.backdrop) {
          useEditor.getState().setSelection(null);
        }
      }}
    >
      <div data-backdrop="1" className="mx-auto flex w-max min-w-full flex-col items-center gap-5" style={{ padding: PAD }}>
        {pages.map((p, i) => (
          <PageView key={p.id} page={p} index={i} zoom={zoom} />
        ))}
      </div>
    </div>
  );
}
