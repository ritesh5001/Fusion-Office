"use client";

import { useEffect, useRef, useState } from "react";
import { Mascot, type Mood } from "../mascot/Mascot";
import { isReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/cn";

const STEPS: { mood: Mood; status: string; title: string; text: string }[] = [
  {
    mood: "idle",
    status: "Ready",
    title: "Pick a tool",
    text: "Search or browse every tool on one page, or drop a file and get the tools that can open it.",
  },
  {
    mood: "curious",
    status: "File received",
    title: "Add your file",
    text: "PDFs, Word, Excel, PowerPoint or photos. Drag them in or choose them from your device.",
  },
  {
    mood: "working",
    status: "Processing locally",
    title: "Let it work",
    text: "Most tools run right in your browser. The few that need our server delete the file straight after.",
  },
  {
    mood: "happy",
    status: "Download ready",
    title: "Download the result",
    text: "No watermark, no sign-up, no queue. If a file is damaged or locked, you get a clear message instead.",
  },
];

/**
 * Four steps on a timeline. As you scroll, a glowing signal travels from 01
 * to 04, each step lights up as it's reached, and Folio's status follows.
 * With reduced motion the timeline is shown complete and still.
 */
export function HowItWorks() {
  const list = useRef<HTMLOListElement>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const [p, setP] = useState(1);
  // Where each step sits along the track (0–1), and the track's length in px.
  const [geo, setGeo] = useState<{ wide: boolean; at: number[]; length: number }>({ wide: true, at: [0, 1 / 3, 2 / 3, 1], length: 0 });

  useEffect(() => {
    const ol = list.current;
    if (!ol) return;
    const measure = () => {
      const wide = window.matchMedia("(min-width: 1280px)").matches;
      const lis = items.current.filter((x): x is HTMLLIElement => !!x);
      if (wide) setGeo({ wide, at: [0, 1 / 3, 2 / 3, 1], length: ol.clientWidth * 0.75 });
      else {
        const last = lis[lis.length - 1]?.offsetTop || 1;
        setGeo({ wide, at: lis.map((li) => li.offsetTop / last), length: last });
      }
    };
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (isReducedMotion()) return setP(1);
        const r = ol.getBoundingClientRect();
        const vh = window.innerHeight;
        setP(Math.min(1, Math.max(0, (vh * 0.75 - r.top) / (r.height * 0.5 + vh * 0.3))));
      });
    };
    measure();
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("resize", onScroll);
    window.addEventListener("fo-motion-change", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("fo-motion-change", onScroll);
    };
  }, []);

  const reached = geo.at.map((a) => p >= a - 0.02);
  const current = Math.max(0, reached.lastIndexOf(true));
  const step = STEPS[current];
  const offset = p * geo.length;

  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 border-t border-line">
      <div className="px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[640px]">
            <p className="eyebrow">How it works</p>
            <h2 id="how-title" className="mt-3 text-balance font-display text-[clamp(1.75rem,3.4vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.035em] text-fg">
              From file to finished in four steps.
            </h2>
            <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
              You always know where things stand: Folio, our document helper, shows what is happening at every step.
            </p>
          </div>
          {/* Folio's status follows the signal. */}
          <div className="flex items-center gap-3 self-start rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-4 md:self-auto" aria-hidden="true">
            <Mascot mood={step.mood} size={36} />
            <span key={step.status} className="fo-fade flex items-center gap-2 text-[14px] font-semibold text-fg">
              <span className={cn("h-2 w-2 rounded-full", current === 3 ? "bg-accent shadow-[0_0_8px_#cdf564]" : "bg-brand-400 shadow-[0_0_8px_#9d91fb]")} />
              {step.status}
            </span>
          </div>
        </div>

        <ol ref={list} className="relative mt-12 grid gap-6 xl:grid-cols-4 xl:gap-3">
          {/* Track and signal: across on wide screens, down on narrow ones. */}
          <span aria-hidden="true" className={cn("pointer-events-none absolute", geo.wide ? "left-[12.5%] right-[12.5%] top-4 h-[2px]" : "left-4 top-4 w-[2px]")} style={geo.wide ? undefined : { height: geo.length }}>
            <span className="absolute inset-0 rounded-full bg-line" />
            <span
              className="absolute inset-0 rounded-full bg-[linear-gradient(90deg,#8b7cf6,#cdf564)] shadow-[0_0_10px_rgb(205_245_100/0.5)]"
              style={{ transform: geo.wide ? `scaleX(${p})` : `scaleY(${p})`, transformOrigin: geo.wide ? "left" : "top" }}
            />
            <span
              className="absolute -left-[5px] -top-[5px] h-3 w-3 rounded-full bg-accent shadow-[0_0_14px_4px_rgb(205_245_100/0.6)]"
              style={{ transform: geo.wide ? `translate(${offset}px, 0)` : `translate(0.5px, ${offset}px)`, opacity: p > 0.001 && p < 0.999 ? 1 : 0, transition: "opacity 200ms" }}
            />
          </span>

          {STEPS.map((s, i) => {
            const on = reached[i];
            const now = i === current;
            return (
              <li
                key={s.title}
                ref={(el) => {
                  items.current[i] = el;
                }}
                className="relative flex gap-4 xl:flex-col xl:items-center"
              >
                <span
                  className={cn(
                    "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-semibold ring-1 transition-[background-color,color,box-shadow] duration-300",
                    on ? "bg-accent text-on-accent ring-accent" : "bg-surface text-fg-subtle ring-line-strong",
                    now && on && "shadow-[0_0_0_5px_rgb(205_245_100/0.15),0_0_18px_rgb(205_245_100/0.5)]",
                  )}
                >
                  0{i + 1}
                </span>
                <div
                  className={cn(
                    "card flex w-full flex-1 flex-col p-5 transition-[border-color,opacity,translate] duration-[400ms] xl:mt-1",
                    on ? "opacity-100" : "translate-y-2 opacity-55",
                    now && on && "border-accent/35",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-fg">{s.title}</h3>
                    <Mascot mood={s.mood} size={40} />
                  </div>
                  <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">{s.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
