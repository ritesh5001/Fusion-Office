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
      className="btn btn-ghost hidden md:inline-flex"
    >
      <FileText className="h-4 w-4" aria-hidden="true" />
      My Documents
    </Link>
  );
  if (!user) {
    return (
      <>
        {docs}
        <a href={signInUrl("/dashboard")} className="btn btn-ghost">
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
        className="order-last flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-raised text-[14px] font-semibold text-fg ring-1 ring-line-strong"
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
