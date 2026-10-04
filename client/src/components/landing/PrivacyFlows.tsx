"use client";

import { useRef } from "react";
import { useReveal } from "@/lib/motion";

type Mode = "device" | "server" | "ai";

const MODES: { mode: Mode; title: string; text: string }[] = [
  { mode: "device", title: "On your device", text: "The file is opened, changed and saved inside your browser. It never reaches our server." },
  { mode: "server", title: "Converted on our server", text: "Formats browsers can't handle (like Word to PDF) are converted on our server and deleted straight after." },
  { mode: "ai", title: "With AI", text: "Only the document's text is sent to our AI provider to answer you. Nothing is stored." },
];

/**
 * The privacy section as three small animated diagrams, so the difference
 * between local, server and AI tools reads at a glance. They play only while
 * on screen, and sit still (fully drawn) when motion is reduced.
 */
export function PrivacyFlows({ counts }: { counts: Record<Mode, number> }) {
  const ref = useRef<HTMLUListElement>(null);
  const state = useReveal(ref);
  return (
    <ul ref={ref} data-reveal={state} className="mt-10 grid gap-3 md:grid-cols-3">
      {MODES.map((m, i) => (
        <li key={m.mode} className="fo-r-item card overflow-hidden p-0" style={{ "--i": i } as React.CSSProperties}>
          <div className={`fo-pd flex h-[132px] items-center justify-center border-b border-line ${m.mode === "server" ? "bg-[radial-gradient(70%_90%_at_50%_50%,rgb(245_184_74/0.08),transparent)]" : m.mode === "ai" ? "bg-[radial-gradient(70%_90%_at_50%_50%,rgb(139_124_246/0.1),transparent)]" : "bg-[radial-gradient(70%_90%_at_50%_50%,rgb(205_245_100/0.07),transparent)]"}`}>
            {m.mode === "device" ? <DeviceDiagram /> : m.mode === "server" ? <ServerDiagram /> : <AiDiagram />}
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-fg">{m.title}</h3>
              <span className="text-[13px] tabular-nums text-fg-subtle">
                {counts[m.mode]} tool{counts[m.mode] === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1.5 text-[14px] leading-relaxed text-fg-muted">{m.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

const Doc = ({ x, y, fill, stroke }: { x: number; y: number; fill: string; stroke?: string }) => (
  <path d={`M${x} ${y}h13l7 7v19h-20z`} fill={fill} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
);

/** Browser outline → locked local area → engine → result, all inside the device. */
function DeviceDiagram() {
  return (
    <svg viewBox="0 0 260 110" className="h-[110px] w-[260px]" fill="none" aria-hidden="true">
      <rect x="6" y="6" width="248" height="98" rx="12" stroke="#fff" strokeOpacity=".18" />
      <path d="M6 24h248" stroke="#fff" strokeOpacity=".12" />
      {[18, 26, 34].map((cx) => (
        <circle key={cx} cx={cx} cy="15" r="2.2" fill="#fff" fillOpacity=".25" />
      ))}
      <rect x="20" y="33" width="220" height="62" rx="10" stroke="#cdf564" strokeOpacity=".45" strokeDasharray="4 4" />
      {/* Lock on the local area */}
      <rect x="221" y="27" width="14" height="11" rx="2.5" fill="#12151c" stroke="#cdf564" strokeWidth="1.3" />
      <path d="M224.5 27v-2.5a3.5 3.5 0 0 1 7 0V27" stroke="#cdf564" strokeWidth="1.3" />
      <Doc x={40} y={50} fill="#fff" />
      <rect x="108" y="51" width="44" height="26" rx="6" fill="#2d2868" stroke="#9d91fb" strokeWidth="1.2" />
      <rect className="fo-pd-chip" x="108" y="51" width="44" height="26" rx="6" fill="#9d91fb" fillOpacity=".45" />
      <path d="M118 64h24M122 59v10M130 59v10M138 59v10" stroke="#d2ccff" strokeWidth="1.2" strokeLinecap="round" />
      <g className="fo-pd-result">
        <Doc x={198} y={50} fill="#cdf564" />
        <path d="m203.5 63.5 3 3 6-6" stroke="#14152b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path d="M62 64h44M154 64h42" stroke="#cdf564" strokeOpacity=".25" strokeDasharray="2 4" />
      <circle className="fo-pd-packet" cx="56" cy="64" r="4" fill="#cdf564" />
    </svg>
  );
}

/** A different, amber path: out to a temporary server, back as the result, then the copy is shredded. */
function ServerDiagram() {
  return (
    <svg viewBox="0 0 260 110" className="h-[110px] w-[260px]" fill="none" aria-hidden="true">
      {/* Device */}
      <rect x="10" y="30" width="66" height="46" rx="7" stroke="#fff" strokeOpacity=".22" />
      <path d="M4 82h78" stroke="#fff" strokeOpacity=".22" strokeLinecap="round" />
      <Doc x={33} y={40} fill="#fff" />
      {/* Paths: out (top) and back (bottom) */}
      <path d="M80 47h98" stroke="#f5b84a" strokeOpacity=".55" strokeDasharray="4 4" />
      <path d="M178 63H80" stroke="#cdf564" strokeOpacity=".3" strokeDasharray="2 4" />
      {/* Temporary server */}
      <rect x="182" y="22" width="62" height="66" rx="8" fill="#1a1608" stroke="#f5b84a" strokeOpacity=".8" />
      <path d="M190 36h46M190 50h46M190 64h46" stroke="#f5b84a" strokeOpacity=".35" />
      <circle cx="194" cy="30" r="1.8" fill="#f5b84a" />
      {/* The copy on the server, shredded after converting */}
      <g className="fo-pd-shred">
        <rect className="fo-pd-strip" x="203" y="40" width="6" height="24" rx="1" fill="#f5b84a" />
        <rect className="fo-pd-strip [animation-delay:80ms]" x="210" y="40" width="6" height="24" rx="1" fill="#f5b84a" />
        <rect className="fo-pd-strip [animation-delay:160ms]" x="217" y="40" width="6" height="24" rx="1" fill="#f5b84a" />
      </g>
      <text className="fo-pd-deleted" x="213" y="80" textAnchor="middle" fill="#f5b84a" fontSize="9" fontWeight="700" fontFamily="ui-sans-serif, system-ui, sans-serif">
        DELETED
      </text>
      <circle className="fo-pd-out" cx="84" cy="47" r="4" fill="#f5b84a" />
      <circle className="fo-pd-back" cx="176" cy="63" r="4" fill="#cdf564" />
    </svg>
  );
}

/** Text lines, not the document, travel to the AI. */
function AiDiagram() {
  return (
    <svg viewBox="0 0 260 110" className="h-[110px] w-[260px]" fill="none" aria-hidden="true">
      <rect x="22" y="18" width="62" height="76" rx="8" fill="#fff" fillOpacity=".06" stroke="#fff" strokeOpacity=".25" />
      {[32, 42, 52, 62, 72, 82].map((y, i) => (
        <rect key={y} x="31" y={y} width={i % 3 === 2 ? 30 : 44} height="3.5" rx="1.75" fill="#fff" fillOpacity=".35" />
      ))}
      <path d="M92 56h104" stroke="#9d91fb" strokeOpacity=".3" strokeDasharray="2 4" />
      {/* Copies of three lines travel across */}
      <rect className="fo-pd-line" x="31" y="42" width="44" height="3.5" rx="1.75" fill="#b6adff" />
      <rect className="fo-pd-line [animation-delay:450ms]" x="31" y="52" width="30" height="3.5" rx="1.75" fill="#b6adff" />
      <rect className="fo-pd-line [animation-delay:900ms]" x="31" y="62" width="44" height="3.5" rx="1.75" fill="#b6adff" />
      {/* AI node */}
      <circle className="fo-pd-node" cx="216" cy="56" r="24" fill="#8b7cf6" fillOpacity=".18" />
      <circle cx="216" cy="56" r="17" fill="#1d1a44" stroke="#9d91fb" strokeWidth="1.3" />
      <path d="M216 45c1 5.5 3.5 8 9 9-5.5 1-8 3.5-9 9-1-5.5-3.5-8-9-9 5.5-1 8-3.5 9-9z" fill="#d2ccff" />
    </svg>
  );
}
