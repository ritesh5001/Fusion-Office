"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toToolFile, downloadFile, derived, PDF, type ToolFile } from "@/lib/tools/files";
import { fillForm, listFields, type FieldInfo, type FieldValues } from "@/lib/tools/processors/forms";
import { Dropzone } from "../Dropzone";
import { Toggle } from "../controls";

const pretty = (name: string) => name.replace(/[._]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();

export function FormsTool() {
  const [file, setFile] = useState<ToolFile | null>(null);
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [values, setValues] = useState<FieldValues>({});
  const [flatten, setFlatten] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async ([f]: File[]) => {
    if (!f) return;
    setBusy(true);
    setError(null);
    try {
      const tf = await toToolFile(f);
      const found = await listFields(tf.bytes);
      setFile(tf);
      setFields(found);
      setValues(Object.fromEntries(found.filter((x) => x.kind !== "other").map((x) => [x.name, (x as { value: string | boolean | string[] }).value])));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!file) return;
    setBusy(true);
    try {
      downloadFile({ name: derived(file.name, flatten ? "filled-flat" : "filled"), bytes: await fillForm(file.bytes, values, flatten), type: PDF });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!file) {
    return (
      <>
        {busy ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-ink-soft" aria-label="Loading" />
          </div>
        ) : (
          <Dropzone accept="application/pdf,.pdf" multiple={false} onFiles={load} label="Select PDF form" />
        )}
        {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-center text-[13px] text-red-700">{error}</p>}
      </>
    );
  }

  if (!fields.length) {
    return (
      <div className="mx-auto max-w-[560px] rounded-2xl bg-white p-8 text-center ring-1 ring-ink/10">
        <h2 className="font-display text-[22px] font-semibold">No fillable fields found</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          This PDF is a flat document. You can still type anywhere on it with the editor&apos;s Text tool, then download it.
        </p>
        <Link href="/editor" className="btn mt-5 inline-flex h-11 items-center rounded-full bg-brand-600 px-6 text-[14px] font-medium text-white hover:bg-brand-700">
          Open in the editor
        </Link>
      </div>
    );
  }

  const input = "h-10 w-full rounded-lg bg-white px-3 text-[14px] ring-1 ring-rule outline-none focus:ring-2 focus:ring-brand-500";
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form className="space-y-5 rounded-2xl bg-white p-6 ring-1 ring-ink/10" onSubmit={(e) => e.preventDefault()}>
        <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-ink-soft">{fields.length} fields found</p>
        {fields.map((f) => {
          const id = `field-${f.name}`;
          if (f.kind === "checkbox")
            return <Toggle key={f.name} label={pretty(f.name)} checked={!!values[f.name]} onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))} />;
          return (
            <div key={f.name} className="space-y-1.5">
              <label htmlFor={id} className="block text-[13px] font-medium">
                {pretty(f.name)}
              </label>
              {f.kind === "text" &&
                (f.multiline ? (
                  <textarea id={id} rows={3} maxLength={f.maxLength} className={`${input} h-auto py-2`} value={String(values[f.name] ?? "")} onChange={(e) => setValues((s) => ({ ...s, [f.name]: e.target.value }))} />
                ) : (
                  <input id={id} maxLength={f.maxLength} className={input} value={String(values[f.name] ?? "")} onChange={(e) => setValues((s) => ({ ...s, [f.name]: e.target.value }))} />
                ))}
              {(f.kind === "dropdown" || f.kind === "radio") && (
                <select id={id} className={input} value={String(values[f.name] ?? "")} onChange={(e) => setValues((s) => ({ ...s, [f.name]: e.target.value }))}>
                  <option value="">Choose…</option>
                  {f.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              )}
              {f.kind === "list" && (
                <select id={id} multiple className={`${input} h-auto py-1`} value={(values[f.name] as string[]) ?? []} onChange={(e) => setValues((s) => ({ ...s, [f.name]: Array.from(e.target.selectedOptions, (o) => o.value) }))}>
                  {f.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              )}
              {f.kind === "other" && <p className="text-[12px] text-ink-soft">Signature or button field. Use the editor to sign.</p>}
            </div>
          );
        })}
      </form>
      <aside className="h-fit space-y-4 rounded-2xl bg-white p-5 ring-1 ring-ink/10 lg:sticky lg:top-24">
        <Toggle label="Flatten form" hint="Values become part of the page and can no longer be changed." checked={flatten} onChange={setFlatten} />
        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>}
        <button type="button" onClick={save} disabled={busy} className="btn inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 text-[15px] font-medium text-white hover:bg-brand-700">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />} Download filled PDF
        </button>
      </aside>
    </div>
  );
}
