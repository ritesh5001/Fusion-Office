import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { plainText } from "@/components/seo/RichText";
import { GUIDES } from "@/lib/seo/guides";
import { CLUSTERS } from "@/lib/seo/clusters";
import { breadcrumbs } from "@/lib/seo/jsonld";
import { absoluteUrl, pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "PDF, Document & Image How-To Guides | Fusion Office",
  description: "Step-by-step guides to compressing, merging, splitting, converting, editing, signing, protecting and redacting PDFs, and reducing image file size.",
  path: "/guides",
});

export default function GuidesPage() {
  const trail = [
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
  ];
  const groups = CLUSTERS.map((c) => ({ c, guides: GUIDES.filter((g) => g.cluster === c.id) })).filter((x) => x.guides.length);
  return (
    <SiteShell>
      <JsonLd
        data={[
          breadcrumbs(trail),
          {
            "@type": "CollectionPage",
            name: "Fusion Office guides",
            url: absoluteUrl("/guides"),
            mainEntity: {
              "@type": "ItemList",
              itemListElement: GUIDES.map((g, i) => ({ "@type": "ListItem", position: i + 1, name: g.h1, url: absoluteUrl(`/guides/${g.slug}`) })),
            },
          },
        ]}
      />
      <main id="main" className="px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <Breadcrumbs items={trail} />
        <header className="mt-6 max-w-[720px]">
          <p className="eyebrow">Guides</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,4.4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.035em] text-fg">How to work with PDFs, documents and images</h1>
          <p className="mt-4 text-[16px] leading-relaxed text-fg-muted">
            Practical answers to everyday document tasks: what to do, why it works, and what to try when it doesn&apos;t. Each guide uses free Fusion Office tools that run in your browser.
          </p>
        </header>
        <div className="mt-12 space-y-12">
          {groups.map(({ c, guides }) => (
            <section key={c.id} aria-labelledby={`g-${c.id}`}>
              <h2 id={`g-${c.id}`} className="font-display text-[20px] font-bold tracking-[-0.02em] text-fg">
                {c.name}
              </h2>
              <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {guides.map((g) => (
                  <li key={g.slug} className="min-w-0">
                    <Link href={`/guides/${g.slug}`} className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-raised">
                      <span className="text-[16px] font-semibold leading-snug text-fg">{g.h1}</span>
                      <span className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-fg-muted">{plainText(g.description)}</span>
                      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-[13px] font-semibold text-brand-300 group-hover:text-brand-200">
                        Read the guide <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </SiteShell>
  );
}
