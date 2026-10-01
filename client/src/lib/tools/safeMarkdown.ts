/**
 * Markdown → HTML for text we didn't write (AI answers about a user's PDF).
 * Raw HTML is shown as text, links must be http(s) or mailto and open in a new
 * tab, and images become links, so nothing in the text can run or load.
 */
import { Marked, type Tokens } from "marked";

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const safeHref = (href: string) => (/^(https?:|mailto:)/i.test(href.trim()) ? href.trim() : null);

const md = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html: (t: Tokens.HTML | Tokens.Tag) => escape(t.text),
    link(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, t: Tokens.Link) {
      const text = this.parser.parseInline(t.tokens);
      const href = safeHref(t.href);
      return href ? `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer nofollow">${text}</a>` : text;
    },
    image: (t: Tokens.Image) => {
      const href = safeHref(t.href);
      const label = escape(t.text || "image");
      return href ? `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer nofollow">${label}</a>` : label;
    },
  },
});

export function renderSafeMarkdown(text: string): string {
  return md.parse(text, { async: false }) as string;
}
