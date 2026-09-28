import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Facts, EditorFeatures, Privacy, Steps, Suite, Faq, FinalCta, Footer } from "@/components/landing/Sections";
import { RevealObserver } from "@/components/landing/RevealObserver";

export default function Home() {
  return (
    <div className="landing relative min-h-dvh overflow-x-clip">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <div className="landing-env" aria-hidden="true" />
      <div className="relative z-10">
        <Nav />
        <main id="main" tabIndex={-1} className="outline-none">
          <Hero />
          <Facts />
          <EditorFeatures />
          <Privacy />
          <Steps />
          <Suite />
          <Faq />
          <FinalCta />
        </main>
        <Footer />
      </div>
      <RevealObserver />
    </div>
  );
}
