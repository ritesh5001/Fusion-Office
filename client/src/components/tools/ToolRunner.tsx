"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, Copy, Download, FileText, Loader2, RotateCcw, X } from "lucide-react";
import { downloadFile, formatBytes, toToolFile, zipFiles, type ToolFile } from "@/lib/tools/files";
import { openPdf, renderToCanvas } from "@/lib/tools/pdfjs";
import type { ToolDef } from "@/lib/tools/registry";
import { Dropzone } from "./Dropzone";
import { cn } from "../ui/primitives";

export interface LoadedFile extends ToolFile {
  id: string;
  pages?: number;
  thumb?: string;
}

export interface ToolResult {
  files: ToolFile[];
  summary?: ReactNode;
  /** Text output shown on the page (Markdown, summaries). */
  text?: { content: string; filename: string };
}

export type ProgressFn = (message: string, fraction?: number) => void;

export interface ToolSpec<O> {
  /** Button label, e.g. "Merge PDF". */
  action: string;
  defaults: O;
  Options?: (p: { options: O; set: (patch: Partial<O>) => void; files: LoadedFile[] }) => ReactNode;
  run: (files: LoadedFile[], options: O, progress: ProgressFn) => Promise<ToolResult>;
  minFiles?: number;
  /** Order matters (merge, images to PDF): show move up/down controls. */
  reorderable?: boolean;
  /** Tool takes no files (HTML to PDF). */
  noFiles?: boolean;
  validate?: (files: LoadedFile[], options: O) => string | null;
}

let seq = 0;

async function describe(file: ToolFile): Promise<LoadedFile> {
  const base: LoadedFile = { ...file, id: `f${++seq}` };
  try {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const doc = await openPdf(file.bytes);
      const canvas = await renderToCanvas(doc, 0, 0.35);
      base.pages = doc.numPages;
      base.thumb = canvas.toDataURL("image/jpeg", 0.7);
      await doc.destroy();
    } else if (file.type.startsWith("image/")) {
      base.thumb = URL.createObjectURL(new Blob([file.bytes as BlobPart], { type: file.type }));
    }
  } catch {
    /* thumbnail is optional (e.g. encrypted PDFs) */
  }
  return base;
}

export function ToolRunner<O>({ tool, spec }: { tool: ToolDef; spec: ToolSpec<O> }) {
  const [files, setFiles] = useState<LoadedFile[]>([]);
  const [options, setOptions] = useState<O>(spec.defaults);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState<{ message: string; fraction?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ToolResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const add = async (list: File[]) => {
    setError(null);
    setLoading(true);
    try {
      const loaded = await Promise.all(list.map(async (f) => describe(await toToolFile(f))));
      setFiles((cur) => (tool.multiple ? [...cur, ...loaded] : loaded.slice(0, 1)));
    } finally {
      setLoading(false);
    }
  };

  const move = (i: number, d: -1 | 1) =>
    setFiles((cur) => {
      const next = [...cur];
      const j = i + d;
      if (j < 0 || j >= next.length) return cur;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const run = async () => {
    const problem =
      (!spec.noFiles && files.length < (spec.minFiles ?? 1) ? `Add at least ${spec.minFiles ?? 1} files.` : null) ?? spec.validate?.(files, options) ?? null;
    if (problem) return setError(problem);
    setError(null);
    setRunning({ message: "Working…" });
    try {
      const res = await spec.run(files, options, (message, fraction) => setRunning({ message, fraction }));
      setResult(res);
    } catch (e) {
      setError((e as Error).message || "Something went wrong.");
    } finally {
      setRunning(null);
    }
  };

  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  const reset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setOptions(spec.defaults);
  };

  if (result) return <Results result={result} onReset={reset} anchor={resultRef} />;

  const needsFiles = !spec.noFiles && files.length === 0;
  const Options = spec.Options;

  return (
    <div>
      {needsFiles ? (
        loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-ink-soft" aria-label="Loading files" />
          </div>
        ) : (
          <Dropzone accept={tool.accept} multiple={tool.multiple} onFiles={add} label={tool.multiple ? "Select files" : "Select file"} />
        )
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {!spec.noFiles && (
              <>
                <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {files.map((f, i) => (
                    <li key={f.id} className="group relative flex flex-col overflow-hidden rounded-xl bg-white ring-1 ring-ink/10">
                      <div className="flex h-40 items-center justify-center bg-paper-deep p-3">
                        {f.thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.thumb} alt="" className="max-h-full max-w-full rounded-sm object-contain shadow-sm" />
                        ) : (
                          <FileText className="h-10 w-10 text-ink-soft" aria-hidden="true" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium" title={f.name}>
                            {f.name}
                          </p>
                          <p className="text-[12px] text-ink-soft">
                            {formatBytes(f.bytes.length)}
                            {f.pages ? ` · ${f.pages} page${f.pages === 1 ? "" : "s"}` : ""}
                          </p>
                        </div>
                        {spec.reorderable && files.length > 1 && (
                          <div className="flex">
                            <IconBtn label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)}>
                              <ArrowUp className="h-3.5 w-3.5" />
                            </IconBtn>
                            <IconBtn label="Move later" disabled={i === files.length - 1} onClick={() => move(i, 1)}>
                              <ArrowDown className="h-3.5 w-3.5" />
                            </IconBtn>
                          </div>
                        )}
                        <IconBtn label={`Remove ${f.name}`} onClick={() => setFiles((cur) => cur.filter((x) => x.id !== f.id))}>
                          <X className="h-3.5 w-3.5" />
                        </IconBtn>
                      </div>
                      {spec.reorderable && files.length > 1 && (
                        <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 font-mono text-[11px] text-paper">{i + 1}</span>
                      )}
                    </li>
                  ))}
                </ul>
                {tool.multiple && <Dropzone compact accept={tool.accept} multiple onFiles={add} label="Add more files" />}
              </>
            )}
          </div>
          <aside className="h-fit rounded-2xl bg-white p-5 ring-1 ring-ink/10 lg:sticky lg:top-24">
            {Options && (
              <div className="space-y-4">
                <Options options={options} set={(patch) => setOptions((o) => ({ ...o, ...patch }))} files={files} />
              </div>
            )}
            {error && (
              <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={run}
              disabled={!!running}
              className={cn(
                "btn mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 text-[15px] font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-80",
              )}
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {running ? running.message : spec.action}
            </button>
            {running?.fraction !== undefined && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-deep" role="progressbar" aria-valuenow={Math.round(running.fraction * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-brand-600 transition-[width] duration-300" style={{ width: `${Math.round(running.fraction * 100)}%` }} />
              </div>
            )}
          </aside>
        </div>
      )}
      {error && needsFiles && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-center text-[13px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md text-ink-soft hover:bg-paper-deep hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Results({ result, onReset, anchor }: { result: ToolResult; onReset: () => void; anchor: React.RefObject<HTMLDivElement | null> }) {
  const [copied, setCopied] = useState(false);
  const many = result.files.length > 1;
  const total = result.files.reduce((n, f) => n + f.bytes.length, 0);
  return (
    <div ref={anchor} className="mx-auto max-w-[760px] scroll-mt-24">
      <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-ink/10 md:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Check className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-display text-[26px] font-semibold tracking-[-0.02em]">Done</h2>
        {result.summary && <div className="mx-auto mt-2 max-w-[56ch] text-[15px] leading-relaxed text-ink-soft">{result.summary}</div>}
        {result.files.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => downloadFile(many ? zipFiles(result.files) : result.files[0])}
              className="btn inline-flex h-12 items-center gap-2 rounded-full bg-brand-600 px-7 text-[15px] font-medium text-white shadow-sm hover:bg-brand-700"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {many ? `Download all (${result.files.length} files, ZIP)` : `Download ${result.files[0].name}`}
            </button>
          </div>
        )}
        {many && (
          <ul className="mx-auto mt-5 max-w-[520px] divide-y divide-rule rounded-xl text-left ring-1 ring-rule">
            {result.files.map((f, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[13px]">{f.name}</span>
                <span className="text-[12px] tabular-nums text-ink-soft">{formatBytes(f.bytes.length)}</span>
                <button type="button" onClick={() => downloadFile(f)} className="text-[13px] font-medium text-brand-700 hover:underline">
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}
        {many && <p className="mt-2 text-[12px] text-ink-soft">{formatBytes(total)} in total</p>}
      </div>

      {result.text && (
        <div className="mt-6 rounded-2xl bg-white ring-1 ring-ink/10">
          <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
            <span className="font-mono text-[12px] uppercase tracking-[0.12em] text-ink-soft">{result.text.filename}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(result.text!.content);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-ink-soft hover:bg-paper-deep hover:text-ink"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => downloadFile({ name: result.text!.filename, bytes: new TextEncoder().encode(result.text!.content), type: "text/markdown" })}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-ink-soft hover:bg-paper-deep hover:text-ink"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </button>
            </div>
          </div>
          <pre className="thin-scroll max-h-[520px] overflow-auto whitespace-pre-wrap p-4 font-mono text-[13px] leading-relaxed text-ink">{result.text.content}</pre>
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-ink-soft hover:text-ink">
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Start over with another file
        </button>
      </div>
    </div>
  );
}
