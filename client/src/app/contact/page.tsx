import type { Metadata } from "next";
import { ArrowUpRight, Clock, Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { ContactForm } from "@/components/site/MessageForms";
import { breadcrumbs } from "@/lib/seo/jsonld";
import { SITE_URL, absoluteUrl, pageMetadata } from "@/lib/seo/site";
import { COMPANY } from "@/lib/company";

const PATH = "/contact";
const DESCRIPTION = `Contact the NextGen Fusion team behind Fusion Office. Email ${COMPANY.email}, call or WhatsApp ${COMPANY.phone.display}, or send a message and get a reply within one working day.`;

export const metadata: Metadata = pageMetadata({ title: "Contact Us | Fusion Office by NextGen Fusion", description: DESCRIPTION, path: PATH });

const CHANNELS = [
  { icon: Mail, label: "Email", value: COMPANY.email, href: `mailto:${COMPANY.email}`, note: "Best for anything detailed" },
  { icon: Phone, label: "Call us", value: COMPANY.phone.display, href: `tel:${COMPANY.phone.tel}`, note: COMPANY.hours },
  { icon: MessageCircle, label: "WhatsApp", value: COMPANY.phone.display, href: COMPANY.whatsapp, note: "Fastest for quick questions" },
  { icon: Instagram, label: "Instagram", value: "@nextgenfusion.devs", href: COMPANY.instagram, note: "Updates and behind the scenes" },
];

export default function ContactPage() {
  const trail = [
    { name: "Home", path: "/" },
    { name: "Contact us", path: PATH },
  ];
  const page = {
    "@type": "ContactPage",
    "@id": `${absoluteUrl(PATH)}#page`,
    name: "Contact Fusion Office",
    url: absoluteUrl(PATH),
    description: DESCRIPTION,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    mainEntity: {
      "@type": "Organization",
      name: COMPANY.name,
      url: COMPANY.url,
      email: COMPANY.email,
      contactPoint: [
        { "@type": "ContactPoint", contactType: "customer support", email: COMPANY.email, telephone: COMPANY.phone.tel, areaServed: "Worldwide", availableLanguage: ["English", "Hindi"] },
      ],
      address: COMPANY.offices.map((o) => ({ "@type": "PostalAddress", streetAddress: o.street, addressLocality: o.city, addressRegion: o.region, postalCode: o.postal, addressCountry: "IN" })),
    },
  };

  return (
    <SiteShell>
      <JsonLd data={[page, breadcrumbs(trail)]} />
      <main id="main" className="px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <Breadcrumbs items={trail} />

        <header className="mt-6 max-w-[680px]">
          <p className="fo-intro-rise eyebrow">Contact us</p>
          <h1 className="fo-intro-rise mt-3 text-balance font-display text-[clamp(2.1rem,5vw,3.2rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-fg [animation-delay:80ms]">
            Talk to the people who build it
          </h1>
          <p className="fo-intro-rise mt-4 text-[17px] leading-[1.7] text-fg-muted [animation-delay:160ms]">
            No account managers relaying messages. Every message goes straight to the NextGen Fusion team, and you get a written reply, usually within one working day.
          </p>
        </header>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {CHANNELS.map((c, i) => (
            <li key={c.label} className="fo-intro-rise" style={{ animationDelay: `${220 + i * 60}ms` }}>
              <a
                href={c.href}
                {...(c.href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}
                className="card group flex h-full items-start gap-3.5 p-5 transition-[translate,border-color] duration-300 hover:-translate-y-1 hover:border-line-strong"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-raised text-accent ring-1 ring-inset ring-line-strong transition-transform group-hover:scale-110">
                  <c.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium uppercase tracking-[0.08em] text-fg-subtle">{c.label}</span>
                  <span className="mt-0.5 block break-words text-[15px] font-semibold text-fg">{c.value}</span>
                  <span className="mt-0.5 block text-[13px] text-fg-muted">{c.note}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section aria-labelledby="form-title" className="relative">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-3 rounded-[34px] bg-[linear-gradient(100deg,#8b7cf6,#cdf564)] opacity-[0.12] blur-2xl" />
            <div className="relative rounded-[28px] border border-line-strong bg-surface p-6 sm:p-8">
              <h2 id="form-title" className="font-display text-[22px] font-bold tracking-[-0.02em] text-fg">
                Send us a message
              </h2>
              <p className="mt-1 text-[14.5px] text-fg-muted">Questions about a tool, an idea, a bug, or a project for NextGen Fusion. We read everything.</p>
              <div className="mt-6">
                <ContactForm />
              </div>
            </div>
          </section>

          <aside className="space-y-3">
            {COMPANY.offices.map((o) => (
              <section key={o.city} className="card p-5">
                <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
                  <MapPin className="h-4 w-4 text-accent" aria-hidden="true" /> NextGen Fusion, {o.city}
                </h2>
                <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">{o.address}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13.5px]">
                  <a href={`tel:${o.phone.tel}`} className="font-medium text-fg hover:text-accent">
                    {o.phone.display}
                  </a>
                  <a href={o.map} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-medium text-brand-300 hover:text-brand-200">
                    Open in Maps <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </section>
            ))}
            <section className="card p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-fg">
                <Clock className="h-4 w-4 text-accent" aria-hidden="true" /> Opening hours
              </h2>
              <dl className="mt-3 space-y-1.5 text-[13.5px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">Monday – Saturday</dt>
                  <dd className="font-medium text-fg">10:00 – 19:00 IST</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-fg-muted">Sunday</dt>
                  <dd className="font-medium text-fg">Closed</dd>
                </div>
              </dl>
              <p className="mt-2 text-[12.5px] text-fg-subtle">Email and WhatsApp are still monitored on Sundays.</p>
            </section>
          </aside>
        </div>
      </main>
    </SiteShell>
  );
}
