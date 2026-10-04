"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronRight, FilePlus2, Files, FileText, Image as ImageIcon, ShieldCheck, Shrink, X } from "lucide-react";
import { TOOLS, toolBySlug, type ToolDef } from "@/lib/tools/registry";
import { appPath, handFiles, KIND_ACCEPT, kindOf, toolPath, type FileKind } from "@/lib/tools/handoff";
import { formatBytes } from "@/lib/tools/files";
import { ToolTile } from "../tools/icons";
import { ToolsHub, fitsFiles } from "../tools/ToolsHub";
import { FlowIn, FlowOut } from "./FlowArt";
import { cn } from "../ui/primitives";

/** Best first choices for each kind of file; anything else that fits follows. */
const PREFERRED: Record<FileKind, string[]> = {
  pdf: ["edit-pdf", "merge-pdf", "compress-pdf", "pdf-to-word", "split-pdf", "sign-pdf", "organize-pdf", "ocr-pdf"],
  image: ["image-editor", "compress-image", "resize-image", "jpg-to-pdf", "convert-image", "crop-image"],
  document: ["word-editor", "word-to-pdf", "excel-editor", "excel-to-pdf", "powerpoint-editor", "powerpoint-to-pdf", "markdown-to-pdf", "csv-to-pdf", "ebook-to-pdf"],
};

const QUICK = ["merge-pdf", "compress-pdf", "pdf-to-word", "resize-image"];

const KINDS: { id: FileKind; label: string }[] = [
  { id: "pdf", label: "PDF" },
  { id: "document", label: "Document" },
  { id: "image", label: "Image" },
];

/** The homepage: a drop area that sends files to the right tool, quick actions, and every tool. */
export function HomeWorkspace() {
  const [staged, setStaged] = useState<File[] | null>(null);

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
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_45%_at_45%_62%,rgb(92_77_204/0.22),transparent_70%),radial-gradient(90%_80%_at_50%_30%,#111331,transparent_75%),radial-gradient(rgb(255_255_255/0.05)_1px,transparent_1px)] [background-size:auto,auto,24px_24px] [mask-image:linear-gradient(to_bottom,black_70%,transparent)]"
        />
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center xl:gap-8">
          <div className="min-w-0">
            <header className="text-center">
              <h1 className="font-display text-[clamp(2.4rem,6vw,4.5rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-fg">
                <span className="mb-5 block font-sans text-[13px] font-semibold uppercase leading-none tracking-[0.12em] text-fg-subtle">Free online PDF, Office &amp; image tools</span>
                All your files.
                <br />
                <span className="bg-[linear-gradient(90deg,#8b7cf6,#b6adff)] bg-clip-text text-transparent">One private</span>{" "}
                <span className="text-accent">workspace.</span>
              </h1>
            </header>

            <div className="mt-10 flex items-center justify-center lg:mt-12">
              <div className="hidden lg:block">
                <FlowIn />
              </div>
              <DropHub staged={staged} onFiles={stage} onClear={() => setStaged(null)} matches={matches} />
              <div className="hidden self-stretch lg:flex">
                <FlowOut />
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

          <QuickActions staged={staged} />
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

function DropHub({ staged, onFiles, onClear, matches }: { staged: File[] | null; onFiles: (f: File[]) => void; onClear: () => void; matches: ToolDef[] }) {
  const [over, setOver] = useState(false);
  const [kind, setKind] = useState<FileKind>("pdf");

  const browse = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = KIND_ACCEPT[kind];
    input.multiple = true;
    input.onchange = () => onFiles(Array.from(input.files ?? []));
    input.click();
  };

  const total = staged?.reduce((n, f) => n + f.size, 0) ?? 0;
  const top = matches.slice(0, 6);

  return (
    <div
      className="relative w-full min-w-0 max-w-[560px] flex-1"
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
    >
      {/* The neon glow: the border gradient, blurred behind the card. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -inset-4 rounded-[44px] bg-[linear-gradient(100deg,#8b7cf6,#a99cff_45%,#cdf564)] blur-3xl transition-opacity duration-300",
          over ? "opacity-90" : "opacity-60",
        )}
      />
      <div className="relative rounded-[30px] bg-[linear-gradient(100deg,#9d91fb,#cfc8ff_48%,#cdf564)] p-[3px] shadow-[-10px_0_30px_rgb(139_124_246/0.6),10px_0_30px_rgb(205_245_100/0.45),0_0_60px_rgb(139_124_246/0.25)]">
        <div className="rounded-[28px] bg-[#f5f4f0] p-3 text-[#14152b]">
          <div
            onClick={staged ? undefined : browse}
            className={cn(
              "flex flex-col items-center rounded-[20px] border-[1.5px] border-dashed px-5 text-center transition-colors",
              staged ? "border-transparent py-3" : "cursor-pointer py-10 sm:py-12",
              !staged && (over ? "border-brand-500 bg-brand-500/[0.06]" : "border-[#c4c2d4] hover:border-[#9d97c9]"),
            )}
          >
            {!staged ? (
              <>
                <button type="button" onClick={(e) => (e.stopPropagation(), browse())} className="group flex flex-col items-center rounded-2xl px-4 py-1" aria-label="Choose files">
                  <FilePlus2 className={cn("h-16 w-16 transition-transform duration-200 group-hover:-translate-y-0.5", over && "-translate-y-1 text-brand-600")} strokeWidth={1.6} aria-hidden="true" />
                  <span className="mt-5 font-display text-[clamp(1.5rem,2.6vw,2rem)] font-bold tracking-[-0.025em]">{over ? "Release to add" : "Drop anything here"}</span>
                  <span className="mt-1 text-[14px] text-[#5d5f78]">or click to choose a file</span>
                </button>
                <div role="radiogroup" aria-label="File type to browse" onClick={(e) => e.stopPropagation()} className="mt-7 inline-flex rounded-full bg-white/70 p-1 ring-1 ring-[#d9d7e4]">
                  {KINDS.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      role="radio"
                      aria-checked={kind === k.id}
                      onClick={() => setKind(k.id)}
                      className={cn(
                        "h-10 rounded-full px-5 text-[15px] font-medium transition-colors sm:px-7",
                        kind === k.id ? "bg-[#151738] text-white shadow-[0_4px_12px_-4px_rgb(21_23_56/0.6)]" : "text-[#2b2d48] hover:text-[#14152b]",
                      )}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="w-full text-left">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#14152b] ring-1 ring-[#e0dee9]">
                    {kindOf(staged[0]) === "image" ? <ImageIcon className="h-5 w-5" aria-hidden="true" /> : <FileText className="h-5 w-5" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold" title={staged.map((f) => f.name).join(", ")}>
                      {staged.length === 1 ? staged[0].name : `${staged.length} files`}
                    </p>
                    <p className="text-[13px] text-[#5d5f78]">
                      {formatBytes(total)}
                      {staged.length > 1 && ` · ${staged[0].name} and ${staged.length - 1} more`}
                    </p>
                  </div>
                  <button type="button" onClick={onClear} aria-label="Clear files" className="flex h-9 w-9 items-center justify-center rounded-lg text-[#5d5f78] hover:bg-black/5 hover:text-[#14152b]">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                {top.length ? (
                  <>
                    <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#6b6d86]">Open it in</p>
                    <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {top.map((t) => (
                        <li key={t.slug}>
                          <Link
                            href={appPath(t)}
                            onClick={() => handFiles(appPath(t), staged)}
                            className="group flex items-center gap-3 rounded-xl bg-white p-2 pr-3 ring-1 ring-[#e3e1ec] transition-shadow hover:ring-brand-400 hover:shadow-[0_6px_16px_-8px_rgb(92_77_204/0.45)]"
                          >
                            <ToolTile tool={t} size="sm" />
                            <span className="min-w-0 flex-1 text-[14px] font-medium leading-tight">{t.name}</span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-[#8a8ca3] group-hover:text-[#14152b]" aria-hidden="true" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {matches.length > top.length && (
                      <a href="#all-tools" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-700 hover:text-brand-800">
                        See all {matches.length} tools for this file <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </>
                ) : (
                  <p className="mt-4 rounded-xl bg-[#ebe9f2] px-3.5 py-3 text-[13.5px] text-[#4a4c66]">
                    No tool opens this kind of file yet. PDFs, Word, Excel, PowerPoint, Markdown, CSV, eBooks and images are supported.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {tools.map((t) => {
          const tile = QUICK_TILE[t.slug];
          return (
            <li key={t.slug}>
              <Link
                href={toolPath(t)}
                onClick={() => staged?.length && fitsFiles(t, staged) && handFiles(appPath(t), staged)}
                className="group flex h-[72px] items-center overflow-hidden rounded-[18px] border border-line bg-raised/50 pr-4 transition-colors hover:border-line-strong hover:bg-raised"
              >
                {tile ? (
                  <span className={cn("flex h-full w-[72px] shrink-0 items-center justify-center rounded-[18px] transition-transform duration-200 group-hover:scale-[1.04]", tile.bg, tile.fg)}>{tile.icon}</span>
                ) : (
                  <ToolTile tool={t} size="lg" className="ml-3" />
                )}
                <span className="min-w-0 flex-1 truncate pl-4 text-[15px] font-semibold text-fg">{t.name}</span>
                <ChevronRight className="h-5 w-5 shrink-0 text-fg-muted transition-transform group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
