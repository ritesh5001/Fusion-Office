"use client";

import { useState } from "react";
import { Download, Loader2, Plus, RotateCcw, RotateCw, Trash2, Undo2 } from "lucide-react";
import { toToolFile, downloadFile, PDF } from "@/lib/tools/files";
import { openPdf, renderToCanvas } from "@/lib/tools/pdfjs";
import { assemblePages, type PagePlanItem } from "@/lib/tools/processors/organize";
import { Dropzone } from "../Dropzone";
import { cn } from "../../ui/primitives";

type Item = PagePlanItem & { id: string; thumb?: string; label: string };

let n = 0;
const FILE_TINTS = ["bg-brand-600", "bg-orange-500", "bg-emerald-600", "bg-violet-600", "bg-rose-600"];

export function OrganizeTool() {
  const [sources, setSources] = useState<{ name: string; bytes: Uint8Array }[]>([]);
  // Items and undo history live together so every edit builds on the latest
  // state (rapid clicks can't overwrite each other).
  const [state, setState] = useState<{ items: Item[]; history: Item[][] }>({ items: [], history: [] });
  const { items, history } = state;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);

  const change = (fn: (current: Item[]) => Item[]) =>
    setState((s) => ({ items: fn(s.items), history: [...s.history.slice(-30), s.items] }));
  const undo = () => setState((s) => (s.history.length ? { items: s.history[s.history.length - 1], history: s.history.slice(0, -1) } : s));

  const add = async (files: File[]) => {
    setError(null);
    setBusy("Loading pages…");
    try {
      const added: Item[] = [];
      const newSources = [...sources];
      for (const f of files) {
        const tf = await toToolFile(f);
        const fileIndex = newSources.length;
        newSources.push({ name: tf.name, bytes: tf.bytes });
        const doc = await openPdf(tf.bytes);
        for (let p = 0; p < doc.numPages; p++) {
          const canvas = await renderToCanvas(doc, p, 0.3);
          added.push({ kind: "page", file: fileIndex, page: p, rotate: 0, id: `p${++n}`, thumb: canvas.toDataURL("image/jpeg", 0.7), label: `${p + 1}` });
        }
        await doc.destroy();
      }
      setSources(newSources);
      change((cur) => [...cur, ...added]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const update = (id: string, fn: (it: Item) => Item | null) =>
    change((cur) =>
      cur.flatMap((it) => {
        if (it.id !== id) return [it];
        const next = fn(it);
        return next ? [next] : [];
      }),
    );

  const moveTo = (id: string, targetId: string) => {
    if (id === targetId) return;
    change((cur) => {
      const next = [...cur];
      const from = next.findIndex((i) => i.id === id);
      const [it] = next.splice(from, 1);
      next.splice(next.findIndex((i) => i.id === targetId) + (from <= cur.findIndex((i) => i.id === targetId) ? 1 : 0), 0, it);
      return next;
    });
  };

  const save = async () => {
    if (!items.length) return setError("Keep at least one page.");
    setBusy("Building PDF…");
    try {
      const bytes = await assemblePages(sources.map((s) => s.bytes), items.map(({ id: _i, thumb: _t, label: _l, ...plan }) => plan as PagePlanItem));
      downloadFile({ name: sources.length === 1 ? sources[0].name.replace(/\.pdf$/i, "-organized.pdf") : "organized.pdf", bytes, type: PDF });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!sources.length) {
    return busy ? (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-fg-muted" aria-label="Loading" />
      </div>
    ) : (
      <Dropzone accept="application/pdf,.pdf" multiple onFiles={add} label="Select PDF files" />
    );
  }

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-2 mb-6 flex flex-wrap items-center gap-2 rounded-xl bg-raised/90 px-2 py-3 backdrop-blur">
        <span className="mr-auto text-[13px] text-fg-muted">
          {items.length} page{items.length === 1 ? "" : "s"} · drag to reorder
        </span>
        <button type="button" onClick={undo} disabled={!history.length} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] ring-1 ring-line-strong hover:bg-raised disabled:opacity-40">
          <Undo2 className="h-4 w-4" aria-hidden="true" /> Undo
        </button>
        <button type="button" onClick={() => change((cur) => [...cur].reverse())} className="h-9 rounded-full px-3 text-[13px] ring-1 ring-line-strong hover:bg-raised">
          Reverse order
        </button>
        <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] ring-1 ring-line-strong hover:bg-raised">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add PDF
          <input type="file" accept="application/pdf" multiple className="sr-only" onChange={(e) => e.target.files && add(Array.from(e.target.files))} />
        </label>
        <button type="button" onClick={save} disabled={!!busy} className="btn inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-[14px] font-medium text-on-accent hover:bg-accent-hover">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
          {busy ?? "Save PDF"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
          {error}
        </p>
      )}
      <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((it, i) => (
          <li
            key={it.id}
            draggable
            onDragStart={() => setDrag(it.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drag && moveTo(drag, it.id)}
            onDragEnd={() => setDrag(null)}
            className={cn("group relative rounded-xl bg-surface p-2 ring-1 ring-line transition", drag === it.id && "opacity-40")}
          >
            <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md bg-sunken">
              {it.kind === "page" && it.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.thumb} alt={`Page ${i + 1}`} className="max-h-full max-w-full shadow-sm transition-transform" style={{ transform: `rotate(${it.rotate}deg)` }} draggable={false} />
              ) : (
                <span className="text-[12px] text-fg-muted">Blank page</span>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[12px] tabular-nums text-fg-muted">
                {it.kind === "page" && sources.length > 1 && <span className={`h-2 w-2 rounded-full ${FILE_TINTS[it.file % FILE_TINTS.length]}`} title={sources[it.file].name} />}
                {i + 1}
              </span>
              <span className="flex opacity-70 transition group-hover:opacity-100">
                {it.kind === "page" && (
                  <>
                    <Btn label="Rotate left" onClick={() => update(it.id, (x) => ({ ...x, rotate: ((x.kind === "page" ? x.rotate : 0) + 270) % 360 }) as Item)}>
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Btn>
                    <Btn label="Rotate right" onClick={() => update(it.id, (x) => ({ ...x, rotate: ((x.kind === "page" ? x.rotate : 0) + 90) % 360 }) as Item)}>
                      <RotateCw className="h-3.5 w-3.5" />
                    </Btn>
                  </>
                )}
                <Btn
                  label="Insert blank page after"
                  onClick={() =>
                    change((cur) => {
                      const next = [...cur];
                      const at = next.findIndex((x) => x.id === it.id);
                      next.splice(at + 1, 0, { kind: "blank", width: 595.28, height: 841.89, id: `p${++n}`, label: "blank" });
                      return next;
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                </Btn>
                <Btn label="Delete page" onClick={() => update(it.id, () => null)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Btn>
              </span>
            </div>
          </li>
        ))}
      </ol>
      {sources.length > 1 && (
        <ul className="mt-6 flex flex-wrap gap-4 text-[12px] text-fg-muted">
          {sources.map((s, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${FILE_TINTS[i % FILE_TINTS.length]}`} /> {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Btn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-raised hover:text-fg">
      {children}
    </button>
  );
}
