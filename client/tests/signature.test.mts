// PDF digital signatures: sign with a .p12 certificate, check our own and
// tampered signatures, and confirm the result with OpenSSL when it's installed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import forge from "node-forge";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { checkSignatures, readCertificateFile, signPdf, signatureReportMarkdown } from "../src/lib/tools/signature.ts";

/** A throwaway RSA certificate in a password-protected .p12, like one exported from a DSC. */
function makeP12(password: string, cn = "Asha Verma", from = new Date(Date.now() - 86_400_000), to = new Date(Date.now() + 365 * 86_400_000)) {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "0a1b2c3d";
  cert.validity.notBefore = from;
  cert.validity.notAfter = to;
  const attrs = [{ shortName: "CN", value: cn }, { shortName: "O", value: "Fusion Test Org" }, { shortName: "C", value: "IN" }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const p12 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, { algorithm: "3des" });
  return Uint8Array.from(forge.asn1.toDer(p12).getBytes(), (c) => c.charCodeAt(0));
}

async function makePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.addPage([400, 400]).drawText("Agreement, page 1", { x: 40, y: 340, size: 14, font });
  doc.addPage([400, 400]).drawText("Page 2", { x: 40, y: 340, size: 14, font });
  return doc.save();
}

const p12 = makeP12("s3cret");

test("certificate files: right password opens them, wrong password is reported", () => {
  const id = readCertificateFile(p12, "s3cret");
  assert.equal(id.name, "Asha Verma");
  assert.equal(id.issuer, "Asha Verma");
  assert.throws(() => readCertificateFile(p12, "wrong"), /password is wrong/);
  assert.throws(() => readCertificateFile(new Uint8Array([1, 2, 3, 4]), "x"), /certificate file/);
});

test("sign, then check: intact, whole file covered, signer and reason read back", async () => {
  const id = readCertificateFile(p12, "s3cret");
  const signed = await signPdf(await makePdf(), id, { reason: "Approved", location: "Pune", contact: "", visible: { page: 2, position: "bottom-right" } });
  const [s, ...rest] = await checkSignatures(signed);
  assert.equal(rest.length, 0);
  assert.equal(s.intact, true, s.problems.join("; "));
  assert.equal(s.coversWholeFile, true);
  assert.equal(s.signer, "Asha Verma");
  assert.equal(s.organization, "Fusion Test Org");
  assert.equal(s.reason, "Approved");
  assert.equal(s.location, "Pune");
  assert.equal(s.digest, "SHA-256");
  assert.equal(s.selfSigned, true);
  assert.equal(s.certValidAtSigning, true);
  assert.deepEqual(s.problems, []);
  // The visible stamp is on page 2 and the PDF still opens.
  const doc = await PDFDocument.load(signed);
  assert.equal(doc.getPageCount(), 2);
  assert.match(signatureReportMarkdown("a.pdf", [s]), /Valid: the document hasn't changed/);
});

test("a changed byte breaks the signature, and later additions are reported", async () => {
  const id = readCertificateFile(p12, "s3cret");
  const signed = await signPdf(await makePdf(), id, { reason: "", location: "", contact: "", visible: null });
  const text = new TextDecoder("latin1").decode(signed);
  const at = text.indexOf("Agreement") >= 0 ? text.indexOf("Agreement") : 200;
  const tampered = signed.slice();
  tampered[Math.min(at, 300)] ^= 0x01;
  const [bad] = await checkSignatures(tampered);
  assert.equal(bad.intact, false);
  assert.match(bad.problems.join(" "), /changed after it was signed/);
  // An incremental update appended after signing.
  const appended = new Uint8Array([...signed, ...new TextEncoder().encode("\n% later edit\n")]);
  const [later] = await checkSignatures(appended);
  assert.equal(later.intact, true);
  assert.equal(later.coversWholeFile, false);
  // Signing again would rewrite the file and break the first signature, so it's refused.
  await assert.rejects(signPdf(signed, id, { reason: "Counter-signed", location: "", contact: "", visible: null }), /already digitally signed/);
});

test("expired certificates can't sign; unsigned PDFs report none", async () => {
  const old = readCertificateFile(makeP12("x", "Old", new Date("2020-01-01"), new Date("2021-01-01")), "x");
  await assert.rejects(signPdf(await makePdf(), old, { reason: "", location: "", contact: "", visible: null }), /valid from/);
  assert.deepEqual(await checkSignatures(await makePdf()), []);
  assert.match(signatureReportMarkdown("plain.pdf", []), /no digital signatures/);
});

const hasOpenssl = spawnSync("openssl", ["version"]).status === 0;
test("OpenSSL accepts the signature over the signed byte ranges", { skip: !hasOpenssl && "openssl not installed" }, async () => {
  const id = readCertificateFile(p12, "s3cret");
  const signed = await signPdf(await makePdf(), id, { reason: "Check", location: "", contact: "", visible: null });
  const text = new TextDecoder("latin1").decode(signed);
  const m = text.match(/\/ByteRange \[(\d+) (\d+) (\d+) (\d+)\s*\]/)!;
  const [a, b, c, d] = m.slice(1).map(Number);
  const dir = mkdtempSync(`${tmpdir()}/fo-sig-`);
  try {
    writeFileSync(`${dir}/content.bin`, Buffer.concat([Buffer.from(signed.subarray(a, a + b)), Buffer.from(signed.subarray(c, c + d))]));
    const hex = text.slice(b + 1, c - 1).replace(/(00)+$/, "");
    writeFileSync(`${dir}/sig.der`, Buffer.from(hex.length % 2 ? `${hex}0` : hex, "hex"));
    const r = spawnSync("openssl", ["cms", "-verify", "-binary", "-inform", "DER", "-in", `${dir}/sig.der`, "-content", `${dir}/content.bin`, "-noverify", "-out", "/dev/null"]);
    assert.equal(r.status, 0, r.stderr.toString());
    assert.match(r.stderr.toString(), /Verification successful/);
    // And fails on changed content.
    const content = readFileSync(`${dir}/content.bin`);
    content[100] ^= 1;
    writeFileSync(`${dir}/content.bin`, content);
    const bad = spawnSync("openssl", ["cms", "-verify", "-binary", "-inform", "DER", "-in", `${dir}/sig.der`, "-content", `${dir}/content.bin`, "-noverify", "-out", "/dev/null"]);
    assert.notEqual(bad.status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
