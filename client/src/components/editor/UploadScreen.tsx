"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Clock, Cloud, FilePlus2, FileText, LayoutGrid, Loader2, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { MAX_FILE_MB, newBlankDocument, openFile, openRecent } from "@/lib/editor/actions";
import { deleteDocumentLocal, listRecent, type RecentDoc } from "@/lib/storage/local";
import { takeFiles } from "@/lib/tools/handoff";
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

  // A file dropped on the homepage and sent to the editor opens straight away.
  useEffect(() => {
    const files = takeFiles();
    if (files?.[0]) open(files[0]);
  }, [open]);

  return (
    <div
      className="min-h-dvh bg-app"
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
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-display text-[17px] font-bold tracking-[-0.02em] text-fg">
            <Logo className="h-7 w-7" /> Fusion Office
          </Link>
          <div className="flex items-center gap-1">
            {cloud.enabled && (
              <Link href="/dashboard" className="btn btn-ghost btn-sm">
                <Cloud className="h-4 w-4" /> <span className="hidden sm:inline">{cloud.user ? "My cloud documents" : "Sign in"}</span>
              </Link>
            )}
            <Link href="/tools" className="btn btn-ghost btn-sm">
              <LayoutGrid className="h-4 w-4" /> <span className="hidden sm:inline">All tools</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-4 pb-16 pt-10 sm:px-6 md:pt-14">
        <p className="eyebrow text-center">Workspace</p>
        <h1 className="mt-2 text-center font-display text-[clamp(1.9rem,4vw,2.5rem)] font-bold tracking-[-0.035em] text-fg">PDF Editor</h1>
        <p className="mt-2 text-center text-[15px] text-fg-muted">Edit, annotate, sign and reorganize PDFs right in your browser.</p>

        <div className={cn("mt-8 rounded-[22px] border bg-surface p-2 shadow-card transition-colors", dragging ? "border-accent/70" : "border-line-strong")}>
          <div
            className={cn(
              "flex flex-col items-center rounded-[16px] border border-dashed px-6 py-12 text-center transition-colors",
              dragging ? "border-accent/60 bg-accent/[0.05]" : "border-line-strong bg-[radial-gradient(70%_90%_at_50%_0%,rgb(139_124_246/0.09),transparent)]",
            )}
          >
            {busy ? (
              <>
                <Loader2 className="h-9 w-9 animate-spin text-brand-300" />
                <p className="mt-4 max-w-full truncate text-[14px] text-fg-muted">Opening {busy}…</p>
              </>
            ) : (
              <>
                <span className={cn("flex h-14 w-14 items-center justify-center rounded-2xl ring-1", dragging ? "bg-accent text-on-accent ring-accent" : "bg-raised text-fg ring-line-strong")}>
                  <UploadCloud className="h-6 w-6" />
                </span>
                <p className="mt-5 font-display text-[20px] font-bold tracking-[-0.02em] text-fg">{dragging ? "Release to open" : "Drop your PDF here"}</p>
                <p className="mt-1.5 text-[13.5px] text-fg-muted">or paste it with {typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘V" : "Ctrl+V"}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button variant="primary" className="h-10 px-4" onClick={async () => open((await pickFiles("application/pdf,image/png,image/jpeg,image/webp"))[0])}>
                    <FileText className="h-4 w-4" /> Select file
                  </Button>
                  <Button variant="secondary" className="h-10 px-4" onClick={() => newBlankDocument()}>
                    <FilePlus2 className="h-4 w-4" /> Blank document
                  </Button>
                </div>
                <p className="mt-5 text-[12px] text-fg-subtle">PDF, PNG, JPG or WEBP · up to {MAX_FILE_MB} MB</p>
              </>
            )}
            {error && (
              <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-300 ring-1 ring-inset ring-red-500/25" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        <p className="mt-4 flex items-center justify-center gap-2 text-center text-[12.5px] text-fg-muted">
          <ShieldCheck className="h-4 w-4 shrink-0 text-accent" /> Files are processed on your device and never uploaded unless you save to the cloud.
        </p>

        {recent.length > 0 && (
          <section className="mt-12">
            <h2 className="eyebrow mb-3 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Recent on this device
            </h2>
            <ul className="card divide-y divide-line overflow-hidden">
              {recent.slice(0, 8).map((r) => (
                <li key={r.id} className="group flex items-center">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-raised"
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
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#ff7b70] text-[10px] font-extrabold text-[#0d0f14]">PDF</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-fg">{r.name}</span>
                      <span className="block text-[12px] text-fg-muted">
                        {r.pageCount} page{r.pageCount === 1 ? "" : "s"} · edited {timeAgo(r.updatedAt)}
                        {r.cloudId && " · in cloud"}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${r.name} from this device`}
                    title="Remove from this device"
                    className="mr-2 rounded-lg p-2 text-fg-subtle transition-colors hover:bg-red-500/10 hover:text-red-300 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
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
