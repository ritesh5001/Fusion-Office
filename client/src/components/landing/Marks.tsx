import type { ReactNode } from "react";

/** The signature: editing marks made on the page itself. */

export function Highlight({ children }: { children: ReactNode }) {
  return <span className="mark-sweep">{children}</span>;
}

/** A hand-drawn red pen loop around a word. */
export function PenCircle({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block">
      {children}
      <svg
        aria-hidden="true"
        className="pen-circle pointer-events-none absolute -inset-x-[0.22em] -inset-y-[0.12em] h-[calc(100%+0.24em)] w-[calc(100%+0.44em)] overflow-visible"
        viewBox="0 0 200 100"
        preserveAspectRatio="none"
      >
        <path
          d="M 150 12 C 105 -2, 30 4, 10 34 C -8 62, 40 94, 104 92 C 170 90, 205 66, 192 36 C 182 14, 140 6, 96 10"
          fill="none"
          stroke="var(--color-pen)"
          strokeWidth="3.2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
        />
      </svg>
    </span>
  );
}

/** Small mono label used as section index, e.g. "§ 02 Privacy". */
export function Kicker({ index, children, invert }: { index: string; children: ReactNode; invert?: boolean }) {
  return (
    <p className={`font-mono text-[12px] uppercase tracking-[0.14em] ${invert ? "text-white/60" : "text-ink-soft"}`}>
      <span className={invert ? "text-white" : "text-ink"}>§ {index}</span>
      <span className="mx-2" aria-hidden="true">
        ·
      </span>
      {children}
    </p>
  );
}

/** Print crop marks at the four corners of a box. */
export function CropMarks({ className = "text-ink/40" }: { className?: string }) {
  const corner = "absolute h-4 w-4 border-current";
  return (
    <span aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      <span className={`${corner} -left-5 -top-5 border-b border-r`} />
      <span className={`${corner} -right-5 -top-5 border-b border-l`} />
      <span className={`${corner} -bottom-5 -left-5 border-r border-t`} />
      <span className={`${corner} -bottom-5 -right-5 border-l border-t`} />
    </span>
  );
}
