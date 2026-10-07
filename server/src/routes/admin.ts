import { Router } from "express";
import { dbEnabled, prisma } from "../lib/db.js";
import { HttpError } from "../lib/http.js";
import { rateLimit } from "../lib/rateLimit.js";
import { adminEnabled, checkPassword, clearAdminCookie, isAdmin, requireAdmin, setAdminCookie } from "../lib/admin.js";

const KINDS = ["feedback", "contact", "story"];

/** The feedback admin panel's API. Everything except login needs an admin session. */
export const admin = Router();

admin.get("/session", (req, res) => {
  res.json({ enabled: adminEnabled(), signedIn: isAdmin(req) });
});

// At most 10 password attempts per 15 minutes per IP.
admin.post("/login", rateLimit({ name: "admin-login", windowMs: 15 * 60_000, max: 10 }), (req, res, next) => {
  if (!adminEnabled()) return next(new HttpError(503, "The admin panel is not configured (set ADMIN_PASSWORD)."));
  if (!checkPassword(req.body?.password)) return next(new HttpError(401, "Wrong password."));
  setAdminCookie(req, res);
  res.json({ ok: true });
});

admin.post("/logout", (req, res) => {
  clearAdminCookie(req, res);
  res.json({ ok: true });
});

admin.use(requireAdmin, (_req, _res, next) => next(dbEnabled ? undefined : new HttpError(503, "The database is not configured.")));

admin.get("/feedback", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const filter = req.query.filter;
    // Which inbox: feedback (default), contact messages or pay-it-forward stories.
    const kind = KINDS.includes(req.query.kind as string) ? (req.query.kind as string) : "feedback";
    const contains = (field: "name" | "message" | "email" | "subject") => ({ [field]: { contains: q, mode: "insensitive" as const } });
    const where = {
      kind,
      ...(q ? { OR: [contains("name"), contains("message"), contains("email"), contains("subject")] } : {}),
      ...(filter === "unread" ? { read: false } : filter === "starred" ? { starred: true } : {}),
    };
    const [items, total, unread, starred, perKind] = await Promise.all([
      prisma.feedback.findMany({ where, orderBy: { createdAt: "desc" }, take: 500 }),
      prisma.feedback.count({ where: { kind } }),
      prisma.feedback.count({ where: { kind, read: false } }),
      prisma.feedback.count({ where: { kind, starred: true } }),
      prisma.feedback.groupBy({ by: ["kind"], where: { read: false }, _count: { _all: true } }),
    ]);
    const unreadByKind = Object.fromEntries(KINDS.map((k) => [k, perKind.find((p) => p.kind === k)?._count._all ?? 0]));
    res.json({ items, counts: { total, unread, starred }, unreadByKind });
  } catch (err) {
    next(err);
  }
});

admin.patch("/feedback/:id", async (req, res, next) => {
  try {
    const data: { read?: boolean; starred?: boolean } = {};
    if (typeof req.body?.read === "boolean") data.read = req.body.read;
    if (typeof req.body?.starred === "boolean") data.starred = req.body.starred;
    if (!Object.keys(data).length) throw new HttpError(400, "Nothing to change.");
    const item = await prisma.feedback.update({ where: { id: req.params.id }, data }).catch(() => null);
    if (!item) throw new HttpError(404, "Feedback not found.");
    res.json(item);
  } catch (err) {
    next(err);
  }
});

admin.delete("/feedback/:id", async (req, res, next) => {
  try {
    const gone = await prisma.feedback.delete({ where: { id: req.params.id } }).catch(() => null);
    if (!gone) throw new HttpError(404, "Feedback not found.");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
