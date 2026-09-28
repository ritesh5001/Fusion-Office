import express from "express";
import { authEnabled, authHandler, cloudEnabled, currentUser } from "./auth.js";
import { documents } from "./routes/documents.js";
import { files } from "./routes/files.js";
import { convert } from "./routes/convert.js";
import { ai } from "./routes/ai.js";
import { errorHandler, signedInWhenAvailable } from "./lib/http.js";
import { rateLimit } from "./lib/rateLimit.js";
import { corsPolicy, originGuard, securityHeaders } from "./lib/security.js";

/**
 * @auth/express builds OAuth callback URLs from the raw Host header. Behind the
 * client's /api proxy that would be this server's own address, so present the
 * public address instead: AUTH_URL when set, else the proxy's X-Forwarded-Host.
 */
const usePublicHost: express.RequestHandler = (req, _res, next) => {
  const publicUrl = process.env.AUTH_URL ? new URL(process.env.AUTH_URL) : null;
  const host = publicUrl?.host ?? req.get("x-forwarded-host")?.split(",")[0].trim();
  if (host) req.headers.host = host;
  if (publicUrl) req.headers["x-forwarded-proto"] = publicUrl.protocol.replace(":", "");
  next();
};

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  // Requests arrive through the client's /api proxy (or a load balancer).
  app.set("trust proxy", true);
  // Before everything: sign-in and session lookup must agree on host/protocol
  // (cookie names differ between http and https).
  app.use(usePublicHost);

  app.use(securityHeaders);
  // CORS for browsers calling the API directly (NEXT_PUBLIC_API_URL). Through
  // the client's /api proxy requests are same-origin and CORS never applies.
  app.use(corsPolicy());

  // Auth.js parses its own request bodies. Mount on the plain prefix: it derives
  // its base path from Express's mount path, so a wildcard route would break it.
  app.use("/api/auth", authHandler);

  // Editor state can include embedded images (data URLs), hence the limit.
  app.use(express.json({ limit: process.env.JSON_LIMIT ?? "25mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  /** What the client needs to decide which cloud features to show. */
  app.get("/api/config", async (req, res, next) => {
    try {
      const user = cloudEnabled || authEnabled ? await currentUser(req) : null;
      res.json({
        authEnabled,
        cloudEnabled,
        user: user ? { name: user.name ?? null, email: user.email ?? null, image: user.image ?? null } : null,
      });
    } catch (err) {
      next(err);
    }
  });

  app.use("/api/documents", originGuard(), documents);
  app.use("/api/files", files);
  // Heavy work (LibreOffice, headless Chrome, Claude): origin-checked and rate limited per IP.
  app.use(
    "/api/convert",
    originGuard(),
    rateLimit({ name: "convert", windowMs: 10 * 60_000, max: Number(process.env.CONVERT_RATE_LIMIT) || 40 }),
    convert,
  );
  app.use(
    "/api/ai",
    originGuard(),
    rateLimit({ name: "ai", windowMs: 60 * 60_000, max: Number(process.env.AI_RATE_LIMIT) || 20 }),
    signedInWhenAvailable,
    ai,
  );

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  app.use(errorHandler);
  return app;
}
