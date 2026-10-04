/**
 * Launch gate. Until LAUNCH_AT, every page shows the coming-soon countdown
 * (see src/middleware.ts); from that moment the full site opens on its own,
 * with no redeploy. Developers can open the real site early with
 * `?preview=<PREVIEW_TOKEN>` (sets a cookie) and leave preview with `?preview=off`.
 *
 * To reuse for a future launch, set LAUNCH_AT (ISO time) in the environment.
 */

/** 12:00 PM India time, 5 October 2026. */
export const DEFAULT_LAUNCH_AT = "2026-10-05T12:00:00+05:30";

export const LAUNCH_AT_MS = Date.parse(process.env.LAUNCH_AT || DEFAULT_LAUNCH_AT);

export const PREVIEW_COOKIE = "fo_preview";

export const COMING_SOON_PATH = "/coming-soon";

export const isLaunched = (now = Date.now()) => now >= LAUNCH_AT_MS;
