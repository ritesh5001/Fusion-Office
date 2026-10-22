/**
 * Early testers: the people thanked by name in the mobile app. They sign up
 * through an invite-only page on the website (name, username, email, photo);
 * the photo is re-encoded here so the app only ever downloads a small,
 * clean square JPEG.
 */
import { createHmac } from "node:crypto";
import sharp from "sharp";
import { HttpError } from "./http.js";
import { hasAbuse } from "./moderation.js";

export const TESTER_LIMITS = { name: 60, username: 30, email: 254 } as const;

/** Largest photo accepted before compression (phone photos are a few MB). */
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
/** The stored photo: a square this many pixels wide. */
export const PHOTO_SIZE = 400;

/**
 * The invite code in the link sent to testers. TESTER_INVITE_CODE sets it
 * directly (change it to retire an old link); otherwise it's derived from the
 * server's secret, so it stays the same across restarts without any setup.
 * Null when there's no secret at all: sign-up is then closed.
 */
export function inviteCode(env = process.env): string | null {
  const set = env.TESTER_INVITE_CODE?.trim();
  if (set) return set;
  const secret = env.ADMIN_SECRET || env.AUTH_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update("fusion-office:tester-invite:v1").digest("base64url").slice(0, 16);
}

export function validInvite(given: unknown, env = process.env) {
  const code = inviteCode(env);
  return !!code && typeof given === "string" && given.trim() === code;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// 3–30 characters: letters, digits, underscores and dots, not starting or ending with a dot.
const USERNAME = /^[A-Za-z0-9_](?:[A-Za-z0-9_.]*[A-Za-z0-9_])?$/;

/** Validates and tidies a sign-up. Throws HttpError(400) with a message to show. */
export function parseTester(body: unknown) {
  const b = (body ?? {}) as Record<string, unknown>;
  // Bots fill every field; people never see this one.
  if (typeof b.website === "string" && b.website.trim()) throw new HttpError(400, "Couldn't save your details.");

  const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2) throw new HttpError(400, "Please add your name.");
  if (name.length > TESTER_LIMITS.name) throw new HttpError(400, `Please keep your name under ${TESTER_LIMITS.name} characters.`);

  const username = typeof b.username === "string" ? b.username.trim().replace(/^@+/, "") : "";
  if (username.length < 3) throw new HttpError(400, "Please choose a username of at least 3 characters.");
  if (username.length > TESTER_LIMITS.username) throw new HttpError(400, `Please keep your username under ${TESTER_LIMITS.username} characters.`);
  if (!USERNAME.test(username) || username.includes(".."))
    throw new HttpError(400, "Usernames can use letters, numbers, underscores and dots, and can't start or end with a dot.");

  if (hasAbuse(`${name} ${username}`)) throw new HttpError(400, "Please use your real name and a respectful username: they're shown in the app.");

  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > TESTER_LIMITS.email) throw new HttpError(400, "Please enter a valid email address.");

  return { name, username, usernameKey: username.toLowerCase(), email };
}

const DATA_URL = /^data:image\/[a-z0-9.+-]+;base64,/i;

/**
 * Decode an uploaded photo (a data: URL) and compress it: turned upright using
 * its EXIF orientation, cropped to a square around the most interesting part
 * (usually the face), resized to PHOTO_SIZE and saved as a JPEG. Re-encoding
 * also drops all metadata, including any GPS location the phone recorded.
 */
export async function processPhoto(photo: unknown): Promise<Buffer> {
  if (typeof photo !== "string" || !DATA_URL.test(photo)) throw new HttpError(400, "Please add a profile photo.");
  const bytes = Buffer.from(photo.slice(photo.indexOf(",") + 1), "base64");
  if (!bytes.length) throw new HttpError(400, "Please add a profile photo.");
  if (bytes.length > MAX_PHOTO_BYTES) throw new HttpError(413, "That photo is too large. Please choose one under 10 MB.");

  let meta: sharp.Metadata;
  try {
    meta = await sharp(bytes, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new HttpError(400, "We couldn't read that photo. Please upload a JPG, PNG or WEBP image.");
  }
  if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < 64) throw new HttpError(400, "That photo is too small. Please choose a clearer one.");

  try {
    return await sharp(bytes, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(PHOTO_SIZE, PHOTO_SIZE, { fit: "cover", position: sharp.strategy.attention })
      // Transparent PNGs get a white background instead of turning black.
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new HttpError(400, "We couldn't read that photo. Please upload a JPG, PNG or WEBP image.");
  }
}

/** What the app and the public list see: never the email. */
export const publicTester = (t: { id: string; name: string; username: string; createdAt: Date; updatedAt: Date }) => ({
  id: t.id,
  name: t.name,
  username: t.username,
  // Versioned, so a replaced photo gets a new URL and caches can keep the old one forever.
  photo: `/api/testers/${t.id}/photo?v=${t.updatedAt.getTime()}`,
  joinedAt: t.createdAt.toISOString(),
});
