"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Clock, Cloud, FilePlus2, FileText, Loader2, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { MAX_FILE_MB, newBlankDocument, openFile, openRecent } from "@/lib/editor/actions";
import { deleteDocumentLocal, listRecent, type RecentDoc } from "@/lib/storage/local";
import { pickFiles } from "./filePicker";
import { useCloud } from "./cloud";
import { Button, cn } from "../ui/primitives";
import { Logo } from "../Logo";

export function UploadScreen() {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentDoc[]>([]);
  const cloud = useCloud();

  useEffect(() => {
    listRecent().then(setRecent).catch(() => {});
  }, []);

  const open = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(file.name);
    try {
      await openFile(file);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }, []);

  // Paste a PDF/image file from the clipboard.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = e.clipboardData?.files?.[0];
      if (f) {
        e.preventDefault();
        open(f);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [open]);

  return (
    <div
      className="min-h-dvh bg-[radial-gradient(ellipse_at_top,#eef2ff,transparent_60%)]"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        open(e.dataTransfer.files[0]);
      }}
    >
      <header className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
          <Logo className="h-7 w-7" /> Fusion Office
        </Link>
        {cloud.enabled && (
          <Link href="/dashboard" className="flex items-center gap-1.5 text-[13px] text-slate-600 hover:text-slate-900">
            <Cloud className="h-4 w-4" /> {cloud.user ? "My cloud documents" : "Sign in"}
          </Link>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-16 pt-10">
        <h1 className="text-center text-3xl font-semibold tracking-tight text-slate-900">PDF Editor</h1>
        <p className="mt-2 text-center text-[15px] text-slate-500">Edit, annotate, sign and reorganize PDFs right in your browser.</p>

        <div
          className={cn(
            "mt-8 flex flex-col items-center rounded-2xl border-2 border-dashed bg-white px-6 py-12 text-center shadow-sm transition",
            dragging ? "border-brand-500 bg-brand-50/60" : "border-slate-200",
          )}
        >
          {busy ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
              <p className="mt-4 text-[14px] text-slate-600">Opening {busy}…</p>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <UploadCloud className="h-7 w-7" />
              </div>
              <p className="mt-4 text-[16px] font-medium text-slate-800">Drag &amp; drop your PDF here</p>
              <p className="mt-1 text-[13px] text-slate-500">or paste it with {typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘V" : "Ctrl+V"}</p>
              <div className="mt-5 flex gap-2">
                <Button variant="primary" onClick={async () => open((await pickFiles("application/pdf,image/png,image/jpeg,image/webp"))[0])}>
                  <FileText className="h-4 w-4" /> Select file
                </Button>
                <Button onClick={() => newBlankDocument()}>
                  <FilePlus2 className="h-4 w-4" /> Blank document
                </Button>
              </div>
              <p className="mt-5 text-[12px] text-slate-400">PDF, PNG, JPG or WEBP · up to {MAX_FILE_MB} MB</p>
            </>
          )}
          {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700" role="alert">{error}</p>}
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Files are processed on your device and never uploaded unless you save to the cloud.
        </p>

        {recent.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-slate-400">
              <Clock className="h-3.5 w-3.5" /> Recent on this device
            </h2>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {recent.slice(0, 8).map((r) => (
                <li key={r.id} className="group flex items-center">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                    onClick={async () => {
                      setBusy(r.name);
                      try {
                        await openRecent(r.id);
                      } catch (e) {
                        setError((e as Error).message);
                        setBusy(null);
                      }
                    }}
                  >
                    <FileText className="h-5 w-5 shrink-0 text-red-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-slate-800">{r.name}</span>
                      <span className="block text-[12px] text-slate-500">
                        {r.pageCount} page{r.pageCount === 1 ? "" : "s"} · edited {timeAgo(r.updatedAt)}
                        {r.cloudId && " · in cloud"}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${r.name} from this device`}
                    title="Remove from this device"
                    className="mr-2 rounded-md p-2 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                    onClick={async () => {
                      await deleteDocumentLocal(r.id);
                      setRecent((list) => list.filter((x) => x.id !== r.id));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

function timeAgo(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(ts).toLocaleDateString();
}
