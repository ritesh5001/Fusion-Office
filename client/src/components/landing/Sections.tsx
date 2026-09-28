import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Cloud, HardDrive, Lock, Plus, ShieldCheck, History, ScanLine } from "lucide-react";
import { CropMarks, Kicker } from "./Marks";
import { Logo } from "../Logo";

const container = "mx-auto max-w-[1280px] px-5 md:px-8";
const reveal = (i = 0) => ({ "data-reveal": "", style: { "--i": i } as CSSProperties });

/* ── Facts: four true numbers ─────────────────────────────────────── */

const FACTS = [
  { n: "18", label: "editing tools on the page" },
  { n: "0", label: "bytes uploaded to edit a file" },
  { n: "150", label: "steps of undo" },
  { n: "3", label: "ways to sign: draw, type, upload" },
];

export function Facts() {
  return (
    <section aria-label="Fusion Office in numbers" className={`${container} mt-28 md:mt-36`}>
      <ul className="grid grid-cols-2 border-t border-ink md:grid-cols-4">
        {FACTS.map((f, i) => (
          <li key={f.n + f.label} {...reveal(i)} className="border-b border-rule py-6 pr-4 md:border-b-0 md:py-8">
            <span className="block text-balance font-display text-[clamp(2.75rem,5vw,4.25rem)] font-semibold leading-none tracking-[-0.04em] text-ink tabular-nums">
              {f.n}
            </span>
            <span className="mt-3 block max-w-[20ch] text-[14px] leading-snug text-ink-soft">{f.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── The editor: bento of real screens ────────────────────────────── */

function Shot({ src, alt, size, position, className = "" }: { src: string; alt: string; size: string; position: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={`bg-no-repeat ${className}`}
      style={{ backgroundImage: `url(${src})`, backgroundSize: size, backgroundPosition: position }}
    />
  );
}

function Card({ className = "", visual, title, children, i }: { className?: string; visual: ReactNode; title: string; children: ReactNode; i: number }) {
  return (
    <article {...reveal(i)} className={`flex flex-col overflow-hidden rounded-[14px] bg-white ring-1 ring-ink/10 ${className}`}>
      <div className="relative overflow-hidden border-b border-rule bg-paper-deep">{visual}</div>
      <div className="p-6 md:p-7">
        <h3 className="font-display text-[21px] font-semibold tracking-[-0.02em] text-ink">{title}</h3>
        <p className="mt-2 max-w-[44ch] text-[15px] leading-relaxed text-ink-soft">{children}</p>
      </div>
    </article>
  );
}

export function EditorFeatures() {
  return (
    <section id="editor" aria-labelledby="editor-title" className={`${container} scroll-mt-20 pt-28 md:pt-40`}>
      <div className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-4" {...reveal()}>
          <Kicker index="01">The editor</Kicker>
        </div>
        <h2
          id="editor-title"
          {...reveal(1)}
          className="max-w-[18ch] text-balance font-display text-[clamp(2.25rem,4.6vw,4rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink md:col-span-8"
        >
          The tools you reach for, without the clutter.
        </h2>
      </div>

      <div className="mt-14 grid gap-4 md:mt-20 md:grid-cols-12 md:gap-5">
        <Card
          i={0}
          className="md:col-span-7"
          title="Mark it up like paper"
          visual={<Shot src="/home/editor.webp" alt="Close-up of a highlighted payment clause and a fee circled in red pen" size="235%" position="54% 56%" className="aspect-[16/9]" />}
        >
          Highlight, underline and strike through the actual lines of text. Draw with a pen or a marker, add shapes and sticky notes.
        </Card>
        <Card
          i={1}
          className="md:col-span-5"
          title="Sign in seconds"
          visual={<Shot src="/home/signature.webp" alt="The signature dialog with a typed signature in two script styles" size="contain" position="50% 50%" className="aspect-[16/9] md:aspect-auto md:h-full md:min-h-[260px]" />}
        >
          Draw it, type it, or upload a photo of your signature. Fusion Office removes the paper background and remembers it for next time.
        </Card>
        <Card
          i={0}
          className="md:col-span-4"
          title="Pages in your order"
          visual={<Shot src="/home/pages.webp" alt="The page sidebar with three page thumbnails" size="92%" position="50% 0%" className="aspect-[4/3]" />}
        >
          Drag pages to reorder. Rotate, duplicate, delete, insert from another PDF, extract or split into parts.
        </Card>
        <Card
          i={1}
          className="md:col-span-4"
          title="Find anything"
          visual={<Shot src="/home/search.webp" alt="Search results for the word review, grouped by page" size="120%" position="100% 0%" className="aspect-[4/3]" />}
        >
          Search every page at once. Results are grouped by page and each match is highlighted where it sits.
        </Card>
        <Card i={2} className="md:col-span-4" title="Redact for real" visual={<RedactDemo />}>
          On export, redacted pages are rebuilt so the covered words are gone from the file. Not a black box on top of the text.
        </Card>
      </div>
    </section>
  );
}

function RedactDemo() {
  return (
    <div aria-hidden="true" className="flex aspect-[4/3] items-center justify-center bg-white px-8">
      <div className="w-full max-w-[280px] font-serif text-[14px] leading-7 text-ink/80">
        <p>Account name: Northwind Studio Ltd.</p>
        <p className="flex items-center gap-1.5">
          IBAN:
          <span className="relative inline-block">
            <span>GB29 NWBK 6016 1331 9268 19</span>
            <span className="redact-bar absolute -inset-x-1 -inset-y-0.5 rounded-[2px] bg-ink ring-1 ring-pen" />
          </span>
        </p>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">Exported text layer: none</p>
      </div>
    </div>
  );
}

/* ── Privacy: dark band with a where-does-my-file-go diagram ──────── */

export function Privacy() {
  const points = [
    { icon: HardDrive, title: "Processed on your device", text: "Opening, editing and exporting all run inside your browser tab." },
    { icon: ShieldCheck, title: "Redaction that holds up", text: "Covered text is removed on export, so it can't be copied back out." },
    { icon: History, title: "Autosaved locally", text: "Close the tab by accident and your edits are still here when you return." },
  ];
  return (
    <section id="privacy" aria-labelledby="privacy-title" className="relative mt-28 scroll-mt-16 bg-ink text-white md:mt-40">
      <div className={`${container} py-24 md:py-36`}>
        <div {...reveal()}>
          <Kicker index="02" invert>
            Privacy
          </Kicker>
        </div>
        <h2
          id="privacy-title"
          {...reveal(1)}
          className="mt-8 max-w-[16ch] text-balance font-display text-[clamp(2.5rem,6vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.04em]"
        >
          Your file stays on your computer.
        </h2>
        <p {...reveal(2)} className="mt-8 max-w-[58ch] text-[17px] leading-relaxed text-white/70">
          Most PDF sites ask you to upload a contract to a server you know nothing about. Fusion Office opens, edits and exports the file
          inside your browser tab. Cloud save is there when you want it, and off until you choose it.
        </p>

        {/* Diagram */}
        <div {...reveal(3)} className="mt-16 grid items-stretch gap-4 md:mt-20 md:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-[14px] bg-white/[0.04] p-6 ring-1 ring-white/15 md:p-8">
            <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-white/55">Your device</p>
            <ol className="mt-6 flex flex-wrap items-center gap-2 text-[15px]">
              {["Open", "Edit", "Export"].map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="rounded-full bg-white px-3.5 py-1.5 font-medium text-ink">{s}</span>
                  {i < 2 && <ArrowRight className="h-4 w-4 text-white/40" aria-hidden="true" />}
                </li>
              ))}
            </ol>
            <p className="mt-6 text-[14px] leading-relaxed text-white/60">Everything above happens here. No account needed.</p>
          </div>
          <div className="flex items-center justify-center py-2 md:px-2" aria-hidden="true">
            <div className="flex items-center gap-2 md:flex-col">
              <span className="h-px w-10 border-t border-dashed border-white/30 md:h-10 md:w-px md:border-l md:border-t-0" />
              <span className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-white/25">
                <Lock className="h-4 w-4 text-white/70" />
              </span>
              <span className="h-px w-10 border-t border-dashed border-white/30 md:h-10 md:w-px md:border-l md:border-t-0" />
            </div>
          </div>
          <div className="rounded-[14px] border border-dashed border-white/25 p-6 md:p-8">
            <p className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.14em] text-white/55">
              <Cloud className="h-4 w-4" aria-hidden="true" /> Cloud, optional
            </p>
            <p className="mt-6 text-[15px] leading-relaxed text-white/80">
              Only if you sign in and press <span className="font-medium text-white">Save to cloud</span>. Files go to encrypted storage and
              download links expire after 15 minutes.
            </p>
          </div>
        </div>

        <ul className="mt-16 grid gap-10 border-t border-white/15 pt-10 md:mt-20 md:grid-cols-3">
          {points.map((p, i) => (
            <li key={p.title} {...reveal(i)}>
              <p.icon className="h-5 w-5 text-brand-200" aria-hidden="true" />
              <h3 className="mt-4 text-[17px] font-semibold">{p.title}</h3>
              <p className="mt-2 max-w-[34ch] text-[15px] leading-relaxed text-white/65">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── How it works: three numbered steps, each with a real screen ──── */

const STEPS = [
  {
    title: "Drop a PDF",
    text: "Drag it in, paste it, or pick it from your files. Images work too and become pages.",
    visual: <Shot src="/home/upload.webp" alt="The upload screen with a drop zone" size="122%" position="50% 50%" className="aspect-[4/3] bg-paper-deep" />,
  },
  {
    title: "Edit on the page",
    text: "Click where you want text. Highlight, draw, sign, redact and rearrange pages.",
    visual: <Shot src="/home/editor.webp" alt="The editor toolbar and page sidebar" size="260%" position="0% 0%" className="aspect-[4/3] bg-white" />,
  },
  {
    title: "Download",
    text: "Get a real PDF back. Flatten it for final copies, or keep comments as sticky notes.",
    visual: <Shot src="/home/export.webp" alt="The export dialog with flatten and comment options" size="88%" position="50% 50%" className="aspect-[4/3] bg-paper-deep" />,
  },
];

export function Steps() {
  return (
    <section aria-labelledby="steps-title" className={`${container} pt-28 md:pt-40`}>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <h2
          id="steps-title"
          {...reveal()}
          className="max-w-[14ch] text-balance font-display text-[clamp(2.25rem,4.6vw,4rem)] font-semibold leading-[1.02] tracking-[-0.035em]"
        >
          Three steps. No account.
        </h2>
        <p {...reveal(1)} className="max-w-[36ch] text-[16px] leading-relaxed text-ink-soft">
          There is nothing to install and nothing to sign up for. Open the editor and start.
        </p>
      </div>
      <ol className="mt-14 grid gap-10 md:mt-20 md:grid-cols-3 md:gap-6">
        {STEPS.map((s, i) => (
          <li key={s.title} {...reveal(i)}>
            <div className="overflow-hidden rounded-[14px] ring-1 ring-ink/10">{s.visual}</div>
            <div className="mt-6 flex gap-5 border-t border-ink pt-5">
              <span className="font-mono text-[13px] text-ink-soft tabular-nums">0{i + 1}</span>
              <div>
                <h3 className="font-display text-[21px] font-semibold tracking-[-0.02em]">{s.title}</h3>
                <p className="mt-2 max-w-[34ch] text-[15px] leading-relaxed text-ink-soft">{s.text}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ── The suite: a table of contents ───────────────────────────────── */

type Status = "Available" | "Next" | "Planned";
const SUITE: { name: string; text: string; status: Status; href?: string }[] = [
  { name: "Fusion PDF", text: "Edit, annotate, sign, redact and organize PDFs.", status: "Available", href: "/editor" },
  { name: "PDF tools", text: "Merge, split, extract and rotate pages.", status: "Available", href: "/editor" },
  { name: "Compress and watermark", text: "Smaller files and branded pages.", status: "Next" },
  { name: "OCR", text: "Turn scanned pages into searchable text.", status: "Next" },
  { name: "Converter", text: "PDF to and from Word, Excel, PowerPoint and images.", status: "Planned" },
  { name: "Writer", text: "Documents with styles, tables and tracked changes.", status: "Planned" },
  { name: "Sheets", text: "Spreadsheets with formulas, filters and charts.", status: "Planned" },
  { name: "Slides", text: "Presentations with themes and presenter view.", status: "Planned" },
  { name: "Forms and Sign", text: "Build forms and send documents out for signature.", status: "Planned" },
  { name: "Drive", text: "Folders, sharing and version history for every file.", status: "Planned" },
  { name: "Fusion AI", text: "Ask a document a question and get answers with page references.", status: "Planned" },
];

function StatusChip({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    Available: "bg-brand-600 text-white",
    Next: "bg-transparent text-ink ring-1 ring-ink/40",
    Planned: "bg-transparent text-ink-soft ring-1 ring-rule-strong",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] ${styles[status]}`}>
      {status === "Available" && <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />}
      {status === "Available" ? "Available now" : status === "Next" ? "Up next" : "Planned"}
    </span>
  );
}

export function Suite() {
  return (
    <section id="suite" aria-labelledby="suite-title" className={`${container} scroll-mt-20 pt-28 md:pt-40`}>
      <div className="grid gap-8 md:grid-cols-12 md:gap-y-6">
        <div className="md:col-span-4 md:col-start-1 md:row-start-1" {...reveal()}>
          <Kicker index="03">The suite</Kicker>
        </div>
        <h2
          id="suite-title"
          {...reveal(1)}
          className="max-w-[16ch] text-balance font-display text-[clamp(2.25rem,4.6vw,4rem)] font-semibold leading-[1.02] tracking-[-0.035em] md:col-span-8 md:col-start-5 md:row-span-2 md:row-start-1"
        >
          One workspace. More editors on the way.
        </h2>
        <p {...reveal(2)} className="max-w-[30ch] text-[15px] leading-relaxed text-ink-soft md:col-span-4 md:col-start-1 md:row-start-2">
          One account and one place for every file. The PDF editor comes first. The rest shares the same foundation.
        </p>
      </div>

      <ol className="mt-14 border-t border-ink md:mt-20">
        {SUITE.map((s, i) => {
          const row = (
            <>
              <span className="w-8 shrink-0 font-mono text-[13px] text-ink-soft tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-baseline md:gap-8">
                <span className="font-display text-[20px] font-semibold tracking-[-0.02em] md:w-[300px] md:shrink-0 md:text-[24px]">{s.name}</span>
                <span className="text-[15px] leading-relaxed text-ink-soft">{s.text}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <StatusChip status={s.status} />
                <ArrowUpRight className={`suite-arrow hidden h-5 w-5 md:block ${s.href ? "" : "invisible"}`} aria-hidden="true" />
              </span>
            </>
          );
          const cls = "suite-row flex items-baseline gap-4 border-b border-rule py-5 transition-colors hover:border-ink md:items-center md:py-6";
          return (
            <li key={s.name} {...reveal(Math.min(i, 5))}>
              {s.href ? (
                <Link href={s.href} className={cls}>
                  {row}
                </Link>
              ) : (
                <div className={cls}>{row}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ── FAQ: the real objections, answered plainly ───────────────────── */

const FAQ = [
  {
    q: "Do my files get uploaded?",
    a: "No. Opening, editing and exporting all happen in your browser. A file only leaves your device if you sign in and choose Save to cloud.",
  },
  {
    q: "Can I change the text that is already in the PDF?",
    a: "Not yet. Today you can add new text anywhere and use Whiteout to cover old wording. Editing the original text in place is the next big piece we are building.",
  },
  {
    q: "Does redaction really remove the text?",
    a: "Yes. When a page has a redaction, Fusion Office rebuilds that page as an image on export, so the covered words are gone from the file instead of hidden under a box. Text on that page is no longer selectable afterwards.",
  },
  {
    q: "Will my edits show up in other PDF readers?",
    a: "Yes. Edits become part of a standard PDF. Comments are exported as sticky notes that open in Acrobat, Preview, Chrome and other readers.",
  },
  {
    q: "What about scanned documents?",
    a: "You can mark up, sign and redact scans today. Searching them needs OCR, which is next on the list.",
  },
  {
    q: "Which browsers does it work in?",
    a: "It is built for recent desktop versions of Chrome, Edge, Firefox and Safari. Phones can open and view files; a touch-first editing layout is on the roadmap.",
  },
];

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className={`${container} scroll-mt-20 pt-28 md:pt-40`}>
      <div className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="md:sticky md:top-28" {...reveal()}>
            <Kicker index="04">Questions</Kicker>
            <h2 id="faq-title" className="mt-6 max-w-[12ch] text-balance font-display text-[clamp(2.25rem,4vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
              Good to know before you open a file.
            </h2>
          </div>
        </div>
        <div className="border-t border-ink md:col-span-8">
          {FAQ.map((f, i) => (
            <details key={f.q} className="faq-item group border-b border-rule" {...reveal(Math.min(i, 4))}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left">
                <span className="text-[18px] font-medium tracking-[-0.01em] text-ink md:text-[20px]">{f.q}</span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ring-rule-strong transition-colors group-hover:bg-white">
                  <Plus className="faq-icon h-4 w-4 transition-transform duration-200" aria-hidden="true" />
                </span>
              </summary>
              <p className="max-w-[62ch] pb-7 pr-12 text-[16px] leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Final call to action: a sheet with crop marks ────────────────── */

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className={`${container} pb-24 pt-32 md:pb-32 md:pt-44`}>
      <div {...reveal()} className="relative mx-auto max-w-[980px] rounded-[4px] bg-white px-6 py-16 text-center shadow-[0_30px_80px_-40px_rgb(16_19_26/0.35)] ring-1 ring-ink/10 md:px-16 md:py-24">
        <CropMarks />
        <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-ink-soft">Page 1 of 1</p>
        <h2 id="cta-title" className="mx-auto mt-6 max-w-[14ch] text-balance font-display text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
          Open a PDF and try it.
        </h2>
        <p className="mx-auto mt-6 max-w-[40ch] text-[17px] leading-relaxed text-ink-soft">Nothing to install. Nothing to upload. Your first edit is a few seconds away.</p>
        <Link
          href="/editor"
          className="btn group mt-10 inline-flex h-12 items-center gap-2 rounded-full bg-brand-600 px-7 text-[15px] font-medium text-white shadow-[0_8px_24px_-8px_rgb(47_84_235/0.6)] transition-colors hover:bg-brand-700"
        >
          Open the PDF editor
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
        <p className="mt-6 flex items-center justify-center gap-2 text-[13px] text-ink-soft">
          <ScanLine className="h-4 w-4" aria-hidden="true" /> Works with PDFs, PNG, JPG and WEBP files
        </p>
      </div>
    </section>
  );
}

/* ── Footer ───────────────────────────────────────────────────────── */

export function Footer() {
  const cols = [
    { title: "Product", links: [{ href: "/editor", label: "PDF editor" }, { href: "#editor", label: "Features" }, { href: "#suite", label: "Roadmap" }] },
    { title: "Trust", links: [{ href: "#privacy", label: "Privacy" }, { href: "#faq", label: "FAQ" }] },
    { title: "Account", links: [{ href: "/dashboard", label: "My documents" }] },
  ];
  return (
    <footer className="relative border-t border-rule">
      <div className={`${container} grid gap-12 pb-10 pt-16 md:grid-cols-12`}>
        <div className="md:col-span-5">
          <Link href="/" className="flex items-center gap-2.5 font-display text-[17px] font-semibold tracking-tight">
            <Logo className="h-7 w-7" /> Fusion Office
          </Link>
          <p className="mt-4 max-w-[34ch] text-[14px] leading-relaxed text-ink-soft">A document workspace, built browser-first. Starting with the PDF editor.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-3 gap-6 md:col-span-7">
          {cols.map((c) => (
            <div key={c.title}>
              <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-ink-soft">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[14px] text-ink transition-colors hover:text-brand-700">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className={`${container} overflow-hidden`} aria-hidden="true">
        <p className="select-none whitespace-nowrap text-balance font-display text-[clamp(4rem,15.5vw,13.5rem)] font-semibold leading-[0.8] tracking-[-0.055em] text-ink/[0.07]">
          Fusion Office
        </p>
      </div>
      <div className={`${container} flex flex-col gap-2 border-t border-rule py-6 text-[13px] text-ink-soft md:flex-row md:justify-between`}>
        <p>© {new Date().getFullYear()} Fusion Office</p>
        <p>Your files, on your device.</p>
      </div>
    </footer>
  );
}
