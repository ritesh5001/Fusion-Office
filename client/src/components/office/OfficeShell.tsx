"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FilePlus2, FolderOpen, Loader2, Trash2, type LucideIcon } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { deleteDraft, listDrafts, saveDraft, type DraftInfo, type DraftKind } from "@/lib/office/drafts";
import { convertOnServer, extOf, LEGACY } from "@/lib/office/convert";
import { takeFiles } from "@/lib/tools/handoff";
import { Logo } from "../Logo";
import { Menu, cn } from "../ui/primitives";
import { Toaster } from "../editor/Toaster";

export interface AppIdentity {
  kind: DraftKind;
  name: string;
  icon: LucideIcon;
  /** Tailwind classes for the app's accent chip. */
  tint: string;
}

type MenuItems = Parameters<typeof Menu>[0]["items"];

/** Top bar shared by the Word, Excel and PowerPoint editors. */
export function OfficeHeader({
  app,
  docName,
  onRename,
  status,
  menus,
  actions,
}: {
  app: AppIdentity;
  docName: string;
  onRename: (name: string) => void;
  status: "saved" | "saving" | "idle";
  menus: { label: string; items: MenuItems }[];
  actions?: ReactNode;
}) {
  const Icon = app.icon;
  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-line bg-surface px-2">
      <Link href="/" className="flex shrink-0 items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-raised" title="Fusion Office home">
        <Logo className="h-6 w-6" />
      </Link>
      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", app.tint)} title={app.name}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <NameField value={docName} onChange={onRename} />
      {status !== "idle" && (
        <span className="hidden items-center gap-1.5 text-[12px] text-fg-subtle sm:flex" aria-live="polite">
          <Mascot
            mood={status === "saving" ? "working" : "happy"}
            size={22}
            label={status === "saving" ? "Saving" : "Saved"}
            className="shrink-0"
          />
          {status === "saving" ? "Saving…" : "Saved on this device"}
        </span>
      )}
      <nav className="ml-2 hidden items-center md:flex">
        {menus.map((m) => (
          <Menu key={m.label} label={m.label} items={m.items} />
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-0.5">{actions}</div>
    </header>
  );
}

function NameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      aria-label="Document name"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => (draft.trim() ? onChange(draft.trim()) : setDraft(value))}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className="ml-1 h-8 min-w-0 max-w-[260px] flex-1 truncate rounded-lg border border-transparent px-2 text-[14px] font-medium text-fg outline-none hover:border-line-strong focus:border-brand-500 bg-transparent focus:bg-sunken"
    />
  );
}

/** Save `data` as a local draft shortly after it stops changing. */
export function useAutosave<T>(kind: DraftKind, id: string | null, name: string, data: T | null, delay = 900) {
  const [status, setStatus] = useState<"saved" | "saving" | "idle">("idle");
  useEffect(() => {
    if (!id || data === null) return;
    setStatus("saving");
    const t = setTimeout(() => {
      saveDraft({ id, kind, name }, data)
        .then(() => setStatus("saved"))
        .catch(() => setStatus("idle"));
    }, delay);
    return () => clearTimeout(t);
  }, [kind, id, name, data, delay]);
  return status;
}

/**
 * Read a picked file for an editor. Old formats (.doc, .xls, .ppt and
 * OpenDocument) are converted to the modern one on the server first.
 */
export async function readOfficeFile(file: File, modern: string): Promise<{ name: string; bytes: Uint8Array; ext: string }> {
  const ext = extOf(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = file.name.replace(/\.[^.]+$/, "");
  if (LEGACY[ext] === modern) return { name, bytes: await convertOnServer(file.name, bytes, modern as never), ext: modern };
  return { name, bytes, ext };
}

/** Start screen: open a file, start blank or from a template, or reopen a draft. */
export function StartScreen({
  app,
  title,
  subtitle,
  accept,
  onFile,
  templates,
  onDraft,
  busy,
  error,
}: {
  app: AppIdentity;
  title: string;
  subtitle: string;
  accept: string;
  onFile: (f: File) => void;
  templates: { label: string; hint: string; preview: ReactNode; onSelect: () => void }[];
  onDraft: (d: DraftInfo) => void;
  busy?: string | null;
  error?: string | null;
}) {
  const [drafts, setDrafts] = useState<DraftInfo[]>([]);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const onFileRef = useRef(onFile);
  onFileRef.current = onFile;
  useEffect(() => {
    listDrafts(app.kind).then(setDrafts).catch(() => {});
  }, [app.kind]);
  // A file dropped on the homepage and sent to this editor opens straight away.
  useEffect(() => {
    const files = takeFiles();
    if (files?.[0]) onFileRef.current(files[0]);
  }, []);
  const Icon = app.icon;

  return (
    <div
      className="min-h-dvh bg-app"
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
    >
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-display text-[17px] font-bold tracking-[-0.02em] text-fg">
            <Logo className="h-7 w-7" /> Fusion Office
          </Link>
          <Link href="/tools" className="btn btn-ghost btn-sm ml-auto">
            All tools
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 pb-20 pt-10 sm:px-6 md:pt-12">
        <div className="flex items-center gap-4">
          <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-[13px]", app.tint)}>
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-[clamp(1.6rem,3.2vw,2rem)] font-bold tracking-[-0.03em] text-fg">{title}</h1>
            <p className="text-[14px] text-fg-muted">{subtitle}</p>
          </div>
        </div>

        <p className="eyebrow mt-10">Start</p>
        <div className={cn("mt-3 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4", drag && "opacity-60")}>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className={cn(
              "group flex flex-col rounded-2xl border border-dashed bg-surface p-3 text-left transition-colors",
              drag ? "border-accent/70" : "border-line-strong hover:border-brand-500/60",
            )}
          >
            <span className="flex aspect-[4/3] items-center justify-center rounded-xl bg-sunken">
              {busy ? (
                <Loader2 className="h-7 w-7 animate-spin text-fg-muted" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-raised text-fg ring-1 ring-line-strong transition-colors group-hover:bg-accent group-hover:text-on-accent group-hover:ring-accent">
                  <FolderOpen className="h-6 w-6" />
                </span>
              )}
            </span>
            <span className="mt-3 truncate px-1 text-[14px] font-semibold text-fg">{busy ?? "Open a file"}</span>
            <span className="px-1 text-[12px] text-fg-muted">Or drop it anywhere on this page</span>
          </button>
          <input ref={input} type="file" accept={accept} className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          {templates.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={t.onSelect}
              className="group flex flex-col rounded-2xl border border-line bg-surface p-3 text-left transition-colors hover:border-line-strong hover:bg-raised"
            >
              <span className="flex aspect-[4/3] items-stretch overflow-hidden rounded-xl bg-[#e9ebef] ring-1 ring-black/20">{t.preview}</span>
              <span className="mt-3 flex items-center gap-1.5 px-1 text-[14px] font-semibold text-fg">
                {t.label === "Blank" && <FilePlus2 className="h-4 w-4 text-fg-subtle" aria-hidden="true" />}
                {t.label}
              </span>
              <span className="px-1 text-[12px] text-fg-muted">{t.hint}</span>
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-red-500/10 px-4 py-2.5 text-[13px] text-red-300 ring-1 ring-inset ring-red-500/25">
            {error}
          </p>
        )}

        {drafts.length > 0 && (
          <section className="mt-12">
            <h2 className="eyebrow">Recent on this device</h2>
            <ul className="card mt-3 divide-y divide-line overflow-hidden">
              {drafts.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-raised">
                  <Icon className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                  <button type="button" onClick={() => onDraft(d)} className="min-w-0 flex-1 truncate text-left text-[14px] font-medium text-fg">
                    {d.name}
                  </button>
                  <span className="hidden text-[12px] tabular-nums text-fg-subtle sm:inline">{new Date(d.updatedAt).toLocaleString()}</span>
                  <button
                    type="button"
                    aria-label={`Delete ${d.name}`}
                    onClick={() => deleteDraft(d.id).then(() => setDrafts((all) => all.filter((x) => x.id !== d.id)))}
                    className="rounded-lg p-1.5 text-fg-subtle hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="mt-10 max-w-[80ch] text-[12.5px] leading-relaxed text-fg-subtle">
          Editing happens in your browser and drafts are kept on this device. Old formats ({app.kind === "doc" ? ".doc, .odt, .rtf" : app.kind === "sheet" ? ".xls, .ods" : ".ppt, .odp"}) and PDF export use our server
          to convert, then the file is deleted.
        </p>
      </main>
      <Toaster />
    </div>
  );
}
