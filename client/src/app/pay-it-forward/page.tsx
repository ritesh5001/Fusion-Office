import type { Metadata } from "next";
import { BookOpen, Coffee, HandHeart, Heart, MessageCircleHeart, ShoppingBag, Smile, Sprout, Users } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { StoryForm } from "@/components/site/MessageForms";
import { breadcrumbs, faqPage } from "@/lib/seo/jsonld";
import { SITE_URL, absoluteUrl, pageMetadata } from "@/lib/seo/site";

const PATH = "/pay-it-forward";
const DESCRIPTION =
  "Want to support Fusion Office? We don't take donations. Instead, help someone today, then share the story with us. Every act of kindness counts as your contribution.";

export const metadata: Metadata = pageMetadata({ title: "Pay It Forward: Support Fusion Office by Helping Someone", description: DESCRIPTION, path: PATH });

const STEPS = [
  { icon: HandHeart, title: "Help someone today", text: "A stranger, a neighbour, a classmate, anyone. Big or small, it counts the same to us." },
  { icon: MessageCircleHeart, title: "Tell us the story", text: "Share what you did and how it went using the form below. It takes a minute." },
  { icon: Smile, title: "That's your contribution", text: "We read every story ourselves. Knowing someone is better off is worth more to us than money." },
];

const IDEAS = [
  { icon: Coffee, text: "Buy a stranger a cup of tea" },
  { icon: BookOpen, text: "Teach someone a skill you know" },
  { icon: ShoppingBag, text: "Carry a neighbour's shopping" },
  { icon: Users, text: "Help a student with their documents" },
  { icon: Sprout, text: "Plant a tree in your street" },
  { icon: Heart, text: "Call someone who's alone" },
];

const FAQ: [string, string][] = [
  [
    "Can I donate money to Fusion Office?",
    "We don't accept donations. If Fusion Office helped you and you'd like to give something back, help another person instead. That act of kindness is your contribution, and we'd love to hear about it.",
  ],
  [
    "Does it have to be something big?",
    "Not at all. Paying for someone's tea, helping a classmate fill in a form or simply listening to a friend all count. What matters is that someone's day got a little better.",
  ],
  [
    "What happens to the story I share?",
    "It goes to the NextGen Fusion team, who build Fusion Office, and we read every one. We'll never publish your story or share your email address without asking you first.",
  ],
];

/** The hero art: a beating heart sending out waves, with small acts of kindness circling it. */
function KindnessArt() {
  const orbit = [Coffee, BookOpen, ShoppingBag, Users, Sprout, Smile];
  return (
    <div aria-hidden="true" className="relative mx-auto flex aspect-square w-full max-w-[340px] items-center justify-center">
      {[0, 1, 2].map((i) => (
        <span key={i} className="fo-kind-wave absolute inset-[28%] rounded-full border border-accent/50" style={{ animationDelay: `${i * 1.1}s` }} />
      ))}
      <div className="absolute inset-[6%] rounded-full border border-dashed border-line-strong" />
      <div className="fo-kind-orbit absolute inset-[6%]">
        {orbit.map((Icon, i) => {
          const a = (i / orbit.length) * Math.PI * 2;
          return (
            <span
              key={i}
              className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-raised text-brand-300 shadow-pop ring-1 ring-inset ring-line-strong"
              style={{ left: `${50 + Math.cos(a) * 50}%`, top: `${50 + Math.sin(a) * 50}%` }}
            >
              <Icon className="fo-kind-counter h-5 w-5" />
            </span>
          );
        })}
      </div>
      <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ff8fa3,#ff4d6d)] shadow-[0_0_60px_rgb(255_77_109/0.55)]">
        <Heart className="fo-heartbeat h-12 w-12 fill-white text-white" />
      </span>
    </div>
  );
}

export default function PayItForwardPage() {
  const trail = [
    { name: "Home", path: "/" },
    { name: "Pay it forward", path: PATH },
  ];
  const page = {
    "@type": "WebPage",
    "@id": `${absoluteUrl(PATH)}#page`,
    name: "Pay it forward",
    url: absoluteUrl(PATH),
    description: DESCRIPTION,
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };

  return (
    <SiteShell>
      <JsonLd data={[page, breadcrumbs(trail), faqPage(FAQ)]} />
      <main id="main" className="px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <Breadcrumbs items={trail} />

        <section className="relative mt-6 overflow-hidden rounded-[28px] border border-line bg-surface px-5 py-12 sm:px-10 sm:py-14">
          <div aria-hidden="true" className="fo-intro-fade pointer-events-none absolute inset-0 bg-[radial-gradient(45%_60%_at_80%_45%,rgb(255_77_109/0.16),transparent_70%),radial-gradient(45%_60%_at_15%_100%,rgb(139_124_246/0.16),transparent_70%)]" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div>
              <p className="fo-intro-rise eyebrow">Pay it forward</p>
              <h1 className="fo-intro-rise mt-3 text-balance font-display text-[clamp(2.1rem,5vw,3.4rem)] font-extrabold leading-[1.04] tracking-[-0.035em] text-fg [animation-delay:80ms]">
                Don't pay us. <span className="bg-[linear-gradient(90deg,#ff8fa3,#cdf564)] bg-clip-text text-transparent">Help someone.</span>
              </h1>
              <p className="fo-intro-rise mt-5 max-w-[58ch] text-[17px] leading-[1.7] text-fg-muted [animation-delay:160ms]">
                People often ask how they can donate or contribute to Fusion Office. Here's our answer: if you want to help us, help a random person today. To us, that is worth exactly the same as any money you could send.
              </p>
              <p className="fo-intro-rise mt-4 max-w-[58ch] text-[17px] leading-[1.7] text-fg-muted [animation-delay:220ms]">
                Then come back and share the story of who you helped. We read every single one.
              </p>
              <a href="#share" className="fo-intro-rise btn btn-primary btn-lg mt-7 [animation-delay:280ms]">
                <Heart className="h-4 w-4" aria-hidden="true" /> Share your story
              </a>
            </div>
            <div className="fo-intro-scale [animation-delay:200ms]">
              <KindnessArt />
            </div>
          </div>
        </section>

        <section aria-labelledby="how" className="mt-14">
          <h2 id="how" className="font-display text-[clamp(1.5rem,2.8vw,2rem)] font-bold tracking-[-0.03em] text-fg">
            How it works
          </h2>
          <ol className="mt-5 grid gap-3 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card group relative p-6 transition-[translate,border-color] duration-300 hover:-translate-y-1 hover:border-line-strong">
                <span className="absolute right-5 top-5 font-mono text-[12px] text-fg-subtle">0{i + 1}</span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-raised text-[#ff8fa3] ring-1 ring-inset ring-line-strong transition-transform group-hover:scale-110 group-hover:-rotate-6">
                  <s.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-[17px] font-semibold text-fg">{s.title}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-fg-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="ideas" className="mt-14">
          <h2 id="ideas" className="font-display text-[clamp(1.3rem,2.4vw,1.6rem)] font-bold tracking-[-0.03em] text-fg">
            Need an idea?
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2.5">
            {IDEAS.map((idea, i) => (
              <li key={idea.text} className="fo-kind-float" style={{ animationDelay: `${i * 0.45}s` }}>
                <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-4 py-2.5 text-[14px] text-fg-muted transition-colors hover:border-[#ff8fa3]/60 hover:text-fg">
                  <idea.icon className="h-4 w-4 text-[#ff8fa3]" aria-hidden="true" /> {idea.text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section id="share" aria-labelledby="share-title" className="relative scroll-mt-24">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-3 rounded-[34px] bg-[linear-gradient(100deg,#ff8fa3,#8b7cf6_50%,#cdf564)] opacity-[0.16] blur-2xl" />
            <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(100deg,#ff8fa3,#b6adff_50%,#cdf564)] p-[1.5px]">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="fo-sweep absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0_72%,rgb(255_255_255/0.85)_82%,transparent_92%)]" />
              </div>
              <div className="relative rounded-[26.5px] bg-surface p-6 sm:p-8">
                <h2 id="share-title" className="font-display text-[22px] font-bold tracking-[-0.02em] text-fg">
                  Share who you helped
                </h2>
                <p className="mt-1 text-[14.5px] text-fg-muted">Tell us what happened. Add your email if you'd like a thank-you note from us.</p>
                <div className="mt-6">
                  <StoryForm />
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="faq">
            <h2 id="faq" className="font-display text-[20px] font-bold tracking-[-0.02em] text-fg">
              Questions
            </h2>
            <div className="card mt-4 divide-y divide-line">
              {FAQ.map(([q, a]) => (
                <div key={q} className="p-5">
                  <h3 className="text-[15px] font-semibold text-fg">{q}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-fg-muted">{a}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </SiteShell>
  );
}
