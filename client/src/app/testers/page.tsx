import { Suspense } from "react";
import type { Metadata } from "next";
import { TesterSignup } from "@/components/testers/TesterSignup";

// Invite-only: shared with early testers as /testers?invite=<code> (the admin
// panel shows the link). Not linked from the site, not in the sitemap, and
// sent with noindex headers by the middleware.
export const metadata: Metadata = {
  title: { absolute: "Early testers · Fusion Office" },
  robots: { index: false, follow: false },
};

export default function TestersPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-app" />}>
      <TesterSignup />
    </Suspense>
  );
}
