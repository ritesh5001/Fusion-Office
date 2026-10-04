"use client";

import { setReducedMotion, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/cn";

/** Footer switch: stops floating icons, glow loops and scroll effects. Status changes stay clear. */
export function MotionToggle() {
  const reduced = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={reduced}
      onClick={() => setReducedMotion(!reduced)}
      className="group inline-flex items-center gap-2.5 text-[13px] text-fg-muted transition-colors hover:text-fg"
    >
      <span className={cn("relative h-5 w-9 rounded-full ring-1 ring-inset transition-colors duration-200", reduced ? "bg-accent ring-accent" : "bg-raised ring-line-strong")}>
        <span className={cn("absolute left-0.5 top-0.5 h-4 w-4 rounded-full shadow transition-transform duration-200 ease-[cubic-bezier(.34,1.56,.64,1)]", reduced ? "translate-x-4 bg-on-accent" : "bg-fg-muted")} />
      </span>
      Reduce motion
    </button>
  );
}
