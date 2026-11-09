"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Download, FolderOpen, Link2, Loader2, PenLine } from "lucide-react";
import { Logo } from "../Logo";
import { cn } from "../ui/primitives";
import { Dropzone } from "../tools/Dropzone";
import { ToolIcon } from "../tools/icons";
import { TOOLS } from "@/lib/tools/registry";
import { accepts, appPath, handFiles } from "@/lib/tools/handoff";
import { pickerAccept } from "@/lib/tools/pickerAccept";
import { inApp } from "@/lib/embed";
import { EDITOR_FOR, KIND_LABEL, VIEWER_ACCEPT, extOf, nameFromUrl, safeDocUrl, viewKind, type ViewKind } from "@/lib/viewer/detect";
import { DocView, ImageView, MarkdownView, PdfView, SheetView, SlidesView, TextView } from "./views";

interface Opened {
  file: File;
  kind: ViewKind;
  /** Set when the document came from a link: offers a download. */
  fromUrl?: string;
}

/** The PWA "Open with" launch queue (Chrome, Edge), when the site is installed as an app. */
type LaunchQueue = { setConsumer: (fn: (p: { files?: { getFile: () => Promise<File> }[] }) => void) => void };

const formatBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/**
 * Document viewer: anyone can open a PDF, Word, Excel, PowerPoint, image,
 * Markdown or text file and read it, without signing in. Files are read in
 * this browser and never uploaded (old .doc/.xls/.ppt files are converted on
 * the server first, the same way the editors open them).
 */
export default function ViewerApp() {
  const router = useRouter();
  const [opened, setOpened] = useState<Opened | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");

  const open = useCallback((file: File, fromUrl?: string) => {
    const kind = viewKind(file.name, file.type);
    if (!kind) {
      setError(`Fusion Office can't show ${extOf(file.name) ? `.${extOf(file.name)}` : "this kind of"} file yet. Try a PDF, Word, Excel, PowerPoint, image or text file.`);
      return;
    }
    setError(null);
    setOpened({ file, kind, fromUrl });
    document.title = `${file.name} · Viewer | Fusion Office`;
  }, []);

  const openUrl = useCallback(
    async (raw: string) => {
      const url = safeDocUrl(raw);
      if (!url) return setError("Paste a full link that starts with https://");
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`The link answered with an error (${res.status}).`);
        const blob = await res.blob();
        open(new File([blob], nameFromUrl(url), { type: blob.type }), url);
      } catch (e) {
        const msg = (e as Error).message;
        setError(msg.startsWith("The link") ? msg : "That site doesn't let other sites open its files. Download the file, then open it here.");
      } finally {
        setBusy(false);
      }
    },
    [open],
  );

  // Opened from the installed app's "Open with" menu, or with /viewer?url=…
  useEffect(() => {
    const queue = (window as unknown as { launchQueue?: LaunchQueue }).launchQueue;
    queue?.setConsumer(async (p) => {
      const handle = p.files?.[0];
      if (handle) open(await handle.getFile());
    });
    const url = new URLSearchParams(window.location.search).get("url");
    if (url) {
      setLink(url);
      void openUrl(url);
    }
  }, [open, openUrl]);

  // The mobile app shows Word, Excel and PowerPoint files here: it hands the
  // file over as base64 (it never leaves the phone) and draws its own header.
  const [embedded] = useState(inApp);
  useEffect(() => {
    const w = window as unknown as { __foViewerOpen?: (name: string, type: string, b64: string) => void };
    w.__foViewerOpen = (name, type, b64) => {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      open(new File([bytes], name, { type }));
    };
    return () => {
      delete w.__foViewerOpen;
    };
  }, [open]);

  // Drop another file anywhere to switch to it.
  useEffect(() => {
    if (!opened) return;
    const over = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      const f = e.dataTransfer?.files?.[0];
      if (!f) return;
      e.preventDefault();
      open(f);
    };
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [opened, open]);

  const pickAnother = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = pickerAccept(VIEWER_ACCEPT);
    input.onchange = () => input.files?.[0] && open(input.files[0]);
    input.click();
  };

  const download = () => {
    if (!opened) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(opened.file);
    a.download = opened.file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  };

  const handTo = (href: string) => {
    if (!opened) return;
    handFiles(href, [opened.file]);
    router.push(href);
  };

  const editor = opened ? EDITOR_FOR[opened.kind] : undefined;
  // Other tools that take this file, best known first.
  const more = useMemo(() => {
    if (!opened) return [];
    return TOOLS.filter((t) => t.status === "ready" && !t.href && accepts(t, opened.file)).slice(0, 6);
  }, [opened]);

  return (
    <div className="flex h-dvh flex-col bg-app">
      <header className={cn("flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-2", embedded && "hidden")}>
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-raised" title="Fusion Office home">
          <Logo className="h-6 w-6" />
        </Link>
        <div className="min-w-0 flex-1">
          {opened ? (
            <>
              <p className="truncate text-[14px] font-semibold text-fg">{opened.file.name}</p>
              <p className="truncate text-[11.5px] text-fg-subtle">
                {KIND_LABEL[opened.kind]} · {formatBytes(opened.file.size)} · opened on this device
              </p>
            </>
          ) : (
            <p className="text-[14px] font-semibold text-fg">Document viewer</p>
          )}
        </div>
        {opened && (
          <>
            {editor && (
              <button type="button" onClick={() => handTo(editor.href)} className="btn btn-secondary hidden h-9 px-3 text-[13px] sm:inline-flex">
                <PenLine className="h-4 w-4" aria-hidden="true" /> {editor.label}
              </button>
            )}
            {opened.fromUrl && (
              <button type="button" onClick={download} className="btn btn-secondary h-9 px-3 text-[13px]" title="Download">
                <Download className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}
            <button type="button" onClick={pickAnother} className="btn btn-primary h-9 px-3 text-[13px]" title="Open another file">
              <FolderOpen className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Open</span>
            </button>
          </>
        )}
      </header>

      {opened ? (
        <>
          {!embedded && (more.length > 0 || editor) && (
            <nav aria-label="Do more with this file" className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-line bg-surface/60 px-3 py-2">
              <span className="shrink-0 text-[12px] text-fg-subtle">Do more:</span>
              {editor && (
                <button type="button" onClick={() => handTo(editor.href)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-1 text-[12.5px] text-fg hover:border-line-strong sm:hidden">
                  <PenLine className="h-3.5 w-3.5" aria-hidden="true" /> {editor.label}
                </button>
              )}
              {more.map((t) => (
                <button key={t.slug} type="button" onClick={() => handTo(appPath(t))} className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-1 text-[12.5px] text-fg hover:border-line-strong">
                  <ToolIcon name={t.icon} className="h-3.5 w-3.5" /> {t.name}
                </button>
              ))}
            </nav>
          )}
          <main id="main" className="min-h-0 flex-1 overflow-auto">
            <Body key={`${opened.file.name}-${opened.file.size}-${opened.file.lastModified}`} opened={opened} />
          </main>
        </>
      ) : (
        <main id="main" className="flex-1 overflow-auto px-4 py-10">
          <div className="mx-auto max-w-[720px]">
            <h1 className="text-center font-display text-[28px] font-semibold tracking-tight text-fg sm:text-[34px]">Open any document</h1>
            <p className="mx-auto mt-2 max-w-[520px] text-center text-[15px] leading-relaxed text-fg-muted">
              View PDF, Word, Excel, PowerPoint, images, Markdown and text files right in your browser. No sign-in, nothing to install, and the file stays on your device.
            </p>
            <div className="mt-8">
              <Dropzone accept={VIEWER_ACCEPT} multiple={false} label="Choose a document to view" onFiles={(files) => files[0] && open(files[0])} />
            </div>
            <form
              className="mt-5 flex flex-col gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                void openUrl(link);
              }}
            >
              <label className="sr-only" htmlFor="viewer-url">
                Link to a document
              </label>
              <div className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-line-strong">
                <Link2 className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                <input
                  id="viewer-url"
                  type="url"
                  inputMode="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="…or paste a link to a PDF or document"
                  className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-subtle"
                />
              </div>
              <button type="submit" disabled={busy || !link.trim()} className="btn btn-secondary h-11 px-4 text-[14px] disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />} Open link
              </button>
            </form>
            {error && (
              <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[14px] text-red-200">
                {error}
              </p>
            )}
            <ul className="mt-8 grid gap-2 text-[13.5px] text-fg-muted sm:grid-cols-2">
              <li>• PDF: every page, zoom in and out, password-protected files too.</li>
              <li>• Word (.docx, .doc, .odt, .rtf): text, headings, lists, tables, images.</li>
              <li>• Excel (.xlsx, .xls, .ods, .csv): every sheet, with number formats.</li>
              <li>• PowerPoint (.pptx, .ppt, .odp): every slide with its notes.</li>
              <li>• Images: JPG, PNG, WEBP, GIF, SVG and more.</li>
              <li>• Markdown, TXT, JSON, XML and other text files.</li>
            </ul>
          </div>
        </main>
      )}
    </div>
  );
}

function Body({ opened }: { opened: Opened }) {
  const { file, kind } = opened;
  switch (kind) {
    case "pdf":
      return <PdfView file={file} />;
    case "image":
      return <ImageView file={file} />;
    case "docx":
      return <DocView file={file} />;
    case "xlsx":
    case "csv":
      return <SheetView file={file} csv={kind === "csv"} />;
    case "pptx":
      return <SlidesView file={file} />;
    case "markdown":
      return <MarkdownView file={file} />;
    default:
      return <TextView file={file} />;
  }
}
