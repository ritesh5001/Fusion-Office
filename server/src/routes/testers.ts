import { Router } from "express";
import { dbEnabled, prisma } from "../lib/db.js";
import { HttpError } from "../lib/http.js";
import { rateLimit } from "../lib/rateLimit.js";
import { originGuard } from "../lib/security.js";
import { turnstileGuard } from "../lib/turnstile.js";
import { inviteCode, parseTester, processPhoto, publicTester, validInvite } from "../lib/testers.js";

/**
 * Early testers. Public reads for the mobile app's Special thanks screen
 * (names, usernames and photos, never emails); sign-up needs the invite code
 * from the link sent to testers.
 */
export const testers = Router();

const PUBLIC_FIELDS = { id: true, name: true, username: true, createdAt: true, updatedAt: true } as const;

testers.get("/", async (_req, res, next) => {
  try {
    if (!dbEnabled) return void res.json({ testers: [] });
    const rows = await prisma.tester.findMany({ where: { visible: true }, orderBy: { createdAt: "asc" }, select: PUBLIC_FIELDS });
    // Short cache: a new tester shows up within a few minutes.
    res.set("Cache-Control", "public, max-age=300");
    res.json({ testers: rows.map(publicTester) });
  } catch (err) {
    next(err);
  }
});

/** Lets the sign-up page say straight away whether its link is valid. */
testers.get("/invite/:code", rateLimit({ name: "tester-invite", windowMs: 15 * 60_000, max: 30 }), (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ valid: validInvite(req.params.code), open: !!inviteCode() && dbEnabled });
});

testers.get("/:id/photo", async (req, res, next) => {
  try {
    if (!dbEnabled) throw new HttpError(404, "Not found");
    const t = await prisma.tester.findUnique({ where: { id: req.params.id }, select: { photo: true, photoType: true, visible: true } });
    if (!t || !t.visible) throw new HttpError(404, "Not found");
    // The URL carries a version (?v=…), so the bytes behind it never change.
    res.set({ "Content-Type": t.photoType, "Cache-Control": "public, max-age=31536000, immutable", "Cross-Origin-Resource-Policy": "cross-origin" });
    res.send(Buffer.from(t.photo));
  } catch (err) {
    next(err);
  }
});

// Sign-up: origin-checked, at most 8 tries an hour per IP, and a human check when configured.
testers.post(
  "/join",
  originGuard(),
  rateLimit({ name: "tester-join", windowMs: 60 * 60_000, max: Number(process.env.TESTER_RATE_LIMIT) || 8 }),
  turnstileGuard(),
  async (req, res, next) => {
    try {
      if (!dbEnabled || !inviteCode()) throw new HttpError(503, "Tester sign-up isn't open right now.");
      if (!validInvite((req.body as { invite?: unknown } | undefined)?.invite))
        throw new HttpError(403, "This invite link isn't valid. Please ask the Fusion Office team for a new one.");
      const data = parseTester(req.body);
      const taken = await prisma.tester.findFirst({ where: { OR: [{ email: data.email }, { usernameKey: data.usernameKey }] }, select: { email: true } });
      if (taken) throw new HttpError(409, taken.email === data.email ? "You're already on the list with this email. Thank you!" : "That username is taken. Please choose another one.");
      // Only compress once the cheap checks have passed.
      // Prisma's Bytes type wants a plain Uint8Array.
      const photo = new Uint8Array(await processPhoto((req.body as { photo?: unknown }).photo));
      const created = await prisma.tester
        .create({ data: { ...data, photo, photoType: "image/jpeg", userAgent: req.get("user-agent")?.slice(0, 300) ?? null }, select: PUBLIC_FIELDS })
        .catch((err: { code?: string }) => {
          // Two sign-ups racing for the same email or username.
          if (err.code === "P2002") throw new HttpError(409, "That email or username was just registered. Please check your details.");
          throw err;
        });
      res.status(201).json({ tester: publicTester(created) });
    } catch (err) {
      next(err);
    }
  },
);
