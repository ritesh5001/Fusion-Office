"use client";

import { useEffect, useRef, useState } from "react";
import { Star, X } from "lucide-react";
import { TASK_DONE } from "@/lib/taskDone";
import { cn } from "@/lib/cn";
import { liftStyle, useFooterLift } from "@/lib/footerLift";

/**
 * After a task finishes, a small card slides in asking how it went. Picking a
 * star opens the feedback form with that rating. It stays polite: at most once
 * per visit, never after someone has sent feedback, and "Not now" quiets it
 * for a few days.
 */

const SENT = "fo-feedback-sent";
const SNOOZE = "fo-feedback-snooze";
const SHOWN = "fo-feedback-nudged";
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
const DELAY_MS = 1400;
const AUTO_HIDE_MS = 25_000;
const LABELS = ["Poor", "Fair", "Good", "Great", "Loved it"];

const store = {
  get(area: "local" | "session", key: string) {
    try {
      return (area === "local" ? localStorage : sessionStorage).getItem(key);
    } catch {
      return null;
    }
  },
  set(area: "local" | "session", key: string, value: string) {
    try {
      (area === "local" ? localStorage : sessionStorage).setItem(key, value);
    } catch {
      /* private mode: the prompt just isn't remembered */
    }
  },
};

/** Called once feedback is sent, so the prompt never asks again on this browser. */
export const markFeedbackSent = () => store.set("local", SENT, "1");

const allowed = () =>
  !store.get("local", SENT) && !store.get("session", SHOWN) && Number(store.get("local", SNOOZE) ?? 0) < Date.now();

export function FeedbackNudge({ paused }: { paused: boolean }) {
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");
  const [hover, setHover] = useState(0);
  const timers = useRef<number[]>([]);
  const lift = useFooterLift();

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const clear = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };

  const hide = () => {
    clear();
    setPhase((p) => (p === "in" ? "out" : p));
    later(() => setPhase("hidden"), 220);
  };

  useEffect(() => {
    const onDone = () => {
      if (!allowed()) return;
      store.set("session", SHOWN, "1");
      // Let the result settle on screen first.
      later(() => {
        setPhase("in");
        later(hide, AUTO_HIDE_MS);
      }, DELAY_MS);
    };
    window.addEventListener(TASK_DONE, onDone);
    return () => {
      window.removeEventListener(TASK_DONE, onDone);
      clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The full form took over (opened from here or elsewhere): step aside.
  useEffect(() => {
    if (paused && phase === "in") hide();
  }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "hidden") return null;

  const rate = (n: number) => {
    hide();
    window.dispatchEvent(new CustomEvent("fo-open-feedback", { detail: { rating: n } }));
  };
  const notNow = () => {
    store.set("local", SNOOZE, String(Date.now() + SNOOZE_MS));
    hide();
  };

  return (
    <div
      role="dialog"
      aria-labelledby="fo-nudge-title"
      onKeyDown={(e) => e.key === "Escape" && notNow()}
      style={liftStyle(lift)}
      className={cn(
        "fo-float-dock transition-transform fixed bottom-[84px] right-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] sm:bottom-[92px] sm:right-6",
        phase === "in" ? "fo-nudge-in" : "fo-nudge-out",
      )}
    >
      {/* Glow behind the card, and a light sweeping around its border. */}
      <div aria-hidden="true" className="pointer-events-none absolute -inset-3 rounded-[30px] bg-[linear-gradient(100deg,#8b7cf6,#cdf564)] opacity-30 blur-2xl" />
      <div className="relative overflow-hidden rounded-[22px] bg-[linear-gradient(100deg,#8b7cf6,#b6adff_50%,#cdf564)] p-[1.5px] shadow-pop">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="fo-sweep absolute left-1/2 top-1/2 aspect-square w-[180%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0_70%,rgb(255_255_255/0.9)_82%,transparent_92%)]" />
        </div>
        <div className="relative rounded-[20.5px] bg-overlay p-5">
          <button type="button" onClick={notNow} aria-label="Close" className="fo-press absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-fg-subtle hover:bg-raised hover:text-fg">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2.5 pr-8">
            <span className="fo-pop flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent shadow-[0_0_18px_rgb(205_245_100/0.55)]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                <path d="m5.5 12.5 4 4 9-9" stroke="#14152b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" pathLength="1" className="fo-draw [animation-delay:250ms]" />
              </svg>
            </span>
            <p className="text-[13px] font-medium text-accent">Done! Your file is ready.</p>
          </div>

          <h2 id="fo-nudge-title" className="mt-3 font-display text-[18px] font-bold tracking-[-0.02em] text-fg">
            How was your experience?
          </h2>
          <p className="mt-1 text-[13.5px] leading-snug text-fg-muted">Your feedback shapes what we build next. It takes 10 seconds.</p>

          <div className="mt-3.5 flex items-center gap-1" onMouseLeave={() => setHover(0)} role="group" aria-label="Rate your experience">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => rate(n)}
                onMouseEnter={() => setHover(n)}
                onFocus={() => setHover(n)}
                onBlur={() => setHover(0)}
                aria-label={`${n} star${n === 1 ? "" : "s"}, ${LABELS[n - 1]}`}
                className="fo-star-in flex h-10 w-10 items-center justify-center rounded-lg transition-transform hover:scale-115 focus-visible:scale-115"
                style={{ animationDelay: `${350 + n * 70}ms` }}
              >
                <Star className={cn("h-7 w-7 transition-colors duration-150", n <= hover ? "fill-accent text-accent" : "text-fg-subtle")} aria-hidden="true" />
              </button>
            ))}
            <span aria-hidden="true" className="ml-1.5 min-w-[4.5rem] text-[13px] font-medium text-fg-muted">
              {hover ? LABELS[hover - 1] : ""}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={notNow} className="fo-press -ml-2 rounded-lg px-2 py-1.5 text-[13px] font-medium text-fg-subtle hover:text-fg">
              Not now
            </button>
            <button type="button" onClick={() => rate(0)} className="fo-press rounded-lg px-2 py-1.5 text-[13px] font-semibold text-brand-300 hover:text-brand-200">
              Write feedback →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
