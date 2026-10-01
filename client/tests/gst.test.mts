// GST invoice maths.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkGstin, computeInvoice, gstinCheckChar, indianWords, inr, rupeesInWords } from "../src/lib/tools/gst.ts";

test("GSTIN check character and state", () => {
  assert.equal(gstinCheckChar("27AAPFU0939F1Z"), "V");
  assert.deepEqual(checkGstin("27aapfu0939f1zv"), { ok: true, state: "Maharashtra", stateCode: "27" });
  const typo = checkGstin("27AAPFU0939F1ZW");
  assert.equal(typo.ok, false);
  assert.equal(checkGstin("99AAPFU0939F1ZV").ok, false); // no state 99
  assert.equal(checkGstin("27AAPFU0939").ok, false);
});

const item = (rate: number, qty: number, gstRate: number, discount = 0) => ({ description: "x", hsn: "9987", qty, unit: "Nos", rate, discount, gstRate });

test("same state: CGST + SGST, half the rate each", () => {
  const t = computeInvoice([item(1000, 2, 18), item(500, 1, 5)], "27", "27");
  assert.equal(t.interState, false);
  assert.equal(t.taxable, 2500);
  assert.equal(t.cgst, 192.5); // 180 + 12.5
  assert.equal(t.sgst, 192.5);
  assert.equal(t.igst, 0);
  assert.equal(t.total, 2885);
  assert.deepEqual(t.byRate.map((r) => r.rate), [5, 18]);
});

test("other state: IGST, with discount and round-off", () => {
  const t = computeInvoice([item(999.99, 3, 12, 10)], "27", "29");
  assert.equal(t.interState, true);
  assert.equal(t.taxable, 2699.97);
  assert.equal(t.igst, 324);
  assert.equal(t.cgst + t.sgst, 0);
  assert.equal(t.total, 3024);
  assert.equal(t.roundOff, 0.03);
});

test("empty rows are ignored", () => {
  assert.equal(computeInvoice([item(0, 1, 18), { ...item(100, 1, 18) }].map((x, i) => (i ? x : { ...x, description: "" })), "27", "27").lines.length, 1);
});

test("amounts in Indian words and figures", () => {
  assert.equal(indianWords(123456), "One Lakh Twenty Three Thousand Four Hundred Fifty Six");
  assert.equal(indianWords(10_00_00_000), "Ten Crore");
  assert.equal(indianWords(1_05_000), "One Lakh Five Thousand");
  assert.equal(rupeesInWords(2885.5), "Rupees Two Thousand Eight Hundred Eighty Five and Fifty Paise Only");
  assert.equal(inr(1234567.5), "12,34,567.50");
  assert.equal(inr(999), "999.00");
});

test("invoice PDF has the parties, lines, taxes and total; long lists continue on a new page", async () => {
  const { invoicePdf } = await import("../src/lib/tools/gstPdf.ts");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const party = (name: string, gstin: string, stateCode: string) => ({ name, address: "12 Harbour Road\nMumbai 400001", gstin, stateCode, phone: "", email: "" });
  const data = {
    title: "TAX INVOICE",
    number: "INV-0007",
    date: "02 Oct 2026",
    dueDate: "",
    seller: party("Cleanship Marine", "27AAPFU0939F1ZV", "27"),
    buyer: party("Ocean Star Shipping", "", "29"),
    placeOfSupplyCode: "29",
    reverseCharge: false,
    items: Array.from({ length: 30 }, (_, i) => ({ description: `Hull cleaning — dock ${i + 1} ₹`, hsn: "998719", qty: 1, unit: "Job", rate: 10000, discount: 0, gstRate: 18 })),
    bank: { name: "HDFC Bank", account: "50200012345678", ifsc: "HDFC0001234", branch: "Fort" },
    notes: "Payment within 15 days.",
    signatory: "Ravi Kumar",
  };
  const bytes = await invoicePdf(data);
  const doc = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  assert.ok(doc.numPages >= 2, `${doc.numPages} pages`);
  let all = "";
  for (let i = 1; i <= doc.numPages; i++) all += (await (await doc.getPage(i)).getTextContent()).items.map((x) => ("str" in x ? x.str : "")).join(" ") + "\n";
  for (const s of ["Cleanship Marine", "Ocean Star Shipping", "IGST", "Rs. 3,54,000.00", "Rupees Three Lakh Fifty Four Thousand Only", "INV-0007 (continued)", "Hull cleaning"]) assert.ok(all.includes(s), `missing ${s}`);
  assert.ok(!all.includes("CGST"), "inter-state invoices show IGST only");
});
