"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Copy, FileText, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { documentText } from "@/lib/tools/documentText";
import { renderSafeMarkdown } from "@/lib/tools/safeMarkdown";
import { Dropzone } from "../Dropzone";
import { Mascot } from "../../mascot/Mascot";
import { cn } from "@/lib/cn";

interface Turn {
  role: "user" | "assistant";
  text: string;
}

const STARTERS = [
  "Summarize this document in 5 points",
  "What are the key dates and deadlines?",
  "List every amount and who pays it",
  "What does this ask me to do?",
];

/** Keep the conversation within what the server accepts (it must start with a question). */
const MAX_TURNS = 39;

export function ChatPdfTool() {
  const [file, setFile] = useState<{ name: string; pages: string[] } | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  const open = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    setReading("Reading your PDF…");
    try {
      const pages = await documentText(new Uint8Array(await f.arrayBuffer()), (m) => setReading(m));
      setFile({ name: f.name, pages });
      setTurns([]);
      setTimeout(() => input.current?.focus(), 50);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(null);
    }
  };

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || !file || busy) return;
    // Drop the oldest exchanges if the conversation gets long (the document stays).
    let history = [...turns, { role: "user" as const, text: q }];
    while (history.length > MAX_TURNS) history = history.slice(2);
    setTurns(history);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pages: file.pages, messages: history }),
      });
      const data = (await res.json().catch(() => ({}))) as { answer?: string; error?: string };
      if (!res.ok || !data.answer) throw new Error(data.error ?? (res.status === 503 ? "Chat isn't available on this server yet." : "The AI couldn't answer. Please try again."));
      setTurns([...history, { role: "assistant", text: data.answer }]);
    } catch (e) {
      // Put the question back so it can be sent again.
      setTurns(turns);
      setDraft(q);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!file) {
    return reading ? (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-brand-500/10 py-14" role="status">
        <Mascot mood="working" size={92} />
        <p className="mt-4 text-[15px] font-medium">{reading}</p>
      </div>
    ) : (
      <>
        <Dropzone accept="application/pdf,.pdf" multiple={false} onFiles={open} label="Choose a PDF" />
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-center text-[14px] text-red-300">
            {error}
          </p>
        )}
      </>
    );
  }

  const chars = file.pages.reduce((n, p) => n + p.length, 0);
  return (
    <div className="flex h-[min(720px,calc(100dvh-220px))] min-h-[480px] flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
      {/* File bar */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">{file.name}</p>
          <p className="text-[12px] text-fg-muted">
            {file.pages.length} page{file.pages.length === 1 ? "" : "s"} · {chars.toLocaleString("en")} characters
          </p>
        </div>
        {turns.length > 0 && (
          <button type="button" onClick={() => (setTurns([]), setError(null))} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-fg-muted hover:bg-raised hover:text-fg">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> New chat
          </button>
        )}
        <button type="button" onClick={() => (setFile(null), setTurns([]), setError(null))} className="h-9 rounded-lg px-3 text-[13px] font-medium text-fg-muted hover:bg-raised hover:text-fg">
          Change file
        </button>
      </div>

      {/* Conversation */}
      <div ref={scroller} className="thin-scroll flex-1 space-y-5 overflow-y-auto px-4 py-5 md:px-6" aria-live="polite">
        {turns.length === 0 && (
          <div className="mx-auto max-w-[520px] pt-4 text-center">
            <Mascot mood="happy" size={84} />
            <p className="mt-3 text-[17px] font-semibold">Ask me anything about this document</p>
            <p className="mt-1 text-[13px] text-fg-muted">Answers come from the document only, with the pages they&apos;re on.</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="rounded-xl bg-raised px-3 py-2.5 text-left text-[13px] text-fg ring-1 ring-line transition hover:ring-brand-600 hover:text-brand-300">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-[14px] text-white">{t.text}</p>
            </div>
          ) : (
            <div key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8a8cff] to-[#4f46e5] text-white">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 max-w-[85%]">
                <div className="chat-answer rounded-2xl rounded-tl-md bg-raised px-4 py-3 text-[14px] leading-relaxed" dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(t.text) }} />
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(t.text);
                    setCopied(i);
                    setTimeout(() => setCopied(null), 1400);
                  }}
                  className="mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] text-fg-muted hover:text-fg"
                >
                  {copied === i ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />} {copied === i ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ),
        )}
        {busy && (
          <div className="flex items-center gap-3 text-[13px] text-fg-muted" role="status">
            <Mascot mood="working" size={40} />
            Reading the document…
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mx-4 mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
          {error}
        </p>
      )}

      {/* Question box */}
      <form
        className="border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(draft);
        }}
      >
        <div className="flex items-end gap-2 rounded-2xl bg-raised p-1.5 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand-600">
          <label htmlFor="chat-question" className="sr-only">
            Your question
          </label>
          <textarea
            ref={input}
            id="chat-question"
            rows={1}
            value={draft}
            maxLength={4000}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void ask(draft);
              }
            }}
            placeholder="Ask a question about the document…"
            // The surrounding box shows focus; the site-wide focus outline would double it.
            style={{ outline: "none" }}
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[15px]"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="Send"
            className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-on-accent transition-colors", busy || !draft.trim() ? "bg-accent/40" : "bg-accent hover:bg-accent-hover")}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
        <p className="mt-1.5 px-2 text-[11px] text-fg-muted">The document&apos;s text is sent to our AI provider to answer, and isn&apos;t stored. Check important answers against the document.</p>
      </form>
    </div>
  );
}
