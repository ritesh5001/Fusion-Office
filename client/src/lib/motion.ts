"use client";

import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

/**
 * Motion preference. The visitor's choice (footer toggle) wins; without one
 * we follow the system "reduce motion" setting. It lands on <html> as
 * data-motion="reduced", which the CSS keys every loop and flourish off,
 * set by an inline script before first paint so nothing animates then stops.
 */
const KEY = "fo-motion";
const EVENT = "fo-motion-change";

export const motionInitScript = `try{var p=localStorage.getItem("${KEY}");var r=p?p==="reduced":matchMedia("(prefers-reduced-motion: reduce)").matches;if(r)document.documentElement.dataset.motion="reduced"}catch(e){}`;

export function isReducedMotion() {
  return typeof document !== "undefined" && document.documentElement.dataset.motion === "reduced";
}

export function setReducedMotion(reduced: boolean) {
  try {
    localStorage.setItem(KEY, reduced ? "reduced" : "full");
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  if (reduced) document.documentElement.dataset.motion = "reduced";
  else delete document.documentElement.dataset.motion;
  window.dispatchEvent(new Event(EVENT));
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const sync = () => setReduced(isReducedMotion());
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onSystem = () => {
      let chosen: string | null = null;
      try {
        chosen = localStorage.getItem(KEY);
      } catch {}
      if (!chosen) setReducedMotionAttr(q.matches);
      sync();
    };
    sync();
    window.addEventListener(EVENT, sync);
    q.addEventListener("change", onSystem);
    return () => {
      window.removeEventListener(EVENT, sync);
      q.removeEventListener("change", onSystem);
    };
  }, []);
  return reduced;
}

function setReducedMotionAttr(reduced: boolean) {
  if (reduced) document.documentElement.dataset.motion = "reduced";
  else delete document.documentElement.dataset.motion;
}

/** Smooth scrolling unless the visitor asked for less motion. */
export const scrollBehavior = (): ScrollBehavior => (isReducedMotion() ? "auto" : "smooth");

/**
 * Scroll reveal: "idle" until mounted (server HTML stays visible), then
 * "hidden" for content below the fold and "shown" once it scrolls into view.
 */
export function useReveal<T extends Element>(ref: RefObject<T | null>, margin = "0px 0px -10% 0px") {
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (isReducedMotion() || !("IntersectionObserver" in window)) return setState("shown");
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.9 && r.bottom > 0) return setState("shown");
    setState("hidden");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return state;
}

/**
 * Freezes the page behind an open menu or sheet. Pinning <body> (rather than
 * overflow: hidden alone) also stops iOS Safari from scrolling underneath;
 * the scroll position is restored on close. A layout effect, so the page is
 * unpinned before a link's own navigation (e.g. to #privacy) happens.
 */
export function useScrollLock(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return;
    const y = window.scrollY;
    const b = document.body.style;
    const prev = { position: b.position, top: b.top, left: b.left, right: b.right, width: b.width, overflow: b.overflow };
    Object.assign(b, { position: "fixed", top: `-${y}px`, left: "0", right: "0", width: "100%", overflow: "hidden" });
    return () => {
      Object.assign(b, prev);
      window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
    };
  }, [active]);
}
