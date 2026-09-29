"use client";

import { useEffect, useRef, useState } from "react";
import { Mascot, type Mood } from "../mascot/Mascot";
import { cn } from "@/lib/cn";

const STEPS: { mood: Mood; state: string; title: string; text: string }[] = [
  {
    mood: "idle",
    state: "Ready",
    title: "Pick a tool",
    text: "Search or browse every tool on one page. Folio keeps an eye on what you type and points you to the right one.",
  },
  {
    mood: "curious",
    state: "Curious",
    title: "Drop in your file",
    text: "PDFs, Word, Excel, PowerPoint or photos. Drag them in or choose them from your device.",
  },
  {
    mood: "working",
    state: "Working",
    title: "Let it work",
    text: "Most tools run right in your browser, so the file never leaves your device. The few that need our server delete the file straight after.",
  },
  {
    mood: "happy",
    state: "Done",
    title: "Download the result",
    text: "No watermark, no sign-up, no queue. Your file is ready the moment Folio smiles.",
  },
  {
    mood: "oops",
    state: "Needs a look",
    title: "If something's wrong, it says so",
    text: "A damaged or password-protected file gets a clear message and what to do next, never a blank screen.",
  },
];

/**
 * Scroll story: Folio stays put on the left and changes mood as each step
 * scrolls past, so the character itself explains the flow.
 */
export function HowItWorks() {
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
      },
      // A thin band across the middle of the screen decides the current step.
      { rootMargin: "-45% 0px -45% 0px" },
    );
    items.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const step = STEPS[active];
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-16 border-t border-rule bg-[linear-gradient(180deg,#f4f6fb,#eef3ff_50%,#f4f6fb)]">
      <div className="mx-auto max-w-[1280px] px-5 pt-20 md:px-8">
        <div className="text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-brand-700">How it works</p>
          <h2 id="how-title" className="mx-auto mt-3 max-w-[20ch] text-balance font-display text-[clamp(1.9rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.04em]">
            Meet Folio. Its face shows what&apos;s happening.
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-[16px] leading-relaxed text-ink-soft">
            From the moment you pick a tool to the moment you download, you always know where things stand.
          </p>
        </div>

        <div className="grid gap-10 pb-10 lg:grid-cols-2">
          {/* Folio stays in view while the steps scroll past (large screens). */}
          <div className="hidden lg:block">
            <div className="sticky top-0 flex h-dvh flex-col items-center justify-center">
              <div className="relative flex h-[360px] w-[360px] items-center justify-center rounded-full bg-white/70 shadow-[0_40px_80px_-40px_rgb(36_71_230/0.45)] ring-1 ring-brand-100">
                <div className="absolute inset-6 rounded-full border border-dashed border-brand-200/70" aria-hidden="true" />
                <Mascot mood={step.mood} size={200} follow interactive />
              </div>
              <p key={step.state} className="m-bubble mt-6 rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-ink shadow-sm ring-1 ring-rule">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--dot)]" style={{ ["--dot" as string]: DOT[step.mood] }} aria-hidden="true" />
                {step.state}
              </p>
            </div>
          </div>

          <ol className="lg:py-[25vh]">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                ref={(el) => {
                  items.current[i] = el;
                }}
                data-step={i}
                className={cn(
                  "flex flex-col justify-center py-8 transition-opacity duration-500 lg:min-h-[62vh] lg:py-10",
                  i === active ? "opacity-100" : "lg:opacity-30",
                )}
              >
                <div className="mb-5 lg:hidden">
                  <Mascot mood={s.mood} size={96} />
                </div>
                <span className="font-mono text-[13px] font-medium text-brand-700">0{i + 1}</span>
                <h3 className="mt-2 font-display text-[clamp(1.6rem,3vw,2.4rem)] font-extrabold leading-[1.08] tracking-[-0.035em]">{s.title}</h3>
                <p className="mt-3 max-w-[44ch] text-[17px] leading-relaxed text-ink-soft">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** Status dot colour for each mood (matches Folio's body colour). */
const DOT: Record<Mood, string> = {
  idle: "#2f54eb",
  curious: "#1d6fe0",
  working: "#4f46e5",
  happy: "#0f9f6e",
  wink: "#0f9f6e",
  oops: "#e0344b",
  sleepy: "#7c6fd6",
  confused: "#f08c00",
};
