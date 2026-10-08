"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useEditor, ZOOM_MAX, ZOOM_MIN } from "@/lib/editor/store";
import { viewSize } from "@/lib/editor/types";
import { editorEvents } from "@/lib/editor/events";
import { coarsePointer, pinch } from "@/lib/editor/touch";
import { PageView } from "./PageView";
import { toolHint } from "./ToolBar";

/** Space around the pages: roomy on a desktop, tight on a phone so the page is readable. */
const padFor = (width: number) => (width < 640 ? 10 : 32);

export function Viewport() {
  const pages = useEditor((s) => s.doc!.pages);
  const zoom = useEditor((s) => s.zoom);
  const fitMode = useEditor((s) => s.fitMode);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [pad, setPad] = useState(() => padFor(window.innerWidth));
  // After a pinch, the point between the fingers (content px at the old zoom, and where it is on screen) stays put.
  const anchor = useRef<{ ox: number; oy: number; mx: number; my: number } | null>(null);

  // ── Fit width / fit page, recomputed on resize ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !fitMode) return;
    const fit = () => {
      const { doc, currentPageId, setZoom } = useEditor.getState();
      if (!doc) return;
      const PAD = padFor(el.clientWidth);
      setPad(PAD);
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
    const a = anchor.current;
    anchor.current = null;
    if (a) {
      el.scrollLeft = a.ox * ratio - a.mx;
      el.scrollTop = a.oy * ratio - a.my;
      prevZoom.current = zoom;
      return;
    }
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

  // ── Phones: pinch to zoom, two fingers to pan ──
  // While the fingers move, the pages are only scaled with a CSS transform
  // (smooth, nothing re-renders); the real zoom is applied when they lift.
  useEffect(() => {
    const el = scrollRef.current;
    const content = contentRef.current;
    if (!el || !content) return;
    let g: { d0: number; z0: number; ox: number; oy: number; mx0: number; my0: number; mx: number; my: number; scale: number } | null = null;
    const mid = (t: TouchList) => {
      const r = el.getBoundingClientRect();
      return { x: (t[0].clientX + t[1].clientX) / 2 - r.left, y: (t[0].clientY + t[1].clientY) / 2 - r.top };
    };
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2 || g) return;
      e.preventDefault();
      const m = mid(e.touches);
      g = { d0: dist(e.touches), z0: useEditor.getState().zoom, ox: el.scrollLeft + m.x, oy: el.scrollTop + m.y, mx0: m.x, my0: m.y, mx: m.x, my: m.y, scale: 1 };
      content.style.transformOrigin = `${g.ox}px ${g.oy}px`;
      content.style.willChange = "transform";
      pinch.start();
    };
    const onMove = (e: TouchEvent) => {
      if (!g || e.touches.length < 2) return;
      e.preventDefault();
      const m = mid(e.touches);
      const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (g.z0 * dist(e.touches)) / g.d0));
      g.scale = z / g.z0;
      g.mx = m.x;
      g.my = m.y;
      content.style.transform = `translate(${m.x - g.mx0}px, ${m.y - g.my0}px) scale(${g.scale})`;
    };
    const onEnd = (e: TouchEvent) => {
      if (!g || e.touches.length >= 2) return;
      const done = g;
      g = null;
      content.style.transform = "";
      content.style.willChange = "";
      const { setZoom } = useEditor.getState();
      if (Math.abs(done.scale - 1) < 0.01) {
        // Two-finger pan only.
        el.scrollLeft = done.ox - done.mx;
        el.scrollTop = done.oy - done.my;
      } else {
        anchor.current = { ox: done.ox, oy: done.oy, mx: done.mx, my: done.my };
        setZoom(done.z0 * done.scale);
      }
      pinch.end();
    };
    // Safari's own page zoom would fight ours.
    const noPageZoom = (e: Event) => e.preventDefault();

    el.addEventListener("touchstart", onStart, { passive: false, capture: true });
    el.addEventListener("touchmove", onMove, { passive: false, capture: true });
    el.addEventListener("touchend", onEnd, { capture: true });
    el.addEventListener("touchcancel", onEnd, { capture: true });
    el.addEventListener("gesturestart", noPageZoom);
    return () => {
      el.removeEventListener("touchstart", onStart, { capture: true });
      el.removeEventListener("touchmove", onMove, { capture: true });
      el.removeEventListener("touchend", onEnd, { capture: true });
      el.removeEventListener("touchcancel", onEnd, { capture: true });
      el.removeEventListener("gesturestart", noPageZoom);
    };
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
    <>
    <TouchHint />
    <div
      ref={scrollRef}
      className="thin-scroll relative h-full touch-pan-x touch-pan-y overflow-auto overscroll-contain bg-canvas"
      onMouseDown={(e) => {
        // Clicking the grey area around pages clears the selection.
        if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.backdrop) {
          useEditor.getState().setSelection(null);
        }
      }}
    >
      <div ref={contentRef} data-backdrop="1" className="mx-auto flex w-max min-w-full flex-col items-center gap-5 max-sm:gap-3" style={{ padding: pad }}>
        {pages.map((p, i) => (
          <PageView key={p.id} page={p} index={i} zoom={zoom} />
        ))}
      </div>
    </div>
    </>
  );
}

/** On phones, a short line saying how the active tool works with fingers. */
function TouchHint() {
  const tool = useEditor((s) => s.tool);
  // The editor only renders in the browser, so this can be read directly.
  const hint = tool !== "select" && coarsePointer() ? toolHint(tool, true) : null;
  if (!hint) return null;
  return (
    <div key={tool} className="fo-intro-fade pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center px-3 [animation-duration:220ms]">
      <p className="max-w-full truncate rounded-full bg-black/70 px-3 py-1.5 text-[12px] text-white shadow-pop backdrop-blur">{hint}</p>
    </div>
  );
}
