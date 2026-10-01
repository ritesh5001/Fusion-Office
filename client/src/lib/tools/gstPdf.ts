/**
 * GST tax invoice → PDF (A4), with pdf-lib. Standard fonts only, so the rupee
 * sign is written "Rs.". Long item lists continue on more pages with the table
 * header repeated.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { STATES, computeInvoice, inr, rupeesInWords, type InvoiceItem } from "./gst";

export interface Party {
  name: string;
  address: string;
  gstin: string;
  stateCode: string;
  phone: string;
  email: string;
}

export interface InvoiceData {
  title: string;
  number: string;
  date: string;
  dueDate: string;
  seller: Party;
  buyer: Party;
  placeOfSupplyCode: string;
  reverseCharge: boolean;
  items: InvoiceItem[];
  bank: { name: string; account: string; ifsc: string; branch: string };
  notes: string;
  signatory: string;
}

const W = 595.28;
const H = 841.89;
const M = 36;
const INK = rgb(0.09, 0.1, 0.13);
const SOFT = rgb(0.38, 0.41, 0.47);
const RULE = rgb(0.82, 0.84, 0.88);
const BAND = rgb(0.95, 0.96, 0.98);
const BRAND = rgb(0.18, 0.33, 0.92);

export async function invoicePdf(d: InvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${d.title} ${d.number}`.trim());
  doc.setAuthor(d.seller.name);
  doc.setCreator("Fusion Office");
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const t = computeInvoice(d.items, d.seller.stateCode, d.placeOfSupplyCode);

  // Standard fonts only cover Western characters; keep what they can show.
  const clean = (font: PDFFont, s: string) =>
    [...s.replace(/₹/g, "Rs.").replace(/[‘’]/g, "'").replace(/[“”]/g, '"')]
      .map((ch) => {
        try {
          font.encodeText(ch);
          return ch;
        } catch {
          return "?";
        }
      })
      .join("");
  const width = (s: string, size: number, font = reg) => font.widthOfTextAtSize(clean(font, s), size);
  const wrap = (s: string, maxW: number, size: number, font = reg) => {
    const out: string[] = [];
    for (const para of s.split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (width(next, size, font) <= maxW || !line) line = next;
        else {
          out.push(line);
          line = word;
        }
      }
      out.push(line);
    }
    return out;
  };

  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;
  const text = (s: string, x: number, yy: number, size = 9, font = reg, color = INK) => page.drawText(clean(font, s), { x, y: yy, size, font, color });
  const right = (s: string, xRight: number, yy: number, size = 9, font = reg, color = INK) => text(s, xRight - width(s, size, font), yy, size, font, color);
  const hline = (yy: number, x1 = M, x2 = W - M, color = RULE) => page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness: 0.7, color });

  // ── Header ──
  text(d.seller.name || "Your business", M, y - 14, 16, bold);
  right(d.title || "TAX INVOICE", W - M, y - 12, 14, bold, BRAND);
  y -= 22;
  const sellerLines = [
    ...wrap(d.seller.address, 300, 8.5),
    [d.seller.phone && `Phone: ${d.seller.phone}`, d.seller.email].filter(Boolean).join("   "),
    d.seller.gstin && `GSTIN: ${d.seller.gstin.toUpperCase()}`,
    d.seller.stateCode && `State: ${STATES[d.seller.stateCode] ?? ""} (${d.seller.stateCode})`,
  ].filter(Boolean) as string[];
  const metaRows: [string, string][] = [
    ["Invoice no.", d.number],
    ["Invoice date", d.date],
    ...(d.dueDate ? ([["Due date", d.dueDate]] as [string, string][]) : []),
    ["Place of supply", d.placeOfSupplyCode ? `${STATES[d.placeOfSupplyCode] ?? ""} (${d.placeOfSupplyCode})` : "-"],
    ["Reverse charge", d.reverseCharge ? "Yes" : "No"],
  ];
  let ly = y - 4;
  for (const l of sellerLines) {
    text(l, M, ly, 8.5, reg, SOFT);
    ly -= 11.5;
  }
  let my = y - 6;
  for (const [k, v] of metaRows) {
    text(k, W - M - 200, my, 8.5, reg, SOFT);
    right(v, W - M, my, 8.5, bold);
    my -= 12.5;
  }
  y = Math.min(ly, my) - 8;
  hline(y);

  // ── Bill to ──
  y -= 16;
  text("BILL TO", M, y, 7.5, bold, SOFT);
  y -= 13;
  text(d.buyer.name || "Customer", M, y, 10.5, bold);
  y -= 12;
  for (const l of [
    ...wrap(d.buyer.address, 330, 8.5),
    d.buyer.gstin ? `GSTIN: ${d.buyer.gstin.toUpperCase()}` : "Unregistered (B2C)",
    d.buyer.stateCode && `State: ${STATES[d.buyer.stateCode] ?? ""} (${d.buyer.stateCode})`,
    [d.buyer.phone && `Phone: ${d.buyer.phone}`, d.buyer.email].filter(Boolean).join("   "),
  ].filter(Boolean) as string[]) {
    text(l, M, y, 8.5, reg, SOFT);
    y -= 11.5;
  }
  y -= 8;

  // ── Items table ──
  const inter = t.interState;
  const cols = [
    { key: "#", w: 18, align: "left" },
    { key: "Item", w: 0, align: "left" },
    { key: "HSN/SAC", w: 48, align: "left" },
    { key: "Qty", w: 40, align: "right" },
    { key: "Rate", w: 54, align: "right" },
    { key: "Taxable", w: 62, align: "right" },
    { key: "GST", w: 30, align: "right" },
    ...(inter ? [{ key: "IGST", w: 58, align: "right" }] : [{ key: "CGST", w: 48, align: "right" }, { key: "SGST", w: 48, align: "right" }]),
    { key: "Amount", w: 64, align: "right" },
  ];
  const fixed = cols.reduce((n, c) => n + c.w, 0);
  cols[1].w = W - 2 * M - fixed - 8 * 0;
  const xs: number[] = [];
  cols.reduce((x, c) => (xs.push(x), x + c.w), M);
  const PAD = 4;
  const header = () => {
    page.drawRectangle({ x: M, y: y - 16, width: W - 2 * M, height: 18, color: BAND });
    cols.forEach((c, i) => {
      const label = c.key;
      if (c.align === "right") right(label, xs[i] + c.w - PAD, y - 11, 7.5, bold, SOFT);
      else text(label, xs[i] + PAD, y - 11, 7.5, bold, SOFT);
    });
    y -= 20;
  };
  header();
  t.lines.forEach((l, n) => {
    const desc = wrap(l.description || "-", cols[1].w - 2 * PAD, 8.5);
    const rowH = Math.max(1, desc.length) * 11 + 6;
    if (y - rowH < 200) {
      // Continue on a new page with the header repeated.
      right("Continued on next page", W - M, y - 12, 8, reg, SOFT);
      page = doc.addPage([W, H]);
      y = H - M;
      text(`${d.title || "TAX INVOICE"} ${d.number} (continued)`, M, y - 10, 10, bold);
      y -= 24;
      header();
    }
    const cells = [
      String(n + 1),
      "",
      l.hsn,
      `${l.qty} ${l.unit}`.trim(),
      inr(l.rate),
      inr(l.taxable),
      `${l.gstRate}%`,
      ...(inter ? [inr(l.igst)] : [inr(l.cgst), inr(l.sgst)]),
      inr(l.total),
    ];
    cells.forEach((c, i) => {
      if (i === 1) desc.forEach((dl, k) => text(dl, xs[1] + PAD, y - 10 - k * 11, 8.5));
      else if (cols[i].align === "right") right(c, xs[i] + cols[i].w - PAD, y - 10, 8.5);
      else text(c, xs[i] + PAD, y - 10, 8.5);
    });
    if (l.discount) text(`less ${l.discount}% discount`, xs[1] + PAD, y - 10 - desc.length * 11, 7, reg, SOFT);
    y -= rowH + (l.discount ? 9 : 0);
    hline(y + 2);
  });

  // ── Totals ──
  y -= 10;
  const tx = W - M - 220;
  const totalRows: [string, string][] = [["Taxable value", inr(t.taxable)]];
  if (inter) totalRows.push(["IGST", inr(t.igst)]);
  else totalRows.push(["CGST", inr(t.cgst)], ["SGST", inr(t.sgst)]);
  if (t.roundOff) totalRows.push(["Round off", `${t.roundOff > 0 ? "+" : ""}${inr(t.roundOff)}`]);
  const topOfTotals = y;
  for (const [k, v] of totalRows) {
    text(k, tx, y - 10, 9, reg, SOFT);
    right(v, W - M - PAD, y - 10, 9);
    y -= 15;
  }
  page.drawRectangle({ x: tx - 6, y: y - 22, width: W - M - tx + 6, height: 24, color: BRAND });
  text("Total", tx, y - 14, 11, bold, rgb(1, 1, 1));
  right(`Rs. ${inr(t.total)}`, W - M - PAD, y - 14, 11, bold, rgb(1, 1, 1));
  y -= 30;

  // Left of the totals: amount in words and the tax summary by rate.
  let wy = topOfTotals;
  text("Amount in words", M, wy - 10, 7.5, bold, SOFT);
  wy -= 22;
  for (const l of wrap(rupeesInWords(t.total), tx - M - 24, 9, bold)) {
    text(l, M, wy, 9, bold);
    wy -= 12;
  }
  if (t.byRate.length) {
    wy -= 6;
    text("Tax summary", M, wy, 7.5, bold, SOFT);
    wy -= 13;
    for (const r of t.byRate) {
      const tax = inter ? `IGST ${inr(r.igst)}` : `CGST ${inr(r.cgst)} + SGST ${inr(r.sgst)}`;
      text(`${r.rate}% on ${inr(r.taxable)}: ${tax}`, M, wy, 8, reg, SOFT);
      wy -= 11;
    }
  }
  y = Math.min(y, wy) - 14;

  // ── Bank, notes, signature ──
  hline(y);
  y -= 16;
  const colTop = y;
  if (d.bank.account || d.bank.name) {
    text("BANK DETAILS", M, y, 7.5, bold, SOFT);
    y -= 13;
    for (const [k, v] of [
      ["Bank", d.bank.name],
      ["Account no.", d.bank.account],
      ["IFSC", d.bank.ifsc],
      ["Branch", d.bank.branch],
    ]) {
      if (!v) continue;
      text(`${k}:`, M, y, 8.5, reg, SOFT);
      text(v, M + 62, y, 8.5, bold);
      y -= 11.5;
    }
    y -= 6;
  }
  if (d.notes.trim()) {
    text("NOTES & TERMS", M, y, 7.5, bold, SOFT);
    y -= 12;
    for (const l of wrap(d.notes, 300, 8)) {
      text(l, M, y, 8, reg, SOFT);
      y -= 10.5;
    }
  }
  const sx = W - M - 190;
  text(`For ${d.seller.name || "the supplier"}`, sx, colTop, 9, bold);
  hline(colTop - 52, sx, W - M, SOFT);
  text(d.signatory || "Authorised signatory", sx, colTop - 64, 8.5, reg, SOFT);

  // Footer on every page.
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(clean(reg, "This is a computer-generated invoice."), { x: M, y: 22, size: 7.5, font: reg, color: SOFT });
    const label = `Page ${i + 1} of ${pages.length}`;
    p.drawText(label, { x: W - M - reg.widthOfTextAtSize(label, 7.5), y: 22, size: 7.5, font: reg, color: SOFT });
  });
  return doc.save();
}
