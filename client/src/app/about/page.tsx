import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Code2, Gift, Handshake, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbs } from "@/lib/seo/jsonld";
import { SITE_URL, TOOL_COUNT, absoluteUrl, pageMetadata } from "@/lib/seo/site";
import { COMPANY } from "@/lib/company";

const PATH = "/about";
const DESCRIPTION =
  "Fusion Office is built and run by the NextGen Fusion team, a small web and product team in Lucknow and Mumbai. Learn why we made a free, private workspace for PDFs, Office files and images.";

export const metadata: Metadata = pageMetadata({ title: "About Us: The NextGen Fusion Team Behind Fusion Office", description: DESCRIPTION, path: PATH });

const VALUES = [
  { icon: ShieldCheck, title: "Your files are yours", text: "Most tools run on your own device, so your documents never leave it. Privacy is how the product is built, not a setting." },
  { icon: Gift, title: "Free for everyone", text: "No sign-up, no watermarks and no paywalled tools. We'd rather you help someone than pay us." },
  { icon: Handshake, title: "We finish what we start", text: "We don't ship and disappear. We keep improving Fusion Office, and we read every piece of feedback ourselves." },
  { icon: Code2, title: "Honest engineering", text: "We pick the right tool for each job and tell you exactly where your file goes. No dark patterns, no surprises." },
];

const STATS = [
  { value: String(TOOL_COUNT), label: "free tools in Fusion Office" },
  { value: "2", label: "offices, in Lucknow and Mumbai" },
  { value: "19", label: "written client case studies" },
  { value: "0", label: "clients left without support after launch" },
];

export default function AboutPage() {
  const trail = [
    { name: "Home", path: "/" },
    { name: "About us", path: PATH },
  ];
  const org = {
    "@type": "Organization",
    "@id": `${COMPANY.url}/#organization`,
    name: COMPANY.name,
    url: COMPANY.url,
    email: COMPANY.email,
    telephone: COMPANY.phone.tel,
    sameAs: [COMPANY.instagram],
    address: COMPANY.offices.map((o) => ({ "@type": "PostalAddress", streetAddress: o.street, addressLocality: o.city, addressRegion: o.region, postalCode: o.postal, addressCountry: "IN" })),
  };
  const about = {
    "@type": "AboutPage",
    "@id": `${absoluteUrl(PATH)}#page`,
    name: "About Fusion Office",
    url: absoluteUrl(PATH),
    description: DESCRIPTION,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${COMPANY.url}/#organization` },
  };

  return (
    <SiteShell>
      <JsonLd data={[about, org, breadcrumbs(trail)]} />
      <main id="main" className="px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <Breadcrumbs items={trail} />

        {/* Hero */}
        <section className="relative mt-6 overflow-hidden rounded-[28px] border border-line bg-surface px-5 py-12 sm:px-10 sm:py-16">
          <div aria-hidden="true" className="fo-intro-fade pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_85%_10%,rgb(139_124_246/0.22),transparent_70%),radial-gradient(40%_60%_at_10%_100%,rgb(205_245_100/0.10),transparent_70%)]" />
          <div className="relative max-w-[720px]">
            <p className="fo-intro-rise eyebrow">About us</p>
            <h1 className="fo-intro-rise mt-3 text-balance font-display text-[clamp(2.1rem,5vw,3.4rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-fg [animation-delay:80ms]">
              Built by the <span className="bg-[linear-gradient(90deg,#8b7cf6,#cdf564)] bg-clip-text text-transparent">NextGen Fusion</span> team
            </h1>
            <p className="fo-intro-rise mt-5 max-w-[60ch] text-[17px] leading-[1.7] text-fg-muted [animation-delay:160ms]">
              Fusion Office is made by NextGen Fusion, a small web and product team working out of Lucknow and Mumbai. We build websites, online stores and the software behind them for brands across India, the UK, Italy and the Gulf, and we made Fusion Office for everyone else: a free, private place to get document work done.
            </p>
            <div className="fo-intro-rise mt-7 flex flex-wrap gap-3 [animation-delay:240ms]">
              <Link href="/contact" className="btn btn-primary btn-lg">
                Contact us <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href={COMPANY.url} target="_blank" rel="noopener" className="btn btn-secondary btn-lg">
                Visit nextgenfusion.in <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        {/* Numbers */}
        <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <li key={s.label} className="fo-intro-rise card p-5" style={{ animationDelay: `${300 + i * 60}ms` }}>
              <p className="font-display text-[34px] font-extrabold tabular-nums tracking-[-0.03em] text-fg">{s.value}</p>
              <p className="mt-1 text-[13.5px] leading-snug text-fg-muted">{s.label}</p>
            </li>
          ))}
        </ul>

        <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <section aria-labelledby="why">
            <p className="eyebrow">Our story</p>
            <h2 id="why" className="mt-3 font-display text-[clamp(1.5rem,2.8vw,2rem)] font-bold leading-tight tracking-[-0.03em] text-fg">
              Why we built Fusion Office
            </h2>
            <div className="mt-4 space-y-4 text-[16px] leading-[1.75] text-fg-muted">
              <p>We kept seeing the same thing: people uploading payslips, contracts and ID cards to random websites just to merge two PDFs or shrink a file under a portal's size limit. The tools were full of daily limits, watermarks and sign-up walls, and nobody could say where the files went.</p>
              <p>Modern browsers can do this work themselves. So we built a workspace where most tools run on your own device, the few that need a server delete your file straight away, and everything is free. You can read exactly how on our <Link href="/how-we-built-it" className="font-medium text-fg underline decoration-line-strong underline-offset-4 hover:decoration-brand-400">How we built it</Link> page.</p>
              <p>Running a company that builds software for clients taught us one more thing: the work isn't done at launch. We keep improving Fusion Office, and the people who build it are the people who read your feedback.</p>
            </div>
          </section>

          <section aria-labelledby="values">
            <p className="eyebrow">What we believe</p>
            <h2 id="values" className="mt-3 font-display text-[clamp(1.5rem,2.8vw,2rem)] font-bold leading-tight tracking-[-0.03em] text-fg">
              Four promises we keep
            </h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {VALUES.map((v) => (
                <li key={v.title} className="card group p-5 transition-[translate,border-color] duration-300 hover:-translate-y-1 hover:border-line-strong">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-raised text-accent ring-1 ring-inset ring-line-strong transition-transform group-hover:scale-110">
                    <v.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-[16px] font-semibold text-fg">{v.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-fg-muted">{v.text}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section aria-labelledby="team" className="mt-16 rounded-[28px] border border-line bg-surface p-6 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
            <div>
              <p className="eyebrow">The team</p>
              <h2 id="team" className="mt-3 font-display text-[clamp(1.5rem,2.8vw,2rem)] font-bold leading-tight tracking-[-0.03em] text-fg">
                Small team, no layers
              </h2>
              <p className="mt-4 text-[16px] leading-[1.75] text-fg-muted">
                Everyone at NextGen Fusion writes code, copy or strategy. There are no account managers between you and the people who build the product, so when you write to us, the team that made Fusion Office reads it.
              </p>
              <p className="mt-4 text-[16px] leading-[1.75] text-fg-muted">
                Besides Fusion Office, we design and develop websites, Shopify and Next.js stores, Android apps, AI automation and custom software for businesses.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {COMPANY.offices.map((o) => (
                <li key={o.city} className="card p-5">
                  <p className="flex items-center gap-2 text-[15px] font-semibold text-fg">
                    <MapPin className="h-4 w-4 text-accent" aria-hidden="true" /> {o.city}
                  </p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">{o.address}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-16 grid gap-3 sm:grid-cols-2">
          <Link href="/contact" className="card group flex items-center justify-between gap-4 p-6 transition-colors hover:border-line-strong">
            <span>
              <span className="block font-display text-[19px] font-bold tracking-[-0.02em] text-fg">Get in touch</span>
              <span className="mt-1 block text-[14px] text-fg-muted">Questions, ideas or a project in mind? Talk to the team.</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-1 group-hover:text-fg" aria-hidden="true" />
          </Link>
          <Link href="/pay-it-forward" className="card group flex items-center justify-between gap-4 p-6 transition-colors hover:border-line-strong">
            <span>
              <span className="flex items-center gap-2 font-display text-[19px] font-bold tracking-[-0.02em] text-fg">
                Want to support us? <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
              </span>
              <span className="mt-1 block text-[14px] text-fg-muted">Don't pay us. Help someone today, and tell us the story.</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-1 group-hover:text-fg" aria-hidden="true" />
          </Link>
        </section>
      </main>
    </SiteShell>
  );
}
