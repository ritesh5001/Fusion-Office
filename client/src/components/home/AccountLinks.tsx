"use client";

import Link from "next/link";
import { signInUrl, signOutUrl, useCloudConfig } from "@/lib/cloudConfig";

/** Sign in / My documents / Sign out — shown only when the backend has auth on. */
export function AccountLinks() {
  const { authEnabled, user, loading } = useCloudConfig();
  if (loading || !authEnabled) return null;
  const cls = "h-9 rounded-md px-3 text-sm leading-9 text-slate-600 hover:bg-slate-100";
  return user ? (
    <>
      <Link href="/dashboard" className={cls}>
        My documents
      </Link>
      <a href={signOutUrl()} className={cls}>
        Sign out
      </a>
    </>
  ) : (
    <a href={signInUrl("/dashboard")} className="h-9 rounded-md border border-slate-200 bg-white px-3.5 text-sm font-medium leading-9 text-slate-700 hover:bg-slate-50">
      Sign in
    </a>
  );
}
