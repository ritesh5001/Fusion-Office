import { Plus, Server, ShieldCheck, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { HomeWorkspace } from "@/components/home/HomeWorkspace";
import { HowItWorks } from "@/components/landing/HowItWorks";
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
  const count = (runs: string) => ready.filter((t) => t.runs === runs).length;

  const privacy = [
    {
      icon: ShieldCheck,
      title: "On your device",
      count: count("browser"),
      text: "The file is opened, changed and saved inside your browser. It never reaches our server.",
    },
    {
      icon: Server,
      title: "Converted on our server",
      count: count("server"),
      text: "Formats browsers can't handle (like Word to PDF) are converted on our server and deleted straight after.",
    },
    {
      icon: Sparkles,
      title: "With AI",
      count: count("ai"),
      text: "Only the document's text is sent to our AI provider to answer you. Nothing is stored.",
    },
  ];

  return (
    <SiteShell>
      <main id="main">
        <HomeWorkspace />

        <section id="privacy" aria-labelledby="privacy-title" className="scroll-mt-20 border-t border-line">
          <div className="px-4 py-16 sm:px-6 md:py-20 lg:px-8">
            <div className="max-w-[640px]">
              <p className="eyebrow">Privacy</p>
              <h2 id="privacy-title" className="mt-3 text-balance font-display text-[clamp(1.75rem,3.4vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.035em] text-fg">
                Your files stay yours.
              </h2>
              <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
                Every tool says where it runs before you use it. No account, no tracking of your documents, no watermarks.
              </p>
            </div>
            <ul className="mt-10 grid gap-3 md:grid-cols-3">
              {privacy.map((p) => (
                <li key={p.title} className="card p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-raised text-fg ring-1 ring-inset ring-line-strong">
                      <p.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-[13px] tabular-nums text-fg-subtle">
                      {p.count} tool{p.count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[16px] font-semibold tracking-[-0.01em] text-fg">{p.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-fg-muted">{p.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <HowItWorks />

        <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto max-w-[820px] px-4 py-16 sm:px-6 md:py-20 lg:px-8">
            <h2 id="faq-title" className="text-center font-display text-[clamp(1.6rem,3vw,2.25rem)] font-bold tracking-[-0.03em] text-fg">
              Frequently asked questions
            </h2>
            <div className="card mt-8 divide-y divide-line">
              {FAQ.map((f) => (
                <details key={f.q} className="group px-5 md:px-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left [&::-webkit-details-marker]:hidden">
                    <span className="text-[15px] font-semibold text-fg">{f.q}</span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-raised text-fg-muted ring-1 ring-inset ring-line transition-transform duration-200 group-open:rotate-45">
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </summary>
                  <p className="max-w-[64ch] pb-5 text-[14.5px] leading-relaxed text-fg-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
