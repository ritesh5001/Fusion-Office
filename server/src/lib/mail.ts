/**
 * Thank-you emails through Resend (https://resend.com). On when RESEND_API_KEY
 * is set; MAIL_FROM must use a domain verified in Resend, e.g.
 * "Fusion Office <hello@fusionoffice.online>". Sending never blocks or fails
 * the form submission: problems are logged and the person still gets their
 * on-screen confirmation.
 */
const API = "https://api.resend.com/emails";
const SITE = (process.env.PUBLIC_SITE_URL || "https://fusionoffice.online").replace(/\/+$/, "");

export const mailEnabled = () => !!process.env.RESEND_API_KEY;
const from = () => process.env.MAIL_FROM || "Fusion Office <onboarding@resend.dev>";
const replyTo = () => process.env.MAIL_REPLY_TO || "contact@nextgenfusion.in";

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Sends one email. Resolves false (and logs) instead of throwing. */
export async function sendMail(mail: Mail): Promise<boolean> {
  if (!mailEnabled()) return false;
  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: from(), to: [mail.to], reply_to: replyTo(), subject: mail.subject, html: mail.html, text: mail.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[mail] Resend answered", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[mail]", err);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const first = (name: string) => name.trim().split(/\s+/)[0] || "there";

/** The shared, email-client-safe layout: dark header, white card, plain footer. */
function layout(title: string, paragraphs: string[], cta?: { label: string; href: string }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#3b3e52">${p}</p>`).join("");
  const button = cta
    ? `<p style="margin:22px 0 4px"><a href="${cta.href}" style="display:inline-block;background:#cdf564;color:#14152b;font-weight:700;font-size:14px;text-decoration:none;padding:12px 20px;border-radius:999px">${cta.label}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f3f2f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f2f8;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="background:#0e1027;border-radius:18px 18px 0 0;padding:22px 26px">
<span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.3px">Fusion Office</span>
<span style="display:block;margin-top:3px;font-size:12px;color:#b6adff">All your files. One private workspace.</span>
</td></tr>
<tr><td style="background:#ffffff;border-radius:0 0 18px 18px;padding:28px 26px 24px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:#14152b;letter-spacing:-0.4px">${title}</h1>
${body}${button}
<p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:#3b3e52">With thanks,<br><strong>The NextGen Fusion team</strong></p>
</td></tr>
<tr><td style="padding:16px 8px;text-align:center;font-size:12px;line-height:1.6;color:#8a8ca3">
You're receiving this because you sent us a message at <a href="${SITE}" style="color:#6d5fe0">fusionoffice.online</a>. Just reply to this email to reach us.
</td></tr>
</table></td></tr></table></body></html>`;
}

const plain = (title: string, paragraphs: string[], link?: string) =>
  [title, "", ...paragraphs.map((p) => p.replace(/<[^>]+>/g, "")), ...(link ? ["", link] : []), "", "With thanks,", "The NextGen Fusion team"].join("\n");

export function contactThanks(name: string, email: string): Mail {
  const title = `Thanks for getting in touch, ${esc(first(name))}`;
  const paras = [
    "We've received your message and it's now with the NextGen Fusion team, the people who build and run Fusion Office.",
    "We read every message ourselves and will reply to this email address as soon as we can, usually within one working day.",
    "In the meantime, all our tools are free to use, with no sign-up.",
  ];
  return { to: email, subject: "We've got your message - Fusion Office", html: layout(title, paras, { label: "Open Fusion Office", href: SITE }), text: plain(title, paras, SITE) };
}

export function storyThanks(name: string, email: string): Mail {
  const title = `Thank you for paying it forward, ${esc(first(name))}`;
  const paras = [
    "Your story reached us, and it made our day.",
    "When we built Fusion Office we asked people not to pay us, but to help someone else instead. Knowing that a person somewhere is better off because of you is worth more to us than any contribution.",
    "We'd never share your story or your email address without asking you first.",
  ];
  const link = `${SITE}/pay-it-forward`;
  return { to: email, subject: "Thank you for sharing your story - Fusion Office", html: layout(title, paras, { label: "Read about pay it forward", href: link }), text: plain(title, paras, link) };
}
