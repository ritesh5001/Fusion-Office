import Link from "next/link";
import {
  ArrowRight,
  FileSpreadsheet,
  FileText,
  Presentation,
  Repeat,
  ScanText,
  Scissors,
  Combine,
  Minimize2,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { AccountLinks } from "@/components/home/AccountLinks";

interface Tool {
  name: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  accent: string;
}

const TOOLS: Tool[] = [
  { name: "PDF Editor", description: "Edit text, add images, annotate, sign, redact and reorganize pages.", icon: FileText, href: "/editor", accent: "bg-red-50 text-red-600" },
  { name: "Merge PDF", description: "Combine several PDFs into one document.", icon: Combine, href: "/editor", accent: "bg-orange-50 text-orange-600" },
  { name: "Split & Extract", description: "Pull pages out or split a PDF into parts.", icon: Scissors, href: "/editor", accent: "bg-amber-50 text-amber-600" },
  { name: "Word Editor", description: "Create and edit documents.", icon: FileText, accent: "bg-blue-50 text-blue-600" },
  { name: "Spreadsheets", description: "Edit Excel-compatible spreadsheets.", icon: FileSpreadsheet, accent: "bg-emerald-50 text-emerald-600" },
  { name: "Presentations", description: "Build and edit slide decks.", icon: Presentation, accent: "bg-orange-50 text-orange-600" },
  { name: "Converter", description: "PDF ↔ Word, Excel, PowerPoint and images.", icon: Repeat, accent: "bg-violet-50 text-violet-600" },
  { name: "OCR", description: "Turn scanned documents into editable text.", icon: ScanText, accent: "bg-sky-50 text-sky-600" },
  { name: "Compress", description: "Shrink PDFs for email and upload.", icon: Minimize2, accent: "bg-slate-100 text-slate-600" },
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,#eef2ff,transparent_55%)]">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 text-[16px] font-semibold text-slate-900">
          <Logo className="h-7 w-7" /> Fusion Office
        </Link>
        <nav className="flex items-center gap-2">
          <AccountLinks />
          <Link href="/editor" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-600 px-3.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700">
            Open PDF Editor <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="pb-14 pt-16 text-center">
          <h1 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Everything for your documents</h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-slate-500">
            One workspace to edit, sign, organize and convert files. It starts with a full PDF editor that runs privately in your browser.
          </p>
          <Link
            href="/editor"
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-lg bg-brand-600 px-5 text-[15px] font-medium text-white shadow-sm hover:bg-brand-700"
          >
            Edit a PDF <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => {
            const body = (
              <>
                <div className="flex items-start justify-between">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${t.accent}`}>
                    <t.icon className="h-5 w-5" />
                  </span>
                  {!t.href && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Coming soon</span>}
                </div>
                <h2 className="mt-4 text-[15px] font-semibold text-slate-900">{t.name}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{t.description}</p>
                {t.href && (
                  <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-brand-600">
                    Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                )}
              </>
            );
            return t.href ? (
              <Link key={t.name} href={t.href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md">
                {body}
              </Link>
            ) : (
              <div key={t.name} className="rounded-2xl border border-slate-200 bg-white/60 p-5">
                {body}
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
