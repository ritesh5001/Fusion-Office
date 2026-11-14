import { Router } from "express";
import { HttpError } from "../lib/http.js";
import {
  MAX_JOB_CHARS, MAX_LANGUAGE_LENGTH, MAX_REWRITE_CHARS, TTS_MAX_CHARS, chatWithDocument, checkResume, extractData, isExtractKind, isQuizKind, isQuizLevel, isRewriteMode,
  isSummaryLength, isTtsVoice, makeQuiz, makeSlides, narrate, narrateSummary, parseLabels, parsePages, parseTurns, rewriteText, speak, summarize, translate,
} from "../lib/ai.js";

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
    res.json({ answer: await chatWithDocument(pages, turns, parseLabels(b.labels, pages.length)) });
  } catch (err) {
    next(err);
  }
});

/** Body: { pages, kind: mcq|truefalse|short|flashcards, count, level: easy|medium|hard } → { items }. */
ai.post("/quiz", async (req, res, next) => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const pages = parsePages(b.pages);
    if (!isQuizKind(b.kind)) throw new HttpError(400, "Choose the kind of questions.");
    res.json({ items: await makeQuiz(pages, b.kind, Number(b.count), isQuizLevel(b.level) ? b.level : "medium") });
  } catch (err) {
    next(err);
  }
});

/** Body: { pages, kind: invoice|receipt|tables } → the extracted data. */
ai.post("/extract", async (req, res, next) => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const pages = parsePages(b.pages);
    if (!isExtractKind(b.kind)) throw new HttpError(400, "Choose what to extract.");
    res.json(await extractData(pages, b.kind));
  } catch (err) {
    next(err);
  }
});

/** Body: { pages, count, audience? } → { title, subtitle, slides: [{ title, bullets, notes }] }. */
ai.post("/slides", async (req, res, next) => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const pages = parsePages(b.pages);
    const audience = typeof b.audience === "string" ? b.audience.trim().slice(0, 120) : "";
    res.json(await makeSlides(pages, Number(b.count), audience));
  } catch (err) {
    next(err);
  }
});

/** Body: { pages (the resume), job? (job description text) } → an ATS report. */
ai.post("/ats", async (req, res, next) => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const pages = parsePages(b.pages);
    const job = typeof b.job === "string" ? b.job : "";
    if (job.length > MAX_JOB_CHARS) throw new HttpError(413, "That job description is too long. Paste the main part.");
    res.json(await checkResume(pages, job));
  } catch (err) {
    next(err);
  }
});

/** Body: { text, mode: proofread|formal|friendly|shorter|simpler|expand } → { text }. For the Word editor. */
ai.post("/rewrite", async (req, res, next) => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const text = typeof b.text === "string" ? b.text.trim() : "";
    if (!text) throw new HttpError(400, "Select some text first.");
    if (text.length > MAX_REWRITE_CHARS) throw new HttpError(413, `Select at most ${MAX_REWRITE_CHARS.toLocaleString("en")} characters at a time.`);
    if (!isRewriteMode(b.mode)) throw new HttpError(400, "Choose how to rewrite it.");
    res.json({ text: await rewriteText(text, b.mode) });
  } catch (err) {
    next(err);
  }
});
