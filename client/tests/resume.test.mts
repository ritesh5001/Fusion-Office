// Resume builder: PDF and Word output, and the pre-download checks.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { unzipSync } from "fflate";
import { EMPTY_RESUME, resumeChecks, resumeDocx, resumePdf, type Resume } from "../src/lib/tools/resume.ts";

const R: Resume = {
  ...EMPTY_RESUME,
  name: "Asha Verma",
  headline: "Frontend developer",
  email: "asha@example.com",
  phone: "+91 98765 43210",
  location: "Pune, India",
  links: "linkedin.com/in/asha\ngithub.com/asha",
  summary: "Frontend developer with 4 years building fast web apps.",
  jobs: [{ role: "Senior Developer", org: "Acme", location: "Pune", start: "Jun 2023", end: "Present", points: "- Cut page load time by 40%\n- Led a team of 4" }],
  education: [{ degree: "B.Tech, Computer Science", school: "COEP", start: "2016", end: "2020", score: "8.4 CGPA" }],
  projects: [],
  skills: "React, TypeScript, SQL",
  certifications: "AWS Certified Developer",
  languages: "English, Hindi",
};

async function pdfText(bytes: Uint8Array) {
  const doc = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  let t = "";
  for (let i = 1; i <= doc.numPages; i++) t += (await (await doc.getPage(i)).getTextContent()).items.map((x) => ("str" in x ? x.str : "")).join(" ") + "\n";
  return { text: t.replace(/\s+/g, " "), pages: doc.numPages };
}

test("PDF resume in all three looks: sections in order, real text", async () => {
  for (const style of ["classic", "modern", "compact"] as const) {
    const { text, pages } = await pdfText(await resumePdf(R, style));
    assert.equal(pages, 1, style);
    for (const s of ["Asha Verma", "Frontend developer", "asha@example.com", "SUMMARY", "EXPERIENCE", "Senior Developer, Acme", "Jun 2023 - Present", "Cut page load time by 40%", "EDUCATION", "8.4 CGPA", "SKILLS", "React, TypeScript, SQL", "CERTIFICATIONS", "LANGUAGES"]) assert.ok(text.includes(s), `${style}: ${s}`);
    assert.ok(text.indexOf("EXPERIENCE") < text.indexOf("EDUCATION"));
    assert.ok(!text.includes("PROJECTS"), "empty sections are left out");
  }
});

test("long resumes flow onto more pages", async () => {
  const many = { ...R, jobs: Array.from({ length: 12 }, (_, i) => ({ ...R.jobs[0], role: `Role ${i + 1}`, points: Array(5).fill("Delivered a measurable improvement to a large system used by many people every day").join("\n") })) };
  const { pages, text } = await pdfText(await resumePdf(many, "modern"));
  assert.ok(pages >= 2);
  assert.ok(text.includes("Role 12"));
});

test("Word resume has the same content", async () => {
  const docx = await resumeDocx(R, "classic");
  const xml = new TextDecoder().decode(unzipSync(docx)["word/document.xml"]);
  for (const s of ["Asha Verma", "EXPERIENCE", "Senior Developer, Acme", "Cut page load time by 40%", "React, TypeScript, SQL"]) assert.ok(xml.includes(s), s);
});

test("checks point at what's missing", () => {
  assert.deepEqual(resumeChecks(R), []);
  const c = resumeChecks({ ...EMPTY_RESUME, email: "bad" }).map((x) => x.text).join(" | ");
  assert.match(c, /Add your name/);
  assert.match(c, /email address doesn't look right/);
  assert.match(c, /List your key skills/);
  assert.match(resumeChecks({ ...R, jobs: [{ ...R.jobs[0], points: "Did things\nMore things\nOther things" }] }).map((x) => x.text).join(" "), /Add numbers/);
});

test("Markdown → Word keeps headings, emphasis, lists, tables and links", async () => {
  const { markdownToDocx } = await import("../src/lib/tools/markdownDocx.ts");
  const docx = await markdownToDocx("# Title\n\nSome **bold** and _italic_ with a [link](https://example.com).\n\n- one\n  - nested\n1. first\n\n| A | B |\n| --- | --- |\n| x | y |\n\n> quoted\n\n```\ncode line\n```\n");
  const files = unzipSync(docx);
  const xml = new TextDecoder().decode(files["word/document.xml"]);
  for (const s of ["Title", "bold", "italic", "link", "one", "nested", "first", "quoted", "code line", "<w:tbl>"]) assert.ok(xml.includes(s), s);
  assert.match(xml, /<w:pStyle w:val="Heading1"\/>/);
  assert.match(xml, /<w:b\/>/);
  assert.match(new TextDecoder().decode(files["word/_rels/document.xml.rels"]), /https:\/\/example\.com/);
});

test("QR payloads: UPI keeps the @, Wi-Fi escapes, links get https", async () => {
  const { qrPayload } = await import("../src/lib/tools/qr.ts");
  const base = { url: "", text: "", upiId: "", upiName: "", upiAmount: "", upiNote: "", ssid: "", wifiPassword: "", security: "WPA" as const, name: "", org: "", phone: "", email: "", website: "", subject: "" };
  assert.equal(qrPayload({ ...base, kind: "upi", upiId: " shop@okaxis ", upiName: "Acme Store", upiAmount: "250" }), "upi://pay?pa=shop@okaxis&pn=Acme%20Store&am=250.00&cu=INR");
  assert.equal(qrPayload({ ...base, kind: "wifi", ssid: "Home;Net", wifiPassword: 'p"w' }), String.raw`WIFI:T:WPA;S:Home\;Net;P:p\"w;;`);
  assert.equal(qrPayload({ ...base, kind: "url", url: "example.com/menu" }), "https://example.com/menu");
  assert.equal(qrPayload({ ...base, kind: "upi" }), "");
});
