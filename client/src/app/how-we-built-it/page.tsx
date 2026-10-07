import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Cpu, HeartHandshake, Server, ShieldCheck, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { CoffeeButton } from "@/components/site/Coffee";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { TOOLS } from "@/lib/tools/registry";
import { breadcrumbs, faqPage } from "@/lib/seo/jsonld";
import { CONTENT_UPDATED, SITE_URL, TOOL_COUNT, absoluteUrl, pageMetadata } from "@/lib/seo/site";

const PATH = "/how-we-built-it";
const TITLE = "How Fusion Office Is Built: Tech Stack, Privacy and Why It's Free";
const DESCRIPTION =
  "The engineering behind Fusion Office: why most PDF, Office and image tools run inside your browser, the open-source libraries we use, what the server does, how files are protected, and how that keeps every tool free.";

export const metadata: Metadata = pageMetadata({ title: `${TITLE} | Fusion Office`, description: DESCRIPTION, path: PATH, type: "article", modifiedTime: CONTENT_UPDATED });

const ready = TOOLS.filter((t) => t.status === "ready");
const count = (runs: string) => ready.filter((t) => t.runs === runs).length;
const ON_DEVICE = count("browser");
const ON_SERVER = count("server");
const WITH_AI = count("ai");

const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const TOC = [
  { id: "idea", label: "The core idea" },
  { id: "paths", label: "Where your file goes" },
  { id: "stack", label: "The tech stack" },
  { id: "security", label: "Security and privacy" },
  { id: "free", label: "Why it's free" },
  { id: "credits", label: "Open-source credits" },
  { id: "faq", label: "FAQ" },
];

const PATHS = [
  {
    icon: Cpu,
    title: "On your device",
    count: ON_DEVICE,
    tone: "text-accent",
    text: "Merging, splitting, compressing, editing, signing, protecting, OCR, PDF to Word or Excel, and every image tool. The file is read into your browser's memory, processed there and saved back to you. It is never uploaded.",
  },
  {
    icon: Server,
    title: "On our server",
    count: ON_SERVER,
    tone: "text-brand-300",
    text: "Word, Excel and PowerPoint to PDF are sent over HTTPS to LibreOffice, converted, returned and deleted straight away. For Markdown, CSV, e-book and web page to PDF, your browser builds the page first and only that page is printed by our server's browser engine.",
  },
  {
    icon: Sparkles,
    title: "With AI",
    count: WITH_AI,
    tone: "text-[#ff9ad5]",
    text: "Summarize, translate and chat with a PDF. Your browser extracts the text first, and only that text is sent to the AI model. The PDF file itself stays on your device.",
  },
];

type Tech = { name: string; what: string; href: string };
const STACK: { group: string; why: string; items: Tech[] }[] = [
  {
    group: "The website",
    why: "Pages are prerendered, so they load fast and search engines can read them without running any code.",
    items: [
      { name: "Next.js", what: "React framework with the App Router; tool and guide pages are generated as static HTML.", href: "https://nextjs.org" },
      { name: "React 19", what: "The interface: tool screens, editors and the processing steps you see.", href: "https://react.dev" },
      { name: "TypeScript", what: "Every line of the site, server and app is type-checked.", href: "https://www.typescriptlang.org" },
      { name: "Tailwind CSS", what: "Styling and the dark theme, with a reduced-motion mode built in.", href: "https://tailwindcss.com" },
    ],
  },
  {
    group: "The PDF engine (in your browser)",
    why: "PDF work is mostly reading and rewriting structured data, which modern browsers handle quickly without help from a server.",
    items: [
      { name: "PDF.js", what: "Mozilla's PDF renderer: page previews, thumbnails and text extraction.", href: "https://mozilla.github.io/pdf.js/" },
      { name: "pdf-lib", what: "Builds and edits PDFs: merge, split, rotate, watermark, page numbers, forms and signatures.", href: "https://pdf-lib.js.org" },
      { name: "Tesseract.js", what: "OCR compiled to WebAssembly, so scanned pages become searchable text on your device.", href: "https://tesseract.projectnaptha.com" },
      { name: "fflate", what: "Fast ZIP compression for downloading many results at once.", href: "https://github.com/101arrowz/fflate" },
    ],
  },
  {
    group: "Office files and editors (in your browser)",
    why: "Word, Excel and PowerPoint files are ZIP archives of XML, so they can be read and written directly in JavaScript.",
    items: [
      { name: "Tiptap", what: "The rich-text engine behind the Word editor.", href: "https://tiptap.dev" },
      { name: "Mammoth and docx", what: "Read Word documents, and write new .docx files.", href: "https://github.com/mwilliamson/mammoth.js" },
      { name: "ExcelJS and Formula.js", what: "Open and save spreadsheets, and calculate Excel formulas in the sheet editor.", href: "https://github.com/exceljs/exceljs" },
      { name: "PptxGenJS", what: "Writes PowerPoint files from the slides editor.", href: "https://gitbrent.github.io/PptxGenJS/" },
      { name: "Fabric.js", what: "The canvas behind the image editor and annotations.", href: "http://fabricjs.com" },
    ],
  },
  {
    group: "The server (only where it's needed)",
    why: "A few conversions need software that can't run in a browser. Those run on a small server that keeps nothing.",
    items: [
      { name: "Node.js and Express", what: "A lean API for conversions, AI requests, feedback and optional sign-in.", href: "https://expressjs.com" },
      { name: "LibreOffice", what: "Runs headless to turn Word, Excel and PowerPoint files into faithful PDFs.", href: "https://www.libreoffice.org" },
      { name: "Chromium and Puppeteer", what: "A real browser engine that prints web pages to PDF, including the pages your browser builds from Markdown, CSV and e-books.", href: "https://pptr.dev" },
      { name: "PostgreSQL and Prisma", what: "Stores accounts and saved documents only if you choose to sign in, plus feedback.", href: "https://www.prisma.io" },
    ],
  },
  {
    group: "AI",
    why: "Open models served on fast inference hardware keep answers quick and the cost per request low.",
    items: [
      { name: "Groq", what: "Hosts the open-weight GPT-OSS model used to summarize, translate, chat with PDFs and prepare text for listening.", href: "https://groq.com" },
      { name: "Orpheus voices", what: "Natural-sounding voices for PDF to Audio, with your device's own voice as the fallback.", href: "https://console.groq.com/docs/text-to-speech" },
    ],
  },
  {
    group: "Apps and hosting",
    why: "One codebase per platform, and hosting that scales down to almost nothing when it's quiet.",
    items: [
      { name: "Expo and React Native", what: "The Android and iOS app, which runs many tools natively on the phone.", href: "https://expo.dev" },
      { name: "Render", what: "Hosts the website and the conversion server.", href: "https://render.com" },
      { name: "Cloudflare Turnstile", what: "A privacy-friendly human check in front of the server tools.", href: "https://www.cloudflare.com/products/turnstile/" },
    ],
  },
];

const SECURITY = [
  "**Most files never leave your device.** The browser tools have no upload step at all, which you can confirm in your browser's network panel.",
  "**Server conversions are temporary.** Each file is written to a private temporary folder, converted, sent back and deleted in the same request. Nothing is kept or reviewed.",
  "**Strict browser rules.** A Content Security Policy limits which scripts can run and where the page may connect, and the site can't be framed by other sites.",
  "**Abuse protection.** Server and AI tools are checked with Cloudflare Turnstile, limited per visitor and accept requests only from our own site, so bots can't drain the shared capacity.",
  "**Files are checked before they're opened.** Uploaded Office files must match their real format signature, and conversions run with time limits.",
  "**No account needed.** Signing in is optional and only exists to save documents to the cloud.",
];

const FREE = [
  {
    title: "Your device does the heavy lifting",
    text: `${ON_DEVICE} of ${TOOL_COUNT} tools run on the computer or phone you already own. For those, our cost is serving the page itself, which is close to nothing.`,
  },
  {
    title: "No storage bill",
    text: "We don't keep your files, so there are no growing storage costs to pass on to you.",
  },
  {
    title: "A small, careful server",
    text: "Only a handful of conversions use the server, they finish in seconds, and fair-use limits stop any one visitor from using up the shared capacity.",
  },
  {
    title: "Built on open source",
    text: "The engines above are free, open-source projects. We build on them instead of paying for licensed SDKs, and the savings reach you.",
  },
];

const FAQ: [string, string][] = [
  [
    "Why is Fusion Office free?",
    `Because most of the work happens on your own device. ${ON_DEVICE} of the ${TOOL_COUNT} tools run in your browser, so we don't pay for servers to process or store those files. The few tools that need a server are small, fast and rate limited, which keeps running costs low enough to offer everything free, without an account or watermarks.`,
  ],
  [
    "Are my files uploaded when I use Fusion Office?",
    `Not for most tools. ${ON_DEVICE} tools process files entirely in your browser. Word, Excel and PowerPoint to PDF upload the file over HTTPS, convert it and delete it immediately. Markdown, CSV, e-book and web page to PDF send only a web page for printing. AI tools send only the extracted text, never the PDF.`,
  ],
  [
    "What technology does Fusion Office use?",
    "The site is built with Next.js, React and TypeScript. PDFs are handled in the browser by PDF.js and pdf-lib, OCR by Tesseract.js in WebAssembly, and Office files by Tiptap, Mammoth, ExcelJS and PptxGenJS. A Node.js server runs LibreOffice and headless Chromium for the few conversions that need them, and AI features use open models served by Groq.",
  ],
  [
    "How can PDF tools run without uploading the file?",
    "Modern browsers can run full applications. JavaScript libraries like pdf-lib rewrite a PDF's structure directly in memory, and WebAssembly runs compiled engines such as the Tesseract OCR engine at near-native speed. The result is created on your device and saved straight to your downloads.",
  ],
  [
    "Is the AI in Fusion Office private?",
    "Your browser extracts the text from your PDF and sends only that text to the AI model to answer your request. The file itself is not uploaded, and Fusion Office doesn't store the text afterwards.",
  ],
  [
    "Is there a mobile app?",
    "Yes. The Fusion Office app is built with Expo and React Native, and many tools run natively on the phone with the same privacy rules as the website.",
  ],
];

/** "**Bold** rest" → a bold lead-in followed by the sentence. */
function Lead({ text }: { text: string }) {
  const m = /^\*\*(.+?)\*\*\s*(.*)$/.exec(text);
  return m ? (
    <>
      <strong className="font-semibold text-fg">{m[1]}</strong> {m[2]}
    </>
  ) : (
    <>{text}</>
  );
}

const H2 = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h2 id={id} className="scroll-mt-24 font-display text-[clamp(1.4rem,2.6vw,1.75rem)] font-bold tracking-[-0.025em] text-fg">
    {children}
  </h2>
);

export default function HowWeBuiltIt() {
  const trail = [
    { name: "Home", path: "/" },
    { name: "How we built it", path: PATH },
  ];
  const techArticle = {
    "@type": "TechArticle",
    "@id": `${absoluteUrl(PATH)}#article`,
    headline: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl(PATH),
    mainEntityOfPage: absoluteUrl(PATH),
    dateModified: CONTENT_UPDATED,
    inLanguage: "en",
    image: absoluteUrl(`${PATH}/opengraph-image`),
    proficiencyLevel: "Beginner",
    about: STACK.flatMap((g) => g.items.map((t) => ({ "@type": "Thing", name: t.name, url: t.href }))),
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };

  return (
    <SiteShell>
      <JsonLd data={[techArticle, breadcrumbs(trail), faqPage(FAQ)]} />
      <main id="main" className="px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <Breadcrumbs items={trail} />

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px] xl:gap-14">
          <article className="min-w-0 max-w-[780px]">
            <header>
              <p className="eyebrow">Behind the platform</p>
              <h1 className="mt-3 text-balance font-display text-[clamp(2rem,4.4vw,3rem)] font-extrabold leading-[1.06] tracking-[-0.035em] text-fg">
                How we built Fusion Office, and why it's free
              </h1>
              <p className="mt-4 max-w-[62ch] text-[17px] leading-[1.7] text-fg-muted">
                A plain-language tour of the engineering behind {TOOL_COUNT} PDF, Office and image tools: what runs where, the open-source projects we build on, how your files are protected, and why none of it costs you anything.
              </p>
              <p className="mt-3 text-[13px] text-fg-subtle">
                By the Fusion Office team at NextGen Fusion · Updated <time dateTime={CONTENT_UPDATED}>{fmt(CONTENT_UPDATED)}</time>
              </p>
            </header>

            <div className="card mt-8 p-5 sm:p-6">
              <p className="eyebrow">The short version</p>
              <p className="mt-2 text-[16px] leading-[1.75] text-fg">
                Fusion Office is a web app that turns your browser into the processing engine. {ON_DEVICE} of {TOOL_COUNT} tools work entirely on your device using JavaScript and WebAssembly, so files are never uploaded and we have almost no server costs. That is what lets us keep every tool free, with no sign-up and no watermarks.
              </p>
            </div>

            <section className="mt-12" aria-labelledby="idea">
              <H2 id="idea">The core idea: your browser is the computer</H2>
              <div className="mt-4 space-y-4 text-[16px] leading-[1.75] text-fg-muted">
                <p>
                  Most online PDF tools upload your document, process it on their servers and send it back. That is slow, it means a stranger's computer holds your payslip or contract, and the servers cost money, which is why so many of those tools have daily limits, watermarks or subscriptions.
                </p>
                <p>
                  We flipped it. Today's browsers can run real applications: JavaScript is fast, and WebAssembly runs compiled engines at close to native speed. So instead of shipping your file to the code, we ship the code to your file. When you open a tool, your browser downloads the engine once, caches it, and does the work locally.
                </p>
              </div>
            </section>

            <section className="mt-12" aria-labelledby="paths">
              <H2 id="paths">Where your file goes</H2>
              <p className="mt-3 text-[16px] leading-[1.75] text-fg-muted">Every tool belongs to one of three paths, and each tool page tells you which one it uses before you add a file.</p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                {PATHS.map((p) => (
                  <li key={p.title} className="card flex flex-col p-5">
                    <div className="flex items-center justify-between">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-raised ring-1 ring-inset ring-line-strong ${p.tone}`}>
                        <p.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="font-display text-[28px] font-extrabold tabular-nums tracking-[-0.03em] text-fg">{p.count}</span>
                    </div>
                    <h3 className="mt-4 text-[16px] font-semibold text-fg">{p.title}</h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-fg-muted">{p.text}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-12" aria-labelledby="stack">
              <H2 id="stack">The tech stack, and why we chose it</H2>
              <div className="mt-6 space-y-8">
                {STACK.map((g) => (
                  <div key={g.group}>
                    <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-fg">{g.group}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-fg-muted">{g.why}</p>
                    <dl className="card mt-3 divide-y divide-line">
                      {g.items.map((t) => (
                        <div key={t.name} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4">
                          <dt>
                            <a href={t.href} target="_blank" rel="noopener noreferrer" className="text-[15px] font-semibold text-fg underline decoration-line-strong underline-offset-4 hover:decoration-brand-400">
                              {t.name}
                            </a>
                          </dt>
                          <dd className="text-[15px] leading-relaxed text-fg-muted">{t.what}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-12" aria-labelledby="security">
              <H2 id="security">Security and privacy by design</H2>
              <ul className="mt-5 space-y-3">
                {SECURITY.map((s) => (
                  <li key={s} className="flex gap-3 text-[15.5px] leading-[1.7] text-fg-muted">
                    <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    <span>
                      <Lead text={s} />
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-12" aria-labelledby="free">
              <H2 id="free">Why Fusion Office is free</H2>
              <p className="mt-3 text-[16px] leading-[1.75] text-fg-muted">
                Free isn't a trial or a teaser here. It follows from how the platform is built: when your device does the work, there is very little left for us to pay for.
              </p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {FREE.map((f, i) => (
                  <li key={f.title} className="card p-5">
                    <span className="font-mono text-[12px] font-medium text-fg-subtle">0{i + 1}</span>
                    <h3 className="mt-1.5 text-[16px] font-semibold text-fg">{f.title}</h3>
                    <p className="mt-1.5 text-[14.5px] leading-relaxed text-fg-muted">{f.text}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[16px] leading-[1.75] text-fg-muted">
                Fusion Office is built and run by{" "}
                <a href="https://nextgenfusion.in" target="_blank" rel="noopener" className="font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-brand-400">
                  NextGen Fusion
                </a>
                . No account is required, nothing is added to your files, and you can use every tool as often as you need within fair-use limits.
              </p>
              <p className="mt-4 text-[16px] leading-[1.75] text-fg-muted">
                Want to give something back?{" "}
                <Link href="/pay-it-forward" className="font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-brand-400">
                  Help someone today and tell us the story
                </Link>
                , or buy us a coffee. Either one keeps us going.
              </p>
              <CoffeeButton className="mt-4" />
            </section>

            <section className="mt-12" aria-labelledby="credits">
              <H2 id="credits">Open-source credits</H2>
              <p className="mt-3 flex gap-3 text-[16px] leading-[1.75] text-fg-muted">
                <HeartHandshake className="mt-1.5 h-5 w-5 shrink-0 text-[#ff8fa3]" aria-hidden="true" />
                <span>
                  Fusion Office stands on the work of thousands of open-source contributors, including the teams behind PDF.js, pdf-lib, Tesseract, LibreOffice, Chromium, Tiptap, ExcelJS, PptxGenJS, Fabric.js, React and Next.js. Thank you.
                </span>
              </p>
            </section>

            <section className="mt-12" aria-labelledby="faq">
              <H2 id="faq">Frequently asked questions</H2>
              <div className="card mt-5 divide-y divide-line">
                {FAQ.map(([q, a]) => (
                  <div key={q} className="px-5 py-4">
                    <h3 className="text-[15.5px] font-semibold text-fg">{q}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-fg-muted">{a}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-12 flex flex-col items-start gap-4 rounded-3xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div>
                <p className="font-display text-[20px] font-bold tracking-[-0.02em] text-fg">See it for yourself</p>
                <p className="mt-1 text-[14.5px] text-fg-muted">Open a tool, then watch your browser's network panel while it works.</p>
              </div>
              <Link href="/tools" className="btn btn-primary btn-lg shrink-0">
                Browse all tools <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </article>

          <aside className="hidden lg:block">
            <nav aria-label="On this page" className="sticky top-24">
              <p className="eyebrow">On this page</p>
              <ol className="mt-3 space-y-1 border-l border-line">
                {TOC.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`} className="-ml-px block border-l border-transparent py-1 pl-4 text-[14px] text-fg-muted hover:border-brand-400 hover:text-fg">
                      {t.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
        </div>
      </main>
    </SiteShell>
  );
}
