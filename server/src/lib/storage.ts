import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

/**
 * File storage on the server's own disk (a Render persistent disk in
 * production, ./.data/files locally).
 *
 * Browsers never get raw paths. The API hands out short-lived signed links
 * (/api/files/<key>?op=get|put&exp=…&sig=…), verified with an HMAC, and the
 * files route streams bytes in and out. The document routes don't know or
 * care where the bytes live.
 */
export const storageDir = path.resolve(process.env.STORAGE_DIR || ".data/files");
export const storageEnabled = true;

/** Largest upload accepted, in bytes (default 200 MB). */
export const maxUploadBytes = Number(process.env.MAX_UPLOAD_MB ?? 200) * 1024 * 1024;

const LINK_TTL_SECONDS = 15 * 60;

// Signing key: a dedicated secret, else AUTH_SECRET, else a random per-process
// key (links then stop working after a restart, which is fine in development).
const signingKey = process.env.STORAGE_SIGNING_SECRET || process.env.AUTH_SECRET || randomBytes(32).toString("hex");

export type FileOp = "get" | "put";

export const sourceKey = (userId: string, documentId: string, sourceId: string) =>
  `users/${userId}/documents/${documentId}/sources/${sourceId}.pdf`;

const KEY_RE = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_.-]+)*$/;

/** Absolute path for a key, refusing anything that could escape storageDir. */
export function filePath(key: string): string {
  if (!KEY_RE.test(key) || key.split("/").some((p) => p === "." || p === "..")) throw new Error("Invalid storage key");
  const full = path.resolve(storageDir, key);
  if (!full.startsWith(storageDir + path.sep)) throw new Error("Invalid storage key");
  return full;
}

const sign = (key: string, op: FileOp, exp: number) =>
  createHmac("sha256", signingKey).update(`${op}\n${key}\n${exp}`).digest("base64url");

function signedUrl(key: string, op: FileOp): string {
  const exp = Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS;
  const q = new URLSearchParams({ op, exp: String(exp), sig: sign(key, op, exp) });
  // Relative on purpose: works through the client's /api proxy and in direct mode.
  return `/api/files/${key}?${q}`;
}

/** Check a signed link. Returns an error message, or null when valid. */
export function verifySignature(key: string, op: string | undefined, exp: string | undefined, sig: string | undefined): string | null {
  if (op !== "get" && op !== "put") return "Invalid link";
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || !sig) return "Invalid link";
  if (expNum < Math.floor(Date.now() / 1000)) return "This link has expired";
  const expected = Buffer.from(sign(key, op, expNum));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return "Invalid link";
  return null;
}

export async function presignUpload(key: string): Promise<string> {
  await mkdir(path.dirname(filePath(key)), { recursive: true });
  return signedUrl(key, "put");
}

export async function presignDownload(key: string): Promise<string> {
  filePath(key);
  return signedUrl(key, "get");
}

export async function deleteObject(key: string): Promise<void> {
  await rm(filePath(key), { force: true });
}
