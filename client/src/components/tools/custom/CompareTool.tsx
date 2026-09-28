"use client";

import { useState } from "react";
import { FileText, Loader2, X } from "lucide-react";
import { toToolFile, type ToolFile } from "@/lib/tools/files";
import { compareText, compareVisual, type TextComparison, type VisualPage } from "@/lib/tools/processors/compare";
import { Dropzone } from "../Dropzone";
import { cn } from "../../ui/primitives";

export function CompareTool() {
  const [a, setA] = useState<ToolFile | null>(null);
  const [b, setB] = useState<ToolFile | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState<TextComparison | null>(null);
  const [visual, setVisual] = useState<VisualPage[] | null>(null);
  const [tab, setTab] = useState<"text" | "visual">("text");
  const [onlyChanges, setOnlyChanges] = useState(true);

  const run = async () => {
    if (!a || !b) return;
    setError(null);
    try {
      setBusy("Comparing text…");
      setText(await compareText(a.bytes, b.bytes));
      setBusy("Comparing pages…");
      setVisual(await compareVisual(a.bytes, b.bytes, (d, t) => setBusy(`Comparing page ${Math.min(d + 1, t)} of ${t}…`)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const slot = (label: string, file: ToolFile | null, set: (f: ToolFile | null) => void) => (
    <div>
      <p className="mb-2 font-mono text-[12px] uppercase tracking-[0.12em] text-ink-soft">{label}</p>
      {file ? (
        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-ink/10">
          <FileText className="h-5 w-5 text-red-500" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-[14px]">{file.name}</span>
          <button type="button" aria-label={`Remove ${file.name}`} onClick={() => (set(null), setText(null), setVisual(null))} className="rounded-md p-1 text-ink-soft hover:bg-paper-deep">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <Dropzone compact accept="application/pdf,.pdf" multiple={false} onFiles={async ([f]) => f && set(await toToolFile(f))} label={`Choose ${label.toLowerCase()}`} />
      )}
    </div>
  );

  const shown = text ? (onlyChanges ? text.ops.map((o, i) => ({ o, i })).filter(({ o, i }) => o.op !== "same" || text.ops.slice(Math.max(0, i - 1), i + 2).some((x) => x.op !== "same")) : text.ops.map((o, i) => ({ o, i }))) : [];

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {slot("Original", a, setA)}
        {slot("New version", b, setB)}
      </div>
      <div className="mt-6 flex justify-center">
        <button type="button" onClick={run} disabled={!a || !b || !!busy} className="btn inline-flex h-12 items-center gap-2 rounded-full bg-brand-600 px-7 text-[15px] font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ?? "Compare"}
        </button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-center text-[13px] text-red-700">{error}</p>}

      {text && (
        <div className="mt-10">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-full bg-white p-1 ring-1 ring-rule">
              {(["text", "visual"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)} className={cn("h-8 rounded-full px-4 text-[13px] capitalize", tab === t ? "bg-ink text-paper" : "text-ink-soft")}>
                  {t === "text" ? "Text changes" : "Visual"}
                </button>
              ))}
            </div>
            <span className="text-[13px] text-ink-soft">
              <span className="font-medium text-emerald-700">+{text.added} added</span> · <span className="font-medium text-red-700">−{text.removed} removed</span> lines
            </span>
            {tab === "text" && (
              <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-soft">
                <input type="checkbox" checked={onlyChanges} onChange={(e) => setOnlyChanges(e.target.checked)} className="accent-brand-600" /> Only show changes
              </label>
            )}
          </div>

          {tab === "text" ? (
            <div className="mt-4 overflow-hidden rounded-2xl bg-white ring-1 ring-ink/10">
              {shown.length === 0 ? (
                <p className="p-6 text-center text-[14px] text-ink-soft">The text of both versions is identical.</p>
              ) : (
                <ol className="thin-scroll max-h-[640px] overflow-auto font-mono text-[13px] leading-relaxed">
                  {shown.map(({ o, i }) => (
                    <li key={i} className={cn("flex gap-3 px-4 py-0.5", o.op === "add" && "bg-emerald-50 text-emerald-900", o.op === "del" && "bg-red-50 text-red-900 line-through decoration-red-300")}>
                      <span className="w-3 shrink-0 select-none text-ink-soft">{o.op === "add" ? "+" : o.op === "del" ? "−" : ""}</span>
                      <span className="whitespace-pre-wrap">{o.text}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-8">
              {!visual && <Loader2 className="mx-auto h-6 w-6 animate-spin text-ink-soft" aria-label="Rendering" />}
              {visual?.map((p, i) => (
                <section key={i}>
                  <h3 className="mb-2 text-[13px] font-medium">
                    Page {i + 1}{" "}
                    <span className="font-normal text-ink-soft">
                      {!p.a ? "· only in the new version" : !p.b ? "· removed in the new version" : p.changed < 0.0005 ? "· no visible changes" : `· ${(p.changed * 100).toFixed(1)}% of the page changed`}
                    </span>
                  </h3>
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      { src: p.a, label: "Original" },
                      { src: p.b, label: "New version" },
                      { src: p.overlay, label: "Changes in red" },
                    ].map((v) => (
                      <figure key={v.label} className="rounded-xl bg-white p-2 ring-1 ring-ink/10">
                        {v.src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.src} alt={`${v.label}, page ${i + 1}`} className="w-full" />
                        ) : (
                          <div className="flex aspect-[3/4] items-center justify-center text-[12px] text-ink-soft">No page</div>
                        )}
                        <figcaption className="mt-1.5 text-center text-[12px] text-ink-soft">{v.label}</figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
