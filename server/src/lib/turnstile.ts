import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, RequestHandler, Response } from "express";

/**
 * Cloudflare Turnstile: proof that a person (not a script) started a request.
 * On when TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are both set; the client
 * learns the site key from /api/config, so the two can never disagree.
 *
 * A solved check earns a short "human pass" (a signed httpOnly cookie), so a
 * person converting several files, or listening to a PDF sentence by sentence,
 * isn't challenged on every request. Bots without a solved check get nothing.
 */
export const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY?.trim() || null;
const secret = process.env.TURNSTILE_SECRET_KEY?.trim() || null;
export const turnstileEnabled = !!(turnstileSiteKey && secret);

/** Turnstile "action" the browser widget is rendered with. */
export const TURNSTILE_ACTION = "human";
export const PASS_COOKIE = "fo_human";
export const PASS_MS = 30 * 60_000;
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface Siteverify {
  success: boolean;
  action?: string;
  "error-codes"?: string[];
}

/** Ask Cloudflare whether `token` is valid, unused and was issued for `action`. */
export async function verifyTurnstile(token: string, ip: string | undefined, action: string, secretKey = secret): Promise<boolean> {
  const body = new URLSearchParams({ secret: secretKey ?? "", response: token });
  if (ip) body.set("remoteip", ip);
  const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Turnstile siteverify answered ${res.status}`);
  const data = (await res.json()) as Siteverify;
  if (!data.success) return false;
  // A token from another widget (another action) doesn't count. Cloudflare's
  // testing keys answer with action "test".
  return !data.action || data.action === action || data.action === "test";
}

const sign = (payload: string, secretKey: string) => createHmac("sha256", `turnstile-pass:${secretKey}`).update(payload).digest("base64url");

export function createPass(secretKey: string, now = Date.now()) {
  const exp = String(now + PASS_MS);
  return `${exp}.${sign(exp, secretKey)}`;
}

export function verifyPass(pass: string | undefined, secretKey: string, now = Date.now()) {
  if (!pass) return false;
  const [exp, sig] = pass.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) <= now) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp, secretKey));
  return a.length === b.length && timingSafeEqual(a, b);
}

const readCookie = (req: Request, name: string) =>
  (req.headers.cookie ?? "")
    .split(";")
    .map((c) => c.trim().split("="))
    .find(([k]) => k === name)?.[1];

const secure = (req: Request) => req.protocol === "https" || req.get("x-forwarded-proto")?.split(",")[0].trim() === "https";

function setPass(req: Request, res: Response, secretKey: string) {
  res.cookie(PASS_COOKIE, createPass(secretKey), { httpOnly: true, sameSite: "lax", secure: secure(req), path: "/api", maxAge: PASS_MS });
  // Lets the browser know when to run the check again (it can't read the cookie).
  res.set("X-Human-Pass-Expires", String(Date.now() + PASS_MS));
}

/**
 * Require a person: a valid human-pass cookie, or a fresh Turnstile token in
 * the CF-Turnstile-Response header (each token works once and expires after
 * 5 minutes, so a bot can't replay one). Runs before the route reads the
 * upload, so rejected requests cost nothing.
 */
export function turnstileGuard(enabled = turnstileEnabled, secretKey = secret ?? ""): RequestHandler {
  return async (req, res, next) => {
    if (!enabled || req.method === "OPTIONS") return next();
    if (verifyPass(readCookie(req, PASS_COOKIE), secretKey)) return next();
    const token = req.get("cf-turnstile-response")?.trim();
    if (!token || token.length > 2048) {
      res.status(403).json({ error: "Please complete the security check and try again.", code: "turnstile_required" });
      return;
    }
    try {
      if (await verifyTurnstile(token, req.ip, TURNSTILE_ACTION, secretKey)) {
        setPass(req, res, secretKey);
        return next();
      }
      res.status(403).json({ error: "The security check failed or expired. Please try again.", code: "turnstile_required" });
    } catch (err) {
      // Fail closed: without Cloudflare's answer we can't tell a person from a bot.
      console.error("[turnstile]", err);
      res.status(503).json({ error: "Couldn't run the security check. Please try again in a moment." });
    }
  };
}
