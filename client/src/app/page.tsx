import { Plus, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { ToolsHub } from "@/components/tools/ToolsHub";
import { TOOLS } from "@/lib/tools/registry";

const PROMISES = [
  {
    icon: ShieldCheck,
    title: "Your files stay with you",
    text: "Most tools run inside your browser, so the file never leaves your device. Tools marked Server convert it on our server and delete it right after.",
  },
  {
    icon: Zap,
    title: "Free, no sign-up",
    text: "Open a tool and use it. No account needed, and nothing is added to your files.",
  },
  {
    icon: Sparkles,
    title: "PDFs, Office and images",
    text: "Edit PDFs, open Word, Excel and PowerPoint files, and resize or compress photos, all in one place.",
  },
];

const FAQ = [
  {
    q: "Are my files uploaded?",
    a: "Not for most tools: they work on your device, inside the browser. Tools marked Server (like Word to PDF) send the file to our server to convert it and delete it straight after. AI tools send the text to our AI provider; nothing is stored.",
  },
  {
    q: "Is it really free?",
    a: "Yes. Every tool is free to use without an account, and nothing is added to your files. Signing in is only needed to save documents to the cloud.",
  },
  {
    q: "Can I change the text that's already in a PDF?",
    a: "Yes. Open the PDF editor, pick Edit text and click any line. The new text keeps the original font, size and colour, and the old words are removed from the file, not hidden under a box.",
  },
  {
    q: "Which devices does it work on?",
    a: "Any recent version of Chrome, Edge, Firefox or Safari. The tools work on phones too; the full editors are easiest on a computer.",
  },
];

export default function Home() {
  const inBrowser = TOOLS.filter((t) => t.runs === "browser" && t.status === "ready").length;
  return (
    <div className="landing relative min-h-dvh overflow-x-clip">
      <a
        href="#tools"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to tools
      </a>
      <div className="landing-env" aria-hidden="true" />
      <div className="relative z-10">
        <Nav />
        <main id="main">
          <section id="tools" aria-labelledby="home-title" className="mx-auto max-w-[1280px] scroll-mt-16 px-5 pb-20 pt-12 md:px-8 md:pt-16">
            <header className="text-center">
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[13px] text-ink-soft ring-1 ring-rule">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                {TOOLS.length} free tools · {inBrowser} work without uploading
              </p>
              <h1
                id="home-title"
                className="mx-auto mt-5 max-w-[20ch] text-balance font-display text-[clamp(2.1rem,5vw,3.75rem)] font-semibold leading-[1.04] tracking-[-0.035em]"
              >
                Every tool for your PDFs, documents and images
              </h1>
              <p className="mx-auto mt-4 max-w-[52ch] text-pretty text-[17px] leading-relaxed text-ink-soft">
                Pick a tool, add your file, download the result. Free, no sign-up, and your files stay on your device.
              </p>
            </header>
            <div className="mt-8">
              <ToolsHub />
            </div>
          </section>

          <section aria-label="Why Fusion Office" className="border-y border-rule bg-white/60">
            <ul className="mx-auto grid max-w-[1280px] gap-8 px-5 py-12 md:grid-cols-3 md:px-8">
              {PROMISES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold">{title}</span>
                    <span className="mt-1 block text-[14px] leading-relaxed text-ink-soft">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-[800px] scroll-mt-20 px-5 py-20 md:px-8">
            <h2 id="faq-title" className="text-center font-display text-[clamp(1.6rem,3vw,2.25rem)] font-semibold tracking-[-0.03em]">
              Questions
            </h2>
            <div className="mt-8 divide-y divide-rule rounded-2xl bg-white ring-1 ring-ink/10">
              {FAQ.map((f) => (
                <details key={f.q} className="group px-5 md:px-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                    <span className="text-[16px] font-medium">{f.q}</span>
                    <Plus className="h-4 w-4 shrink-0 text-ink-soft transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
                  </summary>
                  <p className="max-w-[64ch] pb-5 text-[15px] leading-relaxed text-ink-soft">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
