/**
 * GST invoice maths (India): state codes, GSTIN check character, CGST/SGST
 * versus IGST, totals with round-off, and the amount in words (lakh/crore).
 */

export const STATES: Record<string, string> = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
  "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
  "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam",
  "19": "West Bengal", "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep",
  "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman and Nicobar Islands", "36": "Telangana",
  "37": "Andhra Pradesh", "38": "Ladakh", "97": "Other Territory",
};

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28] as const;

const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** The check character a GSTIN's first 14 characters require. */
export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = CHARS.indexOf(first14[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(v / 36) + (v % 36);
  }
  return CHARS[(36 - (sum % 36)) % 36];
}

export type GstinCheck = { ok: true; state: string; stateCode: string } | { ok: false; reason: string };

export function checkGstin(raw: string): GstinCheck {
  const g = raw.trim().toUpperCase();
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return { ok: false, reason: "A GSTIN has 15 characters, like 27AAPFU0939F1ZV." };
  const code = g.slice(0, 2);
  if (!STATES[code]) return { ok: false, reason: `${code} isn't a valid state code.` };
  if (gstinCheckChar(g.slice(0, 14)) !== g[14]) return { ok: false, reason: "The last character doesn't match: check for a typo." };
  return { ok: true, state: STATES[code], stateCode: code };
}

export interface InvoiceItem {
  description: string;
  hsn: string;
  qty: number;
  unit: string;
  rate: number;
  /** Discount on this line, percent. */
  discount: number;
  gstRate: number;
}

export interface ItemLine extends InvoiceItem {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface InvoiceTotals {
  lines: ItemLine[];
  interState: boolean;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  /** Tax per rate, for the summary table. */
  byRate: { rate: number; taxable: number; cgst: number; sgst: number; igst: number }[];
  roundOff: number;
  total: number;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Totals for an invoice. Supply within the seller's state carries CGST + SGST
 * (half the rate each); supply to another state carries IGST.
 */
export function computeInvoice(items: InvoiceItem[], sellerStateCode: string, placeOfSupplyCode: string): InvoiceTotals {
  const interState = !!sellerStateCode && !!placeOfSupplyCode && sellerStateCode !== placeOfSupplyCode;
  const lines = items
    .filter((it) => it.description.trim() || it.qty * it.rate)
    .map((it) => {
      const taxable = r2(it.qty * it.rate * (1 - (it.discount || 0) / 100));
      const tax = taxable * (it.gstRate / 100);
      const igst = interState ? r2(tax) : 0;
      const cgst = interState ? 0 : r2(tax / 2);
      const sgst = interState ? 0 : r2(tax / 2);
      return { ...it, taxable, cgst, sgst, igst, total: r2(taxable + cgst + sgst + igst) };
    });
  const sum = (k: "taxable" | "cgst" | "sgst" | "igst") => r2(lines.reduce((n, l) => n + l[k], 0));
  const rates = [...new Set(lines.map((l) => l.gstRate))].sort((a, b) => a - b);
  const byRate = rates.map((rate) => {
    const ls = lines.filter((l) => l.gstRate === rate);
    const s = (k: "taxable" | "cgst" | "sgst" | "igst") => r2(ls.reduce((n, l) => n + l[k], 0));
    return { rate, taxable: s("taxable"), cgst: s("cgst"), sgst: s("sgst"), igst: s("igst") };
  });
  const exact = r2(sum("taxable") + sum("cgst") + sum("sgst") + sum("igst"));
  const total = Math.round(exact);
  return { lines, interState, taxable: sum("taxable"), cgst: sum("cgst"), sgst: sum("sgst"), igst: sum("igst"), byRate, roundOff: r2(total - exact), total };
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const words = rest < 20 ? ONES[rest] : `${TENS[Math.floor(rest / 10)]}${rest % 10 ? ` ${ONES[rest % 10]}` : ""}`;
  return [h ? `${ONES[h]} Hundred` : "", words].filter(Boolean).join(" ");
}

/** 123456 → "One Lakh Twenty Three Thousand Four Hundred Fifty Six" (Indian grouping). */
export function indianWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7);
  const lakh = Math.floor((n % 1e7) / 1e5);
  const thousand = Math.floor((n % 1e5) / 1e3);
  const rest = n % 1e3;
  if (crore) parts.push(`${crore >= 1000 ? indianWords(crore) : below1000(crore)} Crore`);
  if (lakh) parts.push(`${below1000(lakh)} Lakh`);
  if (thousand) parts.push(`${below1000(thousand)} Thousand`);
  if (rest) parts.push(below1000(rest));
  return parts.join(" ");
}

export function rupeesInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  return `Rupees ${indianWords(rupees)}${paise ? ` and ${indianWords(paise)} Paise` : ""} Only`;
}

/** 1234567.5 → "12,34,567.50" */
export function inr(n: number): string {
  const [int, dec] = Math.abs(n).toFixed(2).split(".");
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${n < 0 ? "-" : ""}${rest ? `${rest},` : ""}${last3}.${dec}`;
}
