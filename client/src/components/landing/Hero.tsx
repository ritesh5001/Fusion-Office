import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";
import { Highlight, PenCircle } from "./Marks";

/** Proof notes pinned to the editor screenshot (positions in % of the image). */
const NOTES = [
  { x: 63.8, y: 44.6, text: "Highlights snap to the real lines of text." },
  { x: 47.2, y: 54.5, text: "Redaction deletes the words from the file, not just the view." },
  { x: 45.6, y: 68.2, text: "Sign by drawing, typing or uploading." },
  { x: 95.2, y: 36.4, text: "Every change is in the history, ready to undo." },
];

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative">
      <div className="mx-auto max-w-[1280px] px-5 pt-14 md:px-8 md:pt-20">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-soft">
          <span className="text-ink">Fusion Office</span>
          <span aria-hidden="true">·</span>
          <span>Edition 01</span>
          <span aria-hidden="true">·</span>
          <span>The PDF editor</span>
        </p>

        <h1
          id="hero-title"
          className="mt-8 font-display text-[clamp(2.6rem,8.4vw,8rem)] font-semibold leading-[0.96] tracking-[-0.045em] text-ink"
        >
          <span className="block">
            Edit <PenCircle>any</PenCircle> PDF.
          </span>
          <span className="mt-[0.08em] block">
            <Highlight>Keep it private.</Highlight>
          </span>
        </h1>

        <div className="mt-10 grid gap-10 md:grid-cols-12 md:items-end">
          <p className="max-w-[46ch] text-[17px] leading-relaxed text-ink-soft md:col-span-6 md:text-[18px]">
            Fusion Office is a document workspace that starts with a full PDF editor. Add text, sign, redact for real and
            reorder pages, right in your browser. Your file never has to leave your computer.
          </p>
          <div className="flex flex-col gap-4 md:col-span-6 md:items-end">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/editor"
                className="btn group inline-flex h-12 items-center gap-2 rounded-full bg-brand-600 px-6 text-[15px] font-medium text-white shadow-[0_8px_24px_-8px_rgb(47_84_235/0.6)] transition-colors hover:bg-brand-700"
              >
                Open the PDF editor
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <a
                href="#editor"
                className="btn inline-flex h-12 items-center gap-2 rounded-full px-4 text-[15px] font-medium text-ink transition-colors hover:bg-ink/5"
              >
                See what it does
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
            <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-ink-soft">
              No sign-up <span aria-hidden="true">·</span> No upload <span aria-hidden="true">·</span> No watermark
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-[1360px] px-3 md:mt-20 md:px-8">
        <figure className="hero-shot relative">
          <div className="relative overflow-hidden rounded-[14px] bg-white shadow-[0_1px_0_rgb(16_19_26/0.06),0_40px_80px_-32px_rgb(16_19_26/0.35)] ring-1 ring-ink/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/home/editor.webp"
              width={2880}
              height={1800}
              alt="The Fusion Office PDF editor with a statement of work open. A payment clause is highlighted, the fee is circled in red pen, the bank number is redacted, a sticky note is attached and the client signature is on the line."
              className="block h-auto w-full"
              fetchPriority="high"
            />
            {NOTES.map((n, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="proof-pin absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-pen font-mono text-[11px] font-medium text-white shadow-[0_0_0_4px_rgb(217_45_32/0.18)] md:h-7 md:w-7 md:text-[12px]"
                style={{ left: `${n.x}%`, top: `${n.y}%`, ["--i" as string]: i }}
              >
                {i + 1}
              </span>
            ))}
          </div>
          <figcaption>
            <ol className="mt-6 grid gap-x-8 gap-y-3 px-2 sm:grid-cols-2 lg:grid-cols-4">
              {NOTES.map((n, i) => (
                <li key={i} className="flex gap-3 text-[14px] leading-snug text-ink-soft">
                  <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pen font-mono text-[11px] font-medium text-white">
                    {i + 1}
                  </span>
                  {n.text}
                </li>
              ))}
            </ol>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
