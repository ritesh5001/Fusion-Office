"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";

/**
 * Folio, the Fusion Office mascot: a glassy document with a face. Its mood
 * always means something (waiting for a file, working, done, a problem), so
 * the animation doubles as status. Plain SVG + CSS, no animation library.
 */
export type Mood = "idle" | "curious" | "working" | "happy" | "wink" | "oops" | "sleepy" | "confused";

const LABEL: Record<Mood, string> = {
  idle: "looking around",
  curious: "curious",
  working: "busy working",
  happy: "happy",
  wink: "winking",
  oops: "worried",
  sleepy: "asleep",
  confused: "confused",
};

type EyeShape = "oval" | "arc" | "line" | "chev" | "dot";
/** What each eye and the mouth look like in each mood. */
const FACE: Record<Mood, { l: EyeShape; r: EyeShape; mouth?: "smile" | "o" | "wave"; blush?: boolean; big?: boolean }> = {
  idle: { l: "oval", r: "oval" },
  curious: { l: "oval", r: "oval", mouth: "o", big: true },
  working: { l: "oval", r: "oval", mouth: "wave" },
  happy: { l: "arc", r: "arc", mouth: "smile", blush: true },
  wink: { l: "oval", r: "arc", mouth: "smile", blush: true },
  oops: { l: "chev", r: "chev", mouth: "o" },
  sleepy: { l: "line", r: "line" },
  confused: { l: "oval", r: "dot", mouth: "wave" },
};

// Document silhouette with a folded top-right corner.
const BODY = "M36 12 H74 L106 44 V92 A20 20 0 0 1 86 112 H36 A20 20 0 0 1 16 92 V32 A20 20 0 0 1 36 12 Z";
const FOLD = "M74 12 V32 A12 12 0 0 0 86 44 H106 Z";

function Eye({ side, face }: { side: "l" | "r"; face: (typeof FACE)[Mood] }) {
  const shape = face[side];
  const x = side === "l" ? 48 : 74;
  const flip = side === "r" ? -1 : 1;
  const show = (s: EyeShape): CSSProperties => ({
    opacity: shape === s ? 1 : 0,
    transform: `scale(${shape === s ? (s === "oval" && face.big ? 1.18 : 1) : 0.4})`,
  });
  const stroke = { fill: "none", stroke: "white", strokeWidth: 5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <g transform={`translate(${x} 70)`}>
      <g className="m-part" style={show("oval")}>
        <rect className="m-blink" x={-5} y={-9} width={10} height={18} rx={5} fill="white" />
      </g>
      <path className="m-part" style={show("arc")} d="M-7 3 Q0 -7 7 3" {...stroke} />
      <path className="m-part" style={show("line")} d="M-7 1 H7" {...stroke} />
      <path className="m-part" style={show("chev")} d={`M${-5 * flip} -6 L${4 * flip} 0 L${-5 * flip} 6`} {...stroke} />
      <circle className="m-part" style={show("dot")} r={4} fill="white" />
    </g>
  );
}

export function Mascot({
  mood = "idle",
  size = 120,
  follow = false,
  interactive = false,
  /** Bump this (e.g. on download) to trigger a one-shot wink without a click. */
  winkKey = 0,
  label,
  className,
}: {
  mood?: Mood;
  size?: number;
  /** Eyes follow the pointer. */
  follow?: boolean;
  /** A click makes Folio wink. */
  interactive?: boolean;
  /** Change to trigger a temporary wink (download celebration, etc.). */
  winkKey?: number;
  /** Accessible name; omit for decorative use. */
  label?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const root = useRef<HTMLSpanElement>(null);
  const [petted, setPetted] = useState(false);
  const shown: Mood = petted ? "wink" : mood;
  const face = FACE[shown];

  // Eyes look toward the pointer (small offsets, one frame at a time).
  useEffect(() => {
    const el = root.current;
    if (!follow || !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const d = Math.max(1, Math.hypot(dx, dy));
        const pull = Math.min(1, d / 400);
        el.style.setProperty("--lx", `${((dx / d) * 5 * pull).toFixed(2)}px`);
        el.style.setProperty("--ly", `${((dy / d) * 4 * pull).toFixed(2)}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, [follow]);

  useEffect(() => {
    if (!petted) return;
    const t = setTimeout(() => setPetted(false), 1400);
    return () => clearTimeout(t);
  }, [petted]);

  // External wink trigger (download, success moments).
  useEffect(() => {
    if (!winkKey) return;
    setPetted(true);
  }, [winkKey]);

  const pet = () => setPetted(true);
  const a11y = interactive
    ? {
        role: "button",
        tabIndex: 0,
        "aria-label": `Say hi to Folio (${LABEL[shown]})`,
        onClick: pet,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pet();
          }
        },
      }
    : label
      ? { role: "img", "aria-label": `${label}, ${LABEL[shown]}` }
      : { "aria-hidden": true };

  const svg = (
    <svg viewBox="0 0 122 132" width={size} height={(size * 132) / 122} className="m-svg overflow-visible">
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" style={{ stopColor: "var(--m-a)" }} />
          <stop offset="1" style={{ stopColor: "var(--m-b)" }} />
        </linearGradient>
        <clipPath id={`${id}c`}>
          <path d={BODY} />
        </clipPath>
        <filter id={`${id}f`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* Ground shadow: shrinks when Folio hops. */}
      <ellipse className="m-shadow" cx={61} cy={124} rx={34} ry={5} fill="var(--m-b)" opacity={0.18} />

      <g className="m-body">
        <path d={BODY} fill={`url(#${id}b)`} />
        {/* Glass: soft light top-left, depth bottom-right, a thin bright rim. */}
        <g clipPath={`url(#${id}c)`}>
          <ellipse cx={42} cy={30} rx={34} ry={20} fill="white" opacity={0.55} filter={`url(#${id}f)`} />
          <ellipse cx={92} cy={108} rx={36} ry={24} fill="var(--m-b)" opacity={0.55} filter={`url(#${id}f)`} />
          <circle cx={30} cy={96} r={16} fill="var(--m-c)" opacity={0.5} filter={`url(#${id}f)`} />
        </g>
        <path d={BODY} fill="none" stroke="white" strokeOpacity={0.45} strokeWidth={2} />
        <path d={FOLD} fill="white" opacity={0.55} />

        <g className="m-face">
          <g className="m-eyes">
            <Eye side="l" face={face} />
            <Eye side="r" face={face} />
          </g>
          <g transform="translate(61 90)">
            <path className="m-part" style={{ opacity: face.mouth === "smile" ? 1 : 0 }} d="M-7 -1 Q0 6 7 -1" fill="none" stroke="white" strokeWidth={4} strokeLinecap="round" />
            <ellipse className="m-part" style={{ opacity: face.mouth === "o" ? 1 : 0 }} rx={3.5} ry={4} fill="white" />
            <path className="m-part" style={{ opacity: face.mouth === "wave" ? 1 : 0 }} d="M-7 0 Q-3.5 -3 0 0 T7 0" fill="none" stroke="white" strokeWidth={3.5} strokeLinecap="round" />
          </g>
          <g className="m-part" style={{ opacity: face.blush ? 0.55 : 0 }}>
            <ellipse cx={36} cy={84} rx={6} ry={3.5} fill="#ff8fb3" />
            <ellipse cx={86} cy={84} rx={6} ry={3.5} fill="#ff8fb3" />
          </g>
        </g>
      </g>

      {/* Working: a ring of light travels around Folio. */}
      {shown === "working" && (
        <circle className="m-orbit" cx={61} cy={62} r={58} fill="none" stroke="var(--m-a)" strokeWidth={3} strokeLinecap="round" strokeDasharray="40 330" />
      )}
      {/* Sleepy: little z's drift up. */}
      {shown === "sleepy" && (
        <g fill="var(--m-b)" fontWeight={800} fontFamily="var(--font-display)">
          <text className="m-z" x={100} y={26} fontSize={14}>
            z
          </text>
          <text className="m-z m-z2" x={110} y={14} fontSize={10}>
            z
          </text>
        </g>
      )}
      {/* Confused: a question mark pops up. */}
      {shown === "confused" && (
        <text className="m-q" x={100} y={24} fontSize={22} fontWeight={800} fill="var(--m-b)" fontFamily="var(--font-display)">
          ?
        </text>
      )}
    </svg>
  );

  return (
    <span
      ref={root}
      data-mood={shown}
      className={cn("mascot relative inline-block select-none", interactive && "cursor-pointer rounded-3xl", className)}
      {...a11y}
    >
      {svg}
    </span>
  );
}
