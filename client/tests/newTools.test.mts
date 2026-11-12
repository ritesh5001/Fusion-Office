// Scan clean-up maths, background removal, photo presets, receipts and bank statements.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { contentBox, estimateSkew, fitRaster, inkRatio, isBlankPage, rotationAbout, type Gray } from "../src/lib/tools/scanMath.ts";
import { borderColour, removeBackground } from "../src/lib/image/matte.ts";
import { EXAM_PRESETS, cropFor, idCardPdf, padJpeg, photoSheetPdf, sheetLayout, specSize } from "../src/lib/tools/photoPresets.ts";
import { rentNeedsPan, rentNeedsStamp, rentPeriods, rentReceiptsPdf, salarySlipPdf, salaryTotals } from "../src/lib/tools/receipts.ts";
import { headerRoles, parseAmount, parseDate, parseStatement, statementRows } from "../src/lib/tools/bankStatement.ts";
import { invoicePdf } from "../src/lib/tools/gstPdf.ts";

async function pdfText(bytes: Uint8Array) {
  const doc = await pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) out.push((await (await doc.getPage(i)).getTextContent()).items.map((it) => ("str" in it ? it.str : "")).join(" ").replace(/\s+/g, " "));
  return out;
}

/** A white page with dark text-like bars, optionally tilted by `deg` (clockwise on screen). */
function page(width: number, height: number, deg = 0, paper = 255): Gray {
  const data = new Uint8Array(width * height).fill(paper);
  const tan = Math.tan((deg * Math.PI) / 180);
  for (let line = 0; line < 14; line++) {
    const y0 = 90 + line * 26;
    for (let x = 60; x < width - 60; x++) {
      if ((x + line * 13) % 47 < 6) continue; // gaps between "words"
      const y = Math.round(y0 + (x - width / 2) * tan);
      for (let t = 0; t < 7; t++) if (y + t >= 0 && y + t < height) data[(y + t) * width + x] = 25;
    }
  }
  return { data, width, height };
}

test("blank pages: empty paper is blank, a page of text is not, specks are ignored", () => {
  const empty: Gray = { data: new Uint8Array(400 * 500).fill(250), width: 400, height: 500 };
  assert.equal(isBlankPage(empty), true);
  const grey: Gray = { data: new Uint8Array(400 * 500).fill(205), width: 400, height: 500 }; // yellowed scan
  assert.equal(isBlankPage(grey), true);
  assert.equal(isBlankPage(page(400, 500)), false);
  const dust = { ...empty, data: empty.data.slice() };
  for (let i = 0; i < 40; i++) dust.data[150 * 400 + 100 + i * 3] = 0;
  assert.equal(isBlankPage(dust), true);
  assert.equal(isBlankPage(dust, "strict"), true);
  assert.ok(inkRatio(page(400, 500)) > 0.05);
});

test("content box hugs the text and ignores dust", () => {
  const g = page(400, 500);
  g.data[5 * 400 + 5] = 0; // a speck in the corner
  const b = contentBox(g)!;
  assert.ok(Math.abs(b.x - 60 / 400) < 0.02 && Math.abs(b.y - 90 / 500) < 0.02, JSON.stringify(b));
  assert.ok(Math.abs(b.x + b.w - 340 / 400) < 0.02);
  assert.equal(contentBox({ data: new Uint8Array(100).fill(255), width: 10, height: 10 }), null);
});

test("skew: the tilt of a scan is measured, straight pages are left at zero", () => {
  assert.equal(estimateSkew(page(700, 600, 0)), 0);
  for (const deg of [3, -4.5, 1.2, -0.8]) {
    const got = estimateSkew(page(700, 600, deg));
    assert.ok(Math.abs(got - deg) <= 0.25, `tilted ${deg}°, measured ${got}°`);
  }
  assert.equal(estimateSkew({ data: new Uint8Array(300 * 300).fill(255), width: 300, height: 300 }), 0);
});

test("rotation matrix turns about the centre of the page", () => {
  const m = rotationAbout(90, { x: 0, y: 0, width: 200, height: 100 });
  const at = (x: number, y: number) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]].map((v) => Math.round(v * 1000) / 1000);
  assert.deepEqual(at(100, 50), [100, 50]); // the centre stays put
  assert.deepEqual(at(200, 50), [100, 150]); // right edge goes up: counter-clockwise
});

test("fit under a size: sharpest setting that fits, and an honest 'doesn't fit'", async () => {
  // Size grows with resolution squared and with quality.
  const measure = async (dpi: number, q: number) => Math.round((dpi / 100) ** 2 * (0.3 + q) * 100_000);
  const a = await fitRaster(1_000_000, measure);
  assert.deepEqual([a.dpi, a.quality, a.fits], [150, 0.85, true]);
  const b = await fitRaster(120_000, measure);
  assert.equal(b.fits, true);
  // 150 DPI is too big even at the lowest quality; 120 DPI fits, at the best quality that still does.
  assert.ok(b.size <= 120_000 && b.dpi === 120, JSON.stringify(b));
  assert.ok(b.quality > 0.5 && (await measure(120, b.quality + 0.04)) > 120_000, "should use the best quality that fits");
  const c = await fitRaster(500, measure);
  assert.deepEqual([c.fits, c.dpi], [false, 40]);
});

/** A w×h picture: `bg` everywhere, a `fg` disc in the middle. */
function disc(w: number, h: number, bg: number[], fg: number[]) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const inside = Math.hypot(x - w / 2, y - h / 2) < w * 0.3;
      px.set([...(inside ? fg : bg), 255], (y * w + x) * 4);
    }
  return px;
}

test("background removal: plain backdrop goes, the subject and its enclosed whites stay", () => {
  const w = 80;
  const h = 80;
  const px = disc(w, h, [250, 250, 248], [200, 30, 40]);
  // A white button inside the red disc must survive: it isn't connected to the border.
  for (let y = 38; y < 42; y++) for (let x = 38; x < 42; x++) px.set([250, 250, 248, 255], (y * w + x) * 4);
  assert.deepEqual(borderColour(px, w, h), [250, 250, 248]);
  const m = removeBackground(px, w, h, { tolerance: 30, feather: 0 });
  assert.equal(m.alpha[0], 0);
  assert.equal(m.alpha[w * h - 1], 0);
  assert.equal(m.alpha[30 * w + 40], 255); // disc
  assert.equal(m.alpha[40 * w + 40], 255); // enclosed white
  assert.ok(m.removed > 0.6 && m.removed < 0.8, String(m.removed));
  // Soft shadows and uneven light are followed as background…
  const lit = disc(w, h, [0, 0, 0], [200, 30, 40]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.hypot(x - w / 2, y - h / 2) >= w * 0.3) lit.set([225 + Math.round(x / 4), 225 + Math.round(x / 4), 225, 255], (y * w + x) * 4);
  const lm = removeBackground(lit, w, h, { tolerance: 20, feather: 1 });
  assert.equal(lm.alpha[0], 0);
  assert.equal(lm.alpha[w - 1], 0);
  assert.equal(lm.alpha[40 * w + 40], 255);
  // …but a strict setting keeps a subject that is only slightly different.
  const faint = removeBackground(disc(w, h, [250, 250, 250], [225, 225, 225]), w, h, { tolerance: 5, feather: 0 });
  assert.equal(faint.alpha[40 * w + 40], 255);
});

test("photo presets are complete and sized sensibly", () => {
  assert.equal(new Set(EXAM_PRESETS.map((e) => e.id)).size, EXAM_PRESETS.length);
  for (const e of EXAM_PRESETS) {
    assert.ok(e.items.length, e.id);
    for (const it of e.items) {
      assert.ok(it.maxKB > (it.minKB ?? 0), `${e.id} ${it.kind}`);
      assert.ok((it.width > 0 && it.height > 0) || it.maxSide, `${e.id} ${it.kind} needs a size`);
    }
  }
  const ibps = EXAM_PRESETS.find((e) => e.id === "ibps")!;
  assert.deepEqual(ibps.items.map((i) => [i.width, i.height, i.minKB, i.maxKB]), [[200, 230, 20, 50], [140, 60, 10, 20], [240, 240, 20, 50], [800, 400, 50, 100]]);
  assert.deepEqual(specSize({ width: 200, height: 230 }, { width: 3000, height: 4000 }), { width: 200, height: 230 });
  assert.deepEqual(specSize({ width: 0, height: 0, maxSide: 1000 }, { width: 3000, height: 4000 }), { width: 750, height: 1000 });
  assert.deepEqual(specSize({ width: 0, height: 0, maxSide: 1000 }, { width: 400, height: 300 }), { width: 400, height: 300 });
});

test("crop for a frame: centred by default, pans to the edges, zooms in", () => {
  const src = { width: 4000, height: 3000 };
  const c = cropFor(src, 35 / 45);
  assert.ok(Math.abs(c.h - 1) < 1e-9 && Math.abs((c.w * 4000) / (c.h * 3000) - 35 / 45) < 1e-9);
  assert.ok(Math.abs(c.x - (1 - c.w) / 2) < 1e-9);
  assert.equal(cropFor(src, 35 / 45, 1, -1).x, 0);
  assert.ok(Math.abs(cropFor(src, 35 / 45, 1, 1).x - (1 - c.w)) < 1e-9);
  const z = cropFor(src, 35 / 45, 2);
  assert.ok(Math.abs(z.w - c.w / 2) < 1e-9 && Math.abs(z.y - 0.25) < 1e-9);
});

test("JPEG padding reaches a minimum size without touching the picture", () => {
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46, 0xff, 0xdb, 1, 2, 3, 0xff, 0xd9]);
  const out = padJpeg(jpg, 10 * 1024);
  assert.ok(out.length >= 10 * 1024 && out.length <= 10 * 1024 + 4);
  assert.deepEqual([...out.subarray(0, 8)], [...jpg.subarray(0, 8)]); // header block stays first
  assert.deepEqual([out[8], out[9]], [0xff, 0xfe]); // then the comment
  assert.deepEqual([...out.subarray(out.length - 7)], [...jpg.subarray(8)]);
  assert.equal(padJpeg(jpg, 5), jpg);
  assert.ok(padJpeg(jpg, 200_000).length >= 200_000); // more than one comment block
  const png = new Uint8Array([137, 80, 78, 71]);
  assert.equal(padJpeg(png, 1000), png);
});

// Smallest valid baseline JPEG (1×1, grey).
const TINY_JPG = Uint8Array.from(atob("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k="), (c) => c.charCodeAt(0));

test("print sheets: as many photos as fit, centred; ID cards at true size on A4", async () => {
  const slots = sheetLayout({ width: 100, height: 60 }, { width: 20, height: 20 }, 5, 5);
  assert.equal(slots.length, 6); // 3 across (20+5+20+5+20 = 70 ≤ 90), 2 down
  assert.deepEqual([slots[0].x, slots[0].y], [15, 7.5]);
  assert.equal(sheetLayout({ width: 100, height: 60 }, { width: 20, height: 20 }, 5, 5, 4).length, 4);
  assert.deepEqual(sheetLayout({ width: 10, height: 10 }, { width: 20, height: 20 }, 0, 0), []);
  const sheet = await photoSheetPdf(TINY_JPG, { width: 35, height: 45 }, 8);
  assert.equal(sheet.count, 8);
  const max = await photoSheetPdf(TINY_JPG, { width: 35, height: 45 }, 999);
  assert.equal(max.count, 25); // 5 × 5 on A4
  const id = await PDFDocument.load(await idCardPdf([{ bytes: TINY_JPG, kind: "jpg" }, { bytes: TINY_JPG, kind: "jpg" }], { size: "card", border: true, caption: "Self-attested" }));
  assert.equal(id.getPageCount(), 1);
  assert.deepEqual(id.getPage(0).getSize(), { width: 595.28, height: 841.89 });
  const many = await PDFDocument.load(await idCardPdf(Array(5).fill({ bytes: TINY_JPG, kind: "jpg" }), { size: "large", border: false, caption: "" }));
  assert.equal(many.getPageCount(), 3); // two large cards per page
  await assert.rejects(() => idCardPdf([], { size: "card", border: true, caption: "" }), /front/);
});

test("rent receipts: one per month across a year end, with PAN and stamp rules", async () => {
  assert.deepEqual(rentPeriods("2026-11", 3).map((p) => [p.label, p.end]), [["November 2026", "30 Nov 2026"], ["December 2026", "31 Dec 2026"], ["January 2027", "31 Jan 2027"]]);
  assert.equal(rentPeriods("2028-02", 1)[0].end, "29 Feb 2028");
  assert.equal(rentNeedsPan(8333), false);
  assert.equal(rentNeedsPan(8334), true);
  assert.equal(rentNeedsStamp({ rent: 5000, mode: "Cash" }), false);
  assert.equal(rentNeedsStamp({ rent: 5001, mode: "Cash" }), true);
  assert.equal(rentNeedsStamp({ rent: 50000, mode: "UPI" }), false);
  const data = { tenant: "Asha Verma", landlord: "R. K. Sharma", landlordPan: "abcde1234f", address: "12 MG Road\nPune", rent: 18500, from: "2026-04", months: 4, mode: "Cash" as const, place: "Pune" };
  const r = await rentReceiptsPdf(data);
  assert.deepEqual([r.receipts, r.total], [4, 74000]);
  const pages = await pdfText(r.bytes);
  assert.equal(pages.length, 2); // three to a page
  assert.match(pages[0], /Asha Verma/);
  assert.match(pages[0], /Rs\. 18,500\.00 \(Rupees Eighteen Thousand Five Hundred Only\)/);
  assert.match(pages[0], /April 2026/);
  assert.match(pages[0], /ABCDE1234F/);
  assert.match(pages[0], /Revenue/);
  assert.match(pages[1], /July 2026/);
  await assert.rejects(() => rentReceiptsPdf({ ...data, rent: 0 }), /monthly rent/);
  await assert.rejects(() => rentReceiptsPdf({ ...data, tenant: " " }), /names/);
});

test("salary slip: totals, net pay in words, and refusals", async () => {
  const d = {
    company: "Nextgen Fusion Pvt Ltd", companyAddress: "Pune, Maharashtra", month: "2026-10", employee: "Ravi Kumar", employeeId: "E-104", designation: "Engineer", department: "", pan: "abcde1234f", uan: "", bankAccount: "XXXX1234", joined: "", paidDays: 31, lopDays: 0,
    earnings: [{ label: "Basic", amount: 30000 }, { label: "HRA", amount: 12000 }, { label: "", amount: 500 }, { label: "Bonus", amount: 0 }],
    deductions: [{ label: "Provident fund", amount: 3600 }, { label: "Professional tax", amount: 200 }],
  };
  assert.deepEqual(salaryTotals(d), { gross: 42000, deductions: 3800, net: 38200 });
  const [text] = await pdfText(await salarySlipPdf(d));
  assert.match(text, /Salary slip for October 2026/);
  assert.match(text, /Ravi Kumar/);
  assert.match(text, /38,200\.00/);
  assert.match(text, /Rupees Thirty Eight Thousand Two Hundred Only/);
  assert.match(text, /ABCDE1234F/);
  assert.doesNotMatch(text, /Bonus|Department/); // empty lines are left out
  await assert.rejects(() => salarySlipPdf({ ...d, deductions: [{ label: "Loan", amount: 99999 }] }), /more than/);
  await assert.rejects(() => salarySlipPdf({ ...d, earnings: [] }), /earning/);
});

test("quotation and delivery challan reuse the invoice with their own wording", async () => {
  const party = { name: "Acme", address: "Pune", gstin: "", stateCode: "27", phone: "", email: "" };
  const base = { title: "", number: "QTN-0007", date: "12 Nov 2026", dueDate: "27 Nov 2026", seller: party, buyer: { ...party, name: "Buyer Co" }, placeOfSupplyCode: "27", reverseCharge: false, items: [{ description: "Chairs", hsn: "9401", qty: 2, unit: "Nos", rate: 1000, discount: 0, gstRate: 18 }], bank: { name: "", account: "", ifsc: "", branch: "" }, notes: "", signatory: "" };
  const [q] = await pdfText(await invoicePdf({ ...base, kind: "quotation" }));
  assert.match(q, /QUOTATION/);
  assert.match(q, /Quotation no\./);
  assert.match(q, /Valid until/);
  assert.match(q, /not a tax invoice/);
  assert.doesNotMatch(q, /Reverse charge|Invoice no\./);
  const [c] = await pdfText(await invoicePdf({ ...base, kind: "challan", extra: [["Vehicle no.", "MH12AB1234"], ["Transporter", ""]] }));
  assert.match(c, /DELIVERY CHALLAN/);
  assert.match(c, /CONSIGNEE/);
  assert.match(c, /MH12AB1234/);
  assert.doesNotMatch(c, /Transporter/);
  const [inv] = await pdfText(await invoicePdf(base));
  assert.match(inv, /TAX INVOICE/);
  assert.match(inv, /Reverse charge/);
});

test("statement dates and amounts in the forms banks print", () => {
  assert.equal(parseDate("01/04/2026"), "2026-04-01");
  assert.equal(parseDate("1-4-26"), "2026-04-01");
  assert.equal(parseDate("03 Apr 2026"), "2026-04-03");
  assert.equal(parseDate("03-Apr-26"), "2026-04-03");
  assert.equal(parseDate("03 April 2026 UPI"), "2026-04-03");
  assert.equal(parseDate("2026-04-03"), "2026-04-03");
  assert.equal(parseDate("31/13/2026"), null);
  assert.equal(parseDate("Opening balance"), null);
  assert.deepEqual(parseAmount("1,23,456.78"), { value: 123456.78, side: null });
  assert.deepEqual(parseAmount("(500.00)"), { value: -500, side: null });
  assert.deepEqual(parseAmount("250.00 Dr"), { value: 250, side: "dr" });
  assert.deepEqual(parseAmount("₹ 1,000.00Cr"), { value: 1000, side: "cr" });
  assert.equal(parseAmount("UPI/123"), null);
  assert.equal(parseAmount("000123456789"), null); // a reference number, not money
});

test("statement with a header: columns by name, wrapped narrations joined, balance checked", () => {
  assert.deepEqual(headerRoles(["Txn Date", "Value Date", "Narration", "Chq/Ref No.", "Withdrawal Amt.", "Deposit Amt.", "Closing Balance"]), ["date", "skip", "description", "ref", "debit", "credit", "balance"]);
  assert.equal(headerRoles(["Dear customer", "your statement", ""]), null);
  const s = parseStatement([
    [
      ["HDFC BANK", "", "", "", "", "", ""],
      ["Date", "Value Dt", "Narration", "Chq./Ref.No.", "Withdrawal Amt.", "Deposit Amt.", "Closing Balance"],
      ["01/04/26", "01/04/26", "UPI-SWIGGY-PAYTM", "0000123456789012", "450.00", "", "49,550.00"],
      ["", "", "ORDER 99812", "", "", "", ""],
      ["03/04/26", "03/04/26", "NEFT CR-ACME SALARY", "N093260001", "", "85,000.00", "1,34,550.00"],
      ["05/04/26", "05/04/26", "ATM WDL", "", "10,000.00", "", "1,24,550.00"],
      ["", "", "Page 1 of 2", "", "", "", ""],
    ],
    [
      ["Date", "Value Dt", "Narration", "Chq./Ref.No.", "Withdrawal Amt.", "Deposit Amt.", "Closing Balance"],
      ["07/04/26", "07/04/26", "RENT", "", "20,000.00", "", "1,04,550.00"],
      ["Statement summary", "", "", "", "30,450.00", "85,000.00", ""],
    ],
  ]);
  assert.equal(s.txns.length, 4);
  assert.deepEqual(s.txns[0], { date: "2026-04-01", description: "UPI-SWIGGY-PAYTM ORDER 99812", ref: "0000123456789012", debit: 450, credit: null, balance: 49550 });
  assert.deepEqual([s.txns[1].credit, s.txns[1].debit], [85000, null]);
  assert.deepEqual([s.totalDebit, s.totalCredit, s.opening, s.closing], [30450, 85000, 50000, 104550]);
  assert.deepEqual([s.reconciled, s.checked], [3, 3]);
  assert.deepEqual(statementRows(s)[1], ["01-04-2026", "UPI-SWIGGY-PAYTM ORDER 99812", "0000123456789012", "450.00", "", "49550.00"]);
});

test("statement without a header: amount and balance from the row, side from Dr/Cr or the balance", () => {
  const s = parseStatement([
    [
      ["02 Apr 2026", "OPENING", "1,000.00"],
      ["03 Apr 2026", "POS PURCHASE", "200.00 Dr", "800.00"],
      ["04 Apr 2026", "INTEREST", "50.00", "850.00"],
      ["05 Apr 2026", "CASH WITHDRAWAL", "300.00", "550.00"],
    ],
  ]);
  // The opening line is a balance, not a withdrawal.
  assert.deepEqual([s.txns[0].debit, s.txns[0].credit, s.txns[0].balance], [null, null, 1000]);
  assert.deepEqual([s.reconciled, s.checked, s.totalDebit, s.totalCredit], [3, 3, 500, 50]);
  assert.deepEqual(s.txns.slice(1).map((t) => [t.debit, t.credit, t.balance]), [[200, null, 800], [null, 50, 850], [300, null, 550]]);
});
