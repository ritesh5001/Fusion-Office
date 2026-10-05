import { Router } from "express";
import { dbEnabled, prisma } from "../lib/db.js";
import { HttpError } from "../lib/http.js";
import { contactThanks, sendMail, storyThanks } from "../lib/mail.js";

/**
 * Public forms besides feedback: the contact form and pay-it-forward stories.
 * Both land in the admin inbox; when an email address is given, a thank-you
 * email goes out through Resend. Rate limits and the human check are in app.ts.
 */
export const contact = Router();
export const stories = Router();

export const MESSAGE_LIMITS = { name: 80, email: 254, subject: 120, message: 4000 } as const;
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Shared checks: honeypot, name, optional/required email. Throws HttpError(400). */
function common(body: unknown, needEmail: boolean) {
  const b = (body ?? {}) as Record<string, unknown>;
  if (text(b.website)) throw new HttpError(400, "Couldn't send your message.");
  const name = text(b.name).replace(/\s+/g, " ");
  const email = text(b.email).toLowerCase();
  if (!name) throw new HttpError(400, "Please add your name.");
  if (name.length > MESSAGE_LIMITS.name) throw new HttpError(400, `Please keep your name under ${MESSAGE_LIMITS.name} characters.`);
  if (needEmail && !email) throw new HttpError(400, "Please add your email so we can reply.");
  if (email && (email.length > MESSAGE_LIMITS.email || !EMAIL.test(email))) throw new HttpError(400, "That email address doesn't look right.");
  return { b, name, email: email || null };
}

export function parseContact(body: unknown) {
  const { b, name, email } = common(body, true);
  const subject = text(b.subject).replace(/\s+/g, " ").slice(0, MESSAGE_LIMITS.subject) || null;
  const message = text(b.message);
  if (message.length < 10) throw new HttpError(400, "Please tell us a little more (at least 10 characters).");
  if (message.length > MESSAGE_LIMITS.message) throw new HttpError(400, `Please keep your message under ${MESSAGE_LIMITS.message} characters.`);
  return { kind: "contact", name, email, subject, message };
}

export function parseStory(body: unknown) {
  const { b, name, email } = common(body, false);
  const subject = text(b.title).replace(/\s+/g, " ").slice(0, MESSAGE_LIMITS.subject) || null;
  const message = text(b.story);
  if (message.length < 20) throw new HttpError(400, "Please tell us a little more about who you helped (at least 20 characters).");
  if (message.length > MESSAGE_LIMITS.message) throw new HttpError(400, `Please keep your story under ${MESSAGE_LIMITS.message} characters.`);
  return { kind: "story", name, email, subject, message };
}

const save = (parse: typeof parseContact, thanks: typeof contactThanks) =>
  async (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
    try {
      if (!dbEnabled) throw new HttpError(503, "This form isn't available right now. Please email contact@nextgenfusion.in.");
      const data = parse(req.body);
      await prisma.feedback.create({ data: { ...data, page: null, userAgent: req.get("user-agent")?.slice(0, 300) ?? null } });
      // Don't make the person wait for the email; it's a courtesy, not part of saving.
      if (data.email) void sendMail(thanks(data.name, data.email));
      res.status(201).json({ ok: true });
    } catch (err) {
      next(err);
    }
  };

contact.post("/", save(parseContact, contactThanks));
stories.post("/", save(parseStory, storyThanks));
