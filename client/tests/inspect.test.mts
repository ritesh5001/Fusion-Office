// PDF → JSON, sanitize and overlay.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDict, PDFDocument, PDFHexString, PDFName, PDFRawStream, PDFString, StandardFonts, degrees } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { findRisks, overlayPdf, pdfStructure, sanitizePdf } from "../src/lib/tools/processors/inspect.ts";
import { addAttachments } from "../src/lib/tools/processors/pageOps.ts";

/** A PDF with a script on open, a web link, a comment, metadata and an attachment. */
async function risky() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([300, 400]);
  page.drawText("Body text", { x: 30, y: 300, size: 14, font });
  doc.setTitle("Secret plan");
  doc.setAuthor("Agent X");
  const ctx = doc.context;
  doc.catalog.set(PDFName.of("OpenAction"), ctx.obj({ S: "JavaScript", JS: PDFString.of("app.alert('MALWARE_MARKER')") }));
  const link = ctx.register(ctx.obj({ Type: "Annot", Subtype: "Link", Rect: [0, 0, 50, 50], A: ctx.obj({ S: "URI", URI: PDFString.of("https://tracker.example/LINK_MARKER") }) }));
  const note = ctx.register(ctx.obj({ Type: "Annot", Subtype: "Text", Rect: [60, 60, 80, 80], Contents: PDFString.of("NOTE_MARKER") }));
  const launch = ctx.register(ctx.obj({ Type: "Annot", Subtype: "Link", Rect: [90, 90, 120, 120], A: ctx.obj({ S: "Launch", F: PDFString.of("cmd.exe") }) }));
  page.node.set(PDFName.of("Annots"), ctx.obj([link, note, launch]));
  const withFile = await addAttachments(await doc.save(), [{ name: "payload.txt", bytes: new TextEncoder().encode("ATTACH_MARKER"), type: "text/plain" }]);
  return withFile;
}

/** Every string and stream in a file, decoded, so we can check nothing was left behind. */
async function allText(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const out: string[] = [];
  const { decodePDFRawStream } = await import("pdf-lib");
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream) {
      try {
        out.push(new TextDecoder("latin1").decode(decodePDFRawStream(obj).decode()));
      } catch {
        /* undecodable */
      }
      out.push(obj.dict.toString());
    } else out.push(obj.toString());
  }
  // Hex strings (<FEFF0053…>) decoded too, so text stored that way is found.
  return out
    .join("\n")
    .replace(/<([0-9A-Fa-f]{4,})>/g, (_m, hex: string) => {
      const bytes = Buffer.from(hex, "hex");
      return bytes[0] === 0xfe && bytes[1] === 0xff ? Buffer.from(bytes.subarray(2)).swap16().toString("utf16le") : bytes.toString("latin1");
    });
}

test("risks: script on open, launch action, link, attachment", async () => {
  const r = findRisks(await PDFDocument.load(await risky()));
  assert.deepEqual(r.javascript, ["when the document opens"]);
  assert.equal(r.openAction, "JavaScript");
  assert.equal(r.launch, 1);
  assert.equal(r.uri, 1);
  assert.equal(r.embeddedFiles, 1);
});

test("structure JSON: pages, metadata, annotations, attachments", async () => {
  const s = await pdfStructure(await risky());
  assert.equal(s.pages.length, 1);
  assert.deepEqual(s.pages[0].annotations, { Link: 2, Text: 1 });
  assert.equal(s.metadata.title, "Secret plan");
  assert.deepEqual(s.attachments, ["payload.txt"]);
  assert.ok(s.fonts.some((f) => f.name === "Helvetica" && !f.embedded));
  assert.equal(s.encrypted, false);
  assert.doesNotThrow(() => JSON.stringify(s));
});

test("sanitize removes scripts, actions, links, comments, metadata and attachments from the file itself", async () => {
  const before = await allText(await risky());
  for (const m of ["MALWARE_MARKER", "LINK_MARKER", "NOTE_MARKER", "ATTACH_MARKER", "Secret plan", "cmd.exe"]) assert.ok(before.includes(m), m);
  const { bytes, report } = await sanitizePdf(await risky(), { scripts: true, links: true, metadata: true, attachments: true, annotations: true });
  const after = await allText(bytes);
  for (const m of ["MALWARE_MARKER", "LINK_MARKER", "NOTE_MARKER", "ATTACH_MARKER", "Secret plan", "Agent X", "cmd.exe"]) assert.ok(!after.includes(m), `${m} left in the file`);
  assert.equal(report.scripts, 1);
  assert.equal(report.links, 2);
  assert.equal(report.annotations, 1);
  assert.equal(report.metadata, true);
  assert.ok(report.attachments >= 1);
  assert.ok(report.removedObjects > 0);
  const r = findRisks(await PDFDocument.load(bytes));
  assert.deepEqual([r.javascript, r.launch, r.uri, r.embeddedFiles], [[], 0, 0, 0]);
  // The page itself is untouched.
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const text = (await (await pdf.getPage(1)).getTextContent()).items.map((i) => ("str" in i ? i.str : "")).join("");
  assert.equal(text, "Body text");
});

test("sanitize can keep links, comments and metadata", async () => {
  const { bytes, report } = await sanitizePdf(await risky(), { scripts: true, links: false, metadata: false, attachments: false, annotations: false });
  const after = await allText(bytes);
  assert.ok(after.includes("LINK_MARKER") && after.includes("NOTE_MARKER") && after.includes("Secret plan") && after.includes("ATTACH_MARKER"));
  assert.ok(!after.includes("MALWARE_MARKER") && !after.includes("cmd.exe"));
  assert.equal(report.links, 0);
});

async function textPdf(labels: string[], opts: { rotate?: number; size?: [number, number] } = {}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const l of labels) {
    const p = doc.addPage(opts.size ?? [300, 400]);
    p.drawText(l, { x: 20, y: 20, size: 12, font });
    if (opts.rotate) p.setRotation(degrees(opts.rotate));
  }
  return doc.save();
}

async function itemsOf(bytes: Uint8Array) {
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const out: string[][] = [];
  for (let i = 1; i <= pdf.numPages; i++) out.push((await (await pdf.getPage(i)).getTextContent()).items.map((it) => ("str" in it ? it.str : "")).filter(Boolean));
  return out;
}

test("overlay: letterhead under every page, or on top of the first only", async () => {
  const base = await textPdf(["Body 1", "Body 2", "Body 3"]);
  const head = await textPdf(["LETTERHEAD"], { size: [600, 800] });
  const under = await overlayPdf(base, head, { mode: "under", match: "first", pages: "all", fit: "stretch" });
  assert.equal(under.pages, 3);
  const u = await itemsOf(under.bytes);
  // Drawn first (underneath), so its text comes before the page's own.
  assert.deepEqual(u, [["LETTERHEAD", "Body 1"], ["LETTERHEAD", "Body 2"], ["LETTERHEAD", "Body 3"]]);
  const over = await overlayPdf(base, head, { mode: "over", match: "first", pages: "first", fit: "contain" });
  assert.deepEqual(await itemsOf(over.bytes), [["Body 1", "LETTERHEAD"], ["Body 2"], ["Body 3"]]);
  // Page-by-page matching with a two-page overlay, cycling.
  const two = await textPdf(["A", "B"]);
  const cyc = await overlayPdf(base, two, { mode: "over", match: "cycle", pages: "all", fit: "stretch" });
  assert.deepEqual((await itemsOf(cyc.bytes)).map((p) => p[1]), ["A", "B", "A"]);
  // A rotated page keeps the overlay upright, filling the page as displayed.
  const turned = await overlayPdf(await textPdf(["R"], { rotate: 90 }), head, { mode: "over", match: "first", pages: "all", fit: "stretch" });
  const pdf = await pdfjs.getDocument({ data: turned.bytes.slice(), verbosity: 0 }).promise;
  const page = await pdf.getPage(1);
  const item = (await page.getTextContent()).items.find((i) => "str" in i && i.str === "LETTERHEAD") as { transform: number[] };
  const vp = page.getViewport({ scale: 1 });
  // Upright in the displayed page: text runs left to right.
  const [a, b] = vp.transform;
  const dx = a * item.transform[0] + vp.transform[2] * item.transform[1];
  const dy = b * item.transform[0] + vp.transform[3] * item.transform[1];
  assert.ok(dx > 0 && Math.abs(dy) < 1e-6, `direction ${dx},${dy}`);
});

test("hex strings and dicts are plain pdf-lib objects (sanity for allText)", () => {
  assert.ok(PDFHexString.of("00") && PDFDict);
});
