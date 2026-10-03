import Link from "next/link";
import { Fragment } from "react";

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Plain text with inline [anchor](/path) links turned into internal links. */
export function RichText({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    if (m.index > last) out.push(<Fragment key={last}>{text.slice(last, m.index)}</Fragment>);
    out.push(
      <Link key={m.index} href={m[2]} className="font-medium text-brand-300 underline decoration-brand-500/40 underline-offset-2 hover:text-brand-200 hover:decoration-brand-300">
        {m[1]}
      </Link>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(<Fragment key={last}>{text.slice(last)}</Fragment>);
  return <>{out}</>;
}

/** The same text without link markup (for meta tags and structured data). */
export const plainText = (text: string) => text.replace(LINK, "$1");
