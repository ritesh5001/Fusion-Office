"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquareHeart, Star, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useScrollLock } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { FeedbackNudge, markFeedbackSent } from "./FeedbackNudge";

/** Opens the feedback form from anywhere (e.g. the footer link), optionally with a star rating chosen. */
export const openFeedback = (rating?: number) => window.dispatchEvent(new CustomEvent("fo-open-feedback", { detail: { rating } }));

const MAX = 2000;
/** Example names the name field's placeholder cycles through, one every second. */
const NAMES = ["Iqra", "Archana", "Priya", "Shreya", "Tamanna", "Ghurliya", "Gunja", "Naincy", "Kirti", "Rabina", "Arpita"];
type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

/**
 * The feedback form: a floating button on every page that opens a short form
 * (name, optional rating, message). Submissions land in the admin panel.
 */
export function Feedback() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [example, setExample] = useState(0);
  const nameInput = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const id = useId();

  useScrollLock(open);

  // Opens from openFeedback() or any link to #feedback (the footer's "Send feedback").
  useEffect(() => {
    const show = (e?: Event) => {
      opener.current = document.activeElement as HTMLElement | null;
      const r = (e as CustomEvent<{ rating?: number }> | undefined)?.detail?.rating;
      if (r) setRating(r);
      setOpen(true);
    };
    const onHash = () => {
      if (window.location.hash !== "#feedback") return;
      history.replaceState(null, "", window.location.pathname + window.location.search);
      show();
    };
    onHash();
    window.addEventListener("fo-open-feedback", show);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("fo-open-feedback", show);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => nameInput.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cycle the placeholder name while the form is open and the field is empty.
  useEffect(() => {
    if (!open || name) return;
    const t = window.setInterval(() => setExample((i) => (i + 1) % NAMES.length), 1000);
    return () => window.clearInterval(t);
  }, [open, name]);

  const close = () => {
    setOpen(false);
    if (state.kind === "sent") {
      setName("");
      setMessage("");
      setRating(0);
      setState({ kind: "idle" });
    }
    opener.current?.focus?.();
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const website = (new FormData(e.currentTarget).get("website") as string) ?? "";
    setState({ kind: "sending" });
    try {
      const res = await apiFetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, message, rating: rating || undefined, page: pathname, website }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(res.status === 429 ? "You've sent a lot of feedback just now. Please try again in a little while." : body.error ?? "Couldn't send feedback. Please try again.");
      }
      setState({ kind: "sent" });
      markFeedbackSent();
    } catch (err) {
      setState({ kind: "error", message: (err as Error).message });
    }
  };

  return (
    <>
      <FeedbackNudge paused={open} />
      <button
        type="button"
        onClick={(e) => {
          opener.current = e.currentTarget;
          setOpen(true);
        }}
        className="fo-press group fixed bottom-5 right-5 z-40 inline-flex h-12 items-center gap-2 rounded-full border border-line-strong bg-overlay/90 pl-3.5 pr-4 text-[14px] font-semibold text-fg shadow-pop backdrop-blur-xl transition-[border-color,box-shadow] hover:border-brand-400 hover:shadow-[0_12px_32px_-12px_rgb(139_124_246/0.6)] sm:bottom-6 sm:right-6"
        aria-haspopup="dialog"
      >
        <MessageSquareHeart className="h-[18px] w-[18px] text-accent transition-transform group-hover:-rotate-6 group-hover:scale-110" aria-hidden="true" />
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
          <div aria-hidden="true" onClick={close} className="fo-intro-fade absolute inset-0 bg-[#05060a]/65 backdrop-blur-sm [animation-duration:200ms]" />
          <div className="fo-palette-in relative w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-t-[26px] border border-line-strong bg-overlay p-6 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] [max-height:calc(100dvh-24px)] sm:rounded-[26px] sm:p-7">
            <button type="button" onClick={close} aria-label="Close" className="fo-press absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-raised hover:text-fg">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            {state.kind === "sent" ? (
              <div className="flex flex-col items-center py-6 text-center" role="status">
                <span className="fo-pop flex h-16 w-16 items-center justify-center rounded-full bg-accent shadow-[0_0_30px_rgb(205_245_100/0.6)]">
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden="true">
                    <path d="m5.5 12.5 4 4 9-9" stroke="#14152b" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" pathLength="1" className="fo-draw [animation-delay:200ms]" />
                  </svg>
                </span>
                <h2 id={`${id}-title`} className="mt-5 font-display text-[22px] font-bold tracking-[-0.02em] text-fg">Thank you, {name.split(" ")[0]}!</h2>
                <p className="mt-2 max-w-[34ch] text-[14.5px] leading-relaxed text-fg-muted">Your feedback reached the Fusion Office team. It helps us decide what to build next.</p>
                <button type="button" onClick={close} className="btn btn-primary btn-lg mt-6">
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-raised text-accent ring-1 ring-inset ring-line-strong">
                  <MessageSquareHeart className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 id={`${id}-title`} className="mt-4 font-display text-[22px] font-bold tracking-[-0.02em] text-fg">Share your feedback</h2>
                <p className="mt-1 text-[14px] leading-relaxed text-fg-muted">What do you like, what's missing, what broke? We read every message.</p>

                <label htmlFor={`${id}-name`} className="mt-5 block text-[13px] font-medium text-fg">
                  Your name
                </label>
                <div className="relative mt-1.5">
                  <input
                    ref={nameInput}
                    id={`${id}-name`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    required
                    autoComplete="name"
                    className="h-11 w-full rounded-xl border border-line-strong bg-sunken px-3.5 text-[15px] text-fg outline-none transition focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/20"
                  />
                  {/* Placeholder that rolls through example names (a real placeholder can't animate). */}
                  {!name && (
                    <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center overflow-hidden text-[15px] text-fg-subtle">
                      e.g.&nbsp;
                      <span key={example} className="fo-digit inline-block">
                        {NAMES[example]}
                      </span>
                    </span>
                  )}
                </div>

                <fieldset className="mt-4">
                  <legend className="text-[13px] font-medium text-fg">
                    How's your experience? <span className="font-normal text-fg-subtle">(optional)</span>
                  </legend>
                  <div className="mt-1.5 flex gap-1" role="radiogroup" aria-label="Rating">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={rating === n}
                        aria-label={`${n} star${n === 1 ? "" : "s"}`}
                        onClick={() => setRating(rating === n ? 0 : n)}
                        className="fo-press flex h-10 w-10 items-center justify-center rounded-lg hover:bg-raised"
                      >
                        <Star className={cn("h-6 w-6 transition-colors", n <= rating ? "fill-accent text-accent" : "text-fg-subtle")} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </fieldset>

                <label htmlFor={`${id}-message`} className="mt-4 block text-[13px] font-medium text-fg">
                  Your feedback
                </label>
                <textarea
                  id={`${id}-message`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={MAX}
                  required
                  rows={5}
                  className="mt-1.5 w-full resize-none rounded-xl border border-line-strong bg-sunken px-3.5 py-3 text-[15px] leading-relaxed text-fg outline-none transition placeholder:text-fg-subtle focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/20"
                  placeholder="Tell us what you think…"
                />
                <p className="mt-1 text-right text-[12px] tabular-nums text-fg-subtle">
                  {message.length}/{MAX}
                </p>

                {/* Honeypot: hidden from people, filled in by bots. */}
                <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

                {state.kind === "error" && (
                  <p role="alert" className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-300 ring-1 ring-inset ring-red-500/25">
                    {state.message}
                  </p>
                )}

                <button type="submit" disabled={state.kind === "sending" || !name.trim() || message.trim().length < 3} className="btn btn-primary btn-lg mt-4 w-full disabled:opacity-50">
                  {state.kind === "sending" ? "Sending…" : "Send feedback"}
                </button>
                <p className="mt-3 text-center text-[12px] text-fg-subtle">Only your name and message are sent. No account needed.</p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
