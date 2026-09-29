import { FileCheck2, Plus } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ToolsHub } from "@/components/tools/ToolsHub";
import { Tile, type Swatch } from "@/components/tools/icons";
import { TOOLS } from "@/lib/tools/registry";

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
  const ready = TOOLS.filter((t) => t.status === "ready");
  const inBrowser = ready.filter((t) => t.runs === "browser").length;

  const strip: { icon: string; swatch: Swatch; title: string; text: string }[] = [
    { icon: "BadgeCheck", swatch: "green", title: "100% free", text: "No sign-up, no watermarks" },
    { icon: "ShieldCheck", swatch: "emerald", title: "Private by design", text: "Most tools work in your browser" },
    { icon: "LayoutGrid", swatch: "blue", title: `${TOOLS.length} tools`, text: "PDF, Office and images in one place" },
    { icon: "MonitorSmartphone", swatch: "sky", title: "Works on any device", text: "Desktop, tablet and mobile" },
  ];

  return (
    <div className="landing relative min-h-dvh overflow-x-clip">
      <a
        href="#all-tools"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to tools
      </a>
      {/* Soft blue wash behind the hero. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[820px] bg-[radial-gradient(60%_60%_at_75%_20%,rgb(91_140_255/0.18),transparent_70%),linear-gradient(180deg,#eef3ff_0%,#f4f6fb_60%,transparent_100%)]"
        aria-hidden="true"
      />
      <div className="relative z-10">
        <Nav />
        <main id="main">
          <ToolsHub
            intro={
              <header>
                <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-[13px] font-medium text-brand-700 shadow-sm ring-1 ring-brand-100">
                  <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                  {TOOLS.length} free tools · {inBrowser} work without uploading
                </p>
                <h1 className="mx-auto mt-5 text-balance font-display text-[clamp(2.1rem,4.1vw,3.4rem)] font-extrabold leading-[1.08] tracking-[-0.04em] text-ink">
                  Every tool for your{" "}
                  <span className="bg-gradient-to-r from-brand-600 via-[#3b6cff] to-[#1aa3ff] bg-clip-text text-transparent lg:block">PDFs, documents and images</span>
                </h1>
                <p className="mx-auto mt-5 max-w-[48ch] text-pretty text-[17px] leading-relaxed text-ink-soft">
                  Pick a tool, add your file, download the result. Free, no sign-up, and your files stay on your device.
                </p>
              </header>
            }
            art
            strip={
              <ul aria-label="Why Fusion Office" className="mx-auto grid max-w-[1280px] grid-cols-2 gap-x-4 gap-y-5 px-5 pb-12 md:px-8 lg:grid-cols-4">
                {strip.map((s) => (
                  <li key={s.title} className="flex flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:gap-3.5">
                    <Tile swatch={s.swatch} icon={s.icon} size="md" />
                    <span>
                      <span className="block text-[15px] font-bold text-ink">{s.title}</span>
                      <span className="block text-[13px] text-ink-soft">{s.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            }
          />

          <HowItWorks />

          <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 border-t border-rule bg-paper">
            <div className="mx-auto max-w-[820px] px-5 py-20 md:px-8">
              <h2 id="faq-title" className="text-center font-display text-[clamp(1.6rem,3vw,2.25rem)] font-bold tracking-[-0.03em]">
                Frequently asked questions
              </h2>
              <div className="mt-8 divide-y divide-rule rounded-2xl bg-white shadow-sm ring-1 ring-ink/10">
                {FAQ.map((f) => (
                  <details key={f.q} className="group px-5 md:px-6">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                      <span className="text-[16px] font-semibold">{f.q}</span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition-transform duration-200 group-open:rotate-45">
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </summary>
                    <p className="max-w-[64ch] pb-5 text-[15px] leading-relaxed text-ink-soft">{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
