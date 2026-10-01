/**
 * Documents ⇄ HTML for the converters: Markdown, CSV, plain text and EPUB
 * become one print-ready HTML page (the server prints it to PDF), and PDF text
 * (via Markdown) becomes HTML or an EPUB book.
 */
import { marked } from "marked";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const PRINT_CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: "Helvetica Neue", Helvetica, Arial, "Noto Sans", "Noto Sans Devanagari", sans-serif; color: #16181d; font-size: 11pt; line-height: 1.55; margin: 0; }
  h1, h2, h3, h4 { line-height: 1.2; margin: 1.4em 0 0.5em; page-break-after: avoid; }
  h1 { font-size: 22pt; } h2 { font-size: 16pt; } h3 { font-size: 13pt; }
  p, ul, ol, blockquote, pre, table { margin: 0 0 0.8em; }
  a { color: #2447e6; }
  img { max-width: 100%; height: auto; }
  blockquote { border-left: 3px solid #c9cfda; margin-left: 0; padding: 0.2em 0 0.2em 1em; color: #4a505c; }
  code { font-family: "SFMono-Regular", Menlo, Consolas, monospace; font-size: 9.5pt; background: #f2f4f7; padding: 0.1em 0.3em; border-radius: 3px; }
  pre { background: #f2f4f7; padding: 0.8em 1em; border-radius: 6px; white-space: pre-wrap; word-break: break-word; page-break-inside: avoid; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; font-size: 10pt; }
  th, td { border: 1px solid #d5dae2; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #eef1f6; font-weight: 600; }
  tr { page-break-inside: avoid; }
  hr { border: 0; border-top: 1px solid #d5dae2; margin: 1.5em 0; }
`;

/**
 * Wrap body HTML into a complete document with print styles. Images from the
 * internet can't load while printing (nothing outside the file may), so they
 * become their caption instead of a broken-image icon.
 */
export function htmlDocument(title: string, body: string, extraCss = ""): string {
  const offline = body.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = tag.match(/\bsrc\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    if (/^data:/i.test(src)) return tag;
    const alt = tag.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1]?.trim();
    return alt ? `<em class="img-alt">[${alt}]</em>` : "";
  });
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${PRINT_CSS}${extraCss}</style></head><body>${offline}</body></html>`;
}

export function markdownToHtml(md: string): string {
  return marked.parse(md, { async: false, gfm: true }) as string;
}

// ─── CSV ──────────────────────────────────────────────────────────

/** Parse CSV (quotes, escaped quotes, newlines in quotes); detects ; and tab separators. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = [",", ";", "\t"].map((s) => [s, firstLine.split(s).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export function csvToHtml(rows: string[][], opts: { header: boolean; title: string }): string {
  const width = Math.max(0, ...rows.map((r) => r.length));
  const pad = (r: string[]) => [...r, ...Array(width - r.length).fill("")];
  const numeric = (s: string) => /^-?[\d,.]+%?$/.test(s.trim()) && s.trim() !== "";
  const cells = (r: string[], tag: "th" | "td") =>
    pad(r)
      .map((c) => `<${tag}${tag === "td" && numeric(c) ? ' class="num"' : ""}>${escapeHtml(c)}</${tag}>`)
      .join("");
  const [head, ...body] = opts.header ? rows : [[], ...rows];
  const thead = opts.header && head ? `<thead><tr>${cells(head, "th")}</tr></thead>` : "";
  const tbody = `<tbody>${body.map((r) => `<tr>${cells(r, "td")}</tr>`).join("")}</tbody>`;
  // Wide tables print landscape and a little smaller.
  const wide = width > 6;
  const css = `${wide ? "@page { size: A4 landscape; }" : ""} table { font-size: ${width > 10 ? 8 : 9.5}pt; } td.num { text-align: right; font-variant-numeric: tabular-nums; } tbody tr:nth-child(even) td { background: #f8f9fb; } thead { display: table-header-group; }`;
  return htmlDocument(opts.title, `<h2>${escapeHtml(opts.title)}</h2><table>${thead}${tbody}</table>`, css);
}

export function rowsToCsv(rows: string[][]): string {
  const q = (c: string) => (/[",\n\r]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);
  return rows.map((r) => r.map(q).join(",")).join("\r\n");
}

// ─── Plain text ───────────────────────────────────────────────────

export function textToHtml(text: string, title: string): string {
  const paras = text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return htmlDocument(title, `<h1>${escapeHtml(title)}</h1>${paras}`, "body { font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; } p { text-align: justify; }");
}

// ─── EPUB in ──────────────────────────────────────────────────────

const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", svg: "image/svg+xml", webp: "image/webp" };

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"|\\b${name}\\s*=\\s*'([^']*)'`, "i"))?.slice(1).find((v) => v !== undefined);

function resolvePath(base: string, rel: string): string {
  const parts = (base.includes("/") ? base.slice(0, base.lastIndexOf("/") + 1) : "").concat(decodeURIComponent(rel.split("#")[0])).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p && p !== ".") out.push(p);
  }
  return out.join("/");
}

const toBase64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/** Read an EPUB (a zip of XHTML chapters) into one HTML document, images inlined. */
export function epubToHtml(bytes: Uint8Array, fallbackTitle: string): { html: string; title: string; chapters: number } {
  const files = unzipSync(bytes);
  const text = (p: string) => (files[p] ? strFromU8(files[p]) : "");
  const container = text("META-INF/container.xml");
  const opfPath = attr(container.match(/<rootfile\b[^>]*>/i)?.[0] ?? "", "full-path");
  if (!opfPath || !files[opfPath]) throw new Error("This doesn't look like a valid EPUB file.");
  const opf = text(opfPath);
  const title = opf.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i)?.[1]?.trim() || fallbackTitle;
  const manifest = new Map<string, string>();
  for (const m of opf.matchAll(/<item\b[^>]*>/gi)) {
    const id = attr(m[0], "id");
    const href = attr(m[0], "href");
    if (id && href) manifest.set(id, resolvePath(opfPath, href));
  }
  const spine = [...opf.matchAll(/<itemref\b[^>]*>/gi)].map((m) => manifest.get(attr(m[0], "idref") ?? "")).filter((p): p is string => !!p && !!files[p]);
  const body = spine
    .map((path) => {
      const xhtml = text(path);
      let inner = xhtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? xhtml;
      inner = inner.replace(/<script[\s\S]*?<\/script>/gi, "");
      // Inline images so the document is self-contained.
      inner = inner.replace(/<(img|image)\b[^>]*>/gi, (tag) => {
        const src = attr(tag, "src") ?? attr(tag, "xlink:href") ?? attr(tag, "href");
        if (!src || /^data:/i.test(src)) return tag;
        const p = resolvePath(path, src);
        const data = files[p];
        if (!data) return "";
        const mime = MIME[p.split(".").pop()!.toLowerCase()] ?? "image/png";
        return tag.replace(src, `data:${mime};base64,${toBase64(data)}`);
      });
      return `<section class="chapter">${inner}</section>`;
    })
    .join("");
  if (!spine.length) throw new Error("This EPUB has no readable chapters.");
  const css = "body { font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; } .chapter { page-break-before: always; } .chapter:first-child { page-break-before: auto; } p { text-align: justify; }";
  return { html: htmlDocument(title, body, css), title, chapters: spine.length };
}

// ─── PDF (as Markdown) out ────────────────────────────────────────

/** Markdown from a PDF → a standalone, readable HTML page. */
export function pdfMarkdownToHtml(md: string, title: string): string {
  const css = "body { max-width: 760px; margin: 40px auto; padding: 0 20px; } @media print { body { margin: 0; max-width: none; } }";
  return htmlDocument(title, markdownToHtml(md.replace(/\n---\n/g, '\n<hr class="page">\n')), css);
}

/** Markdown from a PDF → an EPUB 3 book, one chapter per PDF page (or per heading when the pages are joined). */
export function markdownToEpub(md: string, title: string, author = ""): Uint8Array {
  const pieces = md.split(/\n---\n/).map((s) => s.trim()).filter(Boolean);
  const chapters = pieces.length ? pieces : [md];
  const id = `urn:uuid:${crypto.randomUUID()}`;
  const xhtml = (t: string, body: string) =>
    `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en"><head><meta charset="utf-8"/><title>${escapeHtml(t)}</title><link rel="stylesheet" href="style.css"/></head><body>${body}</body></html>`;
  // XHTML needs self-closed void elements.
  const toXhtml = (html: string) => html.replace(/<(br|hr|img|input|meta|link)([^>]*?)\s*\/?>/gi, "<$1$2/>");
  const entries: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {
    mimetype: [strToU8("application/epub+zip"), { level: 0 }],
    "META-INF/container.xml": strToU8(
      `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
    ),
    "OEBPS/style.css": strToU8("body{font-family:serif;line-height:1.5;margin:0 5%}h1,h2,h3{font-family:sans-serif}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px}"),
  };
  const titles: string[] = [];
  chapters.forEach((ch, i) => {
    const heading = ch.match(/^#{1,3}\s+(.+)$/m)?.[1]?.trim() ?? `${title} — part ${i + 1}`;
    titles.push(heading);
    entries[`OEBPS/ch${i + 1}.xhtml`] = strToU8(xhtml(heading, toXhtml(markdownToHtml(ch))));
  });
  const nav = `<nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops"><h1>Contents</h1><ol>${titles.map((t, i) => `<li><a href="ch${i + 1}.xhtml">${escapeHtml(t)}</a></li>`).join("")}</ol></nav>`;
  entries["OEBPS/nav.xhtml"] = strToU8(xhtml("Contents", nav).replace("<html ", '<html xmlns:epub="http://www.idpf.org/2007/ops" '));
  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${id}</dc:identifier>
    <dc:title>${escapeHtml(title)}</dc:title>
    <dc:language>en</dc:language>${author ? `\n    <dc:creator>${escapeHtml(author)}</dc:creator>` : ""}
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="style.css" media-type="text/css"/>
${chapters.map((_, i) => `    <item id="ch${i + 1}" href="ch${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join("\n")}
  </manifest>
  <spine>
${chapters.map((_, i) => `    <itemref idref="ch${i + 1}"/>`).join("\n")}
  </spine>
</package>`;
  entries["OEBPS/content.opf"] = strToU8(opf);
  return zipSync(entries as Parameters<typeof zipSync>[0]);
}
