import "server-only";
import { NextResponse } from "next/server";
import { cloudEnabled, currentUser } from "@/auth";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

/** Wrap a route handler with auth + consistent error responses. */
export function route<Ctx>(handler: (req: Request, userId: string, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      if (!cloudEnabled) throw new HttpError(503, "Cloud storage is not configured on this server.");
      const user = await currentUser();
      if (!user) throw new HttpError(401, "Please sign in.");
      return await handler(req, user.id, ctx);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      console.error("[api]", err);
      return json({ error: "Something went wrong." }, 500);
    }
  };
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
