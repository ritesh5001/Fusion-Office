"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, FilePlus2, FolderOpen, Loader2, Trash2, type LucideIcon } from "lucide-react";
import { deleteDraft, listDrafts, saveDraft, type DraftInfo, type DraftKind } from "@/lib/office/drafts";
import { convertOnServer, extOf, LEGACY } from "@/lib/office/convert";
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
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-2">
      <Link href="/" className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-50" title="Fusion Office home">
        <Logo className="h-6 w-6" />
      </Link>
      <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", app.tint)} title={app.name}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <NameField value={docName} onChange={onRename} />
      <span className="hidden items-center gap-1 text-[12px] text-slate-400 sm:flex" aria-live="polite">
        {status === "saving" ? <Loader2 className="h-3 w-3 animate-spin" /> : status === "saved" ? <Check className="h-3 w-3" /> : null}
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved on this device" : ""}
      </span>
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
      className="ml-1 h-8 w-[min(34vw,260px)] truncate rounded-md border border-transparent px-2 text-[14px] font-medium text-slate-800 outline-none hover:border-slate-200 focus:border-brand-500"
    />
  );
}

/** Save `data` as a local draft shortly after it stops changing. */
export function useAutosave<T>(kind: DraftKind, id: string | null, name: string, data: T | null, delay = 900) {
  const [status, setStatus] = useState<"saved" | "saving" | "idle">("idle");
  const first = useRef(true);
  useEffect(() => {
    first.current = true;
  }, [id]);
  useEffect(() => {
    if (!id || data === null) return;
    // Opening a document isn't a change worth saving.
    if (first.current) {
      first.current = false;
      return;
    }
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
  useEffect(() => {
    listDrafts(app.kind).then(setDrafts).catch(() => {});
  }, [app.kind]);
  const Icon = app.icon;

  return (
    <div
      className="min-h-dvh bg-paper"
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
    >
      <header className="mx-auto flex h-16 max-w-[1100px] items-center gap-3 px-5">
        <Link href="/" className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink">
          <Logo className="h-7 w-7" /> Fusion Office
        </Link>
        <Link href="/tools" className="ml-auto text-[14px] text-ink-soft hover:text-ink">
          All tools
        </Link>
      </header>
      <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-8">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", app.tint)}>
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-[28px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
            <p className="text-[14px] text-ink-soft">{subtitle}</p>
          </div>
        </div>

        <div className={cn("mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4", drag && "opacity-60")}>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="group flex flex-col rounded-2xl border-2 border-dashed border-rule-strong/70 bg-white p-4 text-left transition hover:border-brand-500"
          >
            <span className="flex aspect-[4/3] items-center justify-center rounded-lg bg-paper-deep">
              {busy ? <Loader2 className="h-7 w-7 animate-spin text-ink-soft" /> : <FolderOpen className="h-8 w-8 text-ink-soft group-hover:text-brand-600" />}
            </span>
            <span className="mt-3 text-[14px] font-medium text-ink">{busy ?? "Open a file"}</span>
            <span className="text-[12px] text-ink-soft">Or drop it anywhere on this page</span>
          </button>
          <input ref={input} type="file" accept={accept} className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          {templates.map((t) => (
            <button key={t.label} type="button" onClick={t.onSelect} className="group flex flex-col rounded-2xl bg-white p-4 text-left ring-1 ring-ink/10 transition hover:-translate-y-0.5 hover:ring-ink/25">
              <span className="flex aspect-[4/3] items-stretch overflow-hidden rounded-lg bg-paper-deep ring-1 ring-ink/5">{t.preview}</span>
              <span className="mt-3 flex items-center gap-1.5 text-[14px] font-medium text-ink">
                {t.label === "Blank" && <FilePlus2 className="h-4 w-4 text-ink-soft" aria-hidden="true" />}
                {t.label}
              </span>
              <span className="text-[12px] text-ink-soft">{t.hint}</span>
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-2.5 text-[13px] text-red-700">
            {error}
          </p>
        )}

        {drafts.length > 0 && (
          <section className="mt-12">
            <h2 className="font-mono text-[12px] uppercase tracking-[0.14em] text-ink-soft">Recent on this device</h2>
            <ul className="mt-3 divide-y divide-rule overflow-hidden rounded-2xl bg-white ring-1 ring-ink/10">
              {drafts.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-paper">
                  <Icon className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
                  <button type="button" onClick={() => onDraft(d)} className="min-w-0 flex-1 truncate text-left text-[14px] text-ink hover:text-brand-700">
                    {d.name}
                  </button>
                  <span className="text-[12px] tabular-nums text-ink-soft">{new Date(d.updatedAt).toLocaleString()}</span>
                  <button
                    type="button"
                    aria-label={`Delete ${d.name}`}
                    onClick={() => deleteDraft(d.id).then(() => setDrafts((all) => all.filter((x) => x.id !== d.id)))}
                    className="rounded-md p-1.5 text-ink-soft hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="mt-10 text-[12px] leading-relaxed text-ink-soft">
          Editing happens in your browser and drafts are kept on this device. Old formats ({app.kind === "doc" ? ".doc, .odt, .rtf" : app.kind === "sheet" ? ".xls, .ods" : ".ppt, .odp"}) and PDF export use our server
          to convert, then the file is deleted.
        </p>
      </main>
      <Toaster />
    </div>
  );
}
