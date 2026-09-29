/**
 * Keeps a free Render instance awake. Render stops a free web service after
 * 15 minutes without incoming requests, so the server calls its own public
 * health URL (which goes through Render's router and counts as traffic) on a
 * timer shorter than that. Other URLs, such as the frontend, can be added.
 */

const DEFAULT_MINUTES = 13;

type Env = Record<string, string | undefined>;

/** URLs to ping: KEEP_ALIVE_URLS (comma-separated), else this service's own Render URL. */
export function keepAliveUrls(env: Env = process.env): string[] {
  if (/^(0|off|false|no)$/i.test(env.KEEP_ALIVE ?? "")) return [];
  const listed = (env.KEEP_ALIVE_URLS ?? "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
  // Render sets RENDER_EXTERNAL_URL on web services; locally there is nothing to keep awake.
  const own = env.RENDER_EXTERNAL_URL ? [`${env.RENDER_EXTERNAL_URL.replace(/\/+$/, "")}/api/health`] : [];
  const urls = listed.length ? listed : own;
  return [...new Set(urls)].filter((u) => /^https?:\/\//i.test(u));
}

export function keepAliveMinutes(env: Env = process.env): number {
  const m = Number(env.KEEP_ALIVE_MINUTES);
  // Anything at or above 15 minutes would let the instance fall asleep.
  return Number.isFinite(m) && m >= 1 && m < 15 ? m : DEFAULT_MINUTES;
}

/** Start pinging; returns a function that stops it. Does nothing when there is no URL. */
export function startKeepAlive(env: Env = process.env): () => void {
  const urls = keepAliveUrls(env);
  if (!urls.length) return () => {};
  const minutes = keepAliveMinutes(env);

  const ping = async () => {
    await Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(60_000), headers: { "User-Agent": "fusion-office-keepalive" } });
          if (!res.ok) console.warn(`[keep-alive] ${url} answered ${res.status}`);
          await res.body?.cancel();
        } catch (err) {
          console.warn(`[keep-alive] ${url} failed: ${(err as Error).message}`);
        }
      }),
    );
  };

  const timer = setInterval(ping, minutes * 60_000);
  timer.unref();
  console.log(`[keep-alive] pinging ${urls.join(", ")} every ${minutes} min`);
  return () => clearInterval(timer);
}
