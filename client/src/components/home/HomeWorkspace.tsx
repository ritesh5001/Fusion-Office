"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronRight, FileText, Image as ImageIcon, PenLine, Plus, ShieldCheck, X } from "lucide-react";
import { TOOLS, toolBySlug, type ToolDef } from "@/lib/tools/registry";
import { handFiles, KIND_ACCEPT, kindOf, toolPath, type FileKind } from "@/lib/tools/handoff";
import { formatBytes } from "@/lib/tools/files";
import { ToolTile } from "../tools/icons";
import { ToolsHub, fitsFiles } from "../tools/ToolsHub";
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
      <section className="px-4 pb-10 pt-10 sm:px-6 md:pt-14 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_288px] xl:gap-10">
          <div className="min-w-0">
            <header className="text-center">
              <h1 className="font-display text-[clamp(2.25rem,5.2vw,3.75rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-fg">
                All your files.
                <br />
                <span className="text-brand-400">One private</span> <span className="text-accent">workspace.</span>
              </h1>
              <p className="mx-auto mt-4 max-w-[52ch] text-pretty text-[16px] leading-relaxed text-fg-muted">
                Edit, convert, sign and organize PDFs, Office documents and images, right in your browser. Free, with no sign-up.
              </p>
            </header>

            <DropHub staged={staged} onFiles={stage} onClear={() => setStaged(null)} matches={matches} />
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
    <div className="mx-auto mt-8 max-w-[560px]">
      <div
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
        className={cn(
          "relative rounded-[22px] border bg-surface p-2 shadow-card transition-colors",
          over ? "border-accent/70" : "border-line-strong",
        )}
      >
        <div
          className={cn(
            "flex flex-col items-center rounded-[16px] border border-dashed px-5 text-center transition-colors",
            staged ? "border-transparent py-5" : "py-10 sm:py-12",
            !staged && (over ? "border-accent/60 bg-accent/[0.05]" : "border-line-strong bg-[radial-gradient(70%_90%_at_50%_0%,rgb(139_124_246/0.09),transparent)]"),
          )}
        >
          {!staged ? (
            <>
              <span className={cn("flex h-14 w-14 items-center justify-center rounded-2xl ring-1 transition-colors", over ? "bg-accent text-on-accent ring-accent" : "bg-raised text-fg ring-line-strong")}>
                <Plus className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-5 font-display text-[22px] font-bold tracking-[-0.02em] text-fg">{over ? "Release to add" : "Drop anything here"}</p>
              <p className="mt-1.5 text-[14px] text-fg-muted">
                or{" "}
                <button type="button" onClick={browse} className="font-semibold text-fg underline decoration-line-strong underline-offset-4 hover:decoration-fg">
                  browse your files
                </button>
              </p>
              <div role="radiogroup" aria-label="File type to browse" className="mt-6 inline-flex rounded-full bg-sunken p-1 ring-1 ring-line">
                {KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    role="radio"
                    aria-checked={kind === k.id}
                    onClick={() => setKind(k.id)}
                    className={cn(
                      "h-8 rounded-full px-4 text-[13px] font-medium transition-colors sm:px-5",
                      kind === k.id ? "bg-fg text-app" : "text-fg-muted hover:text-fg",
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
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-raised text-fg ring-1 ring-line-strong">
                  {kindOf(staged[0]) === "image" ? <ImageIcon className="h-5 w-5" aria-hidden="true" /> : <FileText className="h-5 w-5" aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-fg" title={staged.map((f) => f.name).join(", ")}>
                    {staged.length === 1 ? staged[0].name : `${staged.length} files`}
                  </p>
                  <p className="text-[13px] text-fg-muted">
                    {formatBytes(total)}
                    {staged.length > 1 && ` · ${staged[0].name} and ${staged.length - 1} more`}
                  </p>
                </div>
                <button type="button" onClick={onClear} aria-label="Clear files" className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-raised hover:text-fg">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {top.length ? (
                <>
                  <p className="eyebrow mt-5">Open it in</p>
                  <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {top.map((t) => (
                      <li key={t.slug}>
                        <Link
                          href={toolPath(t)}
                          onClick={() => handFiles(toolPath(t), staged)}
                          className="group flex items-center gap-3 rounded-xl bg-raised/60 p-2 pr-3 ring-1 ring-line transition-colors hover:bg-raised hover:ring-line-strong"
                        >
                          <ToolTile tool={t} size="sm" />
                          <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-fg">{t.name}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle group-hover:text-fg" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {matches.length > top.length && (
                    <a href="#all-tools" className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-brand-300 hover:text-brand-200">
                      See all {matches.length} tools for this file <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  )}
                </>
              ) : (
                <p className="mt-4 rounded-xl bg-raised px-3.5 py-3 text-[13.5px] text-fg-muted">
                  No tool opens this kind of file yet. PDFs, Word, Excel, PowerPoint, Markdown, CSV, eBooks and images are supported.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-[13px] text-fg-muted">
        <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
        Files stay on this device for in-browser tools.
      </p>
    </div>
  );
}

function QuickActions({ staged }: { staged: File[] | null }) {
  const tools = QUICK.map((s) => toolBySlug(s)).filter((t): t is ToolDef => !!t);
  return (
    <aside aria-labelledby="quick-title" className="card h-fit p-4 xl:mt-2">
      <h2 id="quick-title" className="px-1 font-display text-[16px] font-bold tracking-[-0.01em] text-fg">
        Quick actions
      </h2>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {tools.map((t) => (
          <li key={t.slug}>
            <Link
              href={toolPath(t)}
              onClick={() => staged?.length && fitsFiles(t, staged) && handFiles(toolPath(t), staged)}
              className="group flex items-center gap-3 rounded-xl border border-line bg-sunken/60 p-2 pr-3 transition-colors hover:border-line-strong hover:bg-raised"
            >
              <ToolTile tool={t} size="md" />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-fg">{t.name}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/editor" className="mt-3 flex items-center gap-3 rounded-xl p-2 pr-3 text-fg-muted transition-colors hover:bg-raised hover:text-fg">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-raised text-fg ring-1 ring-inset ring-line-strong">
          <PenLine className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-fg">Open the PDF editor</span>
          <span className="block text-[12px]">Recent files and blank documents</span>
        </span>
      </Link>
    </aside>
  );
}
