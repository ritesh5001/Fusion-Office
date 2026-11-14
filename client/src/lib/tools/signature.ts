/**
 * Digital signatures in PDFs (PKCS#7 / CMS, "adbe.pkcs7.detached"): sign with
 * a certificate file (.pfx / .p12) and check the signatures already in a PDF.
 * Uses node-forge, so it runs in the browser (nothing is uploaded) and in tests.
 *
 * Signing supports RSA keys, which is what certificate files from Indian
 * certifying authorities and most others contain. USB-token DSCs can't be read
 * by a web page; those need the token's own software.
 */
import forge from "node-forge";
import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFNumber, PDFRef, PDFString, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { loadPdf } from "./processors/common";
import { place, type Position } from "./processors/stamp";

const { asn1, pki } = forge;
const OID = {
  data: "1.2.840.113549.1.7.1",
  signedData: "1.2.840.113549.1.7.2",
  contentType: "1.2.840.113549.1.9.3",
  messageDigest: "1.2.840.113549.1.9.4",
  signingTime: "1.2.840.113549.1.9.5",
  sha1: "1.3.14.3.2.26",
  sha256: "2.16.840.1.101.3.4.2.1",
  sha384: "2.16.840.1.101.3.4.2.2",
  sha512: "2.16.840.1.101.3.4.2.3",
};
const DIGESTS: Record<string, { name: string; md: () => forge.md.MessageDigest; subtle: string }> = {
  [OID.sha1]: { name: "SHA-1", md: () => forge.md.sha1.create(), subtle: "SHA-1" },
  [OID.sha256]: { name: "SHA-256", md: () => forge.md.sha256.create(), subtle: "SHA-256" },
  [OID.sha384]: { name: "SHA-384", md: () => forge.md.sha384.create(), subtle: "SHA-384" },
  [OID.sha512]: { name: "SHA-512", md: () => forge.md.sha512.create(), subtle: "SHA-512" },
};

/** Room reserved in the file for the signature (bytes). Enough for a key plus a chain of certificates. */
const SIGNATURE_BYTES = 16_384;
const BYTE_RANGE_PLACEHOLDER = "**********";

const toBinary = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000) as unknown as number[]);
  return s;
};
const fromBinary = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const latin1 = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);

// ─── Certificate files ────────────────────────────────────────────

export interface Identity {
  key: forge.pki.rsa.PrivateKey;
  cert: forge.pki.Certificate;
  chain: forge.pki.Certificate[];
  /** Common name of the certificate's owner. */
  name: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
}

const attr = (c: forge.pki.Certificate["subject"], short: string) => (c.getField(short)?.value as string | undefined) ?? "";

/** Read a .pfx / .p12 file: the private key and its certificate (plus any chain). */
export function readCertificateFile(bytes: Uint8Array, password: string): Identity {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const der = asn1.fromDer(toBinary(bytes), { strict: false } as never);
    p12 = forge.pkcs12.pkcs12FromAsn1(der, false, password);
  } catch (err) {
    const msg = (err as Error).message ?? "";
    if (/mac|password|invalid/i.test(msg) || /decrypt/i.test(msg)) throw new Error("The certificate password is wrong.");
    throw new Error("This isn't a certificate file we can read. Export it as .pfx or .p12 with its private key.");
  }
  const keys = [
    ...(p12.getBags({ bagType: pki.oids.pkcs8ShroudedKeyBag })[pki.oids.pkcs8ShroudedKeyBag] ?? []),
    ...(p12.getBags({ bagType: pki.oids.keyBag })[pki.oids.keyBag] ?? []),
  ];
  const key = keys.find((b) => b.key)?.key as forge.pki.rsa.PrivateKey | undefined;
  if (!key) throw new Error("This certificate file has no private key. Export it again with “include private key” ticked.");
  if (!("n" in key)) throw new Error("Only RSA certificates can sign here. This one uses a different key type.");
  const certs = (p12.getBags({ bagType: pki.oids.certBag })[pki.oids.certBag] ?? []).map((b) => b.cert).filter((c): c is forge.pki.Certificate => !!c);
  // The certificate whose public key belongs to the private key.
  const cert = certs.find((c) => {
    const pub = c.publicKey as forge.pki.rsa.PublicKey;
    return pub?.n && pub.n.equals(key.n);
  });
  if (!cert) throw new Error("No certificate in this file matches its private key.");
  return {
    key,
    cert,
    chain: certs.filter((c) => c !== cert),
    name: attr(cert.subject, "CN") || attr(cert.subject, "O") || "Signer",
    issuer: attr(cert.issuer, "CN") || attr(cert.issuer, "O"),
    validFrom: cert.validity.notBefore,
    validTo: cert.validity.notAfter,
  };
}

// ─── Signing ──────────────────────────────────────────────────────

export interface SignOptions {
  reason: string;
  location: string;
  contact: string;
  /** Draw a signature box on a page, or sign invisibly. */
  visible: { page: number; position: Position } | null;
  /** For tests: a fixed signing time. */
  when?: Date;
}

function drawStamp(page: PDFPage, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, bold: typeof font, id: Identity, o: SignOptions, when: Date) {
  const { width: W, height: H } = page.getSize();
  const lines = [
    `Digitally signed by ${id.name}`,
    `Date: ${when.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}`,
    ...(o.reason.trim() ? [`Reason: ${o.reason.trim()}`] : []),
    ...(o.location.trim() ? [`Location: ${o.location.trim()}`] : []),
  ].map((l) => [...l].filter((ch) => font.getCharacterSet().includes(ch.codePointAt(0)!)).join(""));
  const size = 7.5;
  const w = Math.min(W - 40, Math.max(...lines.map((l, i) => (i ? font : bold).widthOfTextAtSize(l, size))) + 16);
  const h = lines.length * size * 1.35 + 12;
  const { cx, cy } = place(o.visible!.position, W, H, w, h, 24);
  const x = cx - w / 2;
  const top = H - (cy - h / 2);
  page.drawRectangle({ x, y: top - h, width: w, height: h, borderColor: rgb(0.13, 0.45, 0.25), borderWidth: 0.8, color: rgb(0.94, 0.98, 0.95) });
  lines.forEach((l, i) => page.drawText(l, { x: x + 8, y: top - 10 - i * size * 1.35 - size * 0.4, size, font: i ? font : bold, color: rgb(0.1, 0.2, 0.12) }));
  return [x, top - h, x + w, top] as [number, number, number, number];
}

/**
 * Sign a PDF with a certificate. The result carries a standard detached
 * PKCS#7 signature (SHA-256) that Adobe Acrobat and other readers check.
 */
export async function signPdf(pdf: Uint8Array, id: Identity, o: SignOptions): Promise<Uint8Array> {
  const when = o.when ?? new Date();
  if (when < id.validFrom || when > id.validTo) throw new Error(`This certificate is valid from ${id.validFrom.toLocaleDateString("en-GB")} to ${id.validTo.toLocaleDateString("en-GB")}, so it can't sign today.`);
  // Saving rewrites the whole file, which would break signatures already in it.
  if ((await checkSignatures(pdf).catch(() => [])).length) {
    throw new Error("This PDF is already digitally signed. Signing it again here would invalidate that signature; add a second signature in Adobe Acrobat Reader instead.");
  }
  const doc = await loadPdf(pdf);
  const ctx = doc.context;
  const pages = doc.getPages();
  let rect: [number, number, number, number] = [0, 0, 0, 0];
  let page = pages[0];
  if (o.visible) {
    page = pages[Math.max(0, Math.min(pages.length - 1, o.visible.page - 1))];
    rect = drawStamp(page, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold), id, o, when);
  }
  const placeholder = PDFName.of(BYTE_RANGE_PLACEHOLDER);
  const sig = ctx.obj({
    Type: "Sig",
    Filter: "Adobe.PPKLite",
    SubFilter: "adbe.pkcs7.detached",
    ByteRange: [0, placeholder, placeholder, placeholder],
    Contents: PDFHexString.of("0".repeat(SIGNATURE_BYTES * 2)),
    Name: PDFHexString.fromText(id.name),
    M: PDFString.fromDate(when),
    ...(o.reason.trim() ? { Reason: PDFHexString.fromText(o.reason.trim()) } : {}),
    ...(o.location.trim() ? { Location: PDFHexString.fromText(o.location.trim()) } : {}),
    ...(o.contact.trim() ? { ContactInfo: PDFHexString.fromText(o.contact.trim()) } : {}),
  });
  const sigRef = ctx.register(sig);
  // A signature field: name it after how many are already there, so earlier signatures stay.
  const acro = doc.catalog.lookup(PDFName.of("AcroForm"));
  const fields = acro instanceof PDFDict ? acro.lookup(PDFName.of("Fields")) : undefined;
  const count = fields instanceof PDFArray ? fields.size() : 0;
  const widget = ctx.obj({ Type: "Annot", Subtype: "Widget", FT: "Sig", Rect: rect, V: sigRef, T: PDFString.of(`Signature${count + 1}`), F: 132, P: page.ref });
  const widgetRef = ctx.register(widget);
  const annots = page.node.Annots();
  if (annots) annots.push(widgetRef);
  else page.node.set(PDFName.of("Annots"), ctx.obj([widgetRef]));
  if (acro instanceof PDFDict) {
    if (fields instanceof PDFArray) fields.push(widgetRef);
    else acro.set(PDFName.of("Fields"), ctx.obj([widgetRef]));
    acro.set(PDFName.of("SigFlags"), PDFNumber.of(3));
  } else doc.catalog.set(PDFName.of("AcroForm"), ctx.obj({ Fields: [widgetRef], SigFlags: 3 }));

  // Plain objects (no object streams), so the placeholders are findable in the bytes.
  const bytes = await doc.save({ useObjectStreams: false });
  const text = latin1(bytes);
  const brText = `/ByteRange [ 0 /${BYTE_RANGE_PLACEHOLDER} /${BYTE_RANGE_PLACEHOLDER} /${BYTE_RANGE_PLACEHOLDER} ]`;
  const brAt = text.indexOf(brText);
  const hexAt = text.indexOf(`<${"0".repeat(SIGNATURE_BYTES * 2)}>`);
  if (brAt < 0 || hexAt < 0) throw new Error("Couldn't prepare this PDF for signing.");
  const start = hexAt;
  const end = hexAt + SIGNATURE_BYTES * 2 + 2;
  const range = [0, start, end, bytes.length - end];
  const filledRange = `/ByteRange [${range.join(" ")}]`.padEnd(brText.length, " ");
  if (filledRange.length > brText.length) throw new Error("This PDF is too large to sign here.");
  const out = bytes.slice();
  out.set(new TextEncoder().encode(filledRange), brAt);

  // Sign everything except the hex string itself.
  const signed = new Uint8Array(start + (out.length - end));
  signed.set(out.subarray(0, start), 0);
  signed.set(out.subarray(end), start);
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(toBinary(signed));
  p7.addCertificate(id.cert);
  for (const c of id.chain) p7.addCertificate(c);
  p7.addSigner({
    key: id.key,
    certificate: id.cert,
    digestAlgorithm: pki.oids.sha256,
    authenticatedAttributes: [
      { type: pki.oids.contentType, value: pki.oids.data },
      { type: pki.oids.messageDigest },
      { type: pki.oids.signingTime, value: when as unknown as string },
    ],
  });
  p7.sign({ detached: true });
  const der = asn1.toDer(p7.toAsn1()).getBytes();
  const hex = forge.util.bytesToHex(der);
  if (hex.length > SIGNATURE_BYTES * 2) throw new Error("This certificate chain is too large to fit in the signature space.");
  out.set(new TextEncoder().encode(hex.padEnd(SIGNATURE_BYTES * 2, "0")), start + 1);
  return out;
}

// ─── Checking signatures ──────────────────────────────────────────

export interface SignatureReport {
  field: string;
  signer: string;
  organization: string;
  email: string;
  issuer: string;
  /** Signing time claimed in the signature (or the PDF's /M entry). */
  signedAt: Date | null;
  reason: string;
  location: string;
  subFilter: string;
  digest: string;
  /** The document bytes it covers are unchanged and the signature matches the certificate. */
  intact: boolean | null;
  /** Covers the whole file: nothing was added after this signature. */
  coversWholeFile: boolean;
  /** The certificate was within its validity dates when signing. */
  certValidAtSigning: boolean | null;
  certExpired: boolean;
  selfSigned: boolean;
  certificates: number;
  problems: string[];
}

const nodeValue = (n: forge.asn1.Asn1) => n.value as forge.asn1.Asn1[];
const isContext = (n: forge.asn1.Asn1, type: number) => n.tagClass === asn1.Class.CONTEXT_SPECIFIC && n.type === type;
const oidOf = (n: forge.asn1.Asn1) => asn1.derToOid(n.value as string);

/** The signer's attributes from a SignerInfo (contentType, messageDigest, signingTime). */
function signedAttributes(si: forge.asn1.Asn1[]) {
  const node = si.find((n) => isContext(n, 0) && n.constructed);
  if (!node) return null;
  const attrs = new Map<string, forge.asn1.Asn1>();
  for (const a of nodeValue(node)) {
    const [type, values] = nodeValue(a);
    attrs.set(oidOf(type), nodeValue(values)[0]);
  }
  // The signature covers the attributes encoded as a SET (not the [0] tag they're stored under).
  const der = asn1.toDer(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, true, nodeValue(node))).getBytes();
  return { attrs, der };
}

function timeOf(n: forge.asn1.Asn1 | undefined): Date | null {
  if (!n) return null;
  try {
    return n.type === asn1.Type.UTCTIME ? asn1.utcTimeToDate(n.value as string) : asn1.generalizedTimeToDate(n.value as string);
  } catch {
    return null;
  }
}

/** PDF date string D:20261115103000+05'30' → Date. */
function pdfDate(s: string): Date | null {
  const m = s.match(/D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?([Z+-])?(\d{2})?'?(\d{2})?/);
  if (!m) return null;
  const [, y, mo = "01", d = "01", h = "00", mi = "00", se = "00", tz, th = "00", tm = "00"] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${se}${!tz || tz === "Z" ? "Z" : `${tz}${th}:${tm}`}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function digest(algo: string, data: Uint8Array): Promise<string> {
  const d = DIGESTS[algo];
  if (globalThis.crypto?.subtle) return toBinary(new Uint8Array(await crypto.subtle.digest(d.subtle, data as BufferSource)));
  const md = d.md();
  md.update(toBinary(data));
  return md.digest().getBytes();
}

const textOf = (o: unknown) => (o instanceof PDFString || o instanceof PDFHexString ? o.decodeText() : "");

/** Every signature in a PDF, checked: integrity, certificate dates, whether the file changed afterwards. */
export async function checkSignatures(bytes: Uint8Array): Promise<SignatureReport[]> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  // Signature dictionaries hang off signature fields (/V); collect them with their field names.
  const found: { field: string; sig: PDFDict }[] = [];
  const seen = new Set<PDFDict>();
  const visit = (field: PDFDict, prefix: string, depth = 0) => {
    if (depth > 20) return;
    const name = [prefix, textOf(field.lookup(PDFName.of("T")))].filter(Boolean).join(".");
    const v = field.lookup(PDFName.of("V"));
    if (v instanceof PDFDict && v.lookup(PDFName.of("ByteRange")) && !seen.has(v)) {
      seen.add(v);
      found.push({ field: name || `Signature ${found.length + 1}`, sig: v });
    }
    const kids = field.lookup(PDFName.of("Kids"));
    if (kids instanceof PDFArray) for (let i = 0; i < kids.size(); i++) {
      const k = kids.lookup(i);
      if (k instanceof PDFDict) visit(k, name, depth + 1);
    }
  };
  const acro = doc.catalog.lookup(PDFName.of("AcroForm"));
  const fields = acro instanceof PDFDict ? acro.lookup(PDFName.of("Fields")) : undefined;
  if (fields instanceof PDFArray) for (let i = 0; i < fields.size(); i++) {
    const f = fields.lookup(i);
    if (f instanceof PDFDict) visit(f, "");
  }
  // Signature dictionaries not reachable from the form (damaged files): still report them.
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFDict && !seen.has(obj) && obj.lookup(PDFName.of("ByteRange")) && obj.lookup(PDFName.of("Contents")) && (obj.lookup(PDFName.of("Type")) as PDFName | undefined)?.decodeText() !== "DocTimeStamp") {
      seen.add(obj);
      found.push({ field: `Signature ${found.length + 1}`, sig: obj });
    }
  }

  const reports: SignatureReport[] = [];
  for (const { field, sig } of found) {
    const problems: string[] = [];
    const br = sig.lookup(PDFName.of("ByteRange"));
    const range = br instanceof PDFArray ? br.asArray().map((n) => (n instanceof PDFNumber ? n.asNumber() : NaN)) : [];
    const contents = sig.lookup(PDFName.of("Contents"));
    const subFilter = (sig.lookup(PDFName.of("SubFilter")) as PDFName | undefined)?.decodeText() ?? "";
    const report: SignatureReport = {
      field,
      signer: textOf(sig.lookup(PDFName.of("Name"))),
      organization: "",
      email: "",
      issuer: "",
      signedAt: pdfDate(textOf(sig.lookup(PDFName.of("M")))),
      reason: textOf(sig.lookup(PDFName.of("Reason"))),
      location: textOf(sig.lookup(PDFName.of("Location"))),
      subFilter,
      digest: "",
      intact: null,
      coversWholeFile: false,
      certValidAtSigning: null,
      certExpired: false,
      selfSigned: false,
      certificates: 0,
      problems,
    };
    reports.push(report);
    if (range.length !== 4 || range.some((n) => !Number.isInteger(n) || n < 0) || range[1] + range[3] > bytes.length || range[2] + range[3] > bytes.length) {
      problems.push("The signature's byte range is damaged.");
      continue;
    }
    report.coversWholeFile = range[0] === 0 && range[2] + range[3] === bytes.length;
    if (!(contents instanceof PDFHexString || contents instanceof PDFString)) {
      problems.push("The signature data is missing.");
      continue;
    }
    if (!/pkcs7\.detached|ETSI\.CAdES\.detached/i.test(subFilter)) {
      problems.push(`This signature type (${subFilter || "unknown"}) can't be checked here.`);
      continue;
    }
    const signed = new Uint8Array(range[1] + range[3]);
    signed.set(bytes.subarray(range[0], range[0] + range[1]), 0);
    signed.set(bytes.subarray(range[2], range[2] + range[3]), range[1]);
    try {
      const raw = contents instanceof PDFHexString ? contents.asBytes() : contents.asBytes();
      const root = asn1.fromDer(toBinary(raw), { strict: false, parseAllBytes: false } as never);
      const [ct, wrapped] = nodeValue(root);
      if (oidOf(ct) !== OID.signedData) throw new Error("not signed data");
      const sd = nodeValue(nodeValue(wrapped)[0]);
      const certNode = sd.find((n) => isContext(n, 0));
      const certs: forge.pki.Certificate[] = [];
      const certAsn1 = certNode ? nodeValue(certNode) : [];
      report.certificates = certAsn1.length;
      for (const c of certAsn1) {
        try {
          certs.push(pki.certificateFromAsn1(c));
        } catch {
          /* non-RSA certificate: forge can't read its key */
        }
      }
      const signerInfos = nodeValue(sd[sd.length - 1]);
      const si = nodeValue(signerInfos[0]);
      const sid = si[1];
      const digestOid = oidOf(nodeValue(si[2])[0]);
      report.digest = DIGESTS[digestOid]?.name ?? digestOid;
      if (!DIGESTS[digestOid]) throw new Error(`unsupported digest ${digestOid}`);
      const sa = signedAttributes(si);
      const sigValue = si.find((n, i) => i > 2 && n.tagClass === asn1.Class.UNIVERSAL && n.type === asn1.Type.OCTETSTRING);
      // Find the signer's certificate by issuer and serial number.
      let signerCert: forge.pki.Certificate | undefined;
      if (sid.type === asn1.Type.SEQUENCE) {
        const serial = forge.util.bytesToHex(nodeValue(sid)[1].value as string).replace(/^0+/, "");
        signerCert = certs.find((c) => c.serialNumber.replace(/^0+/, "").toLowerCase() === serial.toLowerCase()) ?? certs[0];
      } else signerCert = certs[0];
      if (signerCert) {
        report.signer = attr(signerCert.subject, "CN") || report.signer;
        report.organization = attr(signerCert.subject, "O");
        report.email = (signerCert.subject.getField({ type: "1.2.840.113549.1.9.1" })?.value as string | undefined) ?? "";
        report.issuer = attr(signerCert.issuer, "CN") || attr(signerCert.issuer, "O");
        report.selfSigned = signerCert.issued(signerCert);
        report.certExpired = new Date() > signerCert.validity.notAfter;
      } else problems.push("The signer's certificate uses a key type that can't be checked here (only RSA).");
      const contentDigest = await digest(digestOid, signed);
      let integrity = false;
      if (sa) {
        const md = sa.attrs.get(OID.messageDigest);
        integrity = !!md && (md.value as string) === contentDigest;
        if (!integrity) problems.push("The document was changed after it was signed: its contents don't match the signature.");
        const time = timeOf(sa.attrs.get(OID.signingTime));
        if (time) report.signedAt = time;
        if (signerCert && sigValue && integrity) {
          const m = DIGESTS[digestOid].md();
          m.update(sa.der);
          const ok = (signerCert.publicKey as forge.pki.rsa.PublicKey).verify(m.digest().getBytes(), sigValue.value as string);
          if (!ok) problems.push("The signature doesn't match the certificate inside it.");
          integrity = integrity && ok;
        }
      } else if (signerCert && sigValue) {
        integrity = (signerCert.publicKey as forge.pki.rsa.PublicKey).verify(contentDigest, sigValue.value as string);
        if (!integrity) problems.push("The document was changed after it was signed.");
      }
      report.intact = signerCert || !integrity ? integrity : null;
      if (signerCert && report.signedAt) report.certValidAtSigning = report.signedAt >= signerCert.validity.notBefore && report.signedAt <= signerCert.validity.notAfter;
      if (report.certValidAtSigning === false) problems.push("The certificate wasn't valid on the signing date.");
    } catch (err) {
      if (!problems.length) problems.push(`The signature data couldn't be read (${(err as Error).message}).`);
    }
    if (!report.coversWholeFile && report.intact) problems.push("Something was added to the file after this signature (another signature, form data or edits). The signed version itself is intact.");
  }
  return reports;
}

/** A plain-language report (Markdown). */
export function signatureReportMarkdown(name: string, list: SignatureReport[]): string {
  if (!list.length) return `# Signatures in ${name}\n\nThis PDF has no digital signatures. (A drawn or typed signature on the page is a picture, not a digital signature.)\n`;
  const when = (d: Date | null) => (d ? d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "not stated");
  const out = [`# Signatures in ${name}`, "", `${list.length} digital signature${list.length === 1 ? "" : "s"} found.`, ""];
  for (const s of list) {
    const status = s.intact === true ? (s.coversWholeFile ? "✅ Valid: the document hasn't changed since it was signed." : "✅ Valid for the signed version; later additions were made.") : s.intact === false ? "❌ Not valid: the document was changed after signing." : "⚠️ Couldn't be fully checked.";
    out.push(`## ${s.field}`, "", `**${status}**`, "");
    out.push(`- **Signed by:** ${s.signer || "unknown"}${s.organization ? ` (${s.organization})` : ""}${s.email ? `, ${s.email}` : ""}`);
    out.push(`- **Certificate issued by:** ${s.issuer || "unknown"}${s.selfSigned ? " (self-signed: anyone can make one like it)" : ""}`);
    out.push(`- **Signed on:** ${when(s.signedAt)}`);
    if (s.reason) out.push(`- **Reason:** ${s.reason}`);
    if (s.location) out.push(`- **Location:** ${s.location}`);
    out.push(`- **Certificate valid when signed:** ${s.certValidAtSigning === null ? "unknown" : s.certValidAtSigning ? "yes" : "no"}${s.certExpired ? " (it has expired since)" : ""}`);
    out.push(`- **Type:** ${s.subFilter || "unknown"}${s.digest ? `, ${s.digest}` : ""}`);
    for (const p of s.problems) out.push(`- ⚠️ ${p}`);
    out.push("");
  }
  out.push("_Whether a certificate's issuer is trusted (for example a licensed Indian certifying authority) isn't checked here. Open the PDF in Adobe Acrobat Reader to see trust status._");
  return out.join("\n");
}

/** Unused-reference guard for tree shaking (keeps PDFRef imported for types in some bundlers). */
export type { PDFRef };
