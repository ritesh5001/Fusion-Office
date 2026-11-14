// Email files → printable HTML.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanMailHtml, decodeWords, mailToHtml, parseEml } from "../src/lib/tools/mail.ts";

const enc = (s: string) => new TextEncoder().encode(s);
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

const EML = [
  "From: =?UTF-8?B?" + b64("आशा वर्मा") + "?= <asha@example.com>",
  "To: Ravi <ravi@example.com>",
  "Subject: =?UTF-8?Q?Invoice_=E2=82=B9_1,180?= for",
  " October",
  "Date: Thu, 12 Nov 2026 10:15:00 +0530",
  "MIME-Version: 1.0",
  'Content-Type: multipart/mixed; boundary="mix"',
  "",
  "preamble",
  "--mix",
  'Content-Type: multipart/related; boundary="rel"',
  "",
  "--rel",
  'Content-Type: multipart/alternative; boundary="alt"',
  "",
  "--alt",
  "Content-Type: text/plain; charset=utf-8",
  "Content-Transfer-Encoding: quoted-printable",
  "",
  "Hello Ravi, total =E2=82=B9 1,180.",
  "--alt",
  "Content-Type: text/html; charset=utf-8",
  "Content-Transfer-Encoding: base64",
  "",
  b64('<html><body onload="evil()"><p>Hello <b>Ravi</b></p><img src="cid:logo@x"><img src="https://tracker.example/p.gif" alt="pixel"><script>alert(1)</script><a href="javascript:steal()">x</a></body></html>'),
  "--alt--",
  "--rel",
  "Content-Type: image/png",
  "Content-ID: <logo@x>",
  "Content-Transfer-Encoding: base64",
  "",
  "iVBORw0KGgo=",
  "--rel--",
  "--mix",
  'Content-Type: application/pdf; name="bill.pdf"',
  "Content-Disposition: attachment; filename*=UTF-8''%E0%A4%AC%E0%A4%BF%E0%A4%B2.pdf",
  "Content-Transfer-Encoding: base64",
  "",
  "JVBERi0xLjQK",
  "--mix--",
  "",
].join("\r\n");

test("headers: encoded words in UTF-8, base64 and quoted-printable, folded lines", () => {
  assert.equal(decodeWords("=?UTF-8?B?" + b64("नमस्ते") + "?= there"), "नमस्ते there");
  assert.equal(decodeWords("=?iso-8859-1?Q?Caf=E9?="), "Café");
  const m = parseEml(enc(EML));
  assert.equal(m.from, "आशा वर्मा <asha@example.com>");
  assert.equal(m.subject, "Invoice ₹ 1,180 for October");
  assert.equal(m.to, "Ravi <ravi@example.com>");
});

test("bodies and attachments are found through nested multiparts", () => {
  const m = parseEml(enc(EML));
  assert.match(m.text!, /total ₹ 1,180/);
  assert.match(m.html!, /Hello <b>Ravi<\/b>/);
  assert.deepEqual(m.attachments.map((a) => [a.name, a.type, a.inline]), [["attachment-1", "image/png", true], ["बिल.pdf", "application/pdf", false]]);
  assert.equal(new TextDecoder().decode(m.attachments[1].bytes), "%PDF-1.4\n");
  assert.throws(() => parseEml(enc("just some text with no headers")), /doesn't look like an email/);
});

test("cleaning: no scripts, handlers or remote pictures; inline pictures embedded", () => {
  const m = parseEml(enc(EML));
  const { html, blocked } = cleanMailHtml(m.html!, m.attachments);
  assert.doesNotMatch(html, /<script|onload|javascript:|tracker\.example/i);
  assert.match(html, /src="data:image\/png;base64,iVBORw0KGgo="/);
  assert.match(html, /\[pixel\]/);
  assert.equal(blocked, 1);
  const doc = mailToHtml(m, { appendImages: true });
  assert.match(doc.html, /<h1>Invoice ₹ 1,180 for October<\/h1>/);
  assert.match(doc.html, /Attachments \(1\)/); // the inline logo isn't listed again
  assert.match(doc.html, /बिल\.pdf/);
});

test("plain-text emails keep their lines and make links clickable", () => {
  const m = parseEml(enc("From: a@b.c\r\nSubject: Hi\r\n\r\nLine one\r\nSee https://example.com/x <ok>\r\n"));
  const { html } = mailToHtml(m, { appendImages: false });
  assert.match(html, /Line one<br>See <a href="https:\/\/example\.com\/x">https:\/\/example\.com\/x<\/a> &lt;ok&gt;/);
});
