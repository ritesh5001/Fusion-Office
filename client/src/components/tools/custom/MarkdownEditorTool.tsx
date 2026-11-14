"use client";

/** A Markdown notes editor: write on the left, see it formatted on the right; save as .md, .html, Word or PDF. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Bold, Code, Download, FileUp, Heading2, Italic, Link2, List, ListOrdered, Loader2, Quote, Table } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { downloadFile } from "@/lib/tools/files";
import { renderSafeMarkdown } from "@/lib/tools/safeMarkdown";
import { cn } from "@/lib/cn";

const STORE = "fusion-office.markdown-notes";
const START = `# Meeting notes

**Date:** ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}

## Agenda

1. Budget for the next quarter
2. Hiring plan

## Decisions

- Approve the new vendor
- Review again in **two weeks**

| Owner | Task | Due |
| --- | --- | --- |
| Asha | Send the quote | Friday |
`;

export function MarkdownEditorTool() {
  const [text, setText] = useState(START);
  const [name, setName] = useState("notes");
  const [view, setView] = useState<"write" | "preview">("write");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
      if (saved?.text) setText(saved.text);
      if (saved?.name) setName(saved.name);
    } catch {
      /* nothing saved */
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORE, JSON.stringify({ text, name }));
      } catch {
        /* storage blocked */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [text, name]);

  const html = useMemo(() => renderSafeMarkdown(text), [text]);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const base = name.trim().replace(/[\\/:*?"<>|]+/g, "-") || "notes";

  /** Wrap the selection (or insert a placeholder) with Markdown. */
  const wrap = (before: string, after = before, placeholder = "text") => {
    const ta = area.current;
    if (!ta) return;
    const { selectionStart: a, selectionEnd: b } = ta;
    const sel = text.slice(a, b) || placeholder;
    const next = text.slice(0, a) + before + sel + after + text.slice(b);
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(a + before.length, a + before.length + sel.length);
    });
  };
  const linePrefix = (prefix: string) => {
    const ta = area.current;
    if (!ta) return;
    const a = text.lastIndexOf("\n", ta.selectionStart - 1) + 1;
    setText(text.slice(0, a) + prefix + text.slice(a));
    requestAnimationFrame(() => ta.focus());
  };

  const open = async (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    setText(await f.text());
    setName(f.name.replace(/\.[^.]+$/, ""));
  };

  const fullHtml = async () => {
    const { htmlDocument } = await import("@/lib/tools/documents");
    return htmlDocument(base, html);
  };

  const save = async (kind: "md" | "html" | "docx" | "pdf") => {
    setError(null);
    setBusy(kind);
    try {
      if (kind === "md") downloadFile({ name: `${base}.md`, bytes: new TextEncoder().encode(text), type: "text/markdown" });
      else if (kind === "html") downloadFile({ name: `${base}.html`, bytes: new TextEncoder().encode(await fullHtml()), type: "text/html" });
      else if (kind === "pdf") {
        const res = await apiFetch("/api/convert/html", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ html: await fullHtml(), name: base }) });
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "The PDF couldn't be made right now.");
        downloadFile({ name: `${base}.pdf`, bytes: new Uint8Array(await res.arrayBuffer()), type: "application/pdf" });
      } else {
        const { markdownToDocx } = await import("@/lib/tools/markdownDocx");
        downloadFile({ name: `${base}.docx`, bytes: await markdownToDocx(text, base), type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const tools: [React.ComponentType<{ className?: string }>, string, () => void][] = [
    [Heading2, "Heading", () => linePrefix("## ")],
    [Bold, "Bold", () => wrap("**")],
    [Italic, "Italic", () => wrap("_")],
    [Link2, "Link", () => wrap("[", "](https://)", "link text")],
    [List, "Bullet list", () => linePrefix("- ")],
    [ListOrdered, "Numbered list", () => linePrefix("1. ")],
    [Quote, "Quote", () => linePrefix("> ")],
    [Code, "Code", () => wrap("`")],
    [Table, "Table", () => wrap("\n| Column | Column |\n| --- | --- |\n| ", " | |\n", "cell")],
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="File name" value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-44 rounded-lg bg-sunken px-3 text-[14px] text-fg ring-1 ring-line-strong outline-none focus:ring-2 focus:ring-brand-500" />
        <div className="flex flex-wrap gap-0.5 rounded-lg bg-surface p-0.5 ring-1 ring-line">
          {tools.map(([Icon, label, fn]) => (
            <button key={label} type="button" title={label} aria-label={label} onClick={fn} className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-raised hover:text-fg">
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <label className="btn btn-ghost btn-sm cursor-pointer">
          <FileUp className="h-3.5 w-3.5" /> Open .md
          <input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" className="sr-only" onChange={(e) => open(e.target.files)} />
        </label>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {(["md", "docx", "pdf", "html"] as const).map((k) => (
            <button key={k} type="button" onClick={() => save(k)} disabled={!!busy} className={cn("btn btn-sm", k === "pdf" ? "btn-primary" : "btn-secondary")}>
              {busy === k ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} {k === "md" ? "Markdown" : k === "docx" ? "Word" : k.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-300">{error}</p>}
      <div role="tablist" className="flex gap-1 lg:hidden">
        {(["write", "preview"] as const).map((v) => (
          <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn("h-8 rounded-full px-4 text-[13px] font-medium", view === v ? "bg-fg text-app" : "text-fg-muted ring-1 ring-line")}>
            {v === "write" ? "Write" : "Preview"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <textarea
          ref={area}
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck
          aria-label="Markdown"
          className={cn("thin-scroll min-h-[60vh] w-full resize-y rounded-xl bg-sunken p-4 font-mono text-[13.5px] leading-relaxed text-fg ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-500", view === "preview" && "hidden lg:block")}
        />
        <div className={cn("rich-text thin-scroll min-h-[60vh] overflow-auto rounded-xl bg-surface p-5 ring-1 ring-line", view === "write" && "hidden lg:block")} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      <p className="text-[12px] text-fg-muted">
        {words.toLocaleString("en-IN")} words · {text.length.toLocaleString("en-IN")} characters · saved on this device as you type. PDF is printed on our server; everything else is made in your browser.
      </p>
    </div>
  );
}
