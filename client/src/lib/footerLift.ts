"use client";

import { useEffect, useState } from "react";

/**
 * How far the floating buttons (Feedback, Buy us a coffee) should rise so that,
 * at the end of the page, they sit centred in the empty band above the footer's
 * bottom bar ([data-float-dock]) instead of covering the footer. Rises
 * gradually as the band scrolls into view; 0 on pages without one.
 */
const BUTTON = 48; // h-12
const offset = () => (window.matchMedia("(min-width: 640px)").matches ? 24 : 20); // bottom-5 / sm:bottom-6

export function useFooterLift() {
  const [lift, setLift] = useState(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const band = document.querySelector<HTMLElement>("[data-float-dock]");
      let next = 0;
      if (band) {
        const r = band.getBoundingClientRect();
        // Where the button's centre rests now, versus the band's centre.
        const restCentre = window.innerHeight - offset() - BUTTON / 2;
        next = Math.max(0, Math.round(restCentre - (r.top + r.height / 2)));
      }
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
