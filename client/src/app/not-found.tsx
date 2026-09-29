import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Mascot } from "@/components/mascot/Mascot";

export default function NotFound() {
  return (
    <div className="landing relative min-h-dvh overflow-x-clip">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[linear-gradient(180deg,#eef3ff_0%,transparent_100%)]" aria-hidden="true" />
      <div className="relative z-10">
        <Nav />
        <main id="main" className="mx-auto flex max-w-[640px] flex-col items-center px-5 pb-24 pt-16 text-center">
          <Mascot mood="sleepy" size={170} interactive />
          <p className="mt-6 font-mono text-[13px] font-medium text-brand-700">404</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,5vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.04em]">This page is taking a nap</h1>
          <p className="mt-3 max-w-[44ch] text-[16px] leading-relaxed text-ink-soft">
            We couldn&apos;t find what you were looking for. It may have moved, or the link has a typo.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className="inline-flex h-12 items-center gap-1.5 rounded-full bg-brand-600 px-6 text-[15px] font-semibold text-white hover:bg-brand-700">
              Browse all tools <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/editor" className="inline-flex h-12 items-center rounded-full bg-white px-6 text-[15px] font-semibold text-ink ring-1 ring-rule hover:ring-rule-strong">
              Open the PDF editor
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
