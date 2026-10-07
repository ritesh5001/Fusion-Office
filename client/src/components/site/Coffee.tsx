"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Coffee as CoffeeIcon, Heart, ShieldCheck, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useCloudConfig } from "@/lib/cloudConfig";
import { useScrollLock } from "@/lib/motion";
import { cn } from "@/lib/cn";

/**
 * "Buy us a coffee": pick ₹49 (or any amount), pay with Razorpay's checkout,
 * and the server confirms the payment before we say thank you. Hidden until
 * the server has Razorpay keys.
 */

const PRESETS = [49, 99, 199];
const MIN = 10;
const MAX = 100_000;

/** Opens the coffee dialog from anywhere (links to #coffee work too). */
export const openCoffee = () => window.dispatchEvent(new Event("fo-open-coffee"));

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
interface RazorpayCheckout {
  open(): void;
  on(event: "payment.failed", fn: (e: { error?: { description?: string } }) => void): void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

let script: Promise<void> | null = null;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  script ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      script = null;
      s.remove();
      reject(new Error("Couldn't load Razorpay. Check your connection, or turn off blockers for this site."));
    };
    document.head.appendChild(s);
  });
  return script;
}

type Phase = { kind: "form" } | { kind: "starting" } | { kind: "paying" } | { kind: "confirming" } | { kind: "thanks"; rupees: number; name: string | null } | { kind: "error"; message: string };

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** A pill that opens the dialog. Renders nothing until payments are set up. */
export function CoffeeButton({ className, label = "Buy us a coffee" }: { className?: string; label?: string }) {
  const { razorpayKeyId } = useCloudConfig();
  if (!razorpayKeyId) return null;
  return (
    <button type="button" onClick={openCoffee} className={cn("fo-press group inline-flex items-center gap-2 rounded-full bg-[#ffdd6b] px-4 py-2.5 text-[14px] font-semibold text-[#3b2400] shadow-[0_8px_22px_-10px_rgb(255_200_80/0.8)] transition-shadow hover:shadow-[0_10px_26px_-8px_rgb(255_200_80/0.9)]", className)}>
      <CoffeeIcon className="h-4 w-4 transition-transform group-hover:-rotate-12" aria-hidden="true" /> {label}
    </button>
  );
}

export function Coffee() {
  const { razorpayKeyId } = useCloudConfig();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<number | "custom">(49);
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const opener = useRef<HTMLElement | null>(null);

  // Razorpay's checkout takes the screen while paying, so our dialog steps aside.
  const visible = open && phase.kind !== "paying";
  useScrollLock(visible);

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
    if (phase.kind === "starting" || phase.kind === "confirming") return;
    setOpen(false);
    if (phase.kind === "thanks" || phase.kind === "error") setPhase({ kind: "form" });
    opener.current?.focus?.();
  };

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!razorpayKeyId) return null;

  const amount = preset === "custom" ? Number(custom) : preset;
  const amountOk = Number.isInteger(amount) && amount >= MIN && amount <= MAX;
  const emailOk = !email.trim() || /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email.trim());

  const pay = async () => {
    setPhase({ kind: "starting" });
    try {
      const [res] = await Promise.all([
        apiFetch("/api/coffee/order", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount, name, email, message }) }),
        loadCheckout(),
      ]);
      const order = (await res.json().catch(() => ({}))) as { orderId?: string; amount?: number; currency?: string; keyId?: string; error?: string };
      if (!res.ok || !order.orderId) throw new Error(order.error ?? "Couldn't start the payment. Please try again.");

      setPhase({ kind: "paying" });
      const checkout = new window.Razorpay!({
        key: order.keyId ?? razorpayKeyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Fusion Office",
        description: "Buy us a coffee",
        image: `${window.location.origin}/icon.svg`,
        prefill: { name: name.trim() || undefined, email: email.trim() || undefined },
        notes: { purpose: "Buy us a coffee" },
        theme: { color: "#8b7cf6" },
        modal: { ondismiss: () => setPhase((p) => (p.kind === "paying" ? { kind: "form" } : p)) },
        handler: async (r: RazorpayResponse) => {
          setPhase({ kind: "confirming" });
          try {
            const v = await apiFetch("/api/coffee/verify", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
            });
            const body = (await v.json().catch(() => ({}))) as { amount?: number; name?: string | null; error?: string };
            if (!v.ok) throw new Error(body.error ?? "We couldn't confirm the payment.");
            setPhase({ kind: "thanks", rupees: (body.amount ?? amount * 100) / 100, name: body.name ?? null });
          } catch (e) {
            setPhase({ kind: "error", message: `${(e as Error).message} Your payment reference is ${r.razorpay_payment_id}.` });
          }
        },
      });
      checkout.on("payment.failed", (e) => setPhase({ kind: "error", message: e.error?.description ?? "The payment didn't go through. No money was taken." }));
      checkout.open();
    } catch (e) {
      setPhase({ kind: "error", message: (e as Error).message });
    }
  };

  // Floating button, bottom-left (Feedback sits bottom-right). site-chrome hides it inside the mobile app.
  const floating = (
    <button
      type="button"
      onClick={(e) => {
        opener.current = e.currentTarget;
        setOpen(true);
      }}
      aria-haspopup="dialog"
      className="site-chrome fo-press group fixed bottom-5 left-5 z-40 inline-flex h-12 items-center gap-2 rounded-full border border-[#ffdd6b]/40 bg-overlay/90 pl-3.5 pr-4 text-[14px] font-semibold text-fg shadow-pop backdrop-blur-xl transition-[border-color,box-shadow] hover:border-[#ffdd6b] hover:shadow-[0_12px_32px_-12px_rgb(255_200_80/0.6)] sm:bottom-6 sm:left-6 xl:left-[232px]"
    >
      <CoffeeIcon className="h-[18px] w-[18px] text-[#ffdd6b] transition-transform group-hover:-rotate-12 group-hover:scale-110" aria-hidden="true" />
      <span className="hidden min-[380px]:inline">Buy us a coffee</span>
      <span className="min-[380px]:hidden">Coffee</span>
    </button>
  );

  if (!visible) return floating;
  const busy = phase.kind === "starting" || phase.kind === "confirming";

  return (
    <>
    {floating}
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
      <div aria-hidden="true" onClick={close} className="fo-intro-fade absolute inset-0 bg-[#05060a]/65 backdrop-blur-sm [animation-duration:200ms]" />
      <div className="fo-palette-in relative w-full max-w-[440px] overflow-y-auto overscroll-contain rounded-t-[26px] border border-line-strong bg-overlay p-6 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] [max-height:calc(100dvh-24px)] sm:rounded-[26px] sm:p-7">
        <button type="button" onClick={close} disabled={busy} aria-label="Close" className="fo-press absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-raised hover:text-fg disabled:opacity-40">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {phase.kind === "thanks" ? (
          <div className="flex flex-col items-center py-4 text-center" role="status">
            <Cup full />
            <h2 id={`${id}-title`} className="fo-rise mt-4 font-display text-[24px] font-bold tracking-[-0.02em] text-fg [animation-delay:500ms]">
              Thank you{phase.name ? `, ${phase.name.split(" ")[0]}` : ""}!
            </h2>
            <p className="fo-rise mt-2 max-w-[34ch] text-[14.5px] leading-relaxed text-fg-muted [animation-delay:600ms]">
              Your {rupees(phase.rupees)} coffee keeps Fusion Office free and private for everyone. {email.trim() ? "We've emailed you a thank-you note." : ""}
            </p>
            <button type="button" onClick={close} className="btn btn-primary btn-lg fo-rise mt-6 [animation-delay:700ms]">
              <Heart className="h-4 w-4" aria-hidden="true" /> You're the best
            </button>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (amountOk && emailOk && !busy) void pay();
            }}
          >
            <div className="flex items-center gap-3">
              <Cup />
              <div>
                <h2 id={`${id}-title`} className="font-display text-[22px] font-bold tracking-[-0.02em] text-fg">
                  Buy us a coffee
                </h2>
                <p className="mt-0.5 text-[13.5px] leading-snug text-fg-muted">Fusion Office is free for everyone. A coffee helps keep it that way.</p>
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

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[13px] font-medium text-fg">
                  Name <span className="font-normal text-fg-subtle">(optional)</span>
                </span>
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" className="mt-1.5 h-11 w-full rounded-xl border border-line-strong bg-sunken px-3.5 text-[15px] text-fg outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/20" />
              </label>
              <label className="block">
                <span className="text-[13px] font-medium text-fg">
                  Email <span className="font-normal text-fg-subtle">(for a thank-you)</span>
                </span>
                <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" className="mt-1.5 h-11 w-full rounded-xl border border-line-strong bg-sunken px-3.5 text-[15px] text-fg outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/20" />
              </label>
            </div>
            <label className="mt-3 block">
              <span className="text-[13px] font-medium text-fg">
                Message <span className="font-normal text-fg-subtle">(optional)</span>
              </span>
              <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} placeholder="Say something nice" className="mt-1.5 h-11 w-full rounded-xl border border-line-strong bg-sunken px-3.5 text-[15px] text-fg outline-none placeholder:text-fg-subtle focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/20" />
            </label>

            {phase.kind === "error" && (
              <p role="alert" className="fo-shake mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-300 ring-1 ring-inset ring-red-500/25">
                {phase.message}
              </p>
            )}

            <button type="submit" disabled={!amountOk || !emailOk || busy} className="fo-press mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#ffdd6b] py-3.5 text-[16px] font-bold text-[#3b2400] shadow-[0_12px_28px_-12px_rgb(255_200_80/0.9)] transition-opacity disabled:opacity-50">
              <CoffeeIcon className="h-5 w-5" aria-hidden="true" />
              {phase.kind === "starting" ? "Opening Razorpay…" : phase.kind === "confirming" ? "Confirming payment…" : amountOk ? `Pay ${rupees(amount)}` : "Choose an amount"}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12px] text-fg-subtle">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> Secure payment by Razorpay · UPI, cards, netbanking, wallets
            </p>
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
