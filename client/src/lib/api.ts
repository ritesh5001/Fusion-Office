/**
 * Where the browser sends API requests.
 *
 * Default (recommended): relative "/api/...", proxied by Next to the server.
 * Same-origin, so CORS never applies and cookies just work.
 *
 * Direct mode: set NEXT_PUBLIC_API_URL (e.g. "https://api.fusionoffice.app")
 * and the browser calls the server cross-origin with credentials. The server
 * must list this site in CLIENT_ORIGIN, and both must share a parent domain
 * (app.x.com + api.x.com) so the session cookie is sent.
 */
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export const apiUrl = (path: string) => `${API_BASE}${path}`;

const send = (path: string, init?: RequestInit) => fetch(apiUrl(path), { ...init, credentials: API_BASE ? "include" : "same-origin" });

/**
 * Fetch from the API. Requests that make the server do work (conversions, AI,
 * feedback) first pass a Cloudflare Turnstile check when the server asks for one.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const human = await import("./human");
  return human.needsHuman(path, init) ? human.humanFetch(path, init, send) : send(path, init);
}
