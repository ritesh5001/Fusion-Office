import type { Request } from "express";
import { ExpressAuth, getSession, type ExpressAuthConfig } from "@auth/express";
import GitHub from "@auth/express/providers/github";
import Google from "@auth/express/providers/google";
import type { Provider } from "@auth/express/providers";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { dbEnabled, prisma } from "./lib/db.js";
import { storageEnabled } from "./lib/storage.js";

const providers: Provider[] = [];
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) providers.push(GitHub);
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google);

/** Sign-in works only when a secret, a provider and the database are configured. */
export const authEnabled = !!process.env.AUTH_SECRET && providers.length > 0 && dbEnabled;
/** Cloud save additionally needs object storage. */
export const cloudEnabled = authEnabled && storageEnabled;

export const authConfig: ExpressAuthConfig = {
  basePath: "/api/auth",
  adapter: authEnabled ? PrismaAdapter(prisma) : undefined,
  providers,
  session: { strategy: "jwt" },
  // A placeholder secret keeps Auth.js quiet when auth is intentionally off.
  secret: process.env.AUTH_SECRET || "fusion-office-auth-disabled",
  // The client proxies /api/* here, so trust X-Forwarded-Host for callback URLs.
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) (session.user as { id?: string }).id = token.uid as string;
      return session;
    },
  },
};

export const authHandler = ExpressAuth(authConfig);

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

/** Current user, or null when signed out or auth is not configured. */
export async function currentUser(req: Request): Promise<SessionUser | null> {
  if (!authEnabled) return null;
  const session = await getSession(req, authConfig);
  const user = session?.user as SessionUser | undefined;
  return user?.id ? user : null;
}
