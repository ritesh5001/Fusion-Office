/**
 * Rent receipts and salary slips → PDF (A4), with pdf-lib. Standard fonts
 * only, so the rupee sign is written "Rs.". Pure, so they run in tests.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { inr, rupeesInWords } from "./gst";

const W = 595.28;
const H = 841.89;
const M = 40;
const INK = rgb(0.09, 0.1, 0.13);
const SOFT = rgb(0.38, 0.41, 0.47);
const RULE = rgb(0.78, 0.8, 0.84);
const BAND = rgb(0.95, 0.96, 0.98);

/** Standard fonts only cover Western characters; keep what they can show. */
const cleaner = (font: PDFFont) => (s: string) =>
  [...s.replace(/₹/g, "Rs.").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-")]
    .map((ch) => {
      try {
        font.encodeText(ch);
        return ch;
      } catch {
        return "?";
      }
    })
    .join("");

function pen(page: () => PDFPage, reg: PDFFont, bold: PDFFont) {
  const clean = cleaner(reg);
  const width = (s: string, size: number, font = reg) => font.widthOfTextAtSize(clean(s), size);
  const text = (s: string, x: number, y: number, size = 9.5, font = reg, color = INK) => page().drawText(clean(s), { x, y, size, font, color });
  const right = (s: string, xRight: number, y: number, size = 9.5, font = reg, color = INK) => text(s, xRight - width(s, size, font), y, size, font, color);
  const center = (s: string, cx: number, y: number, size = 9.5, font = reg, color = INK) => text(s, cx - width(s, size, font) / 2, y, size, font, color);
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
  const hline = (y: number, x1 = M, x2 = W - M, color = RULE) => page().drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.7, color });
  return { text, right, center, wrap, hline, width, bold };
}

// ─── Rent receipts ────────────────────────────────────────────────

export interface RentReceiptData {
  tenant: string;
  landlord: string;
  /** Needed by employers when the yearly rent is above Rs. 1,00,000. */
  landlordPan: string;
  address: string;
  /** Rent for one month. */
  rent: number;
  /** First month, "YYYY-MM". */
  from: string;
  /** How many monthly receipts to make (1–24). */
  months: number;
  mode: "Cash" | "Bank transfer" | "UPI" | "Cheque";
  place: string;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The months a run of receipts covers, with the last day of each as the receipt date. */
export function rentPeriods(from: string, count: number): { label: string; start: string; end: string }[] {
  const m = from.match(/^(\d{4})-(\d{1,2})$/);
  if (!m) throw new Error("Choose the first month.");
  const n = Math.max(1, Math.min(24, Math.floor(count)));
  const out: { label: string; start: string; end: string }[] = [];
  for (let k = 0; k < n; k++) {
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + k, 1));
    const y = d.getUTCFullYear();
    const mo = d.getUTCMonth();
    const last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    const short = MONTHS[mo].slice(0, 3);
    out.push({ label: `${MONTHS[mo]} ${y}`, start: `01 ${short} ${y}`, end: `${String(last).padStart(2, "0")} ${short} ${y}` });
  }
  return out;
}

/** Does this rent need the landlord's PAN for an HRA claim (yearly rent above Rs. 1 lakh)? */
export const rentNeedsPan = (monthlyRent: number) => monthlyRent * 12 > 100_000;
/** Cash receipts above Rs. 5,000 carry a revenue stamp. */
export const rentNeedsStamp = (d: Pick<RentReceiptData, "rent" | "mode">) => d.mode === "Cash" && d.rent > 5000;

/** One receipt per month, three to a page. */
export async function rentReceiptsPdf(d: RentReceiptData): Promise<{ bytes: Uint8Array; receipts: number; total: number }> {
  if (!d.tenant.trim() || !d.landlord.trim()) throw new Error("Enter the tenant's and the landlord's names.");
  if (!(d.rent > 0)) throw new Error("Enter the monthly rent.");
  const periods = rentPeriods(d.from, d.months);
  const doc = await PDFDocument.create();
  doc.setTitle("Rent receipts");
  doc.setCreator("Fusion Office");
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page!: PDFPage;
  const p = pen(() => page, reg, bold);
  const boxH = (H - 2 * M - 2 * 14) / 3;
  const stamp = rentNeedsStamp(d);
  periods.forEach((period, k) => {
    if (k % 3 === 0) page = doc.addPage([W, H]);
    const top = H - M - (k % 3) * (boxH + 14);
    page.drawRectangle({ x: M, y: top - boxH, width: W - 2 * M, height: boxH, borderColor: RULE, borderWidth: 0.9 });
    page.drawRectangle({ x: M, y: top - 30, width: W - 2 * M, height: 30, color: BAND });
    p.text("RENT RECEIPT", M + 14, top - 20, 12, bold);
    p.right(`Receipt no. ${k + 1}`, W - M - 14, top - 13, 8.5, reg, SOFT);
    p.right(`Date: ${period.end}`, W - M - 14, top - 24, 8.5, reg, SOFT);
    let y = top - 52;
    const body = `Received with thanks from ${d.tenant.trim()} a sum of Rs. ${inr(d.rent)} (${rupeesInWords(d.rent)}) towards rent for the month of ${period.label} (${period.start} to ${period.end})${d.address.trim() ? ` for the property at ${d.address.trim().replace(/\s*\n\s*/g, ", ")}` : ""}.`;
    for (const line of p.wrap(body, W - 2 * M - 28, 10)) {
      p.text(line, M + 14, y, 10);
      y -= 15;
    }
    y -= 6;
    const rows: [string, string][] = [
      ["Amount", `Rs. ${inr(d.rent)}`],
      ["Paid by", d.mode],
      ["Landlord", d.landlord.trim()],
      ...(d.landlordPan.trim() ? ([["Landlord's PAN", d.landlordPan.trim().toUpperCase()]] as [string, string][]) : []),
      ...(d.place.trim() ? ([["Place", d.place.trim()]] as [string, string][]) : []),
    ];
    for (const [key, value] of rows) {
      p.text(key, M + 14, y, 9, reg, SOFT);
      p.text(value, M + 110, y, 9, bold);
      y -= 13.5;
    }
    // Signature, bottom right; a box for the revenue stamp when one is needed.
    const sx = W - M - 170;
    const sy = top - boxH + 26;
    if (stamp) {
      page.drawRectangle({ x: sx, y: sy + 8, width: 56, height: 62, borderColor: RULE, borderWidth: 0.7 });
      p.center("Revenue", sx + 28, sy + 44, 7, reg, SOFT);
      p.center("stamp", sx + 28, sy + 35, 7, reg, SOFT);
    }
    p.hline(sy, sx + (stamp ? 64 : 0), W - M - 14, SOFT);
    p.text("Signature of landlord", sx + (stamp ? 64 : 0), sy - 11, 8, reg, SOFT);
  });
  return { bytes: await doc.save(), receipts: periods.length, total: d.rent * periods.length };
}

// ─── Salary slip ──────────────────────────────────────────────────

export interface PayLine {
  label: string;
  amount: number;
}

export interface SalarySlipData {
  company: string;
  companyAddress: string;
  /** "YYYY-MM". */
  month: string;
  employee: string;
  employeeId: string;
  designation: string;
  department: string;
  pan: string;
  uan: string;
  bankAccount: string;
  joined: string;
  paidDays: number;
  lopDays: number;
  earnings: PayLine[];
  deductions: PayLine[];
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function salaryTotals(d: Pick<SalarySlipData, "earnings" | "deductions">) {
  const sum = (list: PayLine[]) => r2(list.filter((l) => l.label.trim() && l.amount).reduce((n, l) => n + (Number(l.amount) || 0), 0));
  const gross = sum(d.earnings);
  const deductions = sum(d.deductions);
  return { gross, deductions, net: r2(gross - deductions) };
}

export async function salarySlipPdf(d: SalarySlipData): Promise<Uint8Array> {
  if (!d.company.trim()) throw new Error("Enter the company's name.");
  if (!d.employee.trim()) throw new Error("Enter the employee's name.");
  const mm = d.month.match(/^(\d{4})-(\d{1,2})$/);
  if (!mm) throw new Error("Choose the pay month.");
  const t = salaryTotals(d);
  if (!(t.gross > 0)) throw new Error("Add at least one earning.");
  if (t.net < 0) throw new Error("Deductions are more than the earnings.");
  const monthLabel = `${MONTHS[Number(mm[2]) - 1] ?? ""} ${mm[1]}`;
  const doc = await PDFDocument.create();
  doc.setTitle(`Salary slip ${monthLabel} - ${d.employee.trim()}`);
  doc.setCreator("Fusion Office");
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([W, H]);
  const p = pen(() => page, reg, bold);
  let y = H - M;

  p.center(d.company.trim(), W / 2, y - 14, 16, bold);
  y -= 22;
  for (const line of p.wrap(d.companyAddress.replace(/\s*\n\s*/g, ", "), W - 2 * M - 80, 8.5)) {
    p.center(line, W / 2, y - 6, 8.5, reg, SOFT);
    y -= 11.5;
  }
  y -= 14;
  page.drawRectangle({ x: M, y: y - 22, width: W - 2 * M, height: 22, color: BAND });
  p.center(`Salary slip for ${monthLabel}`, W / 2, y - 15, 11, bold);
  y -= 40;

  // Employee details in two columns.
  const details: [string, string][] = (
    [
      ["Employee name", d.employee],
      ["Employee ID", d.employeeId],
      ["Designation", d.designation],
      ["Department", d.department],
      ["Date of joining", d.joined],
      ["PAN", d.pan.toUpperCase()],
      ["UAN", d.uan],
      ["Bank account", d.bankAccount],
      ["Paid days", d.paidDays ? String(d.paidDays) : ""],
      ["Loss-of-pay days", d.lopDays ? String(d.lopDays) : ""],
    ] as [string, string][]
  ).filter(([, v]) => v.trim());
  const half = (W - 2 * M) / 2;
  details.forEach(([k, v], i) => {
    const x = M + (i % 2) * half;
    const yy = y - Math.floor(i / 2) * 15;
    p.text(k, x, yy, 9, reg, SOFT);
    p.text(v.trim(), x + 96, yy, 9, bold);
  });
  y -= Math.ceil(details.length / 2) * 15 + 12;

  // Earnings and deductions side by side.
  const earn = d.earnings.filter((l) => l.label.trim() && l.amount);
  const ded = d.deductions.filter((l) => l.label.trim() && l.amount);
  const rows = Math.max(earn.length, ded.length, 1);
  const rowH = 17;
  const tableH = (rows + 2) * rowH;
  page.drawRectangle({ x: M, y: y - tableH, width: W - 2 * M, height: tableH, borderColor: RULE, borderWidth: 0.8 });
  page.drawRectangle({ x: M, y: y - rowH, width: W - 2 * M, height: rowH, color: BAND });
  page.drawLine({ start: { x: M + half, y }, end: { x: M + half, y: y - tableH }, thickness: 0.8, color: RULE });
  p.text("Earnings", M + 8, y - 12, 9, bold);
  p.right("Amount (Rs.)", M + half - 8, y - 12, 9, bold);
  p.text("Deductions", M + half + 8, y - 12, 9, bold);
  p.right("Amount (Rs.)", W - M - 8, y - 12, 9, bold);
  for (let i = 0; i < rows; i++) {
    const yy = y - rowH * (i + 1) - 12;
    if (earn[i]) {
      p.text(earn[i].label.trim(), M + 8, yy, 9);
      p.right(inr(earn[i].amount), M + half - 8, yy, 9);
    }
    if (ded[i]) {
      p.text(ded[i].label.trim(), M + half + 8, yy, 9);
      p.right(inr(ded[i].amount), W - M - 8, yy, 9);
    }
  }
  const ty = y - rowH * (rows + 1);
  p.hline(ty, M, W - M);
  p.text("Gross earnings", M + 8, ty - 12, 9, bold);
  p.right(inr(t.gross), M + half - 8, ty - 12, 9, bold);
  p.text("Total deductions", M + half + 8, ty - 12, 9, bold);
  p.right(inr(t.deductions), W - M - 8, ty - 12, 9, bold);
  y -= tableH + 18;

  page.drawRectangle({ x: M, y: y - 30, width: W - 2 * M, height: 30, color: rgb(0.18, 0.33, 0.92) });
  p.text("Net pay", M + 10, y - 19, 12, bold, rgb(1, 1, 1));
  p.right(`Rs. ${inr(t.net)}`, W - M - 10, y - 19, 12, bold, rgb(1, 1, 1));
  y -= 46;
  for (const line of p.wrap(rupeesInWords(t.net), W - 2 * M, 9.5, bold)) {
    p.text(line, M, y, 9.5, bold);
    y -= 13;
  }

  y -= 60;
  p.hline(y, M, M + 170, SOFT);
  p.hline(y, W - M - 170, W - M, SOFT);
  p.text("Employer's signature", M, y - 12, 8.5, reg, SOFT);
  p.text("Employee's signature", W - M - 170, y - 12, 8.5, reg, SOFT);
  p.center("This is a computer-generated salary slip.", W / 2, 26, 7.5, reg, SOFT);
  return doc.save();
}
