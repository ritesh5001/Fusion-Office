"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, Files, Image as ImageIcon, ShieldCheck, Shrink } from "lucide-react";
import { TOOLS, toolBySlug, type ToolDef } from "@/lib/tools/registry";
import { appPath, handFiles, kindOf, toolPath, type FileKind } from "@/lib/tools/handoff";
import { ToolTile } from "../tools/icons";
import { ToolsHub, fitsFiles } from "../tools/ToolsHub";
import { FlowIn, FlowOut } from "./FlowArt";
import { DropStage } from "./DropStage";
import { cn } from "../ui/primitives";

/** Best first choices for each kind of file; anything else that fits follows. */
const PREFERRED: Record<FileKind, string[]> = {
  pdf: ["edit-pdf", "merge-pdf", "compress-pdf", "pdf-to-word", "split-pdf", "sign-pdf", "organize-pdf", "ocr-pdf"],
  image: ["image-editor", "compress-image", "resize-image", "jpg-to-pdf", "convert-image", "crop-image"],
  document: ["word-editor", "word-to-pdf", "excel-editor", "excel-to-pdf", "powerpoint-editor", "powerpoint-to-pdf", "markdown-to-pdf", "csv-to-pdf", "ebook-to-pdf"],
};

const QUICK = ["merge-pdf", "compress-pdf", "pdf-to-word", "resize-image"];

/** The homepage: a drop area that sends files to the right tool, quick actions, and every tool. */
export function HomeWorkspace() {
  const [staged, setStaged] = useState<File[] | null>(null);
  const [activity, setActivity] = useState({ dragging: false, working: false, done: false });

  const stage = useCallback((files: File[]) => {
    if (files.length) setStaged(files);
  }, []);

  // A file pasted anywhere on the page is staged too.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA)$/.test(el.tagName))) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) {
        e.preventDefault();
        stage(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [stage]);

  const matches = useMemo(() => {
    if (!staged?.length) return [];
    const fit = TOOLS.filter((t) => fitsFiles(t, staged));
    const order = PREFERRED[kindOf(staged[0])];
    const at = (t: ToolDef) => (order.includes(t.slug) ? order.indexOf(t.slug) : order.length + TOOLS.indexOf(t));
    return fit.sort((a, b) => at(a) - at(b));
  }, [staged]);

  return (
    <>
      <section className="relative isolate overflow-hidden px-4 pb-12 pt-10 sm:px-6 md:pt-14 lg:px-8">
        {/* Circuit-board backdrop: a violet haze over a faint dot grid. */}
        <div
          aria-hidden="true"
          className="fo-intro-fade pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_45%_at_45%_62%,rgb(92_77_204/0.22),transparent_70%),radial-gradient(90%_80%_at_50%_30%,#111331,transparent_75%),radial-gradient(rgb(255_255_255/0.05)_1px,transparent_1px)] [background-size:auto,auto,24px_24px] [mask-image:linear-gradient(to_bottom,black_70%,transparent)]"
        />
        <Twinkles />
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center xl:gap-8">
          <div className="min-w-0">
            <header className="text-center">
              <h1 className="font-display text-[clamp(2.4rem,6vw,4.5rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-fg">
                <span className="mb-5 block font-sans text-[13px] font-semibold uppercase leading-none tracking-[0.12em] text-fg-subtle">Free online PDF, Office &amp; image tools</span>
                <span className="fo-intro-rise block [animation-delay:60ms]">All your files.</span>
                <span className="fo-intro-wipe inline-block [animation-delay:170ms]">
                  <span className="bg-[linear-gradient(90deg,#8b7cf6,#b6adff)] bg-clip-text text-transparent">One private</span>{" "}
                  <span className="text-accent">workspace.</span>
                </span>
              </h1>
            </header>

            <div className="mt-10 flex items-center justify-center lg:mt-12">
              <div className="hidden lg:block">
                <FlowIn active={activity.dragging} />
              </div>
              <DropStage staged={staged} onFiles={stage} onClear={() => setStaged(null)} matches={matches} onActivity={setActivity} />
              <div className="hidden self-stretch lg:flex">
                <FlowOut lit={activity.working} done={activity.done} />
              </div>
            </div>

            <p className="mx-auto mt-6 flex items-center justify-center gap-2 text-[14px] font-semibold text-accent lg:hidden">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Stays on this device
            </p>
            <p className="mx-auto mt-6 max-w-[62ch] text-pretty text-center text-[15px] leading-relaxed text-fg-muted lg:mt-16">
              Edit, compress, merge, split, convert and sign PDFs, work on Word, Excel and PowerPoint files, and resize or compress images, right in your browser. Free, with no sign-up.
            </p>
          </div>

          <div className="fo-intro-rise [animation-delay:600ms]">
            <QuickActions staged={staged} />
          </div>
        </div>
      </section>

      <div className="px-4 pb-20 sm:px-6 lg:px-8">
        <ToolsHub
          title="Choose your next move"
          subtitle={staged?.length ? undefined : `${TOOLS.length} tools for PDFs, Office files and images.`}
          staged={staged}
          onClearStaged={() => setStaged(null)}
        />
      </div>
    </>
  );
}

/** Each quick action's tile, as in the design: a solid colour square with a bold glyph. */
const QUICK_TILE: Record<string, { bg: string; fg: string; icon: ReactNode }> = {
  "merge-pdf": { bg: "bg-[#e5676a]", fg: "text-white", icon: <Files className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" /> },
  "compress-pdf": { bg: "bg-[#7a72f0]", fg: "text-white", icon: <Shrink className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" /> },
  "pdf-to-word": {
    bg: "bg-accent",
    fg: "text-[#14152b]",
    icon: <span className="flex h-8 w-8 items-center justify-center rounded-[7px] border-[2.5px] border-current font-display text-[17px] font-extrabold leading-none">W</span>,
  },
  "resize-image": { bg: "bg-[#b7a6f7]", fg: "text-[#14152b]", icon: <ImageIcon className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" /> },
};

function QuickActions({ staged }: { staged: File[] | null }) {
  const tools = QUICK.map((s) => toolBySlug(s)).filter((t): t is ToolDef => !!t);
  return (
    <aside aria-labelledby="quick-title" className="h-fit rounded-[24px] border border-line bg-surface/80 p-5 shadow-card backdrop-blur">
      <h2 id="quick-title" className="px-1 font-display text-[20px] font-bold tracking-[-0.015em] text-fg">
        Quick actions
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-1">
        {tools.map((t) => {
          const tile = QUICK_TILE[t.slug];
          return (
            <li key={t.slug}>
              <Link
                href={toolPath(t)}
                onClick={() => staged?.length && fitsFiles(t, staged) && handFiles(appPath(t), staged)}
                className="group relative flex h-full flex-col items-start gap-3 overflow-hidden rounded-[18px] border border-line bg-raised/50 p-3 transition-[translate,background-color,border-color,box-shadow] duration-200 sm:h-[72px] sm:flex-row sm:items-center sm:gap-0 sm:p-0 sm:pr-4 hover:-translate-y-1 hover:border-line-strong hover:bg-raised hover:shadow-[0_14px_30px_-16px_rgb(0_0_0/0.9)]"
              >
                {tile ? (
                  <span className={cn("fo-pulse-once flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] sm:h-full sm:w-[72px] sm:rounded-[18px]", tile.bg, tile.fg)}>{tile.icon}</span>
                ) : (
                  <ToolTile tool={t} size="lg" className="sm:ml-3" />
                )}
                <span className="min-w-0 flex-1 text-[14px] font-semibold leading-tight text-fg sm:truncate sm:pl-4 sm:text-[15px]">{t.name}</span>
                <ChevronRight className="absolute right-3 top-3 h-5 w-5 shrink-0 text-fg-muted transition-[translate,color] sm:static duration-200 group-hover:translate-x-1.5 group-hover:text-fg" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/** Grid dots that fade in and out at their own pace (fixed positions, so server and client agree). */
const TWINKLES = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 37 + 11) % 97}%`,
  top: `${(i * 53 + 7) % 89}%`,
  delay: `${((i * 7) % 11) * 0.45}s`,
  duration: `${4 + ((i * 3) % 5)}s`,
}));

function Twinkles() {
  return (
    <div aria-hidden="true" className="fo-intro-fade pointer-events-none absolute inset-0 -z-10">
      {TWINKLES.map((t, i) => (
        <span key={i} className="fo-twinkle absolute h-[3px] w-[3px] rounded-full bg-white" style={{ left: t.left, top: t.top, animationDelay: t.delay, animationDuration: t.duration }} />
      ))}
    </div>
  );
}
