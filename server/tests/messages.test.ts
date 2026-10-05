// Contact form, pay-it-forward stories and the Resend thank-you emails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseContact, parseStory } from "../src/routes/messages.js";
import { contactThanks, sendMail, storyThanks } from "../src/lib/mail.js";

test("parseContact tidies a valid message and requires an email", () => {
  const m = parseContact({ name: "  Priya   S ", email: " Priya@Example.COM ", subject: " Hello ", message: "I'd love a dark mode toggle." });
  assert.deepEqual(m, { kind: "contact", name: "Priya S", email: "priya@example.com", subject: "Hello", message: "I'd love a dark mode toggle." });
  assert.throws(() => parseContact({ name: "A", message: "long enough message" }), /email so we can reply/);
  assert.throws(() => parseContact({ name: "A", email: "not-an-email", message: "long enough message" }), /doesn't look right/);
  assert.throws(() => parseContact({ name: "A", email: "a@b.co", message: "short" }), /a little more/);
  assert.throws(() => parseContact({ name: "A", email: "a@b.co", message: "long enough message", website: "x" }));
});

test("parseStory makes the email optional", () => {
  const s = parseStory({ name: "Kirti", title: "Groceries", story: "I carried an elderly neighbour's groceries home today." });
  assert.equal(s.kind, "story");
  assert.equal(s.email, null);
  assert.equal(s.subject, "Groceries");
  assert.throws(() => parseStory({ name: "Kirti", story: "too short" }), /at least 20/);
});

test("thank-you emails escape names and address the right person", () => {
  const c = contactThanks("<b>Eve</b> Smith", "eve@example.com");
  assert.equal(c.to, "eve@example.com");
  assert.match(c.html, /&lt;b&gt;Eve&lt;\/b&gt;/);
  assert.doesNotMatch(c.html, /<b>Eve/);
  assert.match(storyThanks("Rabina", "r@example.com").text, /Thank you for paying it forward, Rabina/);
});

test("sendMail posts to Resend, and is skipped without a key", async () => {
  const realFetch = globalThis.fetch;
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return Response.json({ id: "email_1" });
  }) as typeof fetch;
  try {
    delete process.env.RESEND_API_KEY;
    assert.equal(await sendMail(contactThanks("A", "a@example.com")), false);
    assert.equal(calls.length, 0);

    process.env.RESEND_API_KEY = "re_test";
    process.env.MAIL_FROM = "Fusion Office <hello@fusionoffice.online>";
    assert.equal(await sendMail(contactThanks("A", "a@example.com")), true);
    assert.equal(calls[0].url, "https://api.resend.com/emails");
    assert.equal((calls[0].init.headers as Record<string, string>).authorization, "Bearer re_test");
    const body = JSON.parse(String(calls[0].init.body));
    assert.deepEqual(body.to, ["a@example.com"]);
    assert.equal(body.from, "Fusion Office <hello@fusionoffice.online>");
    assert.ok(body.html && body.text && body.reply_to);

    globalThis.fetch = (async () => new Response("bad", { status: 422 })) as unknown as typeof fetch;
    assert.equal(await sendMail(contactThanks("A", "a@example.com")), false);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.RESEND_API_KEY;
    delete process.env.MAIL_FROM;
  }
});
