"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Square } from "lucide-react";
import { documentText } from "@/lib/tools/documentText";
import { Dropzone } from "../Dropzone";
import { Mascot } from "../../mascot/Mascot";
import { cn } from "@/lib/cn";

interface Sentence {
  page: number;
  text: string;
}

/** Split page text into sentences short enough for the speech engine (long ones get cut off in some browsers). */
function toSentences(pages: string[]): Sentence[] {
  const out: Sentence[] = [];
  pages.forEach((p, page) => {
    // Short lines without end punctuation, followed by a new sentence, are
    // headings: read them on their own. (A wrapped line continues in lowercase.)
    const blocks: string[] = [];
    let para = "";
    const lines = p
      .replace(/-\n(?=\p{Ll})/gu, "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (const [k, line] of lines.entries()) {
      const next = lines[k + 1];
      const heading = line.length < 70 && !/[.!?।:;,]$/.test(line) && !para && (!next || /^[\p{Lu}\p{N}]/u.test(next));
      if (heading) blocks.push(line);
      else {
        para = para ? `${para} ${line}` : line;
        if (/[.!?।]["')\]]*$/.test(line)) {
          blocks.push(para);
          para = "";
        }
      }
    }
    if (para) blocks.push(para);
    for (const flat of blocks) {
      const parts = flat.match(/[^.!?।]+[.!?।]+["')\]]*\s*|[^.!?।]+$/gu) ?? [
        flat,
      ];
      for (let part of parts) {
        part = part.trim();
        while (part.length > 220) {
          const cut = Math.max(
            part.lastIndexOf(", ", 200),
            part.lastIndexOf(" ", 200),
          );
          const at = cut > 60 ? cut + 1 : 200;
          out.push({ page, text: part.slice(0, at).trim() });
          part = part.slice(at).trim();
        }
        if (part) out.push({ page, text: part });
      }
    }
  });
  return out;
}

/** PDF to audio: the browser reads the document aloud, sentence by sentence, highlighting as it goes. */
export function ReadAloudTool() {
  const [name, setName] = useState("");
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [reading, setReading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState("");
  const [rate, setRate] = useState(1);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
  const list = useRef<HTMLDivElement>(null);
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const v = speechSynthesis.getVoices();
      setVoices(v);
      setVoice(
        (cur) =>
          cur ||
          v.find((x) => x.default)?.voiceURI ||
          v.find((x) => x.lang.startsWith(navigator.language.slice(0, 2)))
            ?.voiceURI ||
          v[0]?.voiceURI ||
          "",
      );
    };
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", load);
      speechSynthesis.cancel();
    };
  }, [supported]);

  // Keep the sentence being read in view.
  useEffect(() => {
    list.current
      ?.querySelector(`[data-i="${at}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [at]);

  const speakFrom = (i: number) => {
    if (!supported || i >= sentences.length) {
      setPlaying(false);
      playingRef.current = false;
      return;
    }
    speechSynthesis.cancel();
    setAt(i);
    const u = new SpeechSynthesisUtterance(sentences[i].text);
    const v = voices.find((x) => x.voiceURI === voice);
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    }
    u.rate = rate;
    u.onend = () => {
      if (playingRef.current) speakFrom(i + 1);
    };
    u.onerror = (e) => {
      if (e.error !== "interrupted" && e.error !== "canceled")
        setError("Your browser stopped reading. Press play to continue.");
    };
    speechSynthesis.speak(u);
  };

  const play = (from = at) => {
    setError(null);
    playingRef.current = true;
    setPlaying(true);
    speakFrom(from);
  };
  const pause = () => {
    playingRef.current = false;
    setPlaying(false);
    speechSynthesis.cancel();
  };
  const jump = (i: number) => {
    const n = Math.max(0, Math.min(sentences.length - 1, i));
    if (playingRef.current) play(n);
    else setAt(n);
  };

  // Changing voice or speed applies from the current sentence.
  useEffect(() => {
    if (playingRef.current) speakFrom(at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice, rate]);

  const open = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    pause();
    setError(null);
    setReading("Reading your PDF…");
    try {
      const pages = await documentText(
        new Uint8Array(await f.arrayBuffer()),
        (m) => setReading(m),
      );
      setSentences(toSentences(pages));
      setName(f.name);
      setAt(0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(null);
    }
  };

  const pages = useMemo(
    () => [...new Set(sentences.map((s) => s.page))],
    [sentences],
  );
  const progress = sentences.length
    ? Math.round((at / Math.max(1, sentences.length - 1)) * 100)
    : 0;

  if (!supported)
    return (
      <p className="rounded-2xl bg-amber-500/10 p-6 text-center text-[14px] text-amber-200">
        This browser can&apos;t read text aloud. Try Chrome, Edge or Safari.
      </p>
    );

  if (!sentences.length) {
    return reading ? (
      <div
        className="flex flex-col items-center justify-center rounded-2xl bg-brand-500/10 py-14"
        role="status"
      >
        <Mascot mood="working" size={92} />
        <p className="mt-4 text-[15px] font-medium">{reading}</p>
      </div>
    ) : (
      <>
        <Dropzone
          accept="application/pdf,.pdf"
          multiple={false}
          onFiles={open}
          label="Choose a PDF"
        />
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-center text-[14px] text-red-300"
          >
            {error}
          </p>
        )}
      </>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div
        ref={list}
        className="thin-scroll h-[min(640px,calc(100dvh-240px))] min-h-[420px] overflow-y-auto rounded-2xl bg-surface p-5 text-[16px] leading-[1.9] ring-1 ring-line md:p-7"
      >
        {pages.map((p) => (
          <section key={p} className="mb-6">
            <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-fg-muted">
              Page {p + 1}
            </p>
            <p>
              {sentences.map((s, i) =>
                s.page === p ? (
                  <span
                    key={i}
                    data-i={i}
                    onClick={() => jump(i)}
                    className={cn(
                      "cursor-pointer rounded px-0.5 transition-colors",
                      i === at
                        ? "bg-amber-500/30/70 text-fg"
                        : i < at
                          ? "text-fg-muted"
                          : "hover:bg-raised",
                    )}
                  >
                    {s.text}{" "}
                  </span>
                ) : null,
              )}
            </p>
          </section>
        ))}
      </div>

      <aside className="h-fit space-y-5 rounded-2xl bg-surface p-5 ring-1 ring-line lg:sticky lg:top-24">
        <div className="flex items-center gap-3">
          <Mascot mood={playing ? "working" : "idle"} size={44} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold">{name}</p>
            <p className="text-[12px] text-fg-muted">
              Page {(sentences[at]?.page ?? 0) + 1} of{" "}
              {pages[pages.length - 1] + 1} · {progress}%
            </p>
          </div>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-sunken"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-brand-600 transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => jump(at - 1)}
            aria-label="Previous sentence"
            className="flex h-10 w-10 items-center justify-center rounded-full text-fg hover:bg-raised"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => (playing ? pause() : play())}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent hover:bg-accent-hover"
          >
            {playing ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="ml-0.5 h-6 w-6" />
            )}
          </button>
          <button
            type="button"
            onClick={() => jump(at + 1)}
            aria-label="Next sentence"
            className="flex h-10 w-10 items-center justify-center rounded-full text-fg hover:bg-raised"
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              pause();
              setAt(0);
            }}
            aria-label="Stop"
            className="flex h-10 w-10 items-center justify-center rounded-full text-fg hover:bg-raised"
          >
            <Square className="h-4 w-4" />
          </button>
        </div>
        <label className="block space-y-1.5">
          <span className="text-[13px] font-medium">Voice</span>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="h-10 w-full rounded-lg bg-sunken text-fg placeholder:text-fg-subtle px-2 text-[14px] ring-1 ring-line-strong outline-none focus:ring-2 focus:ring-brand-500"
          >
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="flex justify-between text-[13px] font-medium">
            Speed <span className="text-fg-muted">{rate.toFixed(2)}×</span>
          </span>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full accent-brand-500"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-[13px] font-medium">Jump to page</span>
          <select
            value={sentences[at]?.page ?? 0}
            onChange={(e) =>
              jump(
                sentences.findIndex((s) => s.page === Number(e.target.value)),
              )
            }
            className="h-10 w-full rounded-lg bg-sunken text-fg placeholder:text-fg-subtle px-2 text-[14px] ring-1 ring-line-strong outline-none focus:ring-2 focus:ring-brand-500"
          >
            {pages.map((p) => (
              <option key={p} value={p}>
                Page {p + 1}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-300"
          >
            {error}
          </p>
        )}
        <p className="text-[12px] leading-relaxed text-fg-muted">
          Read by your browser&apos;s own voices, so nothing is uploaded. Tap
          any sentence to start from there.
        </p>
        <button
          type="button"
          onClick={() => (pause(), setSentences([]))}
          className="text-[13px] font-medium text-brand-300 hover:underline"
        >
          Choose another PDF
        </button>
      </aside>
    </div>
  );
}
