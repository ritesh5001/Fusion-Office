"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Cpu, FileText, Server, Sparkles } from "lucide-react";
import type { ToolDef } from "@/lib/tools/registry";
import { formatBytes } from "@/lib/tools/files";
import { cn } from "@/lib/cn";
import { ToolTile } from "./icons";

/**
 * The processing stage shown on every tool page while a tool runs, in the
 * same style as the homepage drop card: the real input on the left, what it
 * becomes on the right, light travelling between them, then the privacy
 * strip and live progress underneath.
 */

type Runs = ToolDef["runs"];
type Phase = "ready" | "running" | "done";

export interface StageFile {
  name: string;
  bytes: { length: number };
  pages?: number;
  width?: number;
  height?: number;
  thumb?: string;
}

const STEPS: Record<Runs, string[]> = {
  browser: ["Reading file", "Working on this device", "Preparing result"],
  server: ["Uploading securely", "Converting on our server", "Preparing result"],
  ai: ["Reading the text", "Asking the AI", "Preparing result"],
};

/** "report.final.PDF" → "PDF". */
export const formatOf = (name: string) => (name.includes(".") ? name.split(".").pop()!.toUpperCase().slice(0, 5) : "FILE");

const FORMATS: Record<string, [string, string]> = {
  pdf: ["PDF", "PDF document"],
  word: ["DOCX", "Word document"],
  excel: ["XLSX", "Excel workbook"],
  powerpoint: ["PPTX", "PowerPoint deck"],
  jpg: ["JPG", "Images, one per page"],
  markdown: ["MD", "Markdown text"],
  html: ["HTML", "Web page"],
  epub: ["EPUB", "eBook"],
  csv: ["CSV", "Table data"],
  zip: ["ZIP", "Pages in a ZIP"],
  handwriting: ["PDF", "Handwritten-style PDF"],
  audio: ["MP3", "Spoken audio"],
};

/** What a tool turns its input into: a format badge and a short description. */
export function outputOf(tool: ToolDef): { format: string; label: string } {
  const to = /-to-([a-z]+)$/.exec(tool.slug)?.[1];
  if (to && FORMATS[to]) return { format: FORMATS[to][0], label: FORMATS[to][1] };
  if (tool.runs === "ai") return { format: "MD", label: tool.slug.startsWith("translate") ? "Translated text" : tool.slug.startsWith("chat") ? "Answers from your PDF" : "Summary" };
  if (tool.slug.startsWith("split") || tool.slug === "extract-images") return { format: "ZIP", label: tool.slug === "extract-images" ? "Extracted images" : "Separate PDF files" };
  if (tool.slug === "extract-text") return { format: "TXT", label: "Plain text" };
  if (tool.slug === "jpg-to-svg") return { format: "SVG", label: "Editable vector" };
  if (LABELS[tool.slug]) return { format: tool.category === "image" ? "IMG" : "PDF", label: LABELS[tool.slug] };
  return tool.category === "image" ? { format: "IMG", label: "Edited image" } : { format: "PDF", label: "Updated PDF" };
}

const LABELS: Record<string, string> = {
  "merge-pdf": "One merged PDF",
  "cdr-converter": "Converted drawing",
  "compress-pdf": "Smaller PDF",
  "rotate-pdf": "Rotated PDF",
  "organize-pdf": "Reordered PDF",
  "repair-pdf": "Repaired PDF",
  "ocr-pdf": "Searchable PDF",
  "watermark-pdf": "Watermarked PDF",
  "page-numbers": "Numbered PDF",
  "protect-pdf": "Password-protected PDF",
  "unlock-pdf": "Unlocked PDF",
  "redact-pdf": "Redacted PDF",
  "sign-pdf": "Signed PDF",
  "crop-pdf": "Cropped PDF",
  "flatten-pdf": "Flattened PDF",
  "compress-image": "Smaller image",
  "resize-image": "Resized image",
  "crop-image": "Cropped image",
  "convert-image": "Converted image",
  "rotate-image": "Rotated image",
  "remove-watermark-image": "Cleaned image",
};

/** Drives the step and percentage: the tool's own fraction when it reports one, otherwise an eased estimate that never claims to be done. */
function useProgress(phase: Phase, fraction?: number) {
  const started = useRef(performance.now());
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (phase !== "running") return;
    started.current = performance.now();
    let id = 0;
    const tick = () => {
      setNow(performance.now());
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [phase]);
  if (phase === "done") return { step: 2, pct: 100 };
  if (phase === "ready") return { step: 0, pct: 0 };
  const elapsed = now - started.current;
  const step = elapsed < 350 ? 0 : (fraction ?? 0) >= 0.97 ? 2 : 1;
  const pct = step === 0 ? Math.min(14, elapsed / 30) : 15 + 80 * Math.max(fraction ?? 0, 1 - Math.exp(-Math.max(0, elapsed - 350) / 2200));
  return { step, pct: Math.max(1, Math.min(97, Math.round(pct))) };
}

export function ProcessStage({ tool, files, message, fraction, phase = "running" }: { tool: ToolDef; files: StageFile[]; message: string; fraction?: number; phase?: Phase }) {
  const { step, pct } = useProgress(phase, fraction);
  const out = outputOf(tool);
  const first = files[0];
  const total = files.reduce((n, f) => n + f.bytes.length, 0);
  const detail = [
    formatBytes(total),
    files.length === 1 && first?.pages ? `${first.pages} page${first.pages === 1 ? "" : "s"}` : null,
    files.length === 1 && first?.width ? `${first.width} × ${first.height}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="relative">
      {/* Neon glow behind the card, as on the homepage. */}
      <div aria-hidden="true" className="pointer-events-none absolute -inset-4 rounded-[44px] bg-[linear-gradient(100deg,#8b7cf6,#a99cff_45%,#cdf564)] opacity-60 blur-3xl" />
      <div className="relative rounded-[30px] bg-[linear-gradient(100deg,#9d91fb,#cfc8ff_48%,#cdf564)] p-[3px] shadow-[-10px_0_30px_rgb(139_124_246/0.6),10px_0_30px_rgb(205_245_100/0.45)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[30px]">
          <div className="fo-sweep absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0_68%,rgb(255_255_255/0.95)_80%,transparent_90%)]" />
        </div>

        <div className="relative rounded-[28px] bg-[#f5f4f0] p-4 text-[#14152b] sm:p-6" role="status" aria-live="polite">
          <p className="sr-only">{message}</p>

          {/* Before → after */}
          <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-4">
            <Pane label="Your file" badge={files.length > 1 ? `${files.length}×` : formatOf(first?.name ?? "")} title={files.length === 1 ? first.name : `${files.length} files`} detail={detail}>
              {first?.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={first.thumb} alt="" className="max-h-full max-w-full rounded-[3px] object-contain shadow-[0_8px_20px_-8px_rgb(21_23_56/0.5)]" />
              ) : (
                <FileText className="h-10 w-10 text-[#8a8ca3]" aria-hidden="true" />
              )}
              {files.length > 1 && <span className="absolute -right-1 -top-1 rounded-full bg-[#14152b] px-2 py-0.5 font-mono text-[11px] font-bold text-accent">{files.length}</span>}
              {phase === "running" && <span aria-hidden="true" className="fo-scan absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(90deg,transparent,rgb(205_245_100/0.55),transparent)]" />}
            </Pane>

            {/* The tool in the middle, with light travelling through it. */}
            <div className="relative flex items-center justify-center py-1 sm:w-[120px]">
              <span aria-hidden="true" className={cn("absolute left-0 right-0 top-1/2 hidden h-[2px] -translate-y-1/2 rounded-full sm:block", phase === "ready" ? "bg-[#d9d7e4]" : "bg-[linear-gradient(90deg,#8b7cf6,#cdf564)] shadow-[0_0_8px_#cdf564]")} />
              {phase === "running" && <span aria-hidden="true" className="fo-packet absolute left-0 top-1/2 -mt-[5px] hidden h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_12px_#cdf564] sm:block" />}
              <span className={cn("relative rounded-2xl bg-white p-1.5 ring-1 ring-[#e0dee9]", phase === "running" && "fo-chip-pulse")}>
                <ToolTile tool={tool} size="md" />
              </span>
            </div>

            <Pane
              label="Result"
              badge={out.format}
              accent
              title={out.label}
              detail={phase === "done" ? "Ready to download" : phase === "running" ? `${message.replace(/…$/, "")}…` : "After you run the tool"}
            >
              {phase === "done" ? (
                <span className="fo-pop flex h-12 w-12 items-center justify-center rounded-full bg-accent shadow-[0_0_20px_rgb(205_245_100/0.6)]">
                  <Check className="h-6 w-6 text-[#14152b]" strokeWidth={2.8} aria-hidden="true" />
                </span>
              ) : (
                <div className="relative flex h-[92px] w-[72px] flex-col gap-1.5 overflow-hidden rounded-md bg-white p-2.5 shadow-[0_8px_20px_-10px_rgb(21_23_56/0.45)] ring-1 ring-[#e0dee9]">
                  {[90, 70, 82, 55, 75].map((w, i) => (
                    <span key={i} className="h-1.5 rounded-full bg-[#ebe9f2]" style={{ width: `${phase === "running" ? Math.min(w, (pct / 100) * w * 1.6) : 0}%`, transition: "width 400ms ease-out" }} />
                  ))}
                  {phase === "running" && <span aria-hidden="true" className="fo-streak absolute inset-y-0 w-10 bg-[linear-gradient(90deg,transparent,rgb(205_245_100/0.5),transparent)]" />}
                </div>
              )}
            </Pane>
          </div>

          <Flow runs={tool.runs} state={phase} step={step} />

          {/* Live progress */}
          <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-[#e3e1ec]">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-[15px] font-semibold">{phase === "done" ? "Done" : message.replace(/…$/, "")}</p>
              <p className="font-mono text-[15px] font-semibold tabular-nums">{pct}%</p>
            </div>
            <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-[#ebe9f2]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={message}>
              <div className="relative h-full overflow-hidden rounded-full bg-[linear-gradient(90deg,#8b7cf6,#cdf564)] transition-[width] duration-200 ease-linear" style={{ width: `${pct}%` }}>
                <span aria-hidden="true" className="fo-streak absolute inset-y-0 w-16 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.85),transparent)]" />
              </div>
            </div>
            <p className="mt-2.5 flex items-center justify-between gap-3 text-[12.5px] text-[#5d5f78]">
              <span key={step} className="fo-fade font-medium text-[#2b2d48]">
                {STEPS[tool.runs][step]}…
              </span>
              <span className="hidden sm:inline">{tool.runs === "browser" ? "Running locally · Your file stays private" : tool.runs === "server" ? "Encrypted · Deleted right after" : "Only the text is sent · Never stored"}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pane({ label, badge, title, detail, accent, children }: { label: string; badge: string; title: string; detail: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className="fo-rise flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-[#e3e1ec] sm:flex-col sm:items-stretch sm:p-4 sm:text-center">
      <div className="relative flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#ebe9f2] sm:mx-auto sm:h-28 sm:w-full">{children}</div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6b6d86] sm:justify-center">
          {label}
          <span className={cn("rounded-md px-1.5 py-0.5 font-mono text-[10.5px] tracking-normal", accent ? "bg-[#14152b] text-accent" : "bg-[#e3e1ec] text-[#2b2d48]")}>{badge}</span>
        </p>
        <p className="mt-1 truncate text-[14.5px] font-semibold" title={title}>
          {title}
        </p>
        <p className="truncate text-[12.5px] text-[#5d5f78]">{detail}</p>
      </div>
    </div>
  );
}

/**
 * The privacy proof: file → engine → shield → result. Light travels the line
 * while the tool runs; the shield locks when it's done. The engine and the
 * footnote say where the work really happens.
 */
export function Flow({ runs = "browser", state, step }: { runs?: Runs; state: Phase; step: number }) {
  const locked = state === "done" || (state === "running" && step >= 2);
  const Engine = runs === "server" ? Server : runs === "ai" ? Sparkles : Cpu;
  const engine = runs === "server" ? "Secure server" : runs === "ai" ? "AI, text only" : "On-device engine";
  const status =
    runs === "browser"
      ? state === "running" ? "Running locally" : state === "done" ? "Processed on this device" : "Ready on this device"
      : runs === "server"
        ? state === "running" ? "Converting over HTTPS" : state === "done" ? "Converted, then deleted" : "Ready to convert"
        : state === "running" ? "Sending text only" : state === "done" ? "Answered, nothing stored" : "Ready";
  const note = runs === "browser" ? "0 files uploaded" : runs === "server" ? "Deleted after use" : "PDF stays on device";

  return (
    <div className="mt-4 rounded-2xl bg-[#14152b] px-3 py-2.5 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
      <div className="fo-flow-strip relative flex items-center gap-1.5">
        <Node lit>
          <svg viewBox="0 0 16 18" className="h-4 w-[14px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 1h7l4 4v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2z" />
          </svg>
        </Node>
        <Wire lit={state !== "ready"} />
        <span className={cn("relative z-10 flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-semibold ring-1 transition-colors duration-[400ms]", state === "running" ? "fo-chip-pulse bg-[#2d2868] text-brand-100 ring-brand-400/70" : "bg-[#1f2142] text-white/80 ring-white/15")}>
          <Engine className="h-3.5 w-3.5" aria-hidden="true" />
          {engine}
        </span>
        <Wire lit={state !== "ready" && step >= 1} />
        <span className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-[box-shadow,background-color] duration-[400ms]", locked ? "bg-[#29331d] shadow-[0_0_16px_rgb(205_245_100/0.55)]" : "bg-[#1f2142]")}>
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
            <path d="M12 2 4 5v6c0 5.1 3.4 9.4 8 11 4.6-1.6 8-5.9 8-11V5z" fill={locked ? "#cdf564" : "none"} stroke="#cdf564" strokeWidth="1.8" strokeLinejoin="round" className="transition-[fill] duration-[400ms]" />
            {locked && <path d="m8.4 12.2 2.5 2.5 4.7-5" stroke="#14152b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" pathLength="1" className="fo-draw" />}
          </svg>
        </span>
        <Wire lit={state === "done"} />
        <Node lit={state === "done"} accent>
          <Check className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
        </Node>
        {state === "running" && <span aria-hidden="true" className="fo-packet pointer-events-none absolute z-0 left-0 top-1/2 -mt-[5px] h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_12px_#cdf564]" />}
      </div>
      <p className="mt-2 flex items-center justify-between gap-3 text-[11.5px] text-white/60">
        <span>{status}</span>
        <span className="font-semibold tabular-nums text-accent">{note}</span>
      </p>
    </div>
  );
}

function Node({ lit, accent, children }: { lit: boolean; accent?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors duration-[400ms]",
        lit ? (accent ? "bg-accent text-[#14152b] ring-accent" : "bg-[#2a2c4d] text-white ring-white/20") : "bg-[#1a1c36] text-white/30 ring-white/10",
      )}
    >
      {children}
    </span>
  );
}

function Wire({ lit }: { lit: boolean }) {
  return <span aria-hidden="true" className={cn("h-[2px] min-w-2 flex-1 rounded-full transition-colors duration-[400ms]", lit ? "bg-accent/80 shadow-[0_0_6px_#cdf564]" : "bg-white/15")} />;
}
