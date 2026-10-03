"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Download, Loader2, Play, Plus, Save, Trash2 } from "lucide-react";
import { TOOLS, toolBySlug } from "@/lib/tools/registry";
import { downloadFile, formatBytes, toToolFile, zipFiles, type ToolFile } from "@/lib/tools/files";
import { SPECS } from "../specs";
import type { LoadedFile } from "../ToolRunner";
import { Dropzone } from "../Dropzone";
import { ToolIcon } from "../icons";

interface Step {
  id: string;
  slug: string;
  options: Record<string, unknown>;
}
interface SavedWorkflow {
  name: string;
  steps: Step[];
}

const STORE = "fusion-office.workflows";
const CHAINABLE = TOOLS.filter((t) => t.chainable && SPECS[t.slug]);
let n = 0;

const loadSaved = (): SavedWorkflow[] => {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "[]");
  } catch {
    return [];
  }
};

/** Passwords are never saved with a workflow. */
const strip = (steps: Step[]) => steps.map((s) => ({ ...s, options: Object.fromEntries(Object.entries(s.options).filter(([k]) => !/password|confirm|image/i.test(k))) }));

export function WorkflowsTool() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [saved, setSaved] = useState<SavedWorkflow[]>([]);
  const [name, setName] = useState("");
  const [files, setFiles] = useState<ToolFile[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<ToolFile[] | null>(null);

  useEffect(() => setSaved(loadSaved()), []);

  const addStep = (slug: string) => {
    const spec = SPECS[slug];
    setSteps((s) => [...s, { id: `w${++n}`, slug, options: { ...(spec.defaults as object) } }]);
    setOutput(null);
  };

  const save = () => {
    if (!name.trim() || !steps.length) return setError("Give the workflow a name and at least one step.");
    const next = [{ name: name.trim(), steps: strip(steps) }, ...saved.filter((w) => w.name !== name.trim())];
    localStorage.setItem(STORE, JSON.stringify(next));
    setSaved(next);
    setError(null);
  };

  const run = async () => {
    if (!steps.length) return setError("Add at least one step.");
    if (!files.length) return setError("Add at least one PDF.");
    const protectAt = steps.findIndex((s) => s.slug === "protect-pdf");
    if (protectAt >= 0 && protectAt !== steps.length - 1) return setError("Protect PDF must be the last step, since later steps can't open a locked file.");
    for (const s of steps) {
      const problem = SPECS[s.slug].validate?.([], s.options as never);
      if (problem) return setError(`${toolBySlug(s.slug)?.name}: ${problem}`);
    }
    setError(null);
    setOutput(null);
    try {
      const results: ToolFile[] = [];
      for (const [fi, file] of files.entries()) {
        let current: LoadedFile[] = [{ ...file, id: `in${fi}` }];
        for (const [si, step] of steps.entries()) {
          setBusy(`${file.name}: step ${si + 1} of ${steps.length} (${toolBySlug(step.slug)?.name})`);
          const res = await SPECS[step.slug].run(current, step.options as never, () => {});
          current = res.files.map((f, k) => ({ ...f, id: `s${si}-${k}` }));
          // Keep the original name through the chain; each tool adds its own suffix.
          current = current.map((f) => ({ ...f, name: file.name }));
        }
        results.push(...current.map((f) => ({ ...f, name: f.name.replace(/\.pdf$/i, "-processed.pdf") })));
      }
      setOutput(results);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {saved.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-fg-muted">Saved:</span>
            {saved.map((w) => (
              <span key={w.name} className="inline-flex items-center rounded-full bg-sunken ring-1 ring-line">
                <button type="button" onClick={() => (setSteps(w.steps.map((s) => ({ ...s, id: `w${++n}` }))), setName(w.name), setOutput(null))} className="h-8 px-3 text-[13px] hover:text-brand-300">
                  {w.name}
                </button>
                <button
                  type="button"
                  aria-label={`Delete workflow ${w.name}`}
                  onClick={() => {
                    const next = saved.filter((x) => x.name !== w.name);
                    localStorage.setItem(STORE, JSON.stringify(next));
                    setSaved(next);
                  }}
                  className="h-8 pr-2.5 text-fg-muted hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <ol className="space-y-3">
          {steps.map((s, i) => {
            const tool = toolBySlug(s.slug)!;
            const spec = SPECS[s.slug];
            const Options = spec.Options;
            return (
              <li key={s.id} className="rounded-2xl bg-surface ring-1 ring-line">
                <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <span className="font-mono text-[12px] text-fg-muted">{String(i + 1).padStart(2, "0")}</span>
                  <ToolIcon name={tool.icon} className="h-4 w-4 text-fg-muted" />
                  <span className="flex-1 text-[14px] font-medium">{tool.name}</span>
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => setSteps((all) => { const x = [...all]; [x[i - 1], x[i]] = [x[i], x[i - 1]]; return x; })} className="rounded-md p-1.5 text-fg-muted hover:bg-raised disabled:opacity-30">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Move down" disabled={i === steps.length - 1} onClick={() => setSteps((all) => { const x = [...all]; [x[i + 1], x[i]] = [x[i], x[i + 1]]; return x; })} className="rounded-md p-1.5 text-fg-muted hover:bg-raised disabled:opacity-30">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Remove step" onClick={() => setSteps((all) => all.filter((x) => x.id !== s.id))} className="rounded-md p-1.5 text-fg-muted hover:bg-red-500/10 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {Options && (
                  <div className="space-y-4 p-4">
                    <Options options={s.options as never} set={(patch) => setSteps((all) => all.map((x) => (x.id === s.id ? { ...x, options: { ...x.options, ...(patch as object) } } : x)))} files={[]} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        <div className="rounded-2xl border-2 border-dashed border-line-strong/60 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[13px] font-medium">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add a step
          </p>
          <div className="flex flex-wrap gap-2">
            {CHAINABLE.map((t) => (
              <button key={t.slug} type="button" onClick={() => addStep(t.slug)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-sunken px-3 text-[13px] ring-1 ring-line-strong hover:ring-brand-500">
                <ToolIcon name={t.icon} className="h-3.5 w-3.5 text-fg-muted" /> {t.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-line lg:sticky lg:top-24">
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workflow name" aria-label="Workflow name" className="h-10 min-w-0 flex-1 rounded-lg bg-sunken px-3 text-[14px] text-fg ring-1 ring-line-strong outline-none placeholder:text-fg-subtle focus:ring-2 focus:ring-brand-500" />
          <button type="button" onClick={save} className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[13px] ring-1 ring-line hover:bg-raised">
            <Save className="h-4 w-4" aria-hidden="true" /> Save
          </button>
        </div>
        <Dropzone compact accept="application/pdf,.pdf" multiple onFiles={async (list) => setFiles(await Promise.all(list.map(toToolFile)))} label={files.length ? `${files.length} PDF${files.length === 1 ? "" : "s"} selected` : "Choose PDFs"} />
        {error && <p role="alert" className="rounded-md bg-red-500/10 px-3 py-2 text-[13px] text-red-300">{error}</p>}
        <button type="button" onClick={run} disabled={!!busy} className="btn inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-medium text-on-accent hover:bg-accent-hover">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />} Run workflow
        </button>
        {busy && <p className="text-[12px] text-fg-muted">{busy}</p>}
        {output && (
          <button type="button" onClick={() => downloadFile(output.length > 1 ? zipFiles(output, "workflow.zip") : output[0])} className="btn inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 text-[14px] font-medium text-white hover:bg-emerald-700">
            <Download className="h-4 w-4" aria-hidden="true" /> Download {output.length > 1 ? `${output.length} files (ZIP)` : `(${formatBytes(output[0].bytes.length)})`}
          </button>
        )}
        <p className="text-[12px] leading-relaxed text-fg-muted">Workflows are saved in this browser. Passwords and images are never saved.</p>
      </aside>
    </div>
  );
}
