"use client";

import { useEffect, useState } from "react";
import type { FileKind } from "@/lib/tools/handoff";
/**
 * The homepage's flow diagram around the drop card: file types on the left
 * feed glowing circuit lines into the card; on the right a dotted trail runs
 * to the "Stays on this device" shield. Decorative only (aria-hidden).
 */

const LAVENDER = "#a99cff";
const LIME = "#cdf564";

/** A document glyph with a folded corner and a label, like a file icon. */
export function DocGlyph({ color, label }: { color: string; label: string }) {
  return (
    <svg viewBox="0 0 40 48" className="h-[50px] w-[42px] drop-shadow-[0_4px_10px_rgb(0_0_0/0.35)]">
      <path d="M4 0h22l14 14v30a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill={color} />
      <path d="M26 0v10a4 4 0 0 0 4 4h10z" fill="#fff" fillOpacity=".55" />
      <text x="20" y="36" textAnchor="middle" fill="#fff" fontSize={label.length > 1 ? 11 : 15} fontWeight="800" fontFamily="ui-sans-serif, system-ui, sans-serif">
        {label}
      </text>
    </svg>
  );
}

export function ImageGlyph() {
  return (
    <svg viewBox="0 0 44 40" className="h-11 w-12 drop-shadow-[0_4px_10px_rgb(0_0_0/0.35)]">
      <rect width="44" height="40" rx="7" fill="#8b7cf6" />
      <circle cx="31" cy="12" r="4.5" fill="#fff" />
      <path d="M5 33 17 17l9 11 5-6 8 11z" fill="#fff" />
    </svg>
  );
}

/** The coloured file icon for a kind of file (drag ghost, landing tile). */
export function KindGlyph({ kind }: { kind: FileKind }) {
  if (kind === "image") return <ImageGlyph />;
  return kind === "pdf" ? <DocGlyph color="#e5534b" label="PDF" /> : <DocGlyph color="#3b6fe0" label="W" />;
}

/** True when the visitor asked for less motion (SMIL animations ignore the CSS media query). */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(q.matches);
    on();
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Glassy tile holding one file type, slightly tilted so the stack feels loose. */
function FileTile({ x, y, rotate, children }: { x: number; y: number; rotate: number; children: React.ReactNode }) {
  return (
    <div
      className="fo-float absolute flex h-[80px] w-[80px] items-center justify-center rounded-[22px] bg-[linear-gradient(145deg,rgb(157_145_251/0.22),rgb(80_70_170/0.10))] ring-1 ring-inset ring-white/[0.16] shadow-[0_18px_40px_-14px_rgb(0_0_0/0.85),0_0_24px_-6px_rgb(139_124_246/0.35),inset_0_1px_0_rgb(255_255_255/0.14)] backdrop-blur-md"
      style={{ left: x, top: y, rotate: `${rotate}deg`, animationDelay: `${(x + y) * -0.02}s` }}
    >
      {children}
    </div>
  );
}

/* Paths share the viewBox 0 0 180 420; every line ends at the hub (160, 210). */
const LINES = [
  { d: "M104 56 H120 C146 56 136 210 160 210", color: LAVENDER, dot: [120, 56] },
  { d: "M78 164 H106 C134 164 136 210 160 210", color: LIME, dot: [106, 164] },
  { d: "M104 268 H114 C138 268 138 210 160 210", color: LIME, dot: [114, 268] },
  { d: "M84 368 H112 C142 368 138 210 160 210", color: LIME, dot: [112, 368] },
];

/** Faint background traces, for the circuit-board feel. */
const TRACES = ["M0 110 H40 L60 90 H96", "M0 318 H30 L48 300 H70", "M126 0 V30 L140 44 V96", "M150 420 V380 L136 366 V330"];

/**
 * Files flowing into the drop card. `active` (a file is being dragged over the
 * card) wakes the lines up: brighter, thicker, faster light.
 */
export function FlowIn({ active = false }: { active?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div aria-hidden="true" className="relative h-[420px] w-[180px] shrink-0">
      <svg viewBox="0 0 180 420" className="absolute inset-0 h-full w-full overflow-visible" fill="none">
        <defs>
          <filter id="flow-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {TRACES.map((d) => (
          <path key={d} d={d} stroke="#fff" strokeOpacity=".07" strokeWidth="1" />
        ))}
        <rect x="20" y="196" width="9" height="9" fill="#fff" fillOpacity=".06" />
        <rect x="132" y="128" width="7" height="7" fill="#fff" fillOpacity=".06" />
        <g filter="url(#flow-glow)" strokeLinecap="round" className="transition-[stroke-width] duration-300" strokeWidth={active ? 2.4 : 1.6}>
          {LINES.map((l) => (
            <path key={l.d} d={l.d} stroke={l.color} strokeOpacity={active ? 1 : 0.75} className="transition-[stroke-opacity] duration-300" />
          ))}
          {LINES.map((l) => (
            <path key={`${l.d}-flow`} d={l.d} stroke="#fff" strokeOpacity=".9" className={active ? "fo-flow-dash fo-flow-dash--fast" : "fo-flow-dash"} />
          ))}
          {/* One lime signal every 5 s, taking each line in turn. */}
          {!reduced &&
            LINES.map((l, i) => (
              <circle key={`${l.d}-signal`} r="3.2" fill={LIME} opacity="0">
                <animateMotion dur="20s" begin={`${i * 5 + 1}s`} repeatCount="indefinite" path={l.d} keyPoints="0;1;1" keyTimes="0;0.07;1" calcMode="linear" />
                <animate attributeName="opacity" dur="20s" begin={`${i * 5 + 1}s`} repeatCount="indefinite" values="1;1;0;0" keyTimes="0;0.07;0.075;1" />
              </circle>
            ))}
          <path d="M160 210 H170" stroke={LAVENDER} />
          <path d="M168 202 180 210 168 218z" fill="#fff" stroke="#fff" strokeLinejoin="round" />
          {LINES.map((l) => (
            <circle key={`${l.d}-dot`} cx={l.dot[0]} cy={l.dot[1]} r="3" fill={l.color} />
          ))}
          <circle cx="160" cy="210" r={active ? 5.5 : 4} fill="#fff" className="transition-[r] duration-300" />
        </g>
      </svg>
      <FileTile x={28} y={18} rotate={-8}>
        <DocGlyph color="#e5534b" label="PDF" />
      </FileTile>
      <FileTile x={0} y={126} rotate={6}>
        <DocGlyph color="#3b6fe0" label="W" />
      </FileTile>
      <FileTile x={26} y={230} rotate={-7}>
        <DocGlyph color="#2f9e5b" label="X" />
      </FileTile>
      <FileTile x={6} y={330} rotate={5}>
        <ImageGlyph />
      </FileTile>
    </div>
  );
}

/** Dotted trail → glowing shield → arrow, with the privacy promise underneath. */
/** `lit`: a file is being processed or is done, so the shield glows harder. */
export function FlowOut({ lit = false }: { lit?: boolean }) {
  return (
    <div className="relative flex w-[180px] shrink-0 items-center" aria-label="Files stay on this device">
      <svg aria-hidden="true" viewBox="0 0 180 420" className="pointer-events-none absolute inset-0 -top-[150px] h-[420px] w-full" fill="none">
        <path d="M60 0 V40 L80 60 V120" stroke="#fff" strokeOpacity=".07" />
        <path d="M120 420 V360 L100 340 V300" stroke="#fff" strokeOpacity=".07" />
        <rect x="140" y="70" width="10" height="10" fill="#fff" fillOpacity=".07" />
        <rect x="128" y="340" width="9" height="9" fill="#fff" fillOpacity=".07" />
      </svg>
      <span aria-hidden="true" className="flex items-center gap-[7px] pl-1 pr-2">
        <span className="h-1.5 w-1.5 rounded-full bg-accent/70 shadow-[0_0_8px_#cdf564]" />
        <span className="h-2 w-2 rounded-full bg-accent/85 shadow-[0_0_8px_#cdf564]" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_10px_#cdf564]" />
      </span>
      <span className="relative shrink-0">
        <span
          className={
            "flex h-[86px] w-[86px] items-center justify-center rounded-full ring-[1.5px] transition-[box-shadow,background-color] duration-500 " +
            (lit
              ? "bg-accent/[0.14] ring-accent shadow-[0_0_44px_rgb(205_245_100/0.6),inset_0_0_26px_rgb(205_245_100/0.3)]"
              : "bg-accent/[0.07] ring-accent/60 shadow-[0_0_28px_rgb(205_245_100/0.35),inset_0_0_22px_rgb(205_245_100/0.15)]")
          }
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-10 w-10 drop-shadow-[0_0_10px_rgb(205_245_100/0.6)]">
            <path d="M12 2 4 5v6c0 5.1 3.4 9.4 8 11 4.6-1.6 8-5.9 8-11V5z" fill="#cdf564" />
            <path d="m8.4 12.2 2.5 2.5 4.7-5" stroke="#0c0f06" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </span>
        <span className="absolute left-1/2 top-full mt-4 -translate-x-1/2 whitespace-nowrap text-[15px] font-semibold text-accent">Stays on this device</span>
      </span>
      <svg aria-hidden="true" viewBox="0 0 40 16" className="ml-1 h-4 w-10 shrink-0" fill="none">
        <path d="M0 8 H36 M29 2 36 8 29 14" stroke="#fff" strokeOpacity=".85" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
