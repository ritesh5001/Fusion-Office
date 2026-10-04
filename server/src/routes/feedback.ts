import { Router } from "express";
import { dbEnabled, prisma } from "../lib/db.js";
import { HttpError } from "../lib/http.js";

/** Public: anyone can send feedback (name + message). Rate limited in app.ts. */
export const feedback = Router();

export const LIMITS = { name: 80, message: 2000 } as const;

/** Validates and tidies a submission. Throws HttpError(400) with a helpful message. */
export function parseFeedback(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  // Bots fill every field; people never see this one.
  if (typeof b.website === "string" && b.website.trim()) throw new HttpError(400, "Couldn't send feedback.");
  const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ") : "";
  const message = typeof b.message === "string" ? b.message.trim() : "";
  if (!name) throw new HttpError(400, "Please add your name.");
  if (name.length > LIMITS.name) throw new HttpError(400, `Please keep your name under ${LIMITS.name} characters.`);
  if (message.length < 3) throw new HttpError(400, "Please write a little feedback.");
  if (message.length > LIMITS.message) throw new HttpError(400, `Please keep feedback under ${LIMITS.message} characters.`);
  const rating = typeof b.rating === "number" && Number.isInteger(b.rating) && b.rating >= 1 && b.rating <= 5 ? b.rating : null;
  const page = typeof b.page === "string" && b.page.startsWith("/") ? b.page.slice(0, 200) : null;
  return { name, message, rating, page };
}

feedback.post("/", async (req, res, next) => {
  try {
    if (!dbEnabled) throw new HttpError(503, "Feedback isn't available right now.");
    const data = parseFeedback(req.body);
    await prisma.feedback.create({ data: { ...data, userAgent: req.get("user-agent")?.slice(0, 300) ?? null } });
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});
