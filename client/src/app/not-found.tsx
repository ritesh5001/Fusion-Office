import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Mascot } from "@/components/mascot/Mascot";

export default function NotFound() {
  return (
    <SiteShell>
      <main id="main" className="mx-auto flex max-w-[640px] flex-col items-center px-4 pb-24 pt-16 text-center sm:px-6">
        <Mascot mood="sleepy" size={140} interactive />
        <p className="mt-6 font-mono text-[13px] font-medium text-fg-subtle">404</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-fg">This page is taking a nap</h1>
        <p className="mt-3 max-w-[44ch] text-[16px] leading-relaxed text-fg-muted">
          We couldn&apos;t find what you were looking for. It may have moved, or the link has a typo.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary btn-lg">
            Browse all tools <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/editor" className="btn btn-secondary btn-lg">
            Open the PDF editor
          </Link>
        </div>
      </main>
    </SiteShell>
  );
}
