import { Router } from "express";
import { HttpError } from "../lib/http.js";
import { MAX_LANGUAGE_LENGTH, isSummaryLength, parsePages, summarize, translate } from "../lib/ai.js";

export const ai = Router();

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
