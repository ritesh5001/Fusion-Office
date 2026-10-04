import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Request, RequestHandler, Response } from "express";
import { HttpError } from "./http.js";

/**
 * Admin sessions for the feedback panel. There is one admin password
 * (ADMIN_PASSWORD); signing in sets an httpOnly cookie holding a signed expiry,
 * so no session table is needed. Changing the password signs everyone out.
 */
export const ADMIN_COOKIE = "fo_admin";
const SESSION_MS = 12 * 60 * 60 * 1000;

export const adminEnabled = () => !!process.env.ADMIN_PASSWORD;

const key = () => {
  const base = process.env.ADMIN_SECRET || process.env.AUTH_SECRET || "";
  // Tie sessions to the password, so changing it invalidates every session.
  return createHash("sha256").update(`${base}:${process.env.ADMIN_PASSWORD ?? ""}`).digest();
};

const sign = (payload: string) => createHmac("sha256", key()).update(payload).digest("base64url");

const equal = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function checkPassword(given: unknown) {
  const real = process.env.ADMIN_PASSWORD ?? "";
  if (!real || typeof given !== "string") return false;
  // Compare digests so the comparison takes the same time whatever the length.
  return timingSafeEqual(createHash("sha256").update(given).digest(), createHash("sha256").update(real).digest());
}

export function createToken(now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ exp: now + SESSION_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined, now = Date.now()) {
  if (!token || !adminEnabled()) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !equal(sig, sign(payload))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp: number };
    return typeof exp === "number" && exp > now;
  } catch {
    return false;
  }
}

const readCookie = (req: Request, name: string) =>
  (req.headers.cookie ?? "")
    .split(";")
    .map((c) => c.trim().split("="))
    .find(([k]) => k === name)?.[1];

const secure = (req: Request) => req.protocol === "https" || req.get("x-forwarded-proto")?.split(",")[0].trim() === "https";

export function setAdminCookie(req: Request, res: Response) {
  res.cookie(ADMIN_COOKIE, createToken(), { httpOnly: true, sameSite: "strict", secure: secure(req), path: "/api/admin", maxAge: SESSION_MS });
}

export function clearAdminCookie(req: Request, res: Response) {
  res.clearCookie(ADMIN_COOKIE, { httpOnly: true, sameSite: "strict", secure: secure(req), path: "/api/admin" });
}

export const isAdmin = (req: Request) => verifyToken(readCookie(req, ADMIN_COOKIE));

/** Rejects requests without a valid admin session. */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!adminEnabled()) return next(new HttpError(503, "The admin panel is not configured (set ADMIN_PASSWORD)."));
  if (!isAdmin(req)) return next(new HttpError(401, "Please sign in."));
  next();
};
