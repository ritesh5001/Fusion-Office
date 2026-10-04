"use client";

import { useEffect, useRef, useState } from "react";
import { Cpu, FileStack, Heart, ShieldCheck, Sparkles, UserX } from "lucide-react";
import { Logo } from "../Logo";
import { FlowIn, FlowOut } from "../home/FlowArt";
import { isReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/cn";

const FEATURES = [
  { icon: FileStack, text: "74 tools for PDFs, Office files and images" },
  { icon: Cpu, text: "Most tools run on your device" },
  { icon: UserX, text: "No sign-up, no watermarks" },
  { icon: Sparkles, text: "AI that reads your PDFs" },
];

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function parts(ms: number): Parts {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

/**
 * The pre-launch screen shown on every URL until the launch time. The clock
 * follows the server's time (not the visitor's), and when it reaches zero the
 * page reloads into the real site.
 */
export function ComingSoon({ launchAt, serverNow }: { launchAt: number; serverNow: number }) {
  // First render uses the server's time so server and browser markup match.
  const [now, setNow] = useState(serverNow);
  const offset = useRef(0);
  const [live, setLive] = useState(false);

  useEffect(() => {
    offset.current = serverNow - Date.now();
    const tick = () => setNow(Date.now() + offset.current);
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [serverNow]);

  const left = launchAt - now;
  // Time's up: show the "we're live" state…
  if (left <= 0 && !live) setLive(true);
  // …then open the real page at this same URL. Keyed on `live` only, so the
  // clock ticking can't cancel it.
  useEffect(() => {
    if (!live) return;
    const id = window.setTimeout(() => window.location.reload(), isReducedMotion() ? 300 : 1600);
    return () => window.clearTimeout(id);
  }, [live]);

  const p = parts(left);
  const ist = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { ...o, timeZone: "Asia/Kolkata" }).format(launchAt);
  const when = `${ist({ day: "numeric", month: "long" })}, ${ist({ hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase()}`;

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-app text-fg">
      {/* Backdrop: violet haze, dot grid, lime glow from below. */}
      <div
        aria-hidden="true"
        className="fo-intro-fade pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_45%_at_50%_42%,rgb(92_77_204/0.28),transparent_70%),radial-gradient(70%_50%_at_50%_110%,rgb(205_245_100/0.10),transparent_70%),radial-gradient(90%_80%_at_50%_20%,#111331,transparent_75%),radial-gradient(rgb(255_255_255/0.05)_1px,transparent_1px)] [background-size:auto,auto,auto,24px_24px]"
      />

      <header className="fo-intro-fade flex items-center justify-between px-5 py-5 sm:px-8">
        <span className="flex items-center gap-2.5 font-display text-[18px] font-bold tracking-[-0.02em]">
          <Logo className="h-7 w-7" /> Fusion Office
        </span>
        <span className="hidden items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-[12.5px] text-fg-muted backdrop-blur sm:inline-flex">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> Private by design
        </span>
      </header>

      <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-4 sm:px-6">
        <span className="fo-intro-rise inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-accent [animation-delay:60ms]">
          <span className="relative flex h-2 w-2">
            <span className="fo-ping absolute inset-0 rounded-full bg-accent" />
            <span className="relative h-2 w-2 rounded-full bg-accent" />
          </span>
          {live ? "We're live" : `Launching ${when} IST`}
        </span>

        <h1 className="mt-6 text-center font-display text-[clamp(2.3rem,6.4vw,4.75rem)] font-extrabold leading-[1.02] tracking-[-0.035em]">
          <span className="fo-intro-rise block [animation-delay:120ms]">All your files.</span>
          <span className="fo-intro-wipe inline-block [animation-delay:230ms]">
            <span className="bg-[linear-gradient(90deg,#8b7cf6,#b6adff)] bg-clip-text text-transparent">One private</span> <span className="text-accent">workspace.</span>
          </span>
        </h1>
        <p className="fo-intro-rise mt-5 max-w-[52ch] text-pretty text-center text-[16px] leading-relaxed text-fg-muted [animation-delay:320ms]">
          Fusion Office opens to everyone soon. Edit, convert, compress and sign documents right in your browser, free and without uploading your files.
        </p>

        {/* Countdown, in the neon card, with the hero's file flow on wide screens. */}
        <div className="mt-10 flex w-full items-center justify-center">
          <div className="hidden lg:block">
            <FlowIn active={live} />
          </div>

          <div className="fo-intro-scale relative w-full max-w-[600px]">
            <div aria-hidden="true" className={cn("pointer-events-none absolute -inset-4 rounded-[44px] bg-[linear-gradient(100deg,#8b7cf6,#a99cff_45%,#cdf564)] blur-3xl transition-opacity duration-700", live ? "opacity-90" : "opacity-50")} />
            <div className="relative rounded-[30px] bg-[linear-gradient(100deg,#9d91fb,#cfc8ff_48%,#cdf564)] p-[3px] shadow-[-10px_0_30px_rgb(139_124_246/0.55),10px_0_30px_rgb(205_245_100/0.4)]">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[30px]">
                <div className="fo-sweep absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0_68%,rgb(255_255_255/0.95)_80%,transparent_90%)]" />
              </div>
              <div className="relative rounded-[28px] bg-[#0e1027] px-4 py-7 sm:px-8 sm:py-9">
                {live ? (
                  <div className="flex flex-col items-center py-4 text-center" role="status">
                    <span className="fo-pop flex h-16 w-16 items-center justify-center rounded-full bg-accent shadow-[0_0_30px_rgb(205_245_100/0.7)]">
                      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden="true">
                        <path d="m5.5 12.5 4 4 9-9" stroke="#14152b" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" pathLength="1" className="fo-draw [animation-delay:200ms]" />
                      </svg>
                    </span>
                    <p className="fo-fade mt-4 font-display text-[24px] font-bold tracking-[-0.02em] [animation-delay:200ms]">Fusion Office is live</p>
                    <p className="mt-1 text-[14px] text-fg-muted">Opening now…</p>
                  </div>
                ) : (
                  <>
                    <p className="text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">Opening in</p>
                    <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-4" role="timer" aria-live="off" aria-label={`${p.days} days, ${p.hours} hours, ${p.minutes} minutes, ${p.seconds} seconds until launch`}>
                      <Unit value={p.days} label="Days" />
                      <Unit value={p.hours} label="Hours" />
                      <Unit value={p.minutes} label="Minutes" />
                      <Unit value={p.seconds} label="Seconds" accent />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="hidden self-stretch lg:flex">
            <FlowOut lit={live} done={live} />
          </div>
        </div>

        <ul className="mt-12 grid w-full max-w-[880px] grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <li
              key={f.text}
              className="fo-intro-rise flex items-center gap-3 rounded-2xl border border-line bg-surface/70 px-4 py-3 text-[13.5px] text-fg-muted backdrop-blur"
              style={{ animationDelay: `${600 + i * 60}ms` }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-raised text-accent ring-1 ring-inset ring-line-strong">
                <f.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              {f.text}
            </li>
          ))}
        </ul>
      </main>

      <footer className="flex flex-col items-center gap-3 border-t border-line px-4 py-5 text-[13px] text-fg-subtle sm:flex-row sm:justify-between sm:px-8">
        <p>
          © {new Date(launchAt).getFullYear()} Fusion Office ·{" "}
          <a href="https://nextgenfusion.in" target="_blank" rel="noopener" className="font-medium text-fg-muted hover:text-fg">
            nextgenfusion.in
          </a>
        </p>
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[14px] text-fg-muted">
          Made with <Heart className="fo-heartbeat h-4 w-4 fill-[#ff5a6e] text-[#ff5a6e]" aria-label="love" /> by
          <a href="https://nextgenfusion.in" target="_blank" rel="noopener" className="bg-[linear-gradient(90deg,#b6adff,#cdf564)] bg-clip-text font-bold text-transparent">
            NextGen Fusion
          </a>
        </p>
      </footer>
    </div>
  );
}

/** One countdown unit; the digits slide up when they change. */
function Unit({ value, label, accent }: { value: number; label: string; accent?: boolean }) {
  const text = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.04] px-1 py-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] sm:py-5">
      <span className="relative block h-[1.1em] overflow-hidden font-display text-[clamp(2rem,7vw,3.6rem)] font-extrabold leading-[1.1] tabular-nums tracking-[-0.03em]">
        <span key={text} className={cn("fo-digit block", accent ? "text-accent" : "text-fg")}>
          {text}
        </span>
      </span>
      <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle sm:text-[12px]">{label}</span>
    </div>
  );
}
