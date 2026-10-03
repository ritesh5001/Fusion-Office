"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, Copy, Download, FileText, Loader2, RotateCcw, X } from "lucide-react";
import { downloadFile, formatBytes, toToolFile, zipFiles, type ToolFile } from "@/lib/tools/files";
import { openPdf, renderToCanvas } from "@/lib/tools/pdfjs";
import type { ToolDef } from "@/lib/tools/registry";
import { Dropzone } from "./Dropzone";
import { Mascot } from "../mascot/Mascot";
import { cn } from "../ui/primitives";

export interface LoadedFile extends ToolFile {
  id: string;
  pages?: number;
  thumb?: string;
  /** Pixel size, for images. */
  width?: number;
  height?: number;
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
    } else if (file.type.startsWith("image/") || /\.(heic|heif|avif|svg|bmp|gif)$/i.test(file.name)) {
      base.thumb = URL.createObjectURL(new Blob([file.bytes as BlobPart], { type: file.type }));
      const { decodeImage } = await import("@/lib/image/canvas");
      const img = await decodeImage(file);
      base.width = img.width;
      base.height = img.height;
      img.close();
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
          <div className="card flex flex-col items-center justify-center py-16 md:py-20" role="status">
            <Mascot mood="working" size={72} />
            <p className="mt-4 text-[15px] font-medium text-fg">Reading your {tool.multiple ? "files" : "file"}…</p>
            <div className="mt-4 h-1 w-40 overflow-hidden rounded-full bg-raised">
              <div className="fo-indeterminate h-full w-1/3 rounded-full bg-brand-400" />
            </div>
          </div>
        ) : (
          <Dropzone accept={tool.accept} multiple={tool.multiple} onFiles={add} label={tool.multiple ? "Choose files" : "Choose a file"} />
        )
      ) : (
        <div className={cn("grid gap-6", spec.noFiles ? "mx-auto max-w-[640px]" : "lg:grid-cols-[minmax(0,1fr)_340px]")}>
          <div className={cn("min-w-0 space-y-3", spec.noFiles && "hidden")}>
            {!spec.noFiles && (
              <>
                <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3">
                  {files.map((f, i) => (
                    <li key={f.id} className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
                      <div className="flex h-44 items-center justify-center bg-sunken p-4">
                        {f.thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.thumb} alt="" className="max-h-full max-w-full rounded-[3px] object-contain shadow-[0_8px_24px_-8px_rgb(0_0_0/0.7)]" />
                        ) : (
                          <FileText className="h-10 w-10 text-fg-subtle" aria-hidden="true" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 border-t border-line px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-fg" title={f.name}>
                            {f.name}
                          </p>
                          <p className="text-[12px] text-fg-muted">
                            {formatBytes(f.bytes.length)}
                            {f.pages ? ` · ${f.pages} page${f.pages === 1 ? "" : "s"}` : ""}
                            {f.width ? ` · ${f.width} × ${f.height}` : ""}
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
                        <span className="absolute left-2.5 top-2.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-fg px-1.5 font-mono text-[11px] font-medium text-app">{i + 1}</span>
                      )}
                    </li>
                  ))}
                </ul>
                {tool.multiple && <Dropzone compact accept={tool.accept} multiple onFiles={add} label="Add more files" />}
              </>
            )}
          </div>
          <aside className="card h-fit p-5 lg:sticky lg:top-24">
            <p className="eyebrow mb-4">{Options ? "Settings" : "Ready"}</p>
            {(running || error) && (
              <div className={cn("mb-4 flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-inset", running ? "bg-brand-500/10 ring-brand-500/25" : "bg-red-500/10 ring-red-500/25")} role="status">
                <Mascot mood={running ? "working" : "oops"} size={40} />
                <p className="text-[13px] font-medium text-fg">{running
                    ? tool.runs === "browser"
                      ? "On it! Working right here on your device."
                      : tool.runs === "ai"
                        ? "On it! Reading your document with AI."
                        : "On it! Converting on our server."
                    : "Something needs a look."}</p>
              </div>
            )}
            {Options && (
              <div className="space-y-4">
                <Options options={options} set={(patch) => setOptions((o) => ({ ...o, ...patch }))} files={files} />
              </div>
            )}
            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-300 ring-1 ring-inset ring-red-500/25">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={run}
              disabled={!!running}
              className="btn btn-primary btn-lg mt-5 w-full disabled:opacity-80"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {running ? running.message : spec.action}
            </button>
            {running?.fraction !== undefined && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={Math.round(running.fraction * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${Math.round(running.fraction * 100)}%` }} />
              </div>
            )}
          </aside>
        </div>
      )}
      {error && needsFiles && (
        <div role="alert" className="mt-4 flex items-center justify-center gap-3 rounded-xl bg-red-500/10 px-4 py-3 text-[14px] text-red-300 ring-1 ring-inset ring-red-500/25">
          <Mascot mood="oops" size={40} />
          {error}
        </div>
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
      className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted hover:bg-raised hover:text-fg disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function ImagePreview({ file }: { file: ToolFile }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(new Blob([file.bytes as BlobPart], { type: file.type }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  if (!url) return null;
  return (
    <div className="mx-auto mt-6 flex max-h-[420px] justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#1a1e27_0%_25%,#12151c_0%_50%)] bg-[length:16px_16px] p-3 ring-1 ring-line">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Result preview" className="max-h-[396px] max-w-full object-contain" />
    </div>
  );
}

function Results({ result, onReset, anchor }: { result: ToolResult; onReset: () => void; anchor: React.RefObject<HTMLDivElement | null> }) {
  const [copied, setCopied] = useState(false);
  const [winkKey, setWinkKey] = useState(0);
  const many = result.files.length > 1;
  const total = result.files.reduce((n, f) => n + f.bytes.length, 0);
  const celebrate = (fn: () => void) => {
    fn();
    setWinkKey((k) => k + 1);
  };
  return (
    <div ref={anchor} className="mx-auto max-w-[760px] scroll-mt-24">
      <div className="card p-6 text-center md:p-10">
        <Mascot mood="happy" size={88} interactive winkKey={winkKey} label="All done" />
        <h2 className="mt-3 font-display text-[26px] font-bold tracking-[-0.025em] text-fg">All done</h2>
        {result.summary && <div className="mx-auto mt-2 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">{result.summary}</div>}
        {!many && result.files[0]?.type.startsWith("image/") && <ImagePreview file={result.files[0]} />}
        {result.files.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => celebrate(() => downloadFile(many ? zipFiles(result.files) : result.files[0]))}
              className="btn btn-primary btn-lg max-w-full px-7"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span className="truncate">{many ? `Download all (${result.files.length} files, ZIP)` : `Download ${result.files[0].name}`}</span>
            </button>
          </div>
        )}
        {many && (
          <ul className="mx-auto mt-6 max-w-[560px] divide-y divide-line overflow-hidden rounded-xl bg-sunken text-left ring-1 ring-line">
            {result.files.map((f, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{f.name}</span>
                <span className="text-[12px] tabular-nums text-fg-muted">{formatBytes(f.bytes.length)}</span>
                <button type="button" onClick={() => celebrate(() => downloadFile(f))} className="text-[13px] font-semibold text-brand-300 hover:text-brand-200">
                  Download
                </button>
              </li>
            ))}
          </ul>
        )}
        {many && <p className="mt-2 text-[12px] text-fg-muted">{formatBytes(total)} in total</p>}
      </div>

      {result.text && (
        <div className="card mt-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="min-w-0 truncate font-mono text-[12px] text-fg-muted">{result.text.filename}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(result.text!.content);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="btn btn-ghost btn-sm"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => downloadFile({ name: result.text!.filename, bytes: new TextEncoder().encode(result.text!.content), type: "text/markdown" })}
                className="btn btn-ghost btn-sm"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </button>
            </div>
          </div>
          <pre className="thin-scroll max-h-[520px] overflow-auto whitespace-pre-wrap p-4 font-mono text-[13px] leading-relaxed text-fg">{result.text.content}</pre>
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <button type="button" onClick={onReset} className="btn btn-ghost">
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Start over with another file
        </button>
      </div>
    </div>
  );
}
