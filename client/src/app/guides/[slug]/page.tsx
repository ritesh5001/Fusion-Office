import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Lightbulb } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { RichText } from "@/components/seo/RichText";
import { ToolTile } from "@/components/tools/icons";
import { GUIDES, guideBySlug, type GuideBlock } from "@/lib/seo/guides";
import { clusterById } from "@/lib/seo/clusters";
import { toolBySlug, type ToolDef } from "@/lib/tools/registry";
import { contentFor } from "@/lib/seo/toolContent";
import { article, breadcrumbs, faqPage } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = guideBySlug((await params).slug);
  if (!g) return {};
  return pageMetadata({ title: `${g.title} | Fusion Office`, description: g.description, path: `/guides/${g.slug}`, type: "article", publishedTime: g.published, modifiedTime: g.updated });
}

const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function Block({ b }: { b: GuideBlock }) {
  if ("p" in b)
    return (
      <p className="text-[16px] leading-[1.75] text-fg-muted">
        <RichText text={b.p} />
      </p>
    );
  if ("steps" in b)
    return (
      <ol className="space-y-3.5">
        {b.steps.map((s, i) => (
          <li key={s} className="flex gap-3.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-raised font-mono text-[12px] font-medium text-fg ring-1 ring-inset ring-line-strong">{i + 1}</span>
            <span className="pt-0.5 text-[16px] leading-[1.7] text-fg-muted">
              <RichText text={s} />
            </span>
          </li>
        ))}
      </ol>
    );
  if ("list" in b)
    return (
      <ul className="list-disc space-y-2 pl-5 text-[16px] leading-[1.7] text-fg-muted marker:text-fg-subtle">
        {b.list.map((s) => (
          <li key={s}>
            <RichText text={s} />
          </li>
        ))}
      </ul>
    );
  return (
    <p className="flex gap-3 rounded-xl border border-brand-500/25 bg-brand-500/[0.07] px-4 py-3 text-[15px] leading-relaxed text-fg-muted">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
      <span>
        <RichText text={b.note} />
      </span>
    </p>
  );
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();
  const path = `/guides/${g.slug}`;
  const cluster = clusterById(g.cluster);
  const trail = [
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
    { name: g.h1, path },
  ];
  const tools = g.tools.map(toolBySlug).filter((t): t is ToolDef => !!t && t.status === "ready");
  const more = GUIDES.filter((x) => x.slug !== g.slug && (x.cluster === g.cluster || x.tools.some((t) => g.tools.includes(t)))).slice(0, 4);

  return (
    <SiteShell>
      <JsonLd data={[article(g, path), breadcrumbs(trail), ...(g.faq?.length ? [faqPage(g.faq)] : [])]} />
      <main id="main" className="px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <Breadcrumbs items={trail} />
        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] xl:gap-14">
          <article className="min-w-0 max-w-[740px]">
            <header>
              <h1 className="text-balance font-display text-[clamp(1.9rem,4vw,2.75rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-fg">{g.h1}</h1>
              <p className="mt-3 text-[13px] text-fg-subtle">
                By the Fusion Office team · Updated <time dateTime={g.updated}>{fmt(g.updated)}</time>
              </p>
            </header>
            <div className="card mt-6 p-5">
              <p className="eyebrow">Quick answer</p>
              <p className="mt-2 text-[16px] leading-[1.7] text-fg">
                <RichText text={g.summary} />
              </p>
            </div>
            {g.sections.map((s) => (
              <section key={s.heading} className="mt-10">
                <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-fg">{s.heading}</h2>
                <div className="mt-4 space-y-4">
                  {s.blocks.map((b, i) => (
                    <Block key={i} b={b} />
                  ))}
                </div>
              </section>
            ))}
            {g.faq && g.faq.length > 0 && (
              <section className="mt-10">
                <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-fg">Frequently asked questions</h2>
                <div className="card mt-4 divide-y divide-line">
                  {g.faq.map(([q, a]) => (
                    <div key={q} className="px-5 py-4">
                      <h3 className="text-[15px] font-semibold text-fg">{q}</h3>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-fg-muted">{a}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </article>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section aria-labelledby="guide-tools" className="card p-5">
              <h2 id="guide-tools" className="text-[15px] font-semibold text-fg">
                Tools in this guide
              </h2>
              <ul className="-mx-2 mt-3">
                {tools.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/tools/${t.slug}`} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-raised">
                      <ToolTile tool={t} size="sm" />
                      <span className="min-w-0 flex-1 text-[14px] font-medium leading-snug text-fg">{contentFor(t).anchor}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle group-hover:text-fg" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={cluster.path} className="mt-3 inline-flex px-1 text-[13px] font-semibold text-brand-300 hover:text-brand-200">
                {cluster.anchor}
              </Link>
            </section>
            {more.length > 0 && (
              <section aria-labelledby="guide-more" className="card p-5">
                <h2 id="guide-more" className="text-[15px] font-semibold text-fg">
                  Related guides
                </h2>
                <ul className="mt-3 space-y-1">
                  {more.map((m) => (
                    <li key={m.slug}>
                      <Link href={`/guides/${m.slug}`} className="-mx-2 block rounded-lg px-2 py-1.5 text-[14px] leading-snug text-fg-muted hover:bg-raised hover:text-fg">
                        {m.h1}
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
