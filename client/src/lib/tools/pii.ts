/**
 * Personal data detection for Auto-redact and the Privacy scanner. Numbers
 * with a check digit (Aadhaar: Verhoeff, cards: Luhn) must pass it, which
 * keeps ordinary figures from being flagged.
 */

export type PiiKind = "aadhaar" | "pan" | "card" | "email" | "phone" | "gstin" | "ifsc" | "iban";

export const PII_LABEL: Record<PiiKind, string> = {
  aadhaar: "Aadhaar numbers",
  pan: "PAN numbers",
  card: "Card numbers",
  email: "Email addresses",
  phone: "Phone numbers",
  gstin: "GSTIN",
  ifsc: "IFSC codes",
  iban: "IBANs",
};

/** "1 PAN number", "3 email addresses". */
export const piiCount = (kind: PiiKind, n: number) => {
  const one: Record<PiiKind, string> = { aadhaar: "Aadhaar number", pan: "PAN number", card: "card number", email: "email address", phone: "phone number", gstin: "GSTIN", ifsc: "IFSC code", iban: "IBAN" };
  const many: Record<PiiKind, string> = { aadhaar: "Aadhaar numbers", pan: "PAN numbers", card: "card numbers", email: "email addresses", phone: "phone numbers", gstin: "GSTINs", ifsc: "IFSC codes", iban: "IBANs" };
  return `${n} ${n === 1 ? one[kind] : many[kind]}`;
};

export interface PiiMatch {
  kind: PiiKind;
  value: string;
}

// Verhoeff tables (Aadhaar's check digit).
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function verhoeffValid(digits: string): boolean {
  let c = 0;
  [...digits].reverse().forEach((ch, i) => (c = D[c][P[i % 8][Number(ch)]]));
  return c === 0;
}

export function luhnValid(digits: string): boolean {
  let sum = 0;
  [...digits].reverse().forEach((ch, i) => {
    let d = Number(ch);
    if (i % 2) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  });
  return sum % 10 === 0;
}

const digitsOf = (s: string) => s.replace(/\D/g, "");

const PATTERNS: { kind: PiiKind; re: RegExp; check?: (m: string) => boolean }[] = [
  { kind: "email", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { kind: "gstin", re: /\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/g },
  { kind: "pan", re: /\b[A-Z]{3}[ABCFGHLJPT][A-Z]\d{4}[A-Z]\b/g },
  { kind: "ifsc", re: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g },
  { kind: "iban", re: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g },
  { kind: "aadhaar", re: /(?<!\d)[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}(?!\d)/g, check: (m) => verhoeffValid(digitsOf(m)) },
  { kind: "card", re: /(?<!\d)\d{4}(?:[ -]?\d{4}){2}[ -]?\d{1,7}(?!\d)/g, check: (m) => digitsOf(m).length >= 13 && digitsOf(m).length <= 19 && luhnValid(digitsOf(m)) },
  { kind: "phone", re: /(?<![\w+])(?:\+?91[ -]?)?[6-9]\d{4}[ -]?\d{5}(?!\d)|\+\d{1,3}[ -]?\(?\d{1,4}\)?(?:[ -]?\d{2,4}){2,4}(?!\d)/g },
];

/** Find personal data in `text`. Overlaps go to the earlier, more specific pattern. */
export function detectPii(text: string, kinds?: PiiKind[]): PiiMatch[] {
  const taken: [number, number][] = [];
  const out: PiiMatch[] = [];
  for (const { kind, re, check } of PATTERNS) {
    if (kinds && !kinds.includes(kind)) continue;
    for (const m of text.matchAll(re)) {
      const s = m.index!;
      const e = s + m[0].length;
      if (check && !check(m[0])) continue;
      if (taken.some(([a, b]) => s < b && e > a)) continue;
      // Phone numbers need enough digits to be a real number.
      if (kind === "phone" && digitsOf(m[0]).length < 10) continue;
      taken.push([s, e]);
      out.push({ kind, value: m[0].trim() });
    }
  }
  return out;
}

/** Show a value without revealing it: keep the last few characters. */
export function mask(value: string): string {
  const keep = value.includes("@") ? value.slice(value.indexOf("@")) : value.slice(-4);
  return `${"•".repeat(Math.max(3, Math.min(8, value.length - keep.length)))}${keep}`;
}
