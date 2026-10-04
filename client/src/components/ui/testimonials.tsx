/**
 * "What our users say": testimonials in slowly scrolling columns.
 *
 * Adapted from a 21st.dev testimonial block to this site: the dark theme
 * tokens, CSS animation instead of framer-motion (lighter, and it follows the
 * site's Reduce motion setting), and columns that pause on hover.
 *
 * Photos: set `image` on an entry (a path in /public or a full URL) and it
 * replaces the initials avatar.
 */

export interface Testimonial {
  text: string;
  name: string;
  role: string;
  /** Avatar photo; until set, the person's initials are shown. */
  image?: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Sahil Barnwal",
    role: "Software Engineer",
    text: "I needed to fix one line in a signed vendor PDF. Fusion Office let me click the text and change it, and it kept the original font. No re-typing the whole document.",
  },
  {
    name: "Vinay Kumar",
    role: "Software Engineer",
    text: "What sold me is that most tools run in the browser. I opened the network tab while compressing a payslip and nothing was uploaded. That's how a PDF tool should work.",
  },
  {
    name: "Nitish Gupta",
    role: "Software Engineer",
    text: "Merging release notes, test reports and sign-off sheets into one PDF used to mean installing something sketchy. Now it's drag, reorder, done.",
  },
  {
    name: "Nikhilesh Gupta",
    role: "Software Engineer",
    text: "The / shortcut for search is a small thing, but it's exactly what I want. I type 'compress' or 'word', hit enter and I'm in the tool.",
  },
  {
    name: "Rahul Yadav",
    role: "Software Engineer",
    text: "I use it for KYC documents. Compress, add a password, and it's under the portal's size limit. No account, no watermark on the result.",
  },
  {
    name: "Rounak Gupta",
    role: "Software Engineer",
    text: "Word to PDF kept my tables and headings intact, which is more than I can say for half the converters I've tried. Clean output, every time.",
  },
  {
    name: "Shiva Sharma",
    role: "Software Engineer",
    text: "I sign NDAs and offer letters on my phone with it. Draw the signature once, place it, download. It just works, even on a slow connection.",
  },
  {
    name: "Aman Gupta",
    role: "Professor",
    text: "I collect assignments as separate PDFs. Merging them into one file per batch, adding page numbers and compressing for the LMS takes me a couple of minutes now.",
  },
  {
    name: "Ajay Yadav",
    role: "Software Engineer",
    text: "OCR on scanned contracts turned them into searchable text I could actually copy from. It's on-device, so I'm not sending client paperwork anywhere.",
  },
  {
    name: "Sailesh Kumar",
    role: "Software Engineer",
    text: "Splitting a 300-page spec by bookmarks gave me one file per chapter, named properly. That alone saved me an afternoon.",
  },
  {
    name: "Saket Srivastava",
    role: "Software Engineer",
    text: "Fast, no sign-up, no upsell popups. I keep it pinned for the boring document work so I can get back to actual engineering.",
  },
  {
    name: "Rachit Srivastava",
    role: "Software Engineer",
    text: "PDF to Excel pulled the tables out of our vendor invoices cleanly enough to reconcile in a sheet. Way less copy-paste than I expected.",
  },
  {
    name: "Kabeer Singh",
    role: "Software Engineer",
    text: "The redaction tool actually removes the text instead of drawing a black box over it. I checked by copying from the output. Nothing there.",
  },
  {
    name: "Priyan Singh",
    role: "Software Engineer",
    text: "I convert screenshots and photos to a single PDF for bug reports all the time. Pick images, reorder, export. Simple and quick.",
  },
  {
    name: "Aman Singh Yadav",
    role: "Software Engineer",
    text: "Chat with PDF is handy for long RFCs and documentation. I ask where something is defined and it points me to the right section.",
  },
  {
    name: "Vinit Yadav",
    role: "Electrical Engineer",
    text: "I deal with big datasheets and scanned schematics. Compressing them for email without losing readable detail is exactly what I needed.",
  },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

function Card({ t, hidden, className = "w-full max-w-[340px]" }: { t: Testimonial; hidden?: boolean; className?: string }) {
  return (
    <li
      aria-hidden={hidden || undefined}
      className={`${className} rounded-3xl border border-line bg-surface p-7 shadow-card transition-[translate,border-color,box-shadow] duration-300 hover:-translate-y-1.5 hover:border-line-strong hover:shadow-[0_24px_48px_-20px_rgb(0_0_0/0.8)]`}
    >
      <blockquote className="m-0">
        <p className="text-[15px] leading-relaxed text-fg-muted">“{t.text}”</p>
        <footer className="mt-6 flex items-center gap-3">
          {t.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.image} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 rounded-full object-cover ring-2 ring-line" />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8b7cf6,#cdf564)] text-[13px] font-bold text-on-accent ring-2 ring-line"
            >
              {initials(t.name)}
            </span>
          )}
          <div className="flex flex-col">
            <cite className="text-[15px] font-semibold not-italic leading-5 tracking-tight text-fg">{t.name}</cite>
            <span className="mt-0.5 text-[13px] leading-5 text-fg-subtle">{t.role}</span>
          </div>
        </footer>
      </blockquote>
    </li>
  );
}

/** One column that scrolls upward forever (the list is doubled so the loop is seamless). */
function Column({ items, duration, className = "" }: { items: Testimonial[]; duration: number; className?: string }) {
  return (
    <div className={`group ${className}`}>
      <ul className="fo-testimonial-col m-0 flex list-none flex-col gap-6 p-0 pb-6" style={{ animationDuration: `${duration}s` }}>
        {items.map((t) => (
          <Card key={t.name} t={t} />
        ))}
        {items.map((t) => (
          <Card key={`${t.name}-copy`} t={t} hidden />
        ))}
      </ul>
    </div>
  );
}

/**
 * One row that slides sideways forever (phones). The list is doubled so the
 * loop is seamless; `reverse` runs it the other way. With reduced motion it
 * stops and becomes a row you can swipe through.
 */
function Row({ items, duration, reverse = false }: { items: Testimonial[]; duration: number; reverse?: boolean }) {
  return (
    <div className="fo-testimonial-row group -mx-4 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] sm:-mx-6">
      <ul
        className={`m-0 flex w-max list-none p-0 ${reverse ? "fo-testimonial-x-rev" : "fo-testimonial-x"}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {[false, true].map((copy) =>
          items.map((t) => <Card key={`${t.name}-${copy}`} t={t} hidden={copy} className="mr-4 w-[280px] shrink-0 !p-6" />),
        )}
      </ul>
    </div>
  );
}

export function TestimonialsSection({ testimonials = TESTIMONIALS }: { testimonials?: Testimonial[] }) {
  // Everyone appears at every size: one column on phones, two on tablets, three on desktops.
  const split = (n: number) => {
    const per = Math.ceil(testimonials.length / n);
    return Array.from({ length: n }, (_, i) => testimonials.slice(i * per, (i + 1) * per));
  };
  const layouts = [
    { cols: split(2), className: "hidden md:flex lg:hidden", durations: [52, 60] },
    { cols: split(3), className: "hidden lg:flex", durations: [38, 46, 42] },
  ];

  return (
    <section id="testimonials" aria-labelledby="testimonials-heading" className="relative scroll-mt-20 overflow-hidden border-t border-line">
      <div className="px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto flex max-w-[560px] flex-col items-center text-center">
          <p className="eyebrow">Testimonials</p>
          <h2 id="testimonials-heading" className="mt-3 text-balance font-display text-[clamp(1.75rem,3.4vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.035em] text-fg">
            What our users say
          </h2>
          <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-fg-muted">
            Engineers, students and professors use Fusion Office for the document work that gets in the way of real work.
          </p>
        </div>

        {/* Phones: rows that slide sideways, alternating direction. */}
        <div role="region" aria-label="Testimonials" className="mt-10 flex flex-col gap-4 md:hidden">
          {split(3).map((items, i) => (
            <Row key={i} items={items} duration={[46, 38, 54][i]} reverse={i % 2 === 1} />
          ))}
        </div>

        {/* Tablets and desktops: columns that drift upward. */}
        {layouts.map((l) => (
          <div
            key={l.className}
            role="region"
            aria-label="Testimonials"
            className={`${l.className} mt-12 max-h-[720px] justify-center gap-6 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)]`}
          >
            {l.cols.map((items, i) => (
              <Column key={i} items={items} duration={l.durations[i]} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export default TestimonialsSection;
