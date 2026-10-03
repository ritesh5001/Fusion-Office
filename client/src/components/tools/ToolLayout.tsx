import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronRight, Info, Server, ShieldCheck, Sparkles } from "lucide-react";
import { SiteShell } from "../site/SiteShell";
import { ToolTile } from "./icons";
import { Breadcrumbs } from "../seo/Breadcrumbs";
import { JsonLd } from "../seo/JsonLd";
import { TOOLS, toolBySlug, type ToolDef } from "@/lib/tools/registry";
import { contentFor } from "@/lib/seo/toolContent";
import { clusterOf } from "@/lib/seo/clusters";
import { guidesForTool } from "@/lib/seo/guides";
import { breadcrumbs, faqPage, toolApplication } from "@/lib/seo/jsonld";
import { cn } from "@/lib/cn";

const RUNS_BADGE = {
  browser: { icon: ShieldCheck, title: "Works in your browser", text: "No file upload needed", tint: "bg-emerald-500/10 text-emerald-300" },
  server: { icon: Server, title: "Converted on our server", text: "Files are deleted right after", tint: "bg-sky-500/10 text-sky-300" },
  ai: { icon: Sparkles, title: "Uses AI", text: "Text is processed, not stored", tint: "bg-violet-500/10 text-violet-300" },
} as const;

/** What happens to the file, in one sentence, for the "Good to know" list. */
const PRIVACY: Record<ToolDef["runs"], string> = {
  browser: "Your files are processed in your browser and never uploaded to a server.",
  server: "Files are uploaded over an encrypted connection, converted on our server, and deleted as soon as the result is ready.",
  ai: "The text is extracted on your device; only that text is sent to our AI provider to produce the result, and nothing is stored.",
};

/** Hand-picked related tools first, then others from the same category. */
function related(tool: ToolDef, picks: string[] = []) {
  const ready = (t: ToolDef | undefined): t is ToolDef => !!t && t.status === "ready" && t.slug !== tool.slug;
  const chosen = picks.map(toolBySlug).filter(ready);
  const same = TOOLS.filter((t) => t.category === tool.category && ready(t) && !chosen.includes(t));
  return [...chosen, ...same].slice(0, 6);
}

/**
 * Page frame for a single tool: breadcrumb, title, the working tool itself,
 * then instructions, features, uses, limits, questions, related tools and guides.
 */
export function ToolLayout({ tool, children }: { tool: ToolDef; children: ReactNode }) {
  const badge = RUNS_BADGE[tool.runs];
  const c = contentFor(tool);
  const cluster = clusterOf(tool.category);
  const path = `/tools/${tool.slug}`;
  const trail = [
    { name: "Home", path: "/" },
    { name: cluster.name, path: cluster.path },
    { name: tool.name, path },
  ];
  const guides = guidesForTool(tool.slug);
  const goodToKnow = [...(c.limits ?? []), ...(tool.status === "ready" ? [PRIVACY[tool.runs], "Free to use with no sign-up, no limit on tasks and no watermark on your files."] : [])];
  const ready = tool.status === "ready";

  return (
    <SiteShell active={tool.category}>
      <JsonLd data={[...(ready ? [toolApplication(tool, c, path)] : []), breadcrumbs(trail), ...(c.faq?.length ? [faqPage(c.faq)] : [])]} />
      <main id="main" className="px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <Breadcrumbs items={trail} />

        <header className="mt-5 flex flex-col gap-4 border-b border-line pb-7 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-start gap-4 sm:items-center">
            <ToolTile tool={tool} size="xl" />
            <div className="min-w-0">
              <h1 className="font-display text-[clamp(1.6rem,3.2vw,2.25rem)] font-bold leading-[1.1] tracking-[-0.03em] text-fg">{tool.name}</h1>
              <p className="mt-1.5 max-w-[68ch] text-[15px] leading-relaxed text-fg-muted">{c.intro}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 self-start rounded-xl border border-line bg-surface px-3.5 py-2.5 md:self-auto">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", badge.tint)}>
              <badge.icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[13px] font-semibold text-fg">{badge.title}</span>
              <span className="block text-[12px] text-fg-muted">{badge.text}</span>
            </span>
          </div>
        </header>

        <div className="mt-8">{children}</div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-14">
          <article className="min-w-0 space-y-12">
            {c.steps.length > 0 && (
              <section aria-labelledby="how-to">
                <h2 id="how-to" className="font-display text-[22px] font-bold tracking-[-0.02em] text-fg">
                  How to {c.howTo ?? tool.name.toLowerCase()}
                </h2>
                <ol className="mt-5 space-y-4">
                  {c.steps.map((s, i) => (
                    <li key={s} className="flex gap-3.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-raised font-mono text-[12px] font-medium text-fg ring-1 ring-inset ring-line-strong">
                        {i + 1}
                      </span>
                      <span className="pt-0.5 text-[15px] leading-relaxed text-fg-muted">{s}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {c.features.length > 0 && (
              <section aria-labelledby="features">
                <h2 id="features" className="font-display text-[22px] font-bold tracking-[-0.02em] text-fg">
                  Features
                </h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {c.features.map((f) => (
                    <li key={f} className="card flex gap-3 p-4 text-[14px] leading-relaxed text-fg-muted">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {c.uses.length > 0 && (
              <section aria-labelledby="uses">
                <h2 id="uses" className="font-display text-[22px] font-bold tracking-[-0.02em] text-fg">
                  When to use {tool.name}
                </h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-fg-muted marker:text-fg-subtle">
                  {c.uses.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              </section>
            )}

            {goodToKnow.length > 0 && (
              <section aria-labelledby="good-to-know">
                <h2 id="good-to-know" className="font-display text-[22px] font-bold tracking-[-0.02em] text-fg">
                  Good to know
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {goodToKnow.map((l) => (
                    <li key={l} className="flex gap-3 text-[15px] leading-relaxed text-fg-muted">
                      <Info className="mt-1 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                      {l}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {c.faq && c.faq.length > 0 && (
              <section aria-labelledby="faq">
                <h2 id="faq" className="font-display text-[22px] font-bold tracking-[-0.02em] text-fg">
                  Frequently asked questions
                </h2>
                <div className="card mt-5 divide-y divide-line">
                  {c.faq.map(([q, a]) => (
                    <div key={q} className="px-5 py-4">
                      <h3 className="text-[15px] font-semibold text-fg">{q}</h3>
                      <p className="mt-1.5 text-[14.5px] leading-relaxed text-fg-muted">{a}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </article>

          <aside className="space-y-4">
            <section aria-labelledby="related-title" className="card p-5">
              <h2 id="related-title" className="text-[15px] font-semibold text-fg">
                Related tools
              </h2>
              <ul className="-mx-2 mt-3">
                {related(tool, c.related).map((t) => (
                  <li key={t.slug}>
                    <Link href={`/tools/${t.slug}`} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-raised">
                      <ToolTile tool={t} size="sm" />
                      <span className="min-w-0 flex-1 text-[14px] font-medium leading-snug text-fg">{contentFor(t).anchor}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={cluster.path} className="mt-3 inline-flex items-center gap-1 px-1 text-[13px] font-semibold text-brand-300 hover:text-brand-200">
                {cluster.anchor} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </section>

            {guides.length > 0 && (
              <section aria-labelledby="guides-title" className="card p-5">
                <h2 id="guides-title" className="text-[15px] font-semibold text-fg">
                  Guides
                </h2>
                <ul className="mt-3 space-y-1">
                  {guides.map((g) => (
                    <li key={g.slug}>
                      <Link href={`/guides/${g.slug}`} className="group -mx-2 flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-[14px] leading-snug text-fg-muted hover:bg-raised hover:text-fg">
                        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle group-hover:text-fg-muted" aria-hidden="true" />
                        {g.h1}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </main>
    </SiteShell>
  );
}
