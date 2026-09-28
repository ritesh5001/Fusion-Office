import type { RequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";

/**
 * Origins allowed to call this API from a browser:
 *  - CLIENT_ORIGIN (comma-separated), e.g. "https://fusionoffice.app"
 *  - the origin of AUTH_URL (the public site), if set
 *  - http://localhost:3000 and http://127.0.0.1:3000 outside production
 */
export function allowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const list = new Set<string>();
  for (const o of (env.CLIENT_ORIGIN ?? "").split(",")) {
    const v = o.trim().replace(/\/$/, "");
    if (v) list.add(v);
  }
  if (env.AUTH_URL) {
    try {
      list.add(new URL(env.AUTH_URL).origin);
    } catch {
      /* ignore malformed AUTH_URL */
    }
  }
  if (env.NODE_ENV !== "production") {
    list.add("http://localhost:3000");
    list.add("http://127.0.0.1:3000");
  }
  return [...list];
}

/**
 * CORS: only allowlisted origins get CORS headers (so browsers block the
 * rest). Credentials are allowed because sessions are cookie-based.
 * Requests without an Origin header (same-origin via the client's proxy,
 * curl, server-to-server) are not affected by CORS at all.
 */
export function corsPolicy(origins = allowedOrigins()): RequestHandler {
  return cors({
    origin(origin, cb) {
      cb(null, !origin || origins.includes(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Requested-With"],
    maxAge: 600,
  });
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF guard for the cookie-authenticated API: any request that changes data
 * must come from an allowlisted Origin (browsers always send Origin on these).
 * Auth.js routes are excluded; they have their own CSRF token check.
 */
export function originGuard(origins = allowedOrigins()): RequestHandler {
  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.get("origin");
    if (origin && !origins.includes(origin)) {
      res.status(403).json({ error: "This origin is not allowed to make changes." });
      return;
    }
    next();
  };
}

/**
 * Security headers. This server returns JSON plus Auth.js's small sign-in
 * pages (inline styles, form posts to the OAuth providers), so the CSP is
 * strict but leaves room for those.
 */
export const securityHeaders: RequestHandler = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      formAction: ["'self'", "https://github.com", "https://accounts.google.com"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
    },
  },
  // API responses are fetched with CORS; allow them to be read cross-origin.
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});
