"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { signInUrl, signOutUrl, useCloudConfig } from "@/lib/cloudConfig";

/** My Documents / avatar / Sign in — shown only when the backend has auth on. */
export function AccountLinks() {
  const { authEnabled, user, loading } = useCloudConfig();
  if (loading || !authEnabled) return null;
  const docs = (
    <Link
      href="/dashboard"
      className="hidden h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium text-brand-300 ring-1 ring-brand-500/35 transition-colors hover:bg-brand-500/15 md:inline-flex"
    >
      <FileText className="h-4 w-4" aria-hidden="true" />
      My Documents
    </Link>
  );
  if (!user) {
    return (
      <>
        {docs}
        <a href={signInUrl("/dashboard")} className="h-10 rounded-full px-4 text-[14px] font-medium leading-10 text-fg hover:bg-raised">
          Sign in
        </a>
      </>
    );
  }
  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();
  return (
    <>
      {docs}
      <a
        href={signOutUrl()}
        title={`Signed in as ${user.email ?? user.name ?? "you"} · Sign out`}
        aria-label="Sign out"
        className="order-last flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-500 to-slate-700 text-[14px] font-semibold text-white ring-2 ring-white"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </a>
    </>
  );
}
