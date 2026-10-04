import type { Metadata } from "next";
import { ComingSoon } from "@/components/launch/ComingSoon";
import { LAUNCH_AT_MS } from "@/lib/launch";

export const metadata: Metadata = {
  title: { absolute: "Fusion Office · Launching soon" },
  description: "Fusion Office, the private workspace for PDFs, Office files and images, is launching soon.",
  robots: { index: false, follow: false },
};

// Rendered per request so the countdown starts from the server's clock.
export const dynamic = "force-dynamic";

export default function ComingSoonPage() {
  return <ComingSoon launchAt={LAUNCH_AT_MS} serverNow={Date.now()} />;
}
