"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText, History, Loader2, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

export interface CloudDoc {
  id: string;
  name: string;
  pageCount: number;
  updatedAt: string;
  versions: number;
}

export function DocumentList({ docs, onChange }: { docs: CloudDoc[]; onChange: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [versions, setVersions] = useState<{ number: number; label: string | null; createdAt: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const showVersions = async (id: string) => {
    if (open === id) return setOpen(null);
    setOpen(id);
    setVersions([]);
    const res = await apiFetch(`/api/documents/${id}/versions`);
    if (res.ok) setVersions((await res.json()).versions);
  };

  const restore = async (id: string, number: number) => {
    if (!confirm(`Restore version ${number}? The current state is kept as a new version.`)) return;
    setBusy(true);
    await apiFetch(`/api/documents/${id}/versions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ number }) });
    setBusy(false);
    window.location.href = `/editor?cloud=${id}`;
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete “${name}” from the cloud? This can't be undone.`)) return;
    await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
    onChange();
  };

  return (
    <ul className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {docs.map((d) => (
        <li key={d.id}>
          <div className="group flex items-center gap-3 px-4 py-3">
            <FileText className="h-5 w-5 shrink-0 text-red-500" />
            <Link href={`/editor?cloud=${d.id}`} className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-slate-800 group-hover:text-brand-700">{d.name}</span>
              <span className="block text-[12px] text-slate-500">
                {d.pageCount} pages · updated {new Date(d.updatedAt).toLocaleString()}
              </span>
            </Link>
            <button type="button" onClick={() => showVersions(d.id)} className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-slate-600 hover:bg-slate-100">
              <History className="h-3.5 w-3.5" /> {d.versions} version{d.versions === 1 ? "" : "s"}
            </button>
            <button type="button" aria-label={`Delete ${d.name}`} onClick={() => remove(d.id, d.name)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {open === d.id && (
            <div className="bg-slate-50 px-12 py-2">
              {versions.length === 0 ? (
                <p className="py-1 text-[12px] text-slate-500">No saved versions. Use “Save to cloud” in the editor to create one.</p>
              ) : (
                versions.map((v) => (
                  <div key={v.number} className="flex items-center justify-between py-1 text-[12px]">
                    <span className="text-slate-700">
                      v{v.number} {v.label && <span className="text-slate-500">· {v.label}</span>}
                      <span className="text-slate-400"> · {new Date(v.createdAt).toLocaleString()}</span>
                    </span>
                    <button type="button" disabled={busy} onClick={() => restore(d.id, v.number)} className="flex items-center gap-1 text-brand-600 hover:underline disabled:opacity-50">
                      {busy && <Loader2 className="h-3 w-3 animate-spin" />} Restore
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
