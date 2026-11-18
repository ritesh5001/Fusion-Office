"use client";

/**
 * Viewers for JSON, email (.eml / .msg), ZIP, EPUB and multi-page TIFF.
 * Each one loads its parser only when such a file is opened, so the viewer
 * stays light. Everything is read in this browser; nothing is uploaded.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Copy, Download, Eye, File as FileIcon, Folder, Minus, Paperclip, Plus, Search } from "lucide-react";
import { viewKind } from "@/lib/viewer/detect";
import { jsonErrorAt } from "@/lib/viewer/text";
import { cn } from "../ui/primitives";
import { Failed, Loading, readText, useLoad, useWidth, ZoomBar } from "./views";

const formatBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

function saveBytes(name: string, bytes: Uint8Array, type = "application/octet-stream") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  a.download = name.split("/").pop() || name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

const baseName = (p: string) => p.split("/").pop() || p;

/** Opens a file found inside another one (a ZIP entry, an email attachment) in the viewer. */
export type OpenInner = (file: File) => void;

function SmallButton({ onClick, children, title, primary }: { onClick: () => void; children: ReactNode; title?: string; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium", primary ? "bg-accent text-on-accent hover:opacity-90" : "border border-line bg-raised text-fg hover:border-line-strong")}
    >
      {children}
    </button>
  );
}

/* ── JSON ──────────────────────────────────────────────────────── */

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
const CHILD_STEP = 300;

/** Where a parse error is, as line / column plus the text around it. */
function parseError(text: string, e: Error) {
  const reported = Number(e.message.match(/position (\d+)/)?.[1] ?? NaN);
  const pos = Number.isNaN(reported) ? jsonErrorAt(text) : reported;
  if (pos < 0 || Number.isNaN(pos)) return { message: `This JSON isn't valid: ${e.message}`, snippet: "" };
  const before = text.slice(0, pos);
  const line = before.split("\n").length;
  const col = pos - before.lastIndexOf("\n");
  return { message: `The JSON is broken at line ${line}, column ${col}.`, snippet: `${text.slice(Math.max(0, pos - 60), pos)}⟶${text.slice(pos, pos + 40)}` };
}

/** Paths (joined with \u0000) of every node on the way to a key or value that matches the search. */
function matchingPaths(root: Json, q: string): Set<string> {
  const hits = new Set<string>();
  const needle = q.toLowerCase();
  const walk = (v: Json, path: string[]): boolean => {
    let found = false;
    if (v && typeof v === "object") {
      for (const [k, child] of Object.entries(v)) {
        const keyHit = !Array.isArray(v) && k.toLowerCase().includes(needle);
        if (walk(child, [...path, k]) || keyHit) found = true;
      }
    } else found = String(v).toLowerCase().includes(needle);
    if (found) hits.add(path.join("\u0000"));
    return found;
  };
  walk(root, []);
  return hits;
}

function Mark({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-amber-300/80 text-black">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

function JsonValue({ v, q }: { v: Json; q: string }) {
  if (v === null) return <span className="text-violet-300">null</span>;
  if (typeof v === "boolean") return <span className="text-violet-300">{String(v)}</span>;
  if (typeof v === "number") return <span className="text-sky-300">{v}</span>;
  return (
    <span className="break-all text-emerald-300">
      &quot;<Mark text={v as string} q={q} />&quot;
    </span>
  );
}

function JsonNode({ name, v, path, depth, openDepth, q, hits }: { name: string | null; v: Json; path: string[]; depth: number; openDepth: number; q: string; hits: Set<string> | null }) {
  const isObj = v !== null && typeof v === "object";
  const key = path.join("\u0000");
  const [open, setOpen] = useState(depth < openDepth);
  const [shown, setShown] = useState(CHILD_STEP);
  if (hits && !hits.has(key)) return null;
  const expanded = hits ? true : open;
  const label =
    name === null ? null : (
      <span className="text-fg">
        <Mark text={name} q={q} />
        <span className="text-fg-subtle">: </span>
      </span>
    );
  if (!isObj)
    return (
      <div className="py-px pl-5" style={{ marginLeft: depth ? 14 : 0 }}>
        {label}
        <JsonValue v={v} q={q} />
      </div>
    );
  const entries = Object.entries(v as object) as [string, Json][];
  const arr = Array.isArray(v);
  return (
    <div style={{ marginLeft: depth ? 14 : 0 }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 rounded py-px text-left hover:bg-raised">
        {expanded ? <ChevronDown className="h-4 w-4 text-fg-subtle" aria-hidden="true" /> : <ChevronRight className="h-4 w-4 text-fg-subtle" aria-hidden="true" />}
        {label}
        <span className="text-fg-subtle">
          {arr ? "[" : "{"}
          {!expanded && <span className="mx-1 text-[11.5px]">{entries.length} {arr ? (entries.length === 1 ? "item" : "items") : entries.length === 1 ? "key" : "keys"}</span>}
          {!expanded && (arr ? "]" : "}")}
        </span>
      </button>
      {expanded && (
        <div className="border-l border-line/60 ml-[7px]">
          {entries.slice(0, shown).map(([k, child]) => (
            <JsonNode key={k} name={arr ? k : k} v={child} path={[...path, k]} depth={depth + 1} openDepth={openDepth} q={q} hits={hits} />
          ))}
          {entries.length > shown && (
            <button type="button" onClick={() => setShown((s) => s + CHILD_STEP)} className="ml-5 mt-1 rounded-md border border-line px-2 py-0.5 text-[12px] text-fg-muted hover:border-line-strong">
              Show {Math.min(CHILD_STEP, entries.length - shown)} more of {entries.length - shown}
            </button>
          )}
        </div>
      )}
      {expanded && <div className="pl-5 text-fg-subtle">{arr ? "]" : "}"}</div>}
    </div>
  );
}

export function JsonView({ file }: { file: File }) {
  const data = useLoad(async () => {
    const text = await readText(file);
    try {
      return { ok: true as const, value: JSON.parse(text) as Json, text };
    } catch (e) {
      return { ok: false as const, text, ...parseError(text, e as Error) };
    }
  }, [file]);
  const [mode, setMode] = useState<"tree" | "text">("tree");
  const [query, setQuery] = useState("");
  const [openDepth, setOpenDepth] = useState(2);
  const [treeKey, setTreeKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const q = query.trim();
  const hits = useMemo(() => (data.state === "ready" && data.value.ok && q.length >= 2 ? matchingPaths(data.value.value, q) : null), [data, q]);
  const pretty = useMemo(() => (data.state === "ready" && data.value.ok ? JSON.stringify(data.value.value, null, 2) : ""), [data]);

  if (data.state === "loading") return <Loading />;
  if (data.state === "error") return <Failed message={data.message} />;
  const d = data.value;
  if (!d.ok)
    return (
      <div className="mx-auto max-w-[1000px] px-3 py-5">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[14px] text-amber-100">
          <p className="font-semibold">{d.message}</p>
          {d.snippet && <pre className="mt-2 overflow-auto whitespace-pre-wrap break-all font-mono text-[12.5px] text-amber-50/90">{d.snippet}</pre>}
        </div>
        <pre className="mt-4 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-line bg-surface p-4 font-mono text-[13px] text-fg">{d.text}</pre>
      </div>
    );
  const expandAll = (depth: number) => {
    setOpenDepth(depth);
    setTreeKey((k) => k + 1);
  };
  const copy = () => {
    void navigator.clipboard?.writeText(pretty).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="mx-auto max-w-[1100px] px-3 py-4">
      <div className="sticky top-0 z-10 -mx-3 mb-3 flex flex-wrap items-center gap-2 bg-app/95 px-3 py-2 backdrop-blur">
        <div className="flex rounded-lg border border-line p-0.5 text-[12.5px]">
          {(["tree", "text"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={cn("rounded-md px-3 py-1", mode === m ? "bg-raised font-semibold text-fg" : "text-fg-muted")}>
              {m === "tree" ? "Tree" : "Text"}
            </button>
          ))}
        </div>
        {mode === "tree" && (
          <>
            <label className="flex h-8 min-w-[160px] flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 focus-within:border-line-strong">
              <Search className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
              <span className="sr-only">Search keys and values</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search keys and values" className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-subtle" />
            </label>
            <SmallButton onClick={() => expandAll(99)}>Expand all</SmallButton>
            <SmallButton onClick={() => expandAll(1)}>Collapse</SmallButton>
          </>
        )}
        <SmallButton onClick={copy} title="Copy formatted JSON">
          <Copy className="h-3.5 w-3.5" aria-hidden="true" /> {copied ? "Copied" : "Copy"}
        </SmallButton>
      </div>
      {mode === "tree" ? (
        <div key={treeKey} className="overflow-auto rounded-xl border border-line bg-surface p-3 font-mono text-[13px] leading-relaxed">
          {hits && hits.size === 0 ? <p className="px-2 py-1 font-sans text-fg-muted">Nothing matches “{q}”.</p> : <JsonNode name={null} v={d.value} path={[]} depth={0} openDepth={openDepth} q={hits ? q : ""} hits={hits} />}
        </div>
      ) : (
        <pre className="overflow-auto whitespace-pre rounded-xl border border-line bg-surface p-4 font-mono text-[13px] leading-relaxed text-fg">{pretty}</pre>
      )}
    </div>
  );
}

/* ── Email (.eml / .msg) ───────────────────────────────────────── */

export function EmailView({ file, onOpen, embedded }: { file: File; onOpen: OpenInner; embedded: boolean }) {
  const mail = useLoad(async () => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { parseEml, parseMsg, cleanMailHtml } = await import("@/lib/tools/mail");
    // Outlook .msg files are OLE compound files (they start D0 CF 11 E0).
    const isMsg = /\.msg$/i.test(file.name) || (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0);
    let m;
    try {
      m = isMsg ? await parseMsg(bytes) : parseEml(bytes);
    } catch {
      throw new Error("This email file couldn't be read. It may be damaged, or not an .eml or .msg file.");
    }
    const cleaned = m.html ? cleanMailHtml(m.html, m.attachments) : null;
    const listed = m.attachments.filter((a) => !(a.inline && cleaned && m.html?.includes(`cid:${a.contentId}`)));
    return { m, cleaned, listed };
  }, [file]);
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(420);

  if (mail.state === "loading") return <Loading />;
  if (mail.state === "error") return <Failed message={mail.message} />;
  const { m, cleaned, listed } = mail.value;
  const rows = [
    ["From", m.from],
    ["To", m.to],
    ["Cc", m.cc],
    ["Date", m.date],
  ].filter(([, v]) => v);
  const srcDoc = cleaned
    ? `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>html,body{margin:0;background:#fff;color:#111;font:15px/1.5 -apple-system,"Segoe UI",Roboto,"Noto Sans","Noto Sans Devanagari",Arial,sans-serif}body{padding:18px;word-wrap:break-word}img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>${cleaned.html}</body></html>`
    : null;
  const fit = () => {
    const doc = frame.current?.contentDocument;
    if (doc) setHeight(Math.max(200, doc.documentElement.scrollHeight + 4));
  };
  return (
    <div className="mx-auto max-w-[920px] px-3 py-5">
      <div className="rounded-t-xl border border-line bg-surface px-5 py-4">
        <h2 className="font-display text-[20px] font-semibold leading-snug text-fg">{m.subject || "(no subject)"}</h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13.5px]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-medium text-fg-subtle">{k}</dt>
              <dd className="min-w-0 break-words text-fg-muted">{v}</dd>
            </div>
          ))}
        </dl>
        {cleaned && cleaned.blocked > 0 && <p className="mt-2 text-[12.5px] text-fg-subtle">{cleaned.blocked} remote picture{cleaned.blocked === 1 ? " was" : "s were"} blocked, so the sender can&apos;t tell you opened this.</p>}
      </div>
      <div className="overflow-hidden rounded-b-xl border border-t-0 border-line bg-white">
        {srcDoc ? (
          // No scripts run: the sandbox leaves out allow-scripts. Same origin only so the frame can be sized to its content.
          <iframe ref={frame} title="Email message" srcDoc={srcDoc} sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" onLoad={fit} style={{ height }} className="block w-full border-0" />
        ) : (
          <div className="whitespace-pre-wrap break-words p-5 text-[15px] leading-relaxed text-[#111]">{m.text || "(This email has no text.)"}</div>
        )}
      </div>
      {listed.length > 0 && (
        <section className="mt-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-[14px] font-semibold text-fg">
            <Paperclip className="h-4 w-4" aria-hidden="true" /> {listed.length} attachment{listed.length === 1 ? "" : "s"}
          </h3>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {listed.map((a, i) => {
              const canView = !!viewKind(a.name, a.type);
              return (
                <li key={`${a.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                  <FileIcon className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-fg">{a.name}</span>
                  <span className="shrink-0 text-[12px] tabular-nums text-fg-subtle">{formatBytes(a.bytes.length)}</span>
                  {canView && (
                    <SmallButton primary onClick={() => onOpen(new File([a.bytes as BlobPart], a.name, { type: a.type }))}>
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" /> View
                    </SmallButton>
                  )}
                  {!embedded && (
                    <SmallButton onClick={() => saveBytes(a.name, a.bytes, a.type)} title={`Save ${a.name}`}>
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    </SmallButton>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ── ZIP ───────────────────────────────────────────────────────── */

interface ZipEntry {
  name: string;
  size: number;
  packed: number;
}

const JUNK = /(^|\/)(__MACOSX\/|\.DS_Store$|Thumbs\.db$|desktop\.ini$)/;

export function ZipView({ file, onOpen, embedded }: { file: File; onOpen: OpenInner; embedded: boolean }) {
  const zip = useLoad(async () => {
    const { unzipSync } = await import("fflate");
    const data = new Uint8Array(await file.arrayBuffer());
    const entries: ZipEntry[] = [];
    try {
      // List only: the filter sees each entry and declines to unpack it.
      unzipSync(data, {
        filter: (f) => {
          if (!f.name.endsWith("/") && !JUNK.test(f.name)) entries.push({ name: f.name, size: f.originalSize, packed: f.size });
          return false;
        },
      });
    } catch {
      throw new Error("This ZIP file couldn't be read. It may be damaged, split into parts, or not a ZIP file.");
    }
    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return { data, entries, unzipSync };
  }, [file]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (zip.state === "loading") return <Loading />;
  if (zip.state === "error") return <Failed message={zip.message} />;
  const { data, entries, unzipSync } = zip.value;
  const extract = (name: string): Uint8Array => {
    const out = unzipSync(data, { filter: (f) => f.name === name })[name];
    if (!out) throw new Error("missing");
    return out;
  };
  const act = (e: ZipEntry, then: (bytes: Uint8Array) => void) => {
    setBusy(e.name);
    setError(null);
    // Let the spinner paint before unpacking a large entry.
    setTimeout(() => {
      try {
        then(extract(e.name));
      } catch {
        setError(`${baseName(e.name)} couldn't be unpacked. The ZIP may be password protected or use a compression method this viewer doesn't support.`);
      } finally {
        setBusy(null);
      }
    }, 20);
  };
  const q = query.trim().toLowerCase();
  const shown = q ? entries.filter((e) => e.name.toLowerCase().includes(q)) : entries;
  const total = entries.reduce((s, e) => s + e.size, 0);
  return (
    <div className="mx-auto max-w-[920px] px-3 py-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <p className="text-[13.5px] text-fg-muted">
          <span className="font-semibold text-fg">{entries.length}</span> file{entries.length === 1 ? "" : "s"} · {formatBytes(total)} unpacked · {formatBytes(file.size)} zipped
        </p>
        {entries.length > 8 && (
          <label className="ml-auto flex h-8 min-w-[180px] items-center gap-2 rounded-lg border border-line bg-surface px-2.5 focus-within:border-line-strong">
            <Search className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />
            <span className="sr-only">Find a file</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a file" className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-subtle" />
          </label>
        )}
      </div>
      {error && (
        <p role="alert" className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13.5px] text-red-200">
          {error}
        </p>
      )}
      {entries.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-6 text-center text-[14px] text-fg-muted">This ZIP is empty.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {shown.map((e) => {
            const dir = e.name.includes("/") ? e.name.slice(0, e.name.lastIndexOf("/") + 1) : "";
            const canView = !!viewKind(e.name);
            return (
              <li key={e.name} className="flex items-center gap-3 px-4 py-2">
                {dir ? <Folder className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" /> : <FileIcon className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />}
                <span className="min-w-0 flex-1 truncate text-[14px]">
                  {dir && <span className="text-fg-subtle">{dir}</span>}
                  <span className="text-fg">{baseName(e.name)}</span>
                </span>
                <span className="shrink-0 text-[12px] tabular-nums text-fg-subtle">{formatBytes(e.size)}</span>
                {busy === e.name ? (
                  <span className="w-[70px] text-center text-[12px] text-fg-muted">Opening…</span>
                ) : (
                  <>
                    {canView && (
                      <SmallButton primary onClick={() => act(e, (b) => onOpen(new File([b as BlobPart], baseName(e.name))))}>
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" /> View
                      </SmallButton>
                    )}
                    {!embedded && (
                      <SmallButton onClick={() => act(e, (b) => saveBytes(e.name, b))} title={`Save ${baseName(e.name)}`}>
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      </SmallButton>
                    )}
                  </>
                )}
              </li>
            );
          })}
          {q && shown.length === 0 && <li className="px-4 py-4 text-center text-[13.5px] text-fg-muted">No file matches “{query}”.</li>}
        </ul>
      )}
    </div>
  );
}

/* ── EPUB ──────────────────────────────────────────────────────── */

interface Book {
  title: string;
  author: string;
  chapters: { path: string; label: string }[];
  files: Record<string, Uint8Array>;
}

const td = new TextDecoder();
const xml = (s: string, type: DOMParserSupportedType = "application/xml") => new DOMParser().parseFromString(s, type);

/** A path inside the book, relative to another file's folder. */
function resolvePath(from: string, rel: string): string {
  try {
    return decodeURIComponent(new URL(rel, `http://book/${from}`).pathname.slice(1));
  } catch {
    return rel;
  }
}

const MIME_BY_EXT: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml" };

function dataUrl(bytes: Uint8Array, path: string): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${MIME_BY_EXT[path.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream"};base64,${btoa(bin)}`;
}

async function readBook(file: File): Promise<Book> {
  const { unzipSync } = await import("fflate");
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new Error("This EPUB couldn't be opened. It may be damaged or not an EPUB file.");
  }
  const container = files["META-INF/container.xml"];
  const opfPath = container ? xml(td.decode(container)).querySelector("rootfile")?.getAttribute("full-path") : null;
  if (!opfPath || !files[opfPath]) throw new Error("This EPUB is missing its table of contents file, so it can't be opened.");
  if (files["META-INF/encryption.xml"] && /EncryptedData/.test(td.decode(files["META-INF/encryption.xml"])) && !/fonts?\//i.test(td.decode(files["META-INF/encryption.xml"])))
    throw new Error("This book is protected with DRM, so only the app it was bought in can open it.");
  const opf = xml(td.decode(files[opfPath]));
  const manifest = new Map<string, { href: string; type: string; props: string }>();
  opf.querySelectorAll("manifest > item").forEach((it) =>
    manifest.set(it.getAttribute("id") ?? "", { href: resolvePath(opfPath, it.getAttribute("href") ?? ""), type: it.getAttribute("media-type") ?? "", props: it.getAttribute("properties") ?? "" }),
  );
  const spine = [...opf.querySelectorAll("spine > itemref")].map((r) => manifest.get(r.getAttribute("idref") ?? "")).filter((m): m is { href: string; type: string; props: string } => !!m && !!files[m.href]);
  if (!spine.length) throw new Error("This EPUB has no chapters to show.");

  // Chapter names: EPUB 3 nav document, or the EPUB 2 NCX.
  const labels = new Map<string, string>();
  const nav = [...manifest.values()].find((m) => m.props.split(/\s+/).includes("nav"));
  if (nav && files[nav.href]) {
    xml(td.decode(files[nav.href]), "text/html")
      .querySelectorAll("nav a[href]")
      .forEach((a) => {
        const p = resolvePath(nav.href, a.getAttribute("href") ?? "").split("#")[0];
        if (!labels.has(p) && a.textContent?.trim()) labels.set(p, a.textContent.trim());
      });
  }
  const ncxId = opf.querySelector("spine")?.getAttribute("toc");
  const ncx = ncxId ? manifest.get(ncxId) : [...manifest.values()].find((m) => m.type === "application/x-dtbncx+xml");
  if (ncx && files[ncx.href]) {
    xml(td.decode(files[ncx.href]))
      .querySelectorAll("navPoint")
      .forEach((np) => {
        const src = np.querySelector("content")?.getAttribute("src");
        const text = np.querySelector("navLabel text")?.textContent?.trim();
        if (src && text) {
          const p = resolvePath(ncx.href, src).split("#")[0];
          if (!labels.has(p)) labels.set(p, text);
        }
      });
  }
  const meta = (tag: string) => opf.getElementsByTagNameNS("*", tag)[0]?.textContent?.trim() ?? "";
  return {
    title: meta("title") || file.name.replace(/\.epub$/i, ""),
    author: meta("creator"),
    chapters: spine.map((s, i) => ({ path: s.href, label: labels.get(s.href) ?? `Section ${i + 1}` })),
    files,
  };
}

/** One chapter as a self-contained page: no scripts, pictures and the book's styles embedded. */
function chapterDoc(book: Book, path: string, dark: boolean): string {
  const raw = td.decode(book.files[path]);
  let doc = xml(raw, "application/xhtml+xml");
  if (doc.querySelector("parsererror")) doc = xml(raw, "text/html");
  doc.querySelectorAll("script, iframe, object, embed, form").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((el) => [...el.attributes].forEach((a) => a.name.toLowerCase().startsWith("on") && el.removeAttribute(a.name)));
  const embed = (el: Element, attr: string) => {
    const v = el.getAttribute(attr);
    if (!v || /^(data:|https?:)/.test(v)) return;
    const p = resolvePath(path, v);
    if (book.files[p]) el.setAttribute(attr, dataUrl(book.files[p], p));
  };
  doc.querySelectorAll("img[src]").forEach((el) => embed(el, "src"));
  doc.querySelectorAll("image").forEach((el) => {
    embed(el, "href");
    embed(el, "xlink:href");
  });
  const styles: string[] = [];
  doc.querySelectorAll('link[rel~="stylesheet"][href]').forEach((l) => {
    const p = resolvePath(path, l.getAttribute("href") ?? "");
    if (book.files[p]) styles.push(td.decode(book.files[p]).replace(/@import[^;]+;/g, "").replace(/url\([^)]*\)/g, "none"));
  });
  doc.querySelectorAll("style").forEach((s) => styles.push(s.textContent ?? ""));
  const body = doc.body?.innerHTML ?? doc.documentElement.innerHTML;
  const fg = dark ? "#e6e6e6" : "#1b1b1b";
  const bg = dark ? "#16181d" : "#fdfcf9";
  return `<!doctype html><html><head><meta charset="utf-8"><style>${styles.join("\n")}</style><style>
    html{background:${bg}!important}body{max-width:40em;margin:0 auto!important;padding:28px 22px 60px!important;color:${fg}!important;background:${bg}!important;font-family:Georgia,"Noto Serif","Noto Serif Devanagari",serif;line-height:1.65;word-wrap:break-word}
    img,svg,image{max-width:100%!important;height:auto!important}a{color:${dark ? "#9cc0ff" : "#2456c7"}}pre{white-space:pre-wrap}
  </style></head><body>${body}</body></html>`;
}

export function EpubView({ file }: { file: File }) {
  const book = useLoad(() => readBook(file), [file]);
  const [index, setIndex] = useState(0);
  const [size, setSize] = useState(100);
  const [dark, setDark] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(() => (book.state === "ready" ? chapterDoc(book.value, book.value.chapters[index].path, dark) : ""), [book, index, dark]);

  // Text size changes apply in place, so the reading position isn't lost.
  useEffect(() => {
    const d = frame.current?.contentDocument;
    if (d?.documentElement) d.documentElement.style.fontSize = `${size}%`;
  }, [size]);

  if (book.state === "loading") return <Loading note="Opening the book…" />;
  if (book.state === "error") return <Failed message={book.message} />;
  const b = book.value;
  const go = (i: number) => setIndex(Math.max(0, Math.min(b.chapters.length - 1, i)));
  const onLoad = () => {
    const d = frame.current?.contentDocument;
    if (!d) return;
    d.documentElement.style.fontSize = `${size}%`;
    // Links to other chapters turn the page; links to the web open in a new tab.
    d.addEventListener("click", (e) => {
      const a = (e.target as Element).closest?.("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (/^https?:/.test(href)) {
        e.preventDefault();
        window.open(href, "_blank", "noopener");
        return;
      }
      e.preventDefault();
      if (href.startsWith("#")) return d.getElementById(href.slice(1))?.scrollIntoView();
      const [p, hash] = resolvePath(b.chapters[index].path, href).split("#");
      const i = b.chapters.findIndex((c) => c.path === p);
      if (i >= 0) {
        setIndex(i);
        if (hash) setTimeout(() => frame.current?.contentDocument?.getElementById(hash)?.scrollIntoView(), 120);
      }
    });
  };
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-surface/60 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-fg">{b.title}</p>
          {b.author && <p className="truncate text-[12px] text-fg-subtle">{b.author}</p>}
        </div>
        <label className="sr-only" htmlFor="epub-chapter">
          Chapter
        </label>
        <select id="epub-chapter" value={index} onChange={(e) => go(Number(e.target.value))} className="h-8 max-w-[46vw] rounded-lg border border-line bg-raised px-2 text-[12.5px] text-fg">
          {b.chapters.map((c, i) => (
            <option key={`${c.path}-${i}`} value={i}>
              {c.label}
            </option>
          ))}
        </select>
        <SmallButton onClick={() => setSize((s) => Math.max(70, s - 10))} title="Smaller text">
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />A
        </SmallButton>
        <SmallButton onClick={() => setSize((s) => Math.min(200, s + 10))} title="Larger text">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />A
        </SmallButton>
        <SmallButton onClick={() => setDark((v) => !v)} title={dark ? "Light page" : "Dark page"}>
          {dark ? "Light" : "Dark"}
        </SmallButton>
      </div>
      {/* No scripts run: the sandbox leaves out allow-scripts. Same origin so chapter links and text size work. */}
      <iframe ref={frame} key={`${index}-${dark}`} title={b.chapters[index].label} srcDoc={srcDoc} sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" onLoad={onLoad} className="min-h-0 w-full flex-1 border-0 bg-white" />
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-surface px-3 py-2">
        <SmallButton onClick={() => go(index - 1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
        </SmallButton>
        <span className="text-[12.5px] tabular-nums text-fg-muted">
          {index + 1} / {b.chapters.length}
        </span>
        <SmallButton onClick={() => go(index + 1)}>
          Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </SmallButton>
      </div>
    </div>
  );
}

/* ── TIFF (every page) ─────────────────────────────────────────── */

const MAX_TIFF_PAGES = 300;

export function TiffView({ file }: { file: File }) {
  const pages = useLoad(
    async (setNote) => {
      const UTIF = await import("utif2");
      const buffer = await file.arrayBuffer();
      let ifds;
      try {
        // Leave out reduced-resolution thumbnails (NewSubfileType 1).
        ifds = UTIF.decode(buffer).filter((d) => !("t254" in d) || (d.t254 as number[])[0] !== 1);
      } catch {
        throw new Error("This TIFF couldn't be read. It may be damaged or not a TIFF file.");
      }
      if (!ifds.length) throw new Error("This TIFF has no pages to show.");
      const out: { url: string; w: number; h: number }[] = [];
      for (let i = 0; i < Math.min(ifds.length, MAX_TIFF_PAGES); i++) {
        if (ifds.length > 1) setNote(`Decoding page ${i + 1} of ${ifds.length}…`);
        const ifd = ifds[i];
        try {
          UTIF.decodeImage(buffer, ifd);
          if (!ifd.width || !ifd.height) continue;
          const canvas = document.createElement("canvas");
          canvas.width = ifd.width;
          canvas.height = ifd.height;
          canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(UTIF.toRGBA8(ifd)), ifd.width, ifd.height), 0, 0);
          const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
          if (blob) out.push({ url: URL.createObjectURL(blob), w: ifd.width, h: ifd.height });
        } catch {
          /* skip a page this decoder can't read */
        }
        // Give the page a moment to repaint between pages.
        await new Promise((r) => setTimeout(r, 0));
      }
      if (!out.length) throw new Error("This TIFF uses a compression this viewer can't read. Try the TIFF to JPG tool.");
      return { pages: out, total: ifds.length };
    },
    [file],
  );
  useEffect(() => () => void (pages.state === "ready" && pages.value.pages.forEach((p) => URL.revokeObjectURL(p.url))), [pages]);
  if (pages.state === "loading") return <Loading note={pages.note} />;
  if (pages.state === "error") return <Failed message={pages.message} />;
  return <TiffPages list={pages.value.pages} total={pages.value.total} />;
}

function TiffPages({ list, total }: { list: { url: string; w: number; h: number }[]; total: number }) {
  const [zoom, setZoom] = useState(1);
  const [ref, width] = useWidth<HTMLDivElement>();
  return (
    <div ref={ref} className="min-h-full px-3 py-5">
      {total > MAX_TIFF_PAGES && <p className="mx-auto mb-3 max-w-[900px] text-center text-[13px] text-fg-muted">Showing the first {MAX_TIFF_PAGES} of {total} pages.</p>}
      <div className="flex flex-col items-center gap-2">
        {list.map((p, i) => (
          <figure key={p.url} className="m-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={`Page ${i + 1}`} width={p.w} height={p.h} loading={i > 1 ? "lazy" : "eager"} style={{ width: Math.min(p.w, Math.max(200, (width - 24) * zoom)), height: "auto" }} className="block max-w-none bg-white shadow-[0_12px_36px_-14px_rgb(0_0_0/0.8)]" />
            {list.length > 1 && (
              <figcaption className="mt-1.5 mb-3 text-center text-[11.5px] tabular-nums text-fg-subtle">
                {i + 1} / {list.length} · {p.w} × {p.h}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
      <ZoomBar zoom={zoom} setZoom={setZoom} />
    </div>
  );
}
