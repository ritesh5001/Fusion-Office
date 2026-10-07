"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Coffee as CoffeeIcon, HandHeart, X } from "lucide-react";
import { useScrollLock } from "@/lib/motion";
import { cn } from "@/lib/cn";
import { liftStyle, useFooterLift } from "@/lib/footerLift";

/**
 * "Buy us a coffee", with a twist: no money changes hands. People choose what
 * a coffee is worth to them, and when they press Pay we thank them and ask
 * them to spend that amount helping someone else instead.
 */

const PRESETS = [49, 99, 199];
const MIN = 10;
const MAX = 100_000;

/** Opens the coffee dialog from anywhere (links to #coffee work too). */
export const openCoffee = () => window.dispatchEvent(new Event("fo-open-coffee"));

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** A pill that opens the dialog. */
export function CoffeeButton({ className, label = "Buy us a coffee" }: { className?: string; label?: string }) {
  return (
    <button type="button" onClick={openCoffee} className={cn("fo-press group inline-flex items-center gap-2 rounded-full bg-[#ffdd6b] px-4 py-2.5 text-[14px] font-semibold text-[#3b2400] shadow-[0_8px_22px_-10px_rgb(255_200_80/0.8)] transition-shadow hover:shadow-[0_10px_26px_-8px_rgb(255_200_80/0.9)]", className)}>
      <CoffeeIcon className="h-4 w-4 transition-transform group-hover:-rotate-12" aria-hidden="true" /> {label}
    </button>
  );
}

export function Coffee() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<number | "custom">(49);
  const [custom, setCustom] = useState("");
  const [thanked, setThanked] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const lift = useFooterLift();
  useScrollLock(open);

  useEffect(() => {
    const show = () => {
      opener.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    };
    const onHash = () => {
      if (window.location.hash !== "#coffee") return;
      history.replaceState(null, "", window.location.pathname + window.location.search);
      show();
    };
    onHash();
    window.addEventListener("fo-open-coffee", show);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("fo-open-coffee", show);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  const close = () => {
    setOpen(false);
    setThanked(null);
    opener.current?.focus?.();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const amount = preset === "custom" ? Number(custom) : preset;
  const amountOk = Number.isInteger(amount) && amount >= MIN && amount <= MAX;

  // Floating button, bottom-left (Feedback sits bottom-right). site-chrome hides it inside the mobile app.
  const floating = (
    <button
      type="button"
      onClick={(e) => {
        opener.current = e.currentTarget;
        setOpen(true);
      }}
      aria-haspopup="dialog"
      className="site-chrome fo-press group fixed bottom-5 left-5 z-40 inline-flex h-12 items-center gap-2 rounded-full border border-[#ffdd6b]/40 bg-overlay/90 pl-3.5 pr-4 text-[14px] font-semibold text-fg shadow-pop backdrop-blur-xl fo-float-dock transition-[border-color,box-shadow,transform] hover:border-[#ffdd6b] hover:shadow-[0_12px_32px_-12px_rgb(255_200_80/0.6)] sm:bottom-6 sm:left-6 xl:left-[232px]"
      style={liftStyle(lift)}
    >
      <CoffeeIcon className="h-[18px] w-[18px] text-[#ffdd6b] transition-transform group-hover:-rotate-12 group-hover:scale-110" aria-hidden="true" />
      <span className="hidden min-[380px]:inline">Buy us a coffee</span>
      <span className="min-[380px]:hidden">Coffee</span>
    </button>
  );

  if (!open) return floating;

  return (
    <>
    {floating}
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
      <div aria-hidden="true" onClick={close} className="fo-intro-fade absolute inset-0 bg-[#05060a]/65 backdrop-blur-sm [animation-duration:200ms]" />
      <div className="fo-palette-in relative w-full max-w-[440px] overflow-y-auto overscroll-contain rounded-t-[26px] border border-line-strong bg-overlay p-6 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] [max-height:calc(100dvh-24px)] sm:rounded-[26px] sm:p-7">
        <button type="button" onClick={close} aria-label="Close" className="fo-press absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-raised hover:text-fg">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {thanked !== null ? (
          <div className="flex flex-col items-center pb-1 pt-3 text-center" role="status">
            <Cup full />
            <h2 id={`${id}-title`} className="fo-rise mt-4 font-display text-[24px] font-bold tracking-[-0.02em] text-fg [animation-delay:450ms]">
              Thank you. That means a lot.
            </h2>
            <p className="fo-rise mt-3 max-w-[36ch] text-[15px] leading-relaxed text-fg-muted [animation-delay:550ms]">
              Please keep your <span className="font-semibold text-fg">{rupees(thanked)}</span>. Fusion Office is free, and it will stay that way.
            </p>
            <p className="fo-rise mt-3 max-w-[36ch] text-[15px] leading-relaxed text-fg-muted [animation-delay:650ms]">
              Instead, we'd ask you to spend it on someone who could use a little help today: a meal, a cup of tea, or a book for a student. That is the best coffee you could buy us.
            </p>
            <button type="button" onClick={close} className="fo-press fo-rise mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ffdd6b] text-[15.5px] font-bold text-[#3b2400] [animation-delay:750ms]">
              <HandHeart className="h-5 w-5" aria-hidden="true" /> I'll pay it forward
            </button>
            <Link href="/pay-it-forward#share" onClick={close} className="fo-rise mt-3 text-[13.5px] font-medium text-brand-300 hover:text-brand-200 [animation-delay:800ms]">
              Tell us who you helped →
            </Link>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (amountOk) setThanked(amount);
            }}
          >
            <div className="flex items-center gap-3">
              <Cup />
              <div>
                <h2 id={`${id}-title`} className="font-display text-[22px] font-bold tracking-[-0.02em] text-fg">
                  Buy us a coffee
                </h2>
                <p className="mt-0.5 text-[13.5px] leading-snug text-fg-muted">Fusion Office is free for everyone. Choose what a coffee is worth to you.</p>
              </div>
            </div>

            <fieldset className="mt-5">
              <legend className="text-[13px] font-medium text-fg">Choose an amount</legend>
              <div className="mt-2 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Amount">
                {[...PRESETS, "custom" as const].map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={preset === p}
                    onClick={() => setPreset(p)}
                    className={cn(
                      "fo-press relative h-14 rounded-xl text-[15px] font-semibold ring-1 ring-inset transition-colors",
                      preset === p ? "bg-[#ffdd6b] text-[#3b2400] ring-[#ffdd6b]" : "bg-sunken text-fg ring-line-strong hover:ring-[#ffdd6b]/60",
                    )}
                  >
                    {p === "custom" ? "Other" : rupees(p)}
                    {p === 49 && <span className={cn("absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wide", preset === 49 ? "bg-[#3b2400] text-[#ffdd6b]" : "bg-raised text-fg-muted")}>1 coffee</span>}
                  </button>
                ))}
              </div>
              {preset === "custom" && (
                <label className="fo-rise mt-3 flex h-12 items-center rounded-xl border border-line-strong bg-sunken px-3.5 focus-within:border-[#ffdd6b] focus-within:ring-[3px] focus-within:ring-[#ffdd6b]/20">
                  <span className="text-[17px] font-semibold text-fg-muted">₹</span>
                  <input
                    autoFocus
                    inputMode="numeric"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder={`Any amount from ${MIN}`}
                    aria-label="Your amount in rupees"
                    className="h-full min-w-0 flex-1 bg-transparent px-2 text-[17px] font-semibold text-fg outline-none placeholder:text-[14px] placeholder:font-normal placeholder:text-fg-subtle"
                  />
                </label>
              )}
              {preset === "custom" && custom && !amountOk && (
                <p className="mt-1.5 text-[12.5px] text-red-300">Enter between {rupees(MIN)} and {rupees(MAX)}.</p>
              )}
            </fieldset>

            <button type="submit" disabled={!amountOk} className="fo-press mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#ffdd6b] py-3.5 text-[16px] font-bold text-[#3b2400] shadow-[0_12px_28px_-12px_rgb(255_200_80/0.9)] transition-opacity disabled:opacity-50">
              <CoffeeIcon className="h-5 w-5" aria-hidden="true" />
              {amountOk ? `Pay ${rupees(amount)}` : "Choose an amount"}
            </button>
          </form>
        )}
      </div>
    </div>
    </>
  );
}

/** A coffee cup with rising steam; `full` fills it up (the thank-you moment). */
function Cup({ full = false }: { full?: boolean }) {
  return (
    <span aria-hidden="true" className={cn("relative flex shrink-0 items-end justify-center", full ? "h-28 w-28" : "h-14 w-14")}>
      <svg viewBox="0 0 64 64" className="h-full w-full overflow-visible">
        {[22, 30, 38].map((x, i) => (
          <path key={x} d={`M${x} 18c-3-4 3-6 0-11`} fill="none" stroke="#ffdd6b" strokeWidth="2.2" strokeLinecap="round" className="fo-steam" style={{ animationDelay: `${i * 0.4}s` }} />
        ))}
        <defs>
          <clipPath id={full ? "cup-full" : "cup"}>
            <path d="M12 24h38l-4 28a6 6 0 0 1-6 5H22a6 6 0 0 1-6-5z" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${full ? "cup-full" : "cup"})`}>
          <rect x="10" y="24" width="44" height="34" fill="#2a1a10" />
          <rect x="10" y="30" width="44" height="30" fill="#7a4a24" className={full ? "fo-fill" : ""} />
          <rect x="10" y="30" width="44" height="3" fill="#c98b4d" className={full ? "fo-fill" : ""} />
        </g>
        <path d="M12 24h38l-4 28a6 6 0 0 1-6 5H22a6 6 0 0 1-6-5z" fill="none" stroke="#ffdd6b" strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M49 30h4a6 6 0 0 1 0 12h-6" fill="none" stroke="#ffdd6b" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}
