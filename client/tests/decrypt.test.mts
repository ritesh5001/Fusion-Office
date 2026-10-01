// Protected forms (owner password only) must keep their content when their
// pages are copied into an export; before the fix they came out blank.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocument as Cantoo, StandardFonts } from "@cantoo/pdf-lib";
import { PDFDocument } from "pdf-lib";
import { loadSourcePdf } from "../src/lib/pdf/decrypt.ts";

async function text(bytes: Uint8Array) {
  const doc = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  return (await (await doc.getPage(1)).getTextContent()).items.map((i) => ("str" in i ? i.str : "")).join(" ");
}

async function protectedForm(userPassword: string) {
  const doc = await Cantoo.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.addPage([300, 300]).drawText("SERVICE REQUEST FORM", { x: 20, y: 200, size: 14, font });
  doc.encrypt({ userPassword, ownerPassword: "owner-secret", permissions: { modifying: false } });
  return doc.save();
}

async function copyFirstPage(src: PDFDocument) {
  const out = await PDFDocument.create();
  const [page] = await out.copyPages(src, [0]);
  out.addPage(page);
  return out.save();
}

test("a form that opens without a password keeps its text when its pages are copied", async () => {
  const bytes = await protectedForm("");
  assert.equal(await text(bytes), "SERVICE REQUEST FORM"); // what the editor shows
  const blank = await copyFirstPage(await PDFDocument.load(bytes, { ignoreEncryption: true }));
  assert.equal((await text(blank)).trim(), ""); // the old behaviour: content lost
  const copied = await copyFirstPage(await loadSourcePdf(bytes));
  assert.equal(await text(copied), "SERVICE REQUEST FORM");
});

test("a file that needs a password to open gets a clear error", async () => {
  const bytes = await protectedForm("open-sesame");
  await assert.rejects(loadSourcePdf(bytes), /password/i);
});

test("ordinary PDFs load unchanged", async () => {
  const doc = await PDFDocument.create();
  doc.addPage([100, 100]);
  const loaded = await loadSourcePdf(await doc.save());
  assert.equal(loaded.getPageCount(), 1);
  assert.equal(loaded.isEncrypted, false);
});
