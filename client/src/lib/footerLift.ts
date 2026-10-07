"use client";

import { useEffect, useState } from "react";

/**
 * How far the floating buttons (Feedback, Buy us a coffee) should rise so they
 * rest above the footer's bottom bar instead of covering it: the part of the
 * bar ([data-float-dock]) that has scrolled into view. 0 on pages without one.
 */
export function useFooterLift() {
  const [lift, setLift] = useState(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const bar = document.querySelector<HTMLElement>("[data-float-dock]");
      const next = bar ? Math.max(0, Math.round(window.innerHeight - bar.getBoundingClientRect().top)) : 0;
      setLift((cur) => (cur === next ? cur : next));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  return lift;
}

/** Inline style that lifts a floating element by `lift` pixels. */
export const liftStyle = (lift: number): React.CSSProperties => ({ transform: lift ? `translateY(${-lift}px)` : undefined });
