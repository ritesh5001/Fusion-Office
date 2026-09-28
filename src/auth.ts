import NextAuth, { type DefaultSession } from "next-auth";
import type { Provider } from "next-auth/providers";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { dbEnabled, prisma } from "@/lib/server/db";
import { storageEnabled } from "@/lib/server/storage";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

const providers: Provider[] = [];
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) providers.push(GitHub);
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google);

/** Sign-in works only when a secret, a provider and the database are configured. */
export const authEnabled = !!process.env.AUTH_SECRET && providers.length > 0 && dbEnabled;
/** Cloud save additionally needs object storage. */
export const cloudEnabled = authEnabled && storageEnabled;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: authEnabled ? PrismaAdapter(prisma) : undefined,
  providers,
  session: { strategy: "jwt" },
  // A placeholder secret keeps Auth.js quiet when auth is intentionally off.
  secret: process.env.AUTH_SECRET || "fusion-office-auth-disabled",
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
});

/** Current user, or null when signed out or auth is not configured. */
export async function currentUser() {
  if (!authEnabled) return null;
  const session = await auth();
  return session?.user?.id ? session.user : null;
}
