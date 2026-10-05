"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Check, ChevronRight, Cpu, Download, RotateCcw, X, Zap } from "lucide-react";
import { TOOLS, toolBySlug, type ToolDef } from "@/lib/tools/registry";
import { appPath, handFiles, KIND_ACCEPT, kindOf, toolPath, type FileKind } from "@/lib/tools/handoff";
import { downloadFile, formatBytes, stem, toToolFile, zipFiles, type ToolFile } from "@/lib/tools/files";
import type { LoadedFile, ToolSpec } from "../tools/ToolRunner";
import { ToolTile } from "../tools/icons";
import { KindGlyph } from "./FlowArt";
import { cn } from "@/lib/cn";
import { pickerAccept } from "@/lib/tools/pickerAccept";
import { taskDone } from "@/lib/taskDone";

/**
 * The homepage drop card as a "processing stage". The motion tells the
 * privacy story: a file enters, is read on this device, and comes out ready.
 *
 *   idle → (hover | drag) → landing → ready → running → done
 *
 * Tools in INLINE run right here with their default settings; everything
 * else opens in its own tool page with the file handed over.
 */

type Phase = "idle" | "landing" | "ready" | "running" | "done" | "error";

const KINDS: { id: FileKind; label: string }[] = [
  { id: "pdf", label: "PDF" },
  { id: "document", label: "Document" },
  { id: "image", label: "Image" },
];

/** Suggested tools under the type switch, per kind. */
const SUGGESTED: Record<FileKind, string[]> = {
  pdf: ["compress-pdf", "merge-pdf", "edit-pdf"],
  document: ["word-to-pdf", "word-editor", "excel-editor"],
  image: ["compress-image", "resize-image", "jpg-to-pdf"],
};

/** Tools that run inside the card (on-device, sensible defaults), in order of preference. */
const INLINE: { slug: string; verb: string }[] = [
  { slug: "merge-pdf", verb: "Merging PDFs" },
  { slug: "compress-pdf", verb: "Compressing PDF" },
  { slug: "pdf-to-jpg", verb: "Converting to JPG" },
  { slug: "compress-image", verb: "Compressing image" },
  { slug: "jpg-to-pdf", verb: "Building PDF" },
];

const STEPS = ["Reading file", "Optimizing locally", "Preparing result"];

/** The shortest the landing and processing sequences run, so the motion can be read. */
const LANDING_MS = 1300;
const RUN_MIN_MS = 1600;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Info {
  pages?: number;
  width?: number;
  height?: number;
}

interface Job {
  tool: ToolDef;
  verb: string;
  step: number;
  /** Fraction reported by the tool itself, when it reports one. */
  real?: number;
  started: number;
}

interface Output {
  file: ToolFile;
  inputBytes: number;
  summary?: string;
  /** A compress tool: say so when the file couldn't get smaller. */
  compress: boolean;
}

function kindFromMime(type: string | undefined): FileKind | null {
  if (!type) return null;
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("image/")) return "image";
  return "document";
}

export function DropStage({
  staged,
  onFiles,
  onClear,
  matches,
  onActivity,
}: {
  staged: File[] | null;
  onFiles: (f: File[]) => void;
  onClear: () => void;
  /** Every tool that can open the staged files, best first. */
  matches: ToolDef[];
  /** Tells the page when a file is over the card (wakes the flow lines) and when work is happening. */
  onActivity?: (a: { dragging: boolean; working: boolean; done: boolean }) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [kind, setKind] = useState<FileKind>("pdf");
  const [hot, setHot] = useState(false);
  const [over, setOver] = useState(false);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [info, setInfo] = useState<Info>({});
  const [job, setJob] = useState<Job | null>(null);
  const [output, setOutput] = useState<Output | null>(null);
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  useEffect(() => {
    onActivity?.({ dragging: over, working: phase === "landing" || phase === "running" || phase === "done", done: phase === "done" });
  }, [over, phase, onActivity]);

  // A new set of files: play the landing while they're read on this device.
  useEffect(() => {
    if (!staged?.length) {
      setPhase("idle");
      setInfo({});
      setJob(null);
      setOutput(null);
      setError(null);
      return;
    }
    let live = true;
    setPhase("landing");
    setOutput(null);
    setError(null);
    setKind(kindOf(staged[0]));
    const first = staged[0];
    const read = (async (): Promise<Info> => {
      try {
        if (staged.length === 1 && kindOf(first) === "pdf") {
          const { pageCount } = await import("@/lib/tools/processors/organize");
          return { pages: await pageCount(new Uint8Array(await first.arrayBuffer())) };
        }
        if (staged.length === 1 && kindOf(first) === "image" && "createImageBitmap" in window) {
          const bmp = await createImageBitmap(first);
          const out = { width: bmp.width, height: bmp.height };
          bmp.close();
          return out;
        }
      } catch {
        /* details are optional (encrypted PDFs, HEIC in some browsers) */
      }
      return {};
    })();
    Promise.all([read, wait(LANDING_MS)]).then(([i]) => {
      if (!live) return;
      setInfo(i);
      setPhase("ready");
    });
    return () => {
      live = false;
    };
  }, [staged]);

  const browse = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = pickerAccept(KIND_ACCEPT[kind]);
    input.multiple = true;
    input.onchange = () => onFiles(Array.from(input.files ?? []));
    input.click();
  }, [kind, onFiles]);

  const inline = (staged ?? []).length
    ? INLINE.map((i) => ({ ...i, tool: toolBySlug(i.slug) }))
        .filter((i): i is { slug: string; verb: string; tool: ToolDef } => !!i.tool && i.tool.runs === "browser" && matches.includes(i.tool))
        .filter((i) => (i.slug === "merge-pdf" ? staged!.length > 1 : true))
        .slice(0, 2)
    : [];

  const run = async (tool: ToolDef, verb: string) => {
    if (!staged?.length) return;
    const started = performance.now();
    setError(null);
    setJob({ tool, verb, step: 0, started });
    setPhase("running");
    try {
      const loaded: LoadedFile[] = await Promise.all(staged.map(async (f, i) => ({ ...(await toToolFile(f)), id: `home-${i}`, pages: staged.length === 1 ? info.pages : undefined })));
      setJob((j) => j && { ...j, step: 1 });
      const { SPECS } = await import("../tools/specs");
      const spec = SPECS[tool.slug] as unknown as ToolSpec<unknown>;
      const invalid = spec.validate?.(loaded, spec.defaults);
      if (invalid) throw new Error(invalid);
      const result = await spec.run(loaded, spec.defaults, (_m, f) => {
        if (typeof f === "number") setJob((j) => j && { ...j, real: f });
      });
      if (!result.files.length) throw new Error("The tool didn't produce a file.");
      setJob((j) => j && { ...j, step: 2 });
      const file = result.files.length > 1 ? zipFiles(result.files, `${stem(staged[0].name)}-${tool.slug}.zip`) : result.files[0];
      await wait(Math.max(350, RUN_MIN_MS - (performance.now() - started)));
      setOutput({
        file,
        inputBytes: staged.reduce((n, f) => n + f.size, 0),
        summary: typeof result.summary === "string" ? result.summary : undefined,
        compress: tool.slug.startsWith("compress"),
      });
      setPhase("done");
      taskDone();
    } catch (e) {
      setError((e as Error).message || "Something went wrong.");
      setPhase("error");
    }
  };

  // Drag tracking: detect the file type, and let a thumbnail follow the pointer.
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!over) {
      setOver(true);
      const k = kindFromMime(e.dataTransfer.items?.[0]?.type);
      if (k && phase === "idle") setKind(k);
    }
    const rect = root.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setGhost({ x, y }));
  };
  const endDrag = () => {
    cancelAnimationFrame(frame.current);
    setOver(false);
    setGhost(null);
  };

  const idle = phase === "idle";
  const glow = over ? "opacity-90" : hot && idle ? "opacity-75" : "opacity-55";

  return (
    <div
      ref={root}
      className={cn(
        "fo-intro-scale relative w-full min-w-0 max-w-[560px] flex-1 transition-transform duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)]",
        over ? "scale-[1.04]" : hot && idle ? "-translate-y-1" : "",
      )}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHot(true)}
      onPointerLeave={() => setHot(false)}
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) endDrag();
      }}
      onDrop={(e) => {
        e.preventDefault();
        endDrag();
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(files);
      }}
    >
      {/* Neon glow: the border gradient, blurred behind the card. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -inset-4 rounded-[44px] bg-[linear-gradient(100deg,#8b7cf6,#a99cff_45%,#cdf564)] blur-3xl transition-opacity duration-[250ms]",
          glow,
        )}
      />
      <div className="relative rounded-[30px] bg-[linear-gradient(100deg,#9d91fb,#cfc8ff_48%,#cdf564)] p-[3px] shadow-[-10px_0_30px_rgb(139_124_246/0.6),10px_0_30px_rgb(205_245_100/0.45),0_0_60px_rgb(139_124_246/0.25)]">
        {/* A slow light sweeping round the border. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[30px]">
          <div className="fo-sweep absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0_68%,rgb(255_255_255/0.95)_80%,transparent_90%)]" />
        </div>

        <div className="relative overflow-hidden rounded-[28px] bg-[#f5f4f0] p-3 text-[#14152b]">
          {phase === "idle" ? (
            <Idle kind={kind} setKind={setKind} hot={hot} over={over} onBrowse={browse} />
          ) : phase === "landing" ? (
            <Landing file={staged![0]} count={staged!.length} />
          ) : (
            <div className="px-2 py-2 sm:px-3">
              <FileRow files={staged!} info={info} onClear={onClear} done={phase === "done"} />
              <PrivacyFlow state={phase === "running" ? "running" : phase === "done" ? "done" : "ready"} step={job?.step ?? 0} />
              <div className="mt-4">
                {phase === "ready" && <Ready inline={inline} matches={matches} staged={staged!} onRun={run} />}
                {phase === "running" && job && <Running job={job} />}
                {phase === "done" && output && <Done output={output} onAgain={() => setPhase("ready")} />}
                {phase === "error" && (
                  <div role="alert" className="fo-rise rounded-2xl bg-[#fdecec] p-4 text-[14px] text-[#8a1f1f]">
                    <p className="font-semibold">That didn&apos;t work</p>
                    <p className="mt-1 text-[13.5px]">{error}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => setPhase("ready")} className="fo-press inline-flex h-9 items-center gap-1.5 rounded-full bg-[#151738] px-4 text-[13px] font-semibold text-white">
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Back
                      </button>
                      {job && (
                        <Link href={appPath(job.tool)} onClick={() => handFiles(appPath(job.tool), staged!)} className="fo-press inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-[13px] font-semibold ring-1 ring-[#e3e1ec]">
                          Open {job.tool.name} with all settings <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* The dragged file's thumbnail follows the pointer. */}
          {over && ghost && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 z-20 flex h-[64px] w-[64px] items-center justify-center rounded-[18px] bg-white/80 shadow-[0_14px_30px_-10px_rgb(21_23_56/0.45)] ring-1 ring-[#dcd9ea] backdrop-blur"
              style={{ transform: `translate(${ghost.x - 32}px, ${ghost.y - 40}px) rotate(-6deg)`, transition: "transform 140ms cubic-bezier(.2,.8,.2,1)" }}
            >
              <KindGlyph kind={kind} />
            </div>
          )}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {phase === "landing" ? "Reading your file on this device." : phase === "running" ? `${job?.verb ?? "Working"} on this device.` : phase === "done" ? "Your file is ready to download." : ""}
      </p>
    </div>
  );
}

// ─── Idle: drop target, type switch, suggestions ───────────────────────

function Idle({ kind, setKind, hot, over, onBrowse }: { kind: FileKind; setKind: (k: FileKind) => void; hot: boolean; over: boolean; onBrowse: () => void }) {
  const at = KINDS.findIndex((k) => k.id === kind);
  const title = over ? "Release to process privately" : hot ? "Choose a file to begin" : "Drop anything here";
  const suggested = SUGGESTED[kind].map(toolBySlug).filter((t): t is ToolDef => !!t);

  return (
    <div onClick={onBrowse} className={cn("relative flex cursor-pointer flex-col items-center px-5 pb-8 pt-10 text-center sm:pt-12", hot && "is-hot", over && "is-over")}>
      {/* Dashed inner border: marches clockwise on hover, faster while dragging. */}
      <svg aria-hidden="true" className="pointer-events-none absolute inset-[1px] h-[calc(100%-2px)] w-[calc(100%-2px)] overflow-visible">
        <rect width="100%" height="100%" rx="20" fill="none" strokeWidth="1.5" strokeDasharray="7 7" className={cn("fo-dash-march transition-[stroke] duration-[250ms]", over ? "stroke-brand-500" : hot ? "stroke-[#9d97c9]" : "stroke-[#c4c2d4]")} />
      </svg>

      <button type="button" onClick={(e) => (e.stopPropagation(), onBrowse())} className="group relative flex flex-col items-center rounded-2xl px-4 py-1" aria-label="Choose files">
        <span className="fo-float-sm relative block h-[68px] w-[60px]">
          <span className={cn("absolute inset-0 transition-transform duration-[400ms] ease-[cubic-bezier(.34,1.56,.64,1)]", (hot || over) && "scale-[1.08]")}>
            {KINDS.map((k) => (
              <KindOutline key={k.id} kind={k.id} active={k.id === kind} />
            ))}
            <span className={cn("absolute -bottom-1 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-[17px] font-bold leading-none ring-[2.5px] ring-[#f5f4f0] transition-colors duration-[250ms]", over ? "bg-brand-600 text-white" : "bg-[#14152b] text-white")}>
              +
            </span>
          </span>
        </span>
        <span key={title} className="fo-fade mt-5 font-display text-[clamp(1.3rem,2.1vw,1.7rem)] font-bold leading-tight tracking-[-0.025em] sm:whitespace-nowrap">
          {title}
        </span>
        <span className="mt-1 text-[14px] text-[#5d5f78]">or click to choose a file</span>
      </button>

      <div role="radiogroup" aria-label="File type" onClick={(e) => e.stopPropagation()} className="relative mt-6 grid w-[300px] max-w-full grid-cols-3 rounded-full bg-white/80 p-1 ring-1 ring-[#d9d7e4] sm:w-[330px]">
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-full bg-[#151738] shadow-[0_4px_12px_-4px_rgb(21_23_56/0.6)] transition-transform duration-[250ms] ease-[cubic-bezier(.3,.7,.2,1)]"
          style={{ transform: `translateX(${at * 100}%)` }}
        />
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="radio"
            aria-checked={kind === k.id}
            onClick={() => setKind(k.id)}
            className={cn("fo-press relative z-10 h-10 rounded-full text-[14.5px] font-medium transition-colors duration-[250ms]", kind === k.id ? "text-white" : "text-[#2b2d48] hover:text-[#14152b]")}
          >
            {k.label}
          </button>
        ))}
      </div>

      <ul key={kind} className="mt-4 flex flex-wrap justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {suggested.map((t, i) => (
          <li key={t.slug} className="fo-rise" style={{ animationDelay: `${i * 40}ms` }}>
            <Link href={toolPath(t)} className="fo-press flex h-8 items-center gap-1.5 rounded-full bg-white/70 pl-1 pr-3 text-[12.5px] font-medium text-[#2b2d48] ring-1 ring-[#e3e1ec] transition-colors hover:bg-white hover:text-[#14152b]">
              <ToolTile tool={t} size="xs" />
              {t.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Line-art icon for each kind; switching kinds cross-fades and turns them like a morph. */
function KindOutline({ kind, active }: { kind: FileKind; active: boolean }) {
  return (
    <svg
      viewBox="0 0 60 68"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("absolute inset-0 h-full w-full transition-[opacity,transform] duration-[250ms] ease-[cubic-bezier(.3,.7,.2,1)]", active ? "rotate-0 scale-100 opacity-100" : "-rotate-6 scale-75 opacity-0")}
      aria-hidden="true"
    >
      {kind === "image" ? (
        <>
          <rect x="4" y="10" width="52" height="46" rx="8" />
          <circle cx="40" cy="25" r="5" />
          <path d="M8 50 22 34l10 11 6-6 14 13" />
        </>
      ) : (
        <>
          <path d="M10 3h26l18 18v38a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V9a6 6 0 0 1 6-6z" />
          <path d="M36 3v12a6 6 0 0 0 6 6h12" />
          {kind === "pdf" ? (
            <text x="27" y="49" textAnchor="middle" stroke="none" fill="currentColor" fontSize="13" fontWeight="800" fontFamily="ui-sans-serif, system-ui, sans-serif">
              PDF
            </text>
          ) : (
            <>
              <path d="M14 32h22M14 40h28M14 48h18" strokeWidth="2.2" />
            </>
          )}
        </>
      )}
    </svg>
  );
}

// ─── Landing: the file drops in, a light scans it, the shield draws ───

function Landing({ file, count }: { file: File; count: number }) {
  return (
    <div className="relative flex flex-col items-center px-5 pb-10 pt-12 text-center" role="status">
      <div className="relative flex h-[120px] w-[200px] items-center justify-center">
        <span aria-hidden="true" className="fo-ripple absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand-400" />
        <span aria-hidden="true" className="fo-ripple absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent [animation-delay:180ms]" />
        <div className="fo-drop-in relative flex h-[88px] w-[88px] items-center justify-center overflow-hidden rounded-[24px] bg-white shadow-[0_18px_36px_-14px_rgb(21_23_56/0.45)] ring-1 ring-[#e0dee9]">
          <KindGlyph kind={kindOf(file)} />
          <span aria-hidden="true" className="fo-scan absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(90deg,transparent,rgb(205_245_100/0.75),transparent)]" />
        </div>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="absolute right-0 top-1/2 h-10 w-10 -translate-y-1/2 drop-shadow-[0_0_10px_rgb(205_245_100/0.7)]">
          <path d="M12 2 4 5v6c0 5.1 3.4 9.4 8 11 4.6-1.6 8-5.9 8-11V5z" fill="#14152b" stroke="#cdf564" strokeWidth="1.6" strokeLinejoin="round" pathLength="1" className="fo-draw [animation-delay:350ms]" />
          <path d="m8.4 12.2 2.5 2.5 4.7-5" stroke="#cdf564" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" pathLength="1" className="fo-draw [animation-delay:750ms]" />
        </svg>
      </div>
      <p className="fo-fade mt-6 font-display text-[22px] font-bold tracking-[-0.02em] [animation-delay:250ms]">Processing locally — no upload</p>
      <p className="mt-1 max-w-full truncate text-[13.5px] text-[#5d5f78]">{count > 1 ? `${count} files` : file.name}</p>
    </div>
  );
}

// ─── Ready, running, done ─────────────────────────────────────────────

function FileRow({ files, info, onClear, done }: { files: File[]; info: Info; onClear: () => void; done: boolean }) {
  const total = files.reduce((n, f) => n + f.size, 0);
  const detail = [formatBytes(total), info.pages && `${info.pages} page${info.pages === 1 ? "" : "s"}`, info.width && `${info.width} × ${info.height}`].filter(Boolean).join(" · ");
  return (
    <div className="fo-rise flex items-center gap-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-white ring-1 ring-[#e0dee9] [&_svg]:h-8 [&_svg]:w-7">
        <KindGlyph kind={kindOf(files[0])} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold" title={files.map((f) => f.name).join(", ")}>
          {files.length === 1 ? files[0].name : `${files.length} files`}
        </p>
        <p className="text-[13px] text-[#5d5f78]">
          {detail}
          {files.length > 1 && ` · ${files[0].name} and ${files.length - 1} more`}
        </p>
      </div>
      <button type="button" onClick={onClear} aria-label={done ? "Start over" : "Clear files"} title={done ? "Start over" : "Clear files"} className="fo-press flex h-9 w-9 items-center justify-center rounded-lg text-[#5d5f78] hover:bg-black/5 hover:text-[#14152b]">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * The privacy proof: file → on-device engine → shield → result. While a tool
 * runs, light travels the line; when it's done the shield locks and the
 * result lights up. Nothing is uploaded, and the strip says so.
 */
function PrivacyFlow({ state, step }: { state: "ready" | "running" | "done"; step: number }) {
  const locked = state === "done" || (state === "running" && step >= 2);
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
          <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
          On-device engine
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
        <span>{state === "running" ? "Running locally" : state === "done" ? "Processed on this device" : "Ready on this device"}</span>
        <span className="font-semibold tabular-nums text-accent">0 files uploaded</span>
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

function Ready({ inline, matches, staged, onRun }: { inline: { slug: string; verb: string; tool: ToolDef }[]; matches: ToolDef[]; staged: File[]; onRun: (t: ToolDef, verb: string) => void }) {
  const rest = matches.filter((t) => !inline.some((i) => i.tool === t)).slice(0, inline.length ? 4 : 6);
  return (
    <div>
      {inline.length > 0 && (
        <>
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#6b6d86]">Do it right here</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {inline.map((i, n) => (
              <button
                key={i.slug}
                type="button"
                onClick={() => onRun(i.tool, i.verb)}
                style={{ animationDelay: `${n * 50}ms` }}
                className={cn(
                  "fo-rise fo-press group flex items-center gap-3 rounded-2xl p-2.5 pr-3 text-left transition-shadow",
                  n === 0 ? "bg-[#151738] text-white shadow-[0_10px_24px_-12px_rgb(21_23_56/0.8)] hover:shadow-[0_12px_28px_-10px_rgb(92_77_204/0.7)]" : "bg-white ring-1 ring-[#e3e1ec] hover:ring-brand-400",
                )}
              >
                <ToolTile tool={i.tool} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold leading-tight">{i.tool.name}</span>
                  <span className={cn("mt-0.5 flex items-center gap-1 text-[12px]", n === 0 ? "text-accent" : "text-[#5d5f78]")}>
                    <Zap className="h-3 w-3" aria-hidden="true" /> Runs on-device
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {rest.length > 0 && (
        <>
          <p className={cn("text-[12px] font-semibold uppercase tracking-[0.1em] text-[#6b6d86]", inline.length > 0 && "mt-4")}>{inline.length ? "Or open it in" : "Open it in"}</p>
          <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {rest.map((t, n) => (
              <li key={t.slug} className="fo-rise" style={{ animationDelay: `${(inline.length + n) * 40}ms` }}>
                <Link
                  href={appPath(t)}
                  onClick={() => handFiles(appPath(t), staged)}
                  className="fo-press group flex items-center gap-3 rounded-xl bg-white p-2 pr-3 ring-1 ring-[#e3e1ec] transition-shadow hover:shadow-[0_6px_16px_-8px_rgb(92_77_204/0.45)] hover:ring-brand-400"
                >
                  <ToolTile tool={t} size="sm" />
                  <span className="min-w-0 flex-1 text-[14px] font-medium leading-tight">{t.name}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#8a8ca3] transition-transform group-hover:translate-x-0.5 group-hover:text-[#14152b]" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {matches.length > inline.length + rest.length && (
        <a href="#all-tools" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-700 hover:text-brand-800">
          See all {matches.length} tools for this file <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}
      {!matches.length && (
        <p className="rounded-xl bg-[#ebe9f2] px-3.5 py-3 text-[13.5px] text-[#4a4c66]">
          No tool opens this kind of file yet. PDFs, Word, Excel, PowerPoint, Markdown, CSV, eBooks and images are supported. ({TOOLS.length} tools in all.)
        </p>
      )}
    </div>
  );
}

/** Progress: the tool's own fraction when it reports one, otherwise an eased estimate that never claims to be done. */
function Running({ job }: { job: Job }) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    let id = 0;
    const tick = () => {
      setNow(performance.now());
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  const elapsed = now - job.started;
  const pct =
    job.step === 0
      ? Math.min(14, elapsed / 40)
      : job.step === 1
        ? 15 + 75 * Math.max(job.real ?? 0, 1 - Math.exp(-Math.max(0, elapsed - 300) / 1400))
        : 95;
  const shown = Math.max(1, Math.min(98, Math.round(pct)));

  return (
    <div className="fo-rise rounded-2xl bg-white p-4 ring-1 ring-[#e3e1ec]" role="status" aria-live="off">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] font-semibold">{job.verb}</p>
        <p className="font-mono text-[15px] font-semibold tabular-nums">{shown}%</p>
      </div>
      <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-[#ebe9f2]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={shown} aria-label={job.verb}>
        <div className="relative h-full overflow-hidden rounded-full bg-[linear-gradient(90deg,#8b7cf6,#cdf564)] transition-[width] duration-200 ease-linear" style={{ width: `${shown}%` }}>
          <span aria-hidden="true" className="fo-streak absolute inset-y-0 w-16 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.85),transparent)]" />
        </div>
      </div>
      <p className="mt-2.5 flex items-center justify-between gap-3 text-[12.5px] text-[#5d5f78]">
        <span key={job.step} className="fo-fade font-medium text-[#2b2d48]">
          {STEPS[job.step]}…
        </span>
        <span>Running locally · Your file stays private</span>
      </p>
    </div>
  );
}

const PARTICLES: CSSProperties[] = [
  { "--dx": "-46px", "--dy": "-30px" },
  { "--dx": "40px", "--dy": "-38px" },
  { "--dx": "54px", "--dy": "10px" },
  { "--dx": "-50px", "--dy": "18px" },
  { "--dx": "4px", "--dy": "-54px" },
] as unknown as CSSProperties[];

function Done({ output, onAgain }: { output: Output; onAgain: () => void }) {
  const { file, inputBytes } = output;
  const ext = (file.name.split(".").pop() ?? "file").toUpperCase();
  const size = file.bytes.byteLength;
  const saved = size < inputBytes ? Math.round((1 - size / inputBytes) * 100) : 0;

  return (
    <div className="text-center">
      <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
        <span aria-hidden="true" className="fo-burst absolute inset-0 rounded-full bg-accent/50" />
        {PARTICLES.map((p, i) => (
          <span key={i} aria-hidden="true" className={cn("fo-particle absolute left-1/2 top-1/2 -ml-1 -mt-1 h-2 w-2 rounded-full", i % 2 ? "bg-brand-400" : "bg-accent")} style={p} />
        ))}
        <span className="fo-pop relative flex h-14 w-14 items-center justify-center rounded-full bg-accent shadow-[0_0_24px_rgb(205_245_100/0.7)]">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
            <path d="m5.5 12.5 4 4 9-9" stroke="#14152b" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" pathLength="1" className="fo-draw [animation-delay:200ms]" />
          </svg>
        </span>
      </div>
      <p className="fo-fade mt-3 font-display text-[22px] font-bold tracking-[-0.02em] [animation-delay:150ms]">Your file is ready</p>

      <div className="fo-rise mt-3 flex items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-[#e3e1ec] [animation-delay:250ms]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#14152b] font-mono text-[10.5px] font-bold text-accent">{ext}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold">{file.name}</span>
          <span className="block text-[12.5px] text-[#5d5f78]">
            {formatBytes(size)}
            {saved > 0 && <span className="font-semibold text-[#3f7d12]"> · {saved}% smaller</span>}
            {!saved && (output.compress ? " · Already well optimized, so it kept its size" : output.summary && ` · ${output.summary}`)}
          </span>
        </span>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => downloadFile(file)}
          className="fo-pop fo-press inline-flex h-12 items-center gap-2 rounded-full bg-[#151738] px-7 text-[15px] font-semibold text-white shadow-[0_12px_26px_-12px_rgb(21_23_56/0.9)] [animation-delay:450ms] hover:bg-[#1f2250]"
        >
          <Download className="h-4 w-4" aria-hidden="true" /> Download {ext}
        </button>
        <button type="button" onClick={onAgain} className="fo-press inline-flex h-12 items-center gap-1.5 rounded-full px-5 text-[14px] font-semibold text-[#2b2d48] hover:bg-black/5">
          Use another tool <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
