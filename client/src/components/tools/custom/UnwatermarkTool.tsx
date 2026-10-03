"use client";

import { useState } from "react";
import { Check, Download, Loader2, RotateCcw, Search } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { derived, downloadFile, formatBytes, PDF, toToolFile, type ToolFile } from "@/lib/tools/files";
import { openPdf, pageTextRuns } from "@/lib/tools/pdfjs";
import { analyzeWatermarks, removeWatermarks, type Analysis, type RemoveReport, type WatermarkCandidate } from "@/lib/tools/processors/unwatermark";
import { findMatches } from "@/lib/tools/processors/redact";
import type { UserRect } from "@/lib/pdf/textRemoval";
import { Dropzone } from "../Dropzone";
import { TextInput } from "../controls";
import { cn } from "../../ui/primitives";

/** Render part of a page (user-space box, padded) to a data URL for a preview. */
async function crop(pdf: PDFDocumentProxy, pageIndex: number, box: UserRect | null, maxW = 220): Promise<string> {
  const page = await pdf.getPage(pageIndex + 1);
  const base = page.getViewport({ scale: 1 });
  let [x0, y0, x1, y1] = box ? base.convertToViewportRectangle(box) : [0, 0, base.width, base.height];
  [x0, x1] = [Math.min(x0, x1), Math.max(x0, x1)];
  [y0, y1] = [Math.min(y0, y1), Math.max(y0, y1)];
  const pad = Math.max(8, (x1 - x0) * 0.1);
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(base.width, x1 + pad);
  y1 = Math.min(base.height, y1 + pad);
  const scale = Math.min(4, maxW / Math.max(1, x1 - x0));
  const vp = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((x1 - x0) * scale));
  canvas.height = Math.max(1, Math.round((y1 - y0) * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(-x0 * scale, -y0 * scale);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return canvas.toDataURL("image/png");
}

export function UnwatermarkTool() {
  const [file, setFile] = useState<ToolFile | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [terms, setTerms] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(RemoveReport & { before: string; after: string; page: number }) | null>(null);

  const reset = () => {
    setFile(null);
    setAnalysis(null);
    setPreviews({});
    setChosen(new Set());
    setTerms("");
    setResult(null);
    setError(null);
  };

  const load = async ([f]: File[]) => {
    if (!f) return;
    setError(null);
    setBusy("Looking for watermarks…");
    try {
      const tf = await toToolFile(f);
      const a = await analyzeWatermarks(tf.bytes);
      setFile(tf);
      setAnalysis(a);
      setChosen(new Set(a.candidates.filter((c) => c.likely).map((c) => c.id)));
      const pdf = await openPdf(tf.bytes);
      const out: Record<string, string> = {};
      for (const c of a.candidates.slice(0, 20)) if (c.preview) out[c.id] = await crop(pdf, c.preview.page, c.preview.box);
      setPreviews(out);
      await pdf.destroy();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const run = async () => {
    if (!file || !analysis) return;
    const words = terms.split(",").map((t) => t.trim()).filter(Boolean);
    if (!chosen.size && !words.length) return setError("Tick at least one watermark, or type the text to remove.");
    setError(null);
    try {
      let textBoxes: UserRect[][] | undefined;
      if (words.length) {
        setBusy("Finding the text…");
        const pdf = await openPdf(file.bytes);
        const pages = [];
        for (let i = 0; i < pdf.numPages; i++) pages.push((await pageTextRuns(pdf, i)).runs);
        await pdf.destroy();
        textBoxes = findMatches(pages, words, { caseSensitive: false, wholeWord: false });
        if (!textBoxes.some((b) => b.length) && !chosen.size) {
          setBusy(null);
          return setError(`Couldn't find “${words.join(", ")}” as text in this PDF. If it's part of a picture, it can't be removed as text.`);
        }
      }
      setBusy("Removing…");
      const report = await removeWatermarks(file.bytes, analysis, { ids: [...chosen], textBoxes });
      // Before/after of the first page that changed.
      const firstPage = Math.min(...[...chosen].flatMap((id) => analysis.candidates.find((c) => c.id === id)?.pages ?? []), ...(textBoxes ?? []).map((b, i) => (b.length ? i : Infinity)), analysis.pageCount - 1);
      const [a, b] = await Promise.all([openPdf(file.bytes), openPdf(report.bytes)]);
      const before = await crop(a, firstPage, null, 360);
      const after = await crop(b, firstPage, null, 360);
      await Promise.all([a.destroy(), b.destroy()]);
      setResult({ ...report, before, after, page: firstPage });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!file || !analysis) {
    return (
      <div>
        {busy ? (
          <div className="flex flex-col items-center gap-3 py-20 text-[14px] text-fg-muted">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> {busy}
          </div>
        ) : (
          <Dropzone accept="application/pdf,.pdf" multiple={false} onFiles={load} label="Select PDF file" />
        )}
        {error && <p role="alert" className="mt-4 rounded-md bg-red-500/10 px-3 py-2 text-center text-[13px] text-red-300">{error}</p>}
        <p className="mt-4 text-center text-[12px] text-fg-muted">For documents you own or have permission to change.</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-[820px] rounded-2xl bg-surface p-6 ring-1 ring-line md:p-8">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
            <Check className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-display text-[26px] font-semibold tracking-[-0.02em]">Watermark removed</h2>
          <p className="mt-2 text-[15px] text-fg-muted">
            {result.removed} item{result.removed === 1 ? "" : "s"} taken out of the file · {formatBytes(result.bytes.length)}
          </p>
          {result.textMissed.length > 0 && (
            <p className="mx-auto mt-3 max-w-[60ch] rounded-lg bg-amber-500/10 px-3 py-2 text-[13px] text-amber-200">
              Some of the text you typed couldn't be removed on page{result.textMissed.length === 1 ? "" : "s"} {result.textMissed.map((p) => p + 1).join(", ")} (it uses a special font or sits inside a drawing). Try ticking a watermark from the list instead.
            </p>
          )}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            ["Before", result.before],
            ["After", result.after],
          ].map(([label, src]) => (
            <figure key={label} className="rounded-xl bg-sunken p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${label}, page ${result.page + 1}`} className="mx-auto max-h-[420px] shadow-sm" />
              <figcaption className="mt-2 text-center text-[12px] text-fg-muted">
                {label} · page {result.page + 1}
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => downloadFile({ name: derived(file.name, "no-watermark"), bytes: result.bytes, type: PDF })} className="btn inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 text-[15px] font-medium text-on-accent hover:bg-accent-hover">
            <Download className="h-4 w-4" aria-hidden="true" /> Download PDF
          </button>
          <button type="button" onClick={() => setResult(null)} className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-[14px] ring-1 ring-line hover:bg-raised">
            Change selection
          </button>
          <button type="button" onClick={reset} className="inline-flex h-12 items-center gap-1.5 px-3 text-[14px] text-fg-muted hover:text-fg">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Another file
          </button>
        </div>
      </div>
    );
  }

  const toggle = (c: WatermarkCandidate) =>
    setChosen((s) => {
      const n = new Set(s);
      if (n.has(c.id)) n.delete(c.id);
      else n.add(c.id);
      return n;
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        <p className="text-[14px] text-fg-muted">
          <span className="font-medium text-fg">{file.name}</span> · {analysis.pageCount} page{analysis.pageCount === 1 ? "" : "s"}
        </p>
        {analysis.candidates.length ? (
          <ul className="space-y-2.5">
            {analysis.candidates.map((c) => (
              <li key={c.id}>
                <label className={cn("flex cursor-pointer items-center gap-4 rounded-xl bg-surface p-3 ring-1 transition", chosen.has(c.id) ? "ring-brand-500" : "ring-line hover:ring-line-strong")}>
                  <input type="checkbox" checked={chosen.has(c.id)} onChange={() => toggle(c)} className="h-4 w-4 shrink-0 accent-brand-500" />
                  <span className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-sunken">
                    {previews[c.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previews[c.id]} alt="" className="max-h-full max-w-full" />
                    ) : (
                      <span className="text-[11px] text-fg-muted">{c.kind === "annotation" || c.kind === "stamp" ? "Annotation" : "—"}</span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{c.label}</span>
                    <span className="block text-[12px] text-fg-muted">
                      {c.reason} · {c.pages.length === analysis.pageCount ? "every page" : `${c.pages.length} of ${analysis.pageCount} pages`}
                      {c.count > c.pages.length ? ` · ${c.count} times` : ""}
                    </span>
                  </span>
                  {c.likely && <span className="hidden shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 sm:inline">Likely watermark</span>}
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl bg-surface p-6 text-center ring-1 ring-line">
            <Search className="mx-auto h-6 w-6 text-fg-muted" aria-hidden="true" />
            <p className="mt-2 text-[14px] font-medium">No watermark found automatically</p>
            <p className="mx-auto mt-1 max-w-[46ch] text-[13px] text-fg-muted">If the watermark is text, type it on the right. If it&apos;s part of a scanned page, turn the page into an image and use Remove watermark from image.</p>
          </div>
        )}
      </div>
      <aside className="h-fit space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line lg:sticky lg:top-24">
        <TextInput label="Also remove this text" hint="Words or phrases, separated by commas. Removed from every page." value={terms} onChange={setTerms} placeholder="e.g. CONFIDENTIAL, Draft copy" />
        {error && <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-[13px] text-red-300">{error}</p>}
        <button type="button" onClick={run} disabled={!!busy} className="btn inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-medium text-on-accent hover:bg-accent-hover disabled:opacity-80">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {busy ?? "Remove watermark"}
        </button>
        <p className="text-[12px] leading-relaxed text-fg-muted">The chosen items are deleted from the file, not covered up. Everything else on the page stays exactly as it was. Use this on documents you own or have permission to change.</p>
        <button type="button" onClick={reset} className="text-[13px] text-fg-muted hover:text-fg">
          Choose another file
        </button>
      </aside>
    </div>
  );
}
