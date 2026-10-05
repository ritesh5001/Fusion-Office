"use client";

import { useId, useState } from "react";
import { Heart, Send } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

/**
 * The contact form and the pay-it-forward story form. Both post to the API
 * (human check, rate limit), land in the admin inbox, and trigger a thank-you
 * email when an address is given.
 */

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; name: string } | { kind: "error"; message: string };

const input =
  "w-full rounded-xl border border-line-strong bg-sunken px-3.5 text-[15px] text-fg outline-none transition placeholder:text-fg-subtle focus:border-brand-500 focus:ring-[3px] focus:ring-brand-500/20";

function Field({ label, hint, htmlFor, delay, children }: { label: string; hint?: string; htmlFor: string; delay: number; children: React.ReactNode }) {
  return (
    <div className="fo-rise" style={{ animationDelay: `${delay}ms` }}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-fg">
        {label} {hint && <span className="font-normal text-fg-subtle">{hint}</span>}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

async function post(path: string, body: Record<string, unknown>) {
  const res = await apiFetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (res.ok) return;
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  throw new Error(res.status === 429 ? "You've sent several messages just now. Please try again in a little while." : data.error ?? "Couldn't send. Please try again.");
}

/** Success: a tick that pops in, with a ring and particles bursting out (hearts for stories). */
function Success({ title, text, hearts, onAgain, again }: { title: string; text: string; hearts?: boolean; onAgain: () => void; again: string }) {
  const bits = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return { dx: `${Math.cos(a) * 70}px`, dy: `${Math.sin(a) * 70}px`, delay: 120 + (i % 3) * 40 };
  });
  return (
    <div className="flex flex-col items-center py-8 text-center" role="status">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span aria-hidden="true" className="fo-burst absolute inset-0 rounded-full border-2 border-accent" />
        {bits.map((b, i) =>
          hearts ? (
            <Heart
              key={i}
              aria-hidden="true"
              className="fo-particle absolute h-3.5 w-3.5 fill-[#ff5a6e] text-[#ff5a6e]"
              style={{ "--dx": b.dx, "--dy": b.dy, animationDelay: `${b.delay}ms` } as React.CSSProperties}
            />
          ) : (
            <span
              key={i}
              aria-hidden="true"
              className={cn("fo-particle absolute h-2 w-2 rounded-full", i % 2 ? "bg-accent" : "bg-brand-400")}
              style={{ "--dx": b.dx, "--dy": b.dy, animationDelay: `${b.delay}ms` } as React.CSSProperties}
            />
          ),
        )}
        <span className="fo-pop relative flex h-16 w-16 items-center justify-center rounded-full bg-accent shadow-[0_0_30px_rgb(205_245_100/0.55)]">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden="true">
            <path d="m5.5 12.5 4 4 9-9" stroke="#14152b" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" pathLength="1" className="fo-draw [animation-delay:200ms]" />
          </svg>
        </span>
      </div>
      <h3 className="fo-rise mt-5 font-display text-[22px] font-bold tracking-[-0.02em] text-fg [animation-delay:250ms]">{title}</h3>
      <p className="fo-rise mt-2 max-w-[40ch] text-[15px] leading-relaxed text-fg-muted [animation-delay:320ms]">{text}</p>
      <button type="button" onClick={onAgain} className="fo-press fo-rise mt-6 rounded-lg px-3 py-2 text-[14px] font-semibold text-brand-300 hover:text-brand-200 [animation-delay:400ms]">
        {again}
      </button>
    </div>
  );
}

function ErrorNote({ status }: { status: Status }) {
  return status.kind === "error" ? (
    <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-300 ring-1 ring-inset ring-red-500/25">
      {status.message}
    </p>
  ) : null;
}

const Honeypot = () => <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />;

const TOPICS = ["General question", "Idea for a tool or feature", "Something isn't working", "Business or partnership", "Other"];

export function ContactForm() {
  const id = useId();
  const [f, setF] = useState({ name: "", email: "", subject: TOPICS[0], message: "" });
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  if (status.kind === "sent")
    return (
      <Success
        title={`Thanks, ${status.name.split(" ")[0]}!`}
        text={`Your message is with the NextGen Fusion team. We'll reply to ${f.email.trim()} as soon as we can, usually within one working day.`}
        again="Send another message"
        onAgain={() => {
          setF({ name: "", email: "", subject: TOPICS[0], message: "" });
          setStatus({ kind: "idle" });
        }}
      />
    );

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus({ kind: "sending" });
        try {
          await post("/api/contact", { ...f, website: new FormData(e.currentTarget).get("website") ?? "" });
          setStatus({ kind: "sent", name: f.name.trim() });
        } catch (err) {
          setStatus({ kind: "error", message: (err as Error).message });
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor={`${id}-name`} delay={0}>
          <input id={`${id}-name`} value={f.name} onChange={set("name")} maxLength={80} required autoComplete="name" className={cn(input, "h-11")} />
        </Field>
        <Field label="Email" htmlFor={`${id}-email`} delay={50}>
          <input id={`${id}-email`} type="email" value={f.email} onChange={set("email")} maxLength={254} required autoComplete="email" inputMode="email" className={cn(input, "h-11")} placeholder="you@example.com" />
        </Field>
      </div>
      <Field label="What's it about?" htmlFor={`${id}-subject`} delay={100}>
        <select id={`${id}-subject`} value={f.subject} onChange={set("subject")} className={cn(input, "h-11 appearance-none")}>
          {TOPICS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Field>
      <Field label="Message" htmlFor={`${id}-message`} delay={150}>
        <textarea id={`${id}-message`} value={f.message} onChange={set("message")} maxLength={4000} required rows={6} className={cn(input, "resize-y py-3 leading-relaxed")} placeholder="How can we help?" />
      </Field>
      <Honeypot />
      <ErrorNote status={status} />
      <div className="fo-rise flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between [animation-delay:200ms]">
        <p className="text-[12.5px] text-fg-subtle">We only use your email to reply to you.</p>
        <button type="submit" disabled={status.kind === "sending" || !f.name.trim() || !f.email.trim() || f.message.trim().length < 10} className="btn btn-primary btn-lg shrink-0 disabled:opacity-50">
          <Send className="h-4 w-4" aria-hidden="true" /> {status.kind === "sending" ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}

export function StoryForm() {
  const id = useId();
  const [f, setF] = useState({ name: "", email: "", title: "", story: "" });
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  if (status.kind === "sent")
    return (
      <Success
        hearts
        title={`Thank you, ${status.name.split(" ")[0]}`}
        text={f.email ? "Your story reached us, and it made our day. Keep an eye on your inbox for a little thank-you note." : "Your story reached us, and it made our day. Somebody out there is better off because of you."}
        again="Share another story"
        onAgain={() => {
          setF({ name: "", email: "", title: "", story: "" });
          setStatus({ kind: "idle" });
        }}
      />
    );

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus({ kind: "sending" });
        try {
          await post("/api/stories", { ...f, website: new FormData(e.currentTarget).get("website") ?? "" });
          setStatus({ kind: "sent", name: f.name.trim() });
        } catch (err) {
          setStatus({ kind: "error", message: (err as Error).message });
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor={`${id}-name`} delay={0}>
          <input id={`${id}-name`} value={f.name} onChange={set("name")} maxLength={80} required autoComplete="name" className={cn(input, "h-11")} />
        </Field>
        <Field label="Email" hint="(optional, for a thank-you note)" htmlFor={`${id}-email`} delay={50}>
          <input id={`${id}-email`} type="email" value={f.email} onChange={set("email")} maxLength={254} autoComplete="email" inputMode="email" className={cn(input, "h-11")} placeholder="you@example.com" />
        </Field>
      </div>
      <Field label="Who did you help?" hint="(optional)" htmlFor={`${id}-title`} delay={100}>
        <input id={`${id}-title`} value={f.title} onChange={set("title")} maxLength={120} className={cn(input, "h-11")} placeholder="e.g. A stranger at the bus stop" />
      </Field>
      <Field label="Your story" htmlFor={`${id}-story`} delay={150}>
        <textarea
          id={`${id}-story`}
          value={f.story}
          onChange={set("story")}
          maxLength={4000}
          required
          rows={6}
          className={cn(input, "resize-y py-3 leading-relaxed")}
          placeholder="What happened? How did it feel? Big or small, every act of kindness counts."
        />
      </Field>
      <Honeypot />
      <ErrorNote status={status} />
      <div className="fo-rise flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between [animation-delay:200ms]">
        <p className="text-[12.5px] text-fg-subtle">We'll never share your story or email without asking you first.</p>
        <button type="submit" disabled={status.kind === "sending" || !f.name.trim() || f.story.trim().length < 20} className="btn btn-primary btn-lg shrink-0 disabled:opacity-50">
          <Heart className="h-4 w-4" aria-hidden="true" /> {status.kind === "sending" ? "Sending…" : "Share my story"}
        </button>
      </div>
    </form>
  );
}
