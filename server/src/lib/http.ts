import type { NextFunction, Request, RequestHandler, Response } from "express";
import { cloudEnabled, currentUser } from "../auth.js";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export type AuthedRequest = Request & { userId: string };

/**
 * Wrap a cloud route: requires cloud to be configured and a signed-in user,
 * and turns thrown errors into JSON responses.
 */
export function authed(handler: (req: AuthedRequest, res: Response) => Promise<unknown>): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!cloudEnabled) throw new HttpError(503, "Cloud storage is not configured on this server.");
      const user = await currentUser(req);
      if (!user) throw new HttpError(401, "Please sign in.");
      (req as AuthedRequest).userId = user.id;
      await handler(req as AuthedRequest, res);
    } catch (err) {
      next(err);
    }
  };
}

/** Final error handler: known errors keep their status, others become 500. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if ((err as { type?: string })?.type === "entity.too.large") return res.status(413).json({ error: "Request is too large." });
  if (err instanceof SyntaxError) return res.status(400).json({ error: "Invalid JSON." });
  console.error("[api]", err);
  res.status(500).json({ error: "Something went wrong." });
}

export interface StoredSource {
  id: string;
  name: string;
  size: number;
  key: string;
  uploaded: boolean;
}

const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Validate the client's document payload. Deliberately strict about shape and size. */
export function parseDocumentBody(body: unknown) {
  if (!body || typeof body !== "object") throw new HttpError(400, "Invalid body");
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.slice(0, 200) : undefined;
  const state = b.state as { pages?: unknown[]; sources?: unknown[] } | undefined;
  if (state !== undefined) {
    if (!state || typeof state !== "object" || !Array.isArray(state.pages)) throw new HttpError(400, "Invalid state");
    if (state.pages.length > 5000) throw new HttpError(413, "Too many pages");
  }
  const sources = Array.isArray(b.sources)
    ? b.sources.map((s) => {
        const src = s as Record<string, unknown>;
        if (typeof src.id !== "string" || !ID.test(src.id)) throw new HttpError(400, "Invalid source id");
        return { id: src.id, name: String(src.name ?? "document.pdf").slice(0, 200), size: Number(src.size) || 0 };
      })
    : undefined;
  const confirm = Array.isArray(b.confirm) ? b.confirm.filter((x): x is string => typeof x === "string" && ID.test(x)) : [];
  return { name, state, sources, confirm, version: b.version === true, label: typeof b.label === "string" ? b.label.slice(0, 100) : undefined };
}
