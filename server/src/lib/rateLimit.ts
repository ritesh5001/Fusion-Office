import type { RequestHandler } from "express";



export function rateLimit({ windowMs, max, name }: { windowMs: number; max: number; name: string }): RequestHandler {
  const hits = new Map<string, { count: number; reset: number }>();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [ip, h] of hits) if (h.reset <= now) hits.delete(ip);
  }, windowMs);
  sweep.unref();

  return (req, res, next) => {
    const ip = req.ip ?? "unknown";
    const now = Date.now();
    let h = hits.get(ip);
    if (!h || h.reset <= now) {
      h = { count: 0, reset: now + windowMs };
      hits.set(ip, h);
    }
    h.count++;
    res.setHeader("RateLimit-Policy", `${max};w=${Math.round(windowMs / 1000)};name="${name}"`);
    if (h.count > max) {
      const wait = Math.ceil((h.reset - now) / 1000);
      res.setHeader("Retry-After", String(wait));
      res.status(429).json({ error: `Too many requests. Try again in ${wait < 60 ? `${wait} seconds` : `${Math.ceil(wait / 60)} minutes`}.` });
      return;
    }
    next();
  };
}

/** Run at most `limit` tasks at once; the rest wait in order. */
export function semaphore(limit: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) await new Promise<void>((r) => queue.push(r));
    active++;
    try {
      return await task();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}
