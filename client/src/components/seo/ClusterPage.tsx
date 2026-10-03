import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, Server, Sparkles } from "lucide-react";
import { SiteShell } from "../site/SiteShell";
import { ToolTile } from "../tools/icons";
import { Breadcrumbs } from "./Breadcrumbs";
import { JsonLd } from "./JsonLd";
import { TOOLS, toolBySlug, type ToolDef } from "@/lib/tools/registry";
import { CLUSTERS, clusterById, type ClusterId } from "@/lib/seo/clusters";
import { guideBySlug } from "@/lib/seo/guides";
import { breadcrumbs, collectionPage, faqPage } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/site";

const toolUrl = (t: ToolDef) => `/tools/${t.slug}`;

export function clusterMetadata(id: ClusterId) {
  const c = clusterById(id);
  return pageMetadata({ title: `${c.title} | Fusion Office`, description: c.description, path: c.path });
}

function sectionTools(s: (typeof CLUSTERS)[number]["sections"][number]) {
  const list = s.category ? TOOLS.filter((t) => t.category === s.category) : (s.slugs ?? []).map(toolBySlug).filter((t): t is ToolDef => !!t);
  return list.filter((t) => t.status === "ready");
}

/** A category landing page: what the group of tools is for, every tool in it, questions, guides. */
export function ClusterPage({ id }: { id: ClusterId }) {
  const c = clusterById(id);
  const trail = [
    { name: "Home", path: "/" },
    { name: c.name, path: c.path },
  ];
  const all = [...new Map(c.sections.flatMap(sectionTools).map((t) => [t.slug, t])).values()];
  const guides = c.guides.map(guideBySlug).filter((g) => !!g);
  const others = CLUSTERS.filter((x) => x.id !== id);

  return (
    <SiteShell>
      <JsonLd data={[collectionPage(c, all, toolUrl), breadcrumbs(trail), ...(c.faq.length ? [faqPage(c.faq)] : [])]} />
      <main id="main" className="px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <Breadcrumbs items={trail} />
        <header className="mt-6 max-w-[760px]">
          <p className="eyebrow">{all.length} free tools</p>
          <h1 className="mt-3 text-balance font-display text-[clamp(2rem,4.4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.035em] text-fg">{c.h1}</h1>
          {c.intro.map((p) => (
            <p key={p} className="mt-4 text-[16px] leading-relaxed text-fg-muted">
              {p}
            </p>
          ))}
        </header>

        <div className="mt-12 space-y-14">
          {c.sections.map((s) => {
            const tools = sectionTools(s);
            if (!tools.length) return null;
            const sid = s.category ? `cat-${s.category}` : s.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            return (
              <section key={sid} id={sid} aria-labelledby={`${sid}-title`} className="scroll-mt-24">
                <h2 id={`${sid}-title`} className="font-display text-[22px] font-bold tracking-[-0.02em] text-fg">
                  {s.heading}
                </h2>
                <p className="mt-1.5 max-w-[70ch] text-[15px] leading-relaxed text-fg-muted">{s.blurb}</p>
                <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {tools.map((t) => {
                    return (
                      <li key={t.slug} className="min-w-0">
                        <Link href={toolUrl(t)} className="group flex h-full items-start gap-3.5 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-raised">
                          <ToolTile tool={t} size="md" />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-[14.5px] font-semibold leading-tight text-fg">{t.name}</span>
                              {t.runs !== "browser" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-[11px] font-medium text-fg-muted">
                                  {t.runs === "ai" ? <Sparkles className="h-3 w-3" aria-hidden="true" /> : <Server className="h-3 w-3" aria-hidden="true" />}
                                  {t.runs === "ai" ? "AI" : "Server"}
                                </span>
                              )}
                            </span>
                            <span className="mt-1 block text-[13px] leading-snug text-fg-muted">{t.description}</span>
                          </span>
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-fg" aria-hidden="true" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-14">
          <section aria-labelledby="cluster-faq" className="min-w-0">
            <h2 id="cluster-faq" className="font-display text-[22px] font-bold tracking-[-0.02em] text-fg">
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
          <aside className="space-y-4">
            {guides.length > 0 && (
              <section aria-labelledby="cluster-guides" className="card p-5">
                <h2 id="cluster-guides" className="text-[15px] font-semibold text-fg">
                  Guides
                </h2>
                <ul className="mt-3 space-y-1">
                  {guides.map((g) => (
                    <li key={g!.slug}>
                      <Link href={`/guides/${g!.slug}`} className="group -mx-2 flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-[14px] leading-snug text-fg-muted hover:bg-raised hover:text-fg">
                        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                        {g!.h1}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section aria-labelledby="cluster-more" className="card p-5">
              <h2 id="cluster-more" className="text-[15px] font-semibold text-fg">
                More tool categories
              </h2>
              <ul className="mt-3 space-y-1">
                {others.map((o) => (
                  <li key={o.id}>
                    <Link href={o.path} className="group -mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[14px] text-fg-muted hover:bg-raised hover:text-fg">
                      {o.name}
                      <ArrowRight className="h-3.5 w-3.5 text-fg-subtle group-hover:text-fg" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </main>
    </SiteShell>
  );
}
