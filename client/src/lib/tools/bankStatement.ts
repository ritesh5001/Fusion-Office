/**
 * Bank statement rows → clean transactions. Input is each page's text as a
 * grid (rows of cells, from how the text lines up); output is one row per
 * transaction with a real date and numbers, checked against the running
 * balance. Pure, so it is tested without a browser.
 *
 * Statements differ between banks, so columns are found from the header row
 * ("Date | Narration | Withdrawal | Deposit | Balance") and, when there is no
 * usable header, from the shape of the rows.
 */

export interface Txn {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  description: string;
  ref: string;
  debit: number | null;
  credit: number | null;
  balance: number | null;
}

export interface Statement {
  txns: Txn[];
  totalDebit: number;
  totalCredit: number;
  /** Rows whose balance follows from the row before; `checked` is how many could be tested. */
  reconciled: number;
  checked: number;
  opening: number | null;
  closing: number | null;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

const iso = (y: number, m: number, d: number) => {
  if (y < 100) y += y < 70 ? 2000 : 1900;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1970 || y > 2100) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

/** A date at the start of a cell, in the day-first forms Indian banks print. */
export function parseDate(cell: string): string | null {
  const s = cell.trim();
  let m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})(?!\d)/);
  if (m) return iso(Number(m[3]), Number(m[2]), Number(m[1]));
  m = s.match(/^(\d{1,2})[\s\-\/]?([A-Za-z]{3,9})[\s\-\/,]*(\d{2}|\d{4})(?!\d)/);
  if (m && MONTHS[m[2].slice(0, 4).toLowerCase()] !== undefined) return iso(Number(m[3]), MONTHS[m[2].slice(0, 4).toLowerCase()], Number(m[1]));
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()] !== undefined) return iso(Number(m[3]), MONTHS[m[2].slice(0, 3).toLowerCase()], Number(m[1]));
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?!\d)/);
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}

/** "1,23,456.78", "(500.00)", "250.00 Dr", "₹ 1,000.00Cr" → number and, if marked, its side. */
export function parseAmount(cell: string): { value: number; side: "dr" | "cr" | null } | null {
  const s = cell.trim();
  const m = s.match(/^[-+(]?\s*(?:₹|rs\.?|inr)?\s*([\d,]*\d(?:\.\d{1,2})?)\s*\)?\s*(dr|cr|d|c)?\.?$/i);
  if (!m || !/\d/.test(m[1])) return null;
  // A bare run of digits with no decimals and no commas is far more likely a reference than money.
  if (!/[.,]/.test(m[1]) && m[1].length > 7) return null;
  const value = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  const neg = /^[-(]/.test(s);
  const tag = m[2]?.toLowerCase();
  return { value: neg ? -value : value, side: tag ? (tag.startsWith("d") ? "dr" : "cr") : null };
}

type Role = "date" | "description" | "ref" | "debit" | "credit" | "amount" | "balance" | "type" | "skip";

const HEADER: [Role, RegExp][] = [
  ["balance", /balance|bal\b/],
  ["debit", /withdraw|debit|\bdr\b|paid out|payments?\b/],
  ["credit", /deposit|credit|\bcr\b|paid in|receipts?\b/],
  ["skip", /value\s*d(ate|t)|post(ing)?\s*date/],
  ["date", /date|\bdt\b/],
  ["ref", /ch(e)?q|cheque|ref|utr|instrument|instr/],
  ["description", /narration|particular|description|details|remark|transaction/],
  ["type", /^(dr\s*\/\s*cr|cr\s*\/\s*dr|type)$/],
  ["amount", /amount|amt/],
];

/** Which column holds what, from a header row; null if the row isn't a header. */
export function headerRoles(row: string[]): Role[] | null {
  const roles = row.map((cell): Role => {
    const c = cell.trim().toLowerCase();
    if (!c || c.length > 40) return "skip";
    return HEADER.find(([, re]) => re.test(c))?.[0] ?? "skip";
  });
  // Only the first of each kind counts ("Txn date" and "Value date" both say "date").
  const seen = new Set<Role>();
  const unique = roles.map((r) => (r === "skip" || !seen.has(r) ? (seen.add(r), r) : "skip"));
  const has = (r: Role) => unique.includes(r);
  const money = [has("debit"), has("credit"), has("amount"), has("balance")].filter(Boolean).length;
  return has("date") && money >= 1 && (has("description") || money >= 2) ? unique : null;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function parseStatement(pages: string[][][]): Statement {
  const txns: Txn[] = [];
  let roles: Role[] | null = null;
  for (const rows of pages) {
    for (const row of rows) {
      const header = headerRoles(row);
      if (header) {
        roles = header;
        continue;
      }
      const cells = row.map((c) => c.trim());
      const dateCol = roles ? roles.indexOf("date") : -1;
      // The date is in its column, or (when columns drifted on this page) the first cell that is one.
      let dateAt = dateCol >= 0 && cells[dateCol] && parseDate(cells[dateCol]) ? dateCol : cells.findIndex((c) => c && parseDate(c));
      if (dateAt > 2 && dateAt !== dateCol) dateAt = -1;
      const date = dateAt >= 0 ? parseDate(cells[dateAt]) : null;

      if (!date) {
        // A line without a date continues the description above it.
        const last = txns[txns.length - 1];
        const extra = cells.filter((c) => c && !parseAmount(c)).join(" ");
        if (last && extra && !/^(page|total|opening|closing|statement|\*+)/i.test(extra) && !cells.some((c) => parseAmount(c))) last.description = `${last.description} ${extra}`.trim();
        continue;
      }

      const t: Txn = { date, description: "", ref: "", debit: null, credit: null, balance: null };
      const text: string[] = [];
      const loose: { value: number; side: "dr" | "cr" | null; col: number }[] = [];
      let side: "dr" | "cr" | null = null;
      // The date cell may carry more text after the date ("01/04/2026 UPI/…").
      const rest = cells[dateAt].replace(/^\S+(\s+[A-Za-z]{3,9}\s+\d{2,4})?/, "").trim();
      if (rest && !parseDate(rest)) text.push(rest);
      cells.forEach((c, i) => {
        if (!c || i === dateAt) return;
        const role: Role = roles?.[i] ?? "skip";
        const amt = parseAmount(c);
        if (role === "type" || /^(dr|cr)\.?$/i.test(c)) return void (side = c.toLowerCase().startsWith("d") ? "dr" : "cr");
        if (amt && role === "debit") return void (t.debit = Math.abs(amt.value));
        if (amt && role === "credit") return void (t.credit = Math.abs(amt.value));
        if (amt && role === "balance") return void (t.balance = amt.side === "dr" ? -Math.abs(amt.value) : amt.value);
        if (amt && (role === "amount" || role === "skip" || !roles) && /[.,]\d{2}\b|\d\s*(dr|cr)\.?$/i.test(c)) return void loose.push({ ...amt, col: i });
        if (role === "ref") return void (t.ref = t.ref ? `${t.ref} ${c}` : c);
        if (parseDate(c) && c.length <= 12) return; // value date
        text.push(c);
      });
      // Money that no header claimed: the last figure is the balance, the one before it the amount.
      // A lone figure on an "opening balance" / "brought forward" line is a balance, not a payment.
      const carried = /\b(opening|closing|balance|b\/f|c\/f|brought forward|carried forward)\b/i.test(text.join(" "));
      if (loose.length && t.balance === null && (loose.length > 1 || t.debit !== null || t.credit !== null || carried)) t.balance = loose.pop()!.value;
      if (loose.length && t.debit === null && t.credit === null) {
        const a = loose.pop()!;
        const s = a.side ?? side ?? (a.value < 0 ? "dr" : null);
        const prev = txns[txns.length - 1]?.balance;
        // No marker: the balance tells which way the money went.
        const dir = s ?? (t.balance !== null && prev !== null && prev !== undefined ? (t.balance < prev ? "dr" : "cr") : "dr");
        if (dir === "dr") t.debit = Math.abs(a.value);
        else t.credit = Math.abs(a.value);
      }
      if (t.debit === 0) t.debit = null;
      if (t.credit === 0) t.credit = null;
      t.description = text.join(" ").replace(/\s+/g, " ").trim();
      if (t.debit === null && t.credit === null && t.balance === null) continue; // a dated line that isn't a transaction
      txns.push(t);
    }
  }

  let reconciled = 0;
  let checked = 0;
  for (let i = 1; i < txns.length; i++) {
    const a = txns[i - 1].balance;
    const b = txns[i].balance;
    if (a === null || b === null) continue;
    checked++;
    if (Math.abs(r2(a + (txns[i].credit ?? 0) - (txns[i].debit ?? 0)) - b) < 0.011) reconciled++;
  }
  const first = txns[0];
  const opening = first && first.balance !== null ? r2(first.balance - (first.credit ?? 0) + (first.debit ?? 0)) : null;
  return {
    txns,
    totalDebit: r2(txns.reduce((n, t) => n + (t.debit ?? 0), 0)),
    totalCredit: r2(txns.reduce((n, t) => n + (t.credit ?? 0), 0)),
    reconciled,
    checked,
    opening,
    closing: txns.length ? txns[txns.length - 1].balance : null,
  };
}

export const STATEMENT_COLUMNS = ["Date", "Description", "Ref / Cheque no.", "Debit", "Credit", "Balance"] as const;

/** Rows for a CSV file (dates as DD-MM-YYYY, the form spreadsheets in India read as dates). */
export function statementRows(s: Statement): string[][] {
  const d = (isoDate: string) => isoDate.split("-").reverse().join("-");
  const n = (v: number | null) => (v === null ? "" : v.toFixed(2));
  return [[...STATEMENT_COLUMNS], ...s.txns.map((t) => [d(t.date), t.description, t.ref, n(t.debit), n(t.credit), n(t.balance)])];
}
