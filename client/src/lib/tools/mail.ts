/**
 * Email files → a printable HTML page: .eml (MIME, saved by Gmail, Outlook on
 * the web, Thunderbird, Apple Mail) and .msg (Outlook desktop). Headers, the
 * message body (HTML preferred, plain text otherwise), inline pictures, and a
 * list of attachments. Pure parsing, so .eml is unit tested.
 */
import { escapeHtml } from "./documents";

export interface MailAttachment {
  name: string;
  type: string;
  bytes: Uint8Array;
  contentId: string;
  inline: boolean;
}

export interface Mail {
  subject: string;
  from: string;
  to: string;
  cc: string;
  date: string;
  html: string | null;
  text: string | null;
  attachments: MailAttachment[];
}

const latin1 = (b: Uint8Array) => new TextDecoder("latin1").decode(b);

function decodeCharset(bytes: Uint8Array, charset: string): string {
  const cs = (charset || "utf-8").trim().toLowerCase().replace(/^"|"$/g, "");
  try {
    return new TextDecoder(cs === "us-ascii" || cs === "ascii" ? "utf-8" : cs).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function base64Bytes(s: string): Uint8Array {
  const clean = s.replace(/[^A-Za-z0-9+/=]/g, "");
  try {
    return Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
  } catch {
    // Damaged padding: decode what's there.
    return Uint8Array.from(atob(clean.replace(/=+$/, "").slice(0, Math.floor(clean.replace(/=+$/, "").length / 4) * 4)), (c) => c.charCodeAt(0));
  }
}

function quotedPrintable(s: string): Uint8Array {
  const soft = s.replace(/=\r?\n/g, "");
  const out: number[] = [];
  for (let i = 0; i < soft.length; i++) {
    const c = soft[i];
    if (c === "=" && /^[0-9A-Fa-f]{2}$/.test(soft.slice(i + 1, i + 3))) {
      out.push(parseInt(soft.slice(i + 1, i + 3), 16));
      i += 2;
    } else out.push(soft.charCodeAt(i) & 0xff);
  }
  return new Uint8Array(out);
}

/** RFC 2047 encoded words in headers: =?UTF-8?B?…?= and =?iso-8859-1?Q?…?= */
export function decodeWords(value: string): string {
  return value
    .replace(/\?=\s+=\?/g, "?==?") // adjacent encoded words join without the space between them
    .replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_m, charset: string, enc: string, data: string) => {
      const bytes = enc.toUpperCase() === "B" ? base64Bytes(data) : quotedPrintable(data.replace(/_/g, " "));
      return decodeCharset(bytes, charset.replace(/\*.*$/, ""));
    });
}

type Headers = Map<string, string>;

function parseHeaders(block: string): Headers {
  const h: Headers = new Map();
  const unfolded = block.replace(/\r?\n[ \t]+/g, " ");
  for (const line of unfolded.split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    if (!h.has(key)) h.set(key, line.slice(i + 1).trim());
  }
  return h;
}

/** "text/html; charset=utf-8; name=x" → { value: "text/html", params: { charset, name } }, with RFC 2231 names. */
function headerParams(v = ""): { value: string; params: Record<string, string> } {
  const [value, ...rest] = v.split(";");
  const params: Record<string, string> = {};
  const continued: Record<string, string[]> = {};
  for (const part of rest) {
    const m = part.match(/^\s*([^=\s]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const c = key.match(/^([^*]+)\*(\d+)\*?$/);
    if (c) (continued[c[1]] ??= [])[Number(c[2])] = m[2];
    else if (key.endsWith("*")) {
      // name*=UTF-8''f%C3%BCr.pdf
      const [cs, , text = ""] = m[2].split("'");
      // Percent-escapes are bytes in the named charset.
      const bytes = Uint8Array.from(text.replace(/%([0-9A-Fa-f]{2})|./gs, (x, hex: string | undefined) => (hex ? String.fromCharCode(parseInt(hex, 16)) : x)), (c) => c.charCodeAt(0) & 0xff);
      params[key.slice(0, -1)] = decodeCharset(bytes, cs || "utf-8");
    } else params[key] = decodeWords(m[2]);
  }
  for (const [k, parts] of Object.entries(continued)) {
    const joined = parts.join("");
    try {
      params[k] = decodeURIComponent(joined.replace(/^[^']*'[^']*'/, ""));
    } catch {
      params[k] = joined;
    }
  }
  return { value: value.trim().toLowerCase(), params };
}

function decodeBody(raw: string, encoding: string): Uint8Array {
  const enc = encoding.trim().toLowerCase();
  if (enc === "base64") return base64Bytes(raw);
  if (enc === "quoted-printable") return quotedPrintable(raw);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0) & 0xff);
}

function splitPart(raw: string): { headers: Headers; body: string } {
  const m = raw.match(/\r?\n\r?\n/);
  if (!m || m.index === undefined) return { headers: parseHeaders(raw), body: "" };
  return { headers: parseHeaders(raw.slice(0, m.index)), body: raw.slice(m.index + m[0].length) };
}

function walk(raw: string, mail: Mail, depth = 0) {
  if (depth > 12) return;
  const { headers, body } = splitPart(raw);
  const type = headerParams(headers.get("content-type") ?? "text/plain");
  const disposition = headerParams(headers.get("content-disposition") ?? "");
  const encoding = headers.get("content-transfer-encoding") ?? "7bit";
  if (type.value.startsWith("multipart/") && type.params.boundary) {
    const b = `--${type.params.boundary}`;
    const parts = body.split(b);
    // parts[0] is the preamble; the part after "--boundary--" is the epilogue.
    for (const part of parts.slice(1)) {
      if (part.startsWith("--")) break;
      walk(part.replace(/^\r?\n/, ""), mail, depth + 1);
    }
    return;
  }
  if (type.value === "message/rfc822") {
    // A forwarded email: show it as an attachment.
    mail.attachments.push({ name: `${decodeWords(splitPart(body).headers.get("subject") ?? "message")}.eml`, type: "message/rfc822", bytes: decodeBody(body, encoding), contentId: "", inline: false });
    return;
  }
  const bytes = decodeBody(body, encoding);
  const name = disposition.params.filename ?? type.params.name ?? "";
  const isAttachment = disposition.value === "attachment" || (!!name && !type.value.startsWith("text/"));
  if (!isAttachment && type.value === "text/html" && mail.html === null) mail.html = decodeCharset(bytes, type.params.charset);
  else if (!isAttachment && type.value === "text/plain" && mail.text === null) mail.text = decodeCharset(bytes, type.params.charset);
  else
    mail.attachments.push({
      name: name || `attachment-${mail.attachments.length + 1}`,
      type: type.value || "application/octet-stream",
      bytes,
      contentId: (headers.get("content-id") ?? "").replace(/^<|>$/g, ""),
      inline: disposition.value === "inline" || !!headers.get("content-id"),
    });
}

export function parseEml(bytes: Uint8Array): Mail {
  const raw = latin1(bytes);
  const { headers } = splitPart(raw);
  const h = (k: string) => decodeWords(headers.get(k) ?? "");
  const mail: Mail = { subject: h("subject"), from: h("from"), to: h("to"), cc: h("cc"), date: h("date"), html: null, text: null, attachments: [] };
  if (!headers.size || (!headers.has("from") && !headers.has("subject") && !headers.has("content-type"))) throw new Error("This doesn't look like an email (.eml) file.");
  walk(raw, mail);
  return mail;
}

/** Outlook .msg (a compound file): read with msgreader, loaded only when needed. */
export async function parseMsg(bytes: Uint8Array): Promise<Mail> {
  const { default: MsgReader } = await import("@kenjiuno/msgreader");
  let info: ReturnType<InstanceType<typeof MsgReader>["getFileData"]>;
  const reader = new MsgReader(bytes.slice().buffer as ArrayBuffer);
  try {
    info = reader.getFileData();
  } catch {
    throw new Error("This doesn't look like an Outlook (.msg) email.");
  }
  if (info.error) throw new Error("This doesn't look like an Outlook (.msg) email.");
  const people = (kind: string) =>
    (info.recipients ?? [])
      .filter((r) => (r.recipType ?? "to") === kind)
      .map((r) => (r.name && r.email && r.name !== r.email ? `${r.name} <${r.email}>` : r.name || r.email || r.smtpAddress || ""))
      .filter(Boolean)
      .join(", ");
  const html = info.bodyHtml ?? (info.html ? new TextDecoder("utf-8").decode(info.html) : null);
  const attachments: MailAttachment[] = [];
  for (const a of info.attachments ?? []) {
    try {
      const got = reader.getAttachment(a);
      attachments.push({ name: got.fileName || a.fileName || "attachment", type: a.attachMimeTag || "application/octet-stream", bytes: got.content, contentId: a.pidContentId ?? "", inline: !!a.pidContentId });
    } catch {
      /* unreadable attachment: skip */
    }
  }
  return {
    subject: info.subject ?? "",
    from: info.senderName && info.senderEmail ? `${info.senderName} <${info.senderEmail}>` : info.senderName || info.senderEmail || "",
    to: people("to"),
    cc: people("cc"),
    date: info.messageDeliveryTime || info.clientSubmitTime || info.creationTime || "",
    html: html || null,
    text: info.body ?? null,
    attachments,
  };
}

const formatBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

function toDataUrl(a: MailAttachment) {
  let s = "";
  for (let i = 0; i < a.bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, a.bytes.subarray(i, i + 0x8000) as unknown as number[]);
  return `data:${a.type};base64,${btoa(s)}`;
}

/**
 * Make email HTML safe and self-contained: no scripts, frames, forms or
 * event handlers, and no remote resources (tracking pixels, web fonts).
 * Inline pictures (cid:) are embedded.
 */
export function cleanMailHtml(html: string, attachments: MailAttachment[]): { html: string; blocked: number } {
  let blocked = 0;
  const byCid = new Map(attachments.filter((a) => a.contentId).map((a) => [a.contentId.toLowerCase(), a]));
  let s = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|iframe|object|embed|form|frameset|frame|applet|base|meta|link)\b[\s\S]*?(<\/\1\s*>|\/?>)/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src|action)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, "$1=$2#$2");
  // Inline pictures from the email itself.
  s = s.replace(/src\s*=\s*(["'])cid:([^"']+)\1/gi, (_m, q: string, cid: string) => {
    const a = byCid.get(cid.toLowerCase());
    return a && a.type.startsWith("image/") ? `src=${q}${toDataUrl(a)}${q}` : `src=${q}${q}`;
  });
  // Remote pictures and backgrounds are left out (they could be tracking pixels).
  s = s.replace(/<img\b[^>]*\bsrc\s*=\s*(["'])\s*(https?:)?\/\/[^"']*\1[^>]*>/gi, (m) => {
    blocked++;
    const alt = m.match(/\balt\s*=\s*(["'])(.*?)\1/i)?.[2];
    return alt ? `<span style="color:#6b7280">[${alt}]</span>` : "";
  });
  s = s.replace(/url\(\s*(["']?)\s*(https?:)?\/\/[^)]*\)/gi, () => (blocked++, "none"));
  s = s.replace(/@import[^;]+;/gi, "");
  // Keep only the body's content.
  const body = s.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? s;
  const styles = [...s.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join("\n");
  return { html: `${styles ? `<style>${styles}</style>` : ""}${body.replace(/<\/?(html|head|body)[^>]*>/gi, "")}`, blocked };
}

/** A complete printable document for the email. */
export function mailToHtml(mail: Mail, opts: { appendImages: boolean }): { html: string; blocked: number } {
  const rows = [
    ["From", mail.from],
    ["To", mail.to],
    ["Cc", mail.cc],
    ["Date", mail.date],
  ].filter(([, v]) => v);
  const cleaned = mail.html ? cleanMailHtml(mail.html, mail.attachments) : null;
  const body = cleaned
    ? cleaned.html
    : `<div class="plain">${escapeHtml((mail.text ?? "").replace(/\r\n?/g, "\n")).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>').replace(/\n/g, "<br>")}</div>`;
  const listed = mail.attachments.filter((a) => !(a.inline && cleaned && mail.html?.includes(`cid:${a.contentId}`)));
  const images = opts.appendImages ? listed.filter((a) => /^image\/(png|jpe?g|gif|webp)$/.test(a.type)) : [];
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(mail.subject || "Email")}</title><style>
    @page { margin: 16mm 14mm; }
    body { font-family: -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Devanagari", Arial, sans-serif; font-size: 11pt; color: #111; line-height: 1.45; }
    .head { border-bottom: 1.5px solid #222; padding-bottom: 10px; margin-bottom: 16px; }
    .head h1 { font-size: 16pt; margin: 0 0 8px; }
    .head table { border-collapse: collapse; font-size: 9.5pt; }
    .head td { padding: 1px 10px 1px 0; vertical-align: top; }
    .head td:first-child { color: #555; font-weight: 600; white-space: nowrap; }
    .plain { white-space: normal; word-wrap: break-word; }
    .att { margin-top: 22px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 9.5pt; }
    .att li { margin: 2px 0; }
    .pics img { max-width: 100%; margin-top: 12px; page-break-inside: avoid; }
    img { max-width: 100%; height: auto; }
    table { max-width: 100%; }
  </style></head><body>
    <div class="head"><h1>${escapeHtml(mail.subject || "(no subject)")}</h1><table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${escapeHtml(v)}</td></tr>`).join("")}</table></div>
    <div class="body">${body}</div>
    ${listed.length ? `<div class="att"><strong>Attachments (${listed.length})</strong><ul>${listed.map((a) => `<li>${escapeHtml(a.name)} · ${formatBytes(a.bytes.length)}</li>`).join("")}</ul></div>` : ""}
    ${images.length ? `<div class="pics">${images.map((a) => `<img src="${toDataUrl(a)}" alt="${escapeHtml(a.name)}">`).join("")}</div>` : ""}
  </body></html>`;
  return { html, blocked: cleaned?.blocked ?? 0 };
}
