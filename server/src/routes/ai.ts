import { Router } from "express";
import { HttpError } from "../lib/http.js";
import { MAX_LANGUAGE_LENGTH, TTS_MAX_CHARS, chatWithDocument, isSummaryLength, isTtsVoice, narrate, narrateSummary, parsePages, parseTurns, speak, summarize, translate } from "../lib/ai.js";

export const ai = Router();

/**
 * Natural voice. Body: { text (≤200 chars), voice } → audio/wav. One sentence
 * per request; mounted with its own rate limit in app.ts (a document is many sentences).
 */
export const speech = Router();
speech.post("/", async (req, res, next) => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const text = typeof b.text === "string" ? b.text.trim() : "";
    if (!text) throw new HttpError(400, "Nothing to read.");
    if (text.length > TTS_MAX_CHARS) throw new HttpError(413, `Send at most ${TTS_MAX_CHARS} characters at a time.`);
    if (!isTtsVoice(b.voice)) throw new HttpError(400, "Choose a voice.");
    const audio = await speak(text, b.voice);
    res.set({ "content-type": "audio/wav", "cache-control": "private, max-age=86400" }).send(audio);
  } catch (err) {
    next(err);
  }
});

/** Body: { pages: string[], length: "short" | "medium" | "detailed" } → { summary } (Markdown). */
ai.post("/summarize", async (req, res, next) => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const pages = parsePages(b.pages);
    const length = isSummaryLength(b.length) ? b.length : "medium";
    res.json({ summary: await summarize(pages, length) });
  } catch (err) {
    next(err);
  }
});

// A language name: letters, spaces and a few separators, e.g. "Chinese (Simplified)".
const LANGUAGE = new RegExp(`^[\\p{L}][\\p{L} ()\\-]{0,${MAX_LANGUAGE_LENGTH - 1}}$`, "u");

/** Body: { pages: string[], target: language name } → { pages: string[] }, one per input page. */
ai.post("/translate", async (req, res, next) => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const pages = parsePages(b.pages);
    if (typeof b.target !== "string" || !LANGUAGE.test(b.target.trim())) throw new HttpError(400, "Choose a language to translate into.");
    res.json({ pages: await translate(pages, b.target.trim()) });
  } catch (err) {
    next(err);
  }
});

/**
 * Body: { pages: string[], mode: "full" | "summary" } → { pages: string[] } of speakable text.
 * "full" returns one script per input page; "summary" returns a single spoken briefing.
 */
ai.post("/narrate", async (req, res, next) => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const pages = parsePages(b.pages);
    if (b.mode === "summary") return res.json({ pages: [await narrateSummary(pages)] });
    res.json({ pages: await narrate(pages) });
  } catch (err) {
    next(err);
  }
});

/** Body: { pages: string[], messages: { role, text }[] } (alternating, last from the user) → { answer } (Markdown). */
ai.post("/chat", async (req, res, next) => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const pages = parsePages(b.pages);
    const turns = parseTurns(b.messages);
    res.json({ answer: await chatWithDocument(pages, turns) });
  } catch (err) {
    next(err);
  }
});
