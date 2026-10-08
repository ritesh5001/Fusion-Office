"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, FileText, Pause, Play, SkipBack, SkipForward, Sparkles, Square } from "lucide-react";
import { documentText } from "@/lib/tools/documentText";
import { cleanForSpeech } from "@/lib/tools/speech";
import { apiFetch } from "@/lib/api";
import { useCloudConfig } from "@/lib/cloudConfig";
import { Dropzone } from "../Dropzone";
import { Mascot } from "../../mascot/Mascot";
import { cn } from "@/lib/cn";
import { inApp } from "@/lib/embed";

const hasSpeech = () => typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Whether this browser can speak. Inside the Fusion Office app, the app adds
 * speech to its web view as the page loads, so wait a moment for it there.
 */
function useSpeechSupport() {
  const [supported, setSupported] = useState(hasSpeech);
  useEffect(() => {
    if (supported || !inApp()) return;
    let tries = 0;
    const t = setInterval(() => {
      if (hasSpeech()) setSupported(true);
      if (hasSpeech() || ++tries > 30) clearInterval(t);
    }, 100);
    return () => clearInterval(t);
  }, [supported]);
  return supported;
}

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
        // ≤ 190 characters: speech engines cut long ones off, and the natural voice takes 200 at most.
        while (part.length > 190) {
          const cut = Math.max(
            part.lastIndexOf(", ", 180),
            part.lastIndexOf(" ", 180),
          );
          const at = cut > 60 ? cut + 1 : 180;
          out.push({ page, text: part.slice(0, at).trim() });
          part = part.slice(at).trim();
        }
        if (part) out.push({ page, text: part });
      }
    }
  });
  return out;
}

type Mode = "full" | "summary" | "asis";

/** Lifelike voices on the server (Groq Orpheus, English). Picked as "ai:<id>". */
const NATURAL_VOICES = [
  { id: "hannah", label: "Hannah", note: "warm, female" },
  { id: "diana", label: "Diana", note: "clear, female" },
  { id: "autumn", label: "Autumn", note: "soft, female" },
  { id: "daniel", label: "Daniel", note: "calm, male" },
  { id: "austin", label: "Austin", note: "friendly, male" },
  { id: "troy", label: "Troy", note: "deep, male" },
];
const isNatural = (v: string) => v.startsWith("ai:");

/** Ranks device voices: the neural/natural ones sound far less robotic. */
function voiceScore(v: SpeechSynthesisVoice, lang: string) {
  let n = 0;
  if (/natural|neural|online/i.test(v.name)) n += 50; // Edge's "Online (Natural)" voices
  if (/premium|enhanced|siri/i.test(v.name)) n += 40; // Apple's downloadable voices
  if (/google/i.test(v.name)) n += 30;
  if (v.lang.toLowerCase().startsWith(lang)) n += 20;
  if (v.localService === false) n += 5;
  if (/compact|espeak/i.test(v.name)) n -= 30;
  return n;
}
const bestDeviceVoice = (list: SpeechSynthesisVoice[]) => {
  const lang = (typeof navigator !== "undefined" ? navigator.language : "en").slice(0, 2).toLowerCase();
  return [...list].sort((a, b) => voiceScore(b, lang) - voiceScore(a, lang))[0]?.voiceURI ?? "";
};

/** Natural voices speak English; use them only when the text is mostly Latin letters. */
const looksEnglish = (text: string) => {
  const letters = text.match(/\p{L}/gu) ?? [];
  return letters.length > 0 && letters.filter((c) => /[A-Za-z]/.test(c)).length / letters.length > 0.85;
};

const MODES: { id: Mode; icon: typeof Sparkles; title: string; text: string; ai: boolean }[] = [
  { id: "full", icon: Sparkles, title: "Smart narration", text: "AI rewrites the whole document as natural spoken sentences: no symbols, links or broken words. Best for listening.", ai: true },
  { id: "summary", icon: AudioLines, title: "Short spoken summary", text: "AI boils the document down to a one or two minute briefing.", ai: true },
  { id: "asis", icon: FileText, title: "Read as it is", text: "The document's own text, tidied up, with nothing sent anywhere.", ai: false },
];

/** Asks the server for speakable text; throws a readable message when it can't. */
async function narrateWithAi(pages: string[], mode: "full" | "summary"): Promise<string[]> {
  const res = await apiFetch("/api/ai/narrate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pages, mode }) });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(res.status === 429 ? "Smart narration is busy right now." : body.error ?? "Smart narration isn't available right now.");
  }
  return ((await res.json()) as { pages: string[] }).pages;
}

/**
 * PDF to audio: the document is read, optionally rewritten by AI into clean
 * spoken sentences, then read aloud by the browser's own voices, sentence by
 * sentence, highlighting as it goes.
 */
export function ReadAloudTool() {
  const { aiEnabled } = useCloudConfig();
  const [rawPages, setRawPages] = useState<string[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
  const supported = useSpeechSupport();

  useEffect(() => {
    if (!supported) return;
    const load = () => {
      const v = speechSynthesis.getVoices();
      setVoices(v);
      setVoice((cur) => cur || bestDeviceVoice(v));
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

  // ── Natural voice: one audio clip per sentence, the next two fetched ahead. ──
  const audio = useRef<HTMLAudioElement | null>(null);
  const clips = useRef(new Map<string, Promise<string>>());
  const english = useMemo(() => looksEnglish(sentences.map((x) => x.text).join(" ").slice(0, 4000)), [sentences]);
  const naturalOk = !!aiEnabled && english;

  const clip = (i: number, id: string) => {
    const key = `${id}|${i}`;
    let p = clips.current.get(key);
    if (!p) {
      p = apiFetch("/api/ai/speak", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: sentences[i].text, voice: id }) }).then(async (res) => {
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "The natural voice isn't available right now.");
        return URL.createObjectURL(await res.blob());
      });
      p.catch(() => clips.current.delete(key));
      clips.current.set(key, p);
    }
    return p;
  };

  // Free the audio clips when the document changes or the tool closes.
  useEffect(() => {
    const cache = clips.current;
    return () => {
      audio.current?.pause();
      cache.forEach((p) => p.then(URL.revokeObjectURL, () => {}));
      cache.clear();
    };
  }, [sentences]);

  // Start on the best voice: natural when available, otherwise the best device voice.
  const [voiceChosen, setVoiceChosen] = useState(false);
  if (naturalOk && !voiceChosen && !isNatural(voice) && sentences.length) {
    setVoiceChosen(true);
    setVoice("ai:hannah");
  }

  const speakNatural = async (i: number, id: string) => {
    speechSynthesis.cancel();
    setAt(i);
    const el = (audio.current ??= new Audio());
    el.pause();
    try {
      const url = await clip(i, id);
      for (const k of [i + 1, i + 2]) if (k < sentences.length) clip(k, id).catch(() => {});
      if (!playingRef.current) return;
      el.src = url;
      el.playbackRate = rate;
      el.onended = () => playingRef.current && speakFrom(i + 1);
      await el.play();
    } catch (e) {
      if (!playingRef.current) return;
      // Keep reading: switch to the best device voice and say why.
      const fallback = bestDeviceVoice(voices);
      setNotice(`${(e as Error).message} Switched to your device's voice.`);
      setVoice(fallback);
      speakDevice(i, fallback);
    }
  };

  const speakFrom = (i: number) => {
    if (!supported || i >= sentences.length) {
      setPlaying(false);
      playingRef.current = false;
      return;
    }
    if (isNatural(voice) && naturalOk) return void speakNatural(i, voice.slice(3));
    speakDevice(i, voice);
  };

  const speakDevice = (i: number, uri: string) => {
    audio.current?.pause();
    speechSynthesis.cancel();
    setAt(i);
    const u = new SpeechSynthesisUtterance(sentences[i].text);
    const v = voices.find((x) => x.voiceURI === uri);
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
    audio.current?.pause();
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
    setNotice(null);
    setReading("Reading your PDF…");
    try {
      const pages = await documentText(
        new Uint8Array(await f.arrayBuffer()),
        (m) => setReading(m),
      );
      setName(f.name);
      setRawPages(pages);
      // Without AI there is nothing to choose: read the tidied text straight away.
      if (!aiEnabled) start(pages, "asis");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReading(null);
    }
  };

  /** Turn the extracted text into what gets spoken, then show the player. */
  const start = async (pages: string[], mode: Mode) => {
    setError(null);
    setNotice(null);
    let spoken = pages.map(cleanForSpeech);
    if (mode !== "asis") {
      setReading(mode === "summary" ? "Writing your spoken summary…" : "Rewriting it for listening…");
      try {
        const out = await narrateWithAi(pages, mode);
        const clean = out.map(cleanForSpeech);
        if (clean.some((p) => p.trim())) spoken = clean;
      } catch (e) {
        // The reader still works: fall back to the tidied original and say why.
        setNotice(`${(e as Error).message} Reading the document's own text instead.`);
      } finally {
        setReading(null);
      }
    }
    setSentences(toSentences(spoken));
    setAt(0);
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

  if (!sentences.length && rawPages && !reading) {
    // The PDF is read; choose how it should be spoken.
    return (
      <div className="mx-auto max-w-[760px]">
        <p className="text-center text-[13px] text-fg-muted">
          <span className="font-medium text-fg">{name}</span> · {rawPages.length} page{rawPages.length === 1 ? "" : "s"} read
        </p>
        <h2 className="mt-2 text-center font-display text-[24px] font-bold tracking-[-0.02em]">How should it be read?</h2>
        <ul className="mt-6 grid gap-3">
          {MODES.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => start(rawPages, m.id)}
                className={cn(
                  "fo-press flex w-full items-start gap-4 rounded-2xl border bg-surface p-4 text-left transition-colors hover:bg-raised",
                  m.id === "full" ? "border-accent/40" : "border-line hover:border-line-strong",
                )}
              >
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset", m.id === "full" ? "bg-accent text-on-accent ring-accent" : "bg-raised text-fg ring-line-strong")}>
                  <m.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[16px] font-semibold text-fg">{m.title}</span>
                    {m.id === "full" && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">Recommended</span>}
                    {m.ai && <span className="rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium text-fg-muted">Uses AI</span>}
                  </span>
                  <span className="mt-1 block text-[13.5px] leading-relaxed text-fg-muted">{m.text}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-[12.5px] leading-relaxed text-fg-subtle">
          AI options send only the document&apos;s text to our AI provider; nothing is stored. The voice itself is always your device&apos;s own.
        </p>
        <div className="mt-5 text-center">
          <button type="button" onClick={() => (setRawPages(null), setName(""))} className="text-[13px] font-medium text-brand-300 hover:underline">
            Choose another PDF
          </button>
        </div>
      </div>
    );
  }

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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
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
            onChange={(e) => (setVoiceChosen(true), setNotice(null), setVoice(e.target.value))}
            className="h-10 w-full rounded-lg bg-sunken text-fg placeholder:text-fg-subtle px-2 text-[14px] ring-1 ring-line-strong outline-none focus:ring-2 focus:ring-brand-500"
          >
            {naturalOk && (
              <optgroup label="Natural voices (AI)">
                {NATURAL_VOICES.map((v) => (
                  <option key={v.id} value={`ai:${v.id}`}>
                    {v.label} · {v.note}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Device voices">
              {[...voices]
                .sort((a, b) => voiceScore(b, navigator.language.slice(0, 2).toLowerCase()) - voiceScore(a, navigator.language.slice(0, 2).toLowerCase()))
                .map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
            </optgroup>
          </select>
          {isNatural(voice) && naturalOk && (
            <span className="mt-1.5 flex items-center gap-1.5 text-[12px] text-accent">
              <Sparkles className="h-3 w-3" aria-hidden="true" /> Lifelike AI voice · sentences are sent to our AI provider to be spoken
            </span>
          )}
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
        {notice && (
          <p role="status" className="rounded-lg bg-amber-500/10 px-3 py-2 text-[12.5px] leading-relaxed text-amber-200">
            {notice}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-300"
          >
            {error}
          </p>
        )}
        <p className="text-[12px] leading-relaxed text-fg-muted">
          {isNatural(voice) && naturalOk ? "The PDF itself is never uploaded; only the text being read goes to the voice service." : "Spoken by your device's own voice; nothing is uploaded."} Tap any sentence to start from there.
        </p>
        <button
          type="button"
          onClick={() => (pause(), setSentences([]), setRawPages(null), setNotice(null))}
          className="text-[13px] font-medium text-brand-300 hover:underline"
        >
          Choose another PDF
        </button>
      </aside>
    </div>
  );
}
