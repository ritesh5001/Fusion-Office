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

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), { ...init, credentials: API_BASE ? "include" : "same-origin" });
}
