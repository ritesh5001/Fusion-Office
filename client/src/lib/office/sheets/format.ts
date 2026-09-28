/**
 * Excel-style number formats (display) and typed-input parsing. Pure; unit tested.
 * Dates are Excel serial numbers (days since 1899-12-30).
 */
import type { Scalar } from "./model";

const EPOCH = Date.UTC(1899, 11, 30);
const DAY = 86_400_000;

export const dateToSerial = (y: number, m: number, d: number, h = 0, min = 0, s = 0) => (Date.UTC(y, m - 1, d, h, min, s) - EPOCH) / DAY;

export function serialToParts(serial: number) {
  const ms = Math.round(serial * DAY) + EPOCH;
  const d = new Date(ms);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes(), s: d.getUTCSeconds(), dow: d.getUTCDay() };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Split a format into its ;-separated sections (ignoring ; inside quotes). */
function sections(fmt: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < fmt.length; i++) {
    const ch = fmt[i];
    if (ch === '"') q = !q;
    if (ch === "\\" && i + 1 < fmt.length) {
      cur += ch + fmt[++i];
      continue;
    }
    if (ch === ";" && !q) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Remove quoted text, escapes, colours and locale tags, for detecting what a format is. */
const bare = (s: string) => s.replace(/"[^"]*"/g, "").replace(/\\./g, "").replace(/\[[^\]]*\]/g, "").replace(/_.|\*./g, "");

export const isDateFormat = (fmt: string | undefined) => !!fmt && /[dmyhs]/i.test(bare(sections(fmt)[0])) && !/^General$/i.test(fmt);

/** General format: like Excel, about 10 significant digits. */
export function general(n: number): string {
  if (!Number.isFinite(n)) return "#NUM!";
  if (Number.isInteger(n) && Math.abs(n) < 1e11) return String(n);
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e11 || abs < 1e-9)) return n.toExponential(5).replace(/\.?0+e/, "E").replace("e", "E");
  return String(Number(n.toPrecision(10)));
}

function group(intPart: string, indian: boolean): string {
  if (!indian) return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
}

function formatDate(serial: number, sec: string): string {
  const p = serialToParts(serial);
  const ampm = /AM\/PM|A\/P/i.test(sec);
  let out = "";
  const toks = sec.match(/"[^"]*"|\\.|\[[^\]]*\]|AM\/PM|A\/P|yyyy|yy|mmmmm|mmmm|mmm|mm|m|dddd|ddd|dd|d|hh|h|ss|s|\.0+|./gi) ?? [];
  // "m" means minutes right after an hour or right before seconds.
  const isMinute = (i: number) => {
    for (let j = i - 1; j >= 0; j--) if (/^[hs]+$/i.test(toks[j])) return /^h+$/i.test(toks[j]);
    for (let j = i + 1; j < toks.length; j++) if (/^[a-z]+$/i.test(toks[j]) && !/^m+$/i.test(toks[j])) return /^s+$/i.test(toks[j]);
    return false;
  };
  const hour = ampm ? ((p.h + 11) % 12) + 1 : p.h;
  toks.forEach((t, i) => {
    const l = t.toLowerCase();
    if (t.startsWith('"')) out += t.slice(1, -1);
    else if (t.startsWith("\\")) out += t[1];
    else if (t.startsWith("[")) {
      /* colours and locales are ignored */
    } else if (l === "yyyy") out += p.y;
    else if (l === "yy") out += String(p.y).slice(-2);
    else if (l === "mmmmm") out += MONTHS[p.m - 1][0];
    else if (l === "mmmm") out += MONTHS[p.m - 1];
    else if (l === "mmm") out += MONTHS[p.m - 1].slice(0, 3);
    else if (l === "mm") out += isMinute(i) ? String(p.min).padStart(2, "0") : String(p.m).padStart(2, "0");
    else if (l === "m") out += isMinute(i) ? p.min : p.m;
    else if (l === "dddd") out += DAYS[p.dow];
    else if (l === "ddd") out += DAYS[p.dow].slice(0, 3);
    else if (l === "dd") out += String(p.d).padStart(2, "0");
    else if (l === "d") out += p.d;
    else if (l === "hh") out += String(hour).padStart(2, "0");
    else if (l === "h") out += hour;
    else if (l === "ss") out += String(p.s).padStart(2, "0");
    else if (l === "s") out += p.s;
    else if (l === "am/pm") out += p.h < 12 ? "AM" : "PM";
    else if (l === "a/p") out += p.h < 12 ? "A" : "P";
    else out += t;
  });
  return out;
}

function formatNumber(n: number, sec: string): string {
  // Literal text around the number: quoted strings, escapes, currency tags like [$₹-4009].
  const currency = sec.match(/\[\$([^-\]]*)[^\]]*\]/)?.[1] ?? "";
  let s = sec.replace(/\[\$([^-\]]*)[^\]]*\]/g, "\u0001").replace(/\[[^\]]*\]/g, "").replace(/_.|\*./g, "");
  const parts = s.match(/"[^"]*"|\\.|[0#?,.%]+(?:E[+-]0+)?|[^"\\0#?,.%]+/gi) ?? [];
  const numIdx = parts.findIndex((p) => /[0#?]/.test(p));
  if (numIdx < 0) return parts.map((p) => (p.startsWith('"') ? p.slice(1, -1) : p.startsWith("\\") ? p[1] : p)).join("").replace("\u0001", currency);
  const pattern = parts[numIdx];
  const lit = (p: string) => (p.startsWith('"') ? p.slice(1, -1) : p.startsWith("\\") ? p[1] : p).replace("\u0001", currency);
  const prefix = parts.slice(0, numIdx).map(lit).join("");
  const suffix = parts.slice(numIdx + 1).map(lit).join("");
  const pct = (pattern.match(/%/g) ?? []).length + (suffix.match(/%/g) ?? []).length;
  let v = n * 100 ** pct;
  const sci = pattern.match(/E([+-])(0+)/i);
  const core = pattern.replace(/E[+-]0+/i, "").replace(/%/g, "");
  // Trailing commas scale by thousands (0,, and 0.0,, = millions).
  const scale = core.match(/,+$/)?.[0].length ?? 0;
  v /= 1000 ** scale;
  const [intPat, decPat = ""] = core.replace(/,+$/, "").split(".");
  const decimals = (decPat.match(/[0#?]/g) ?? []).length;
  const minDecimals = (decPat.match(/0/g) ?? []).length;
  const neg = v < 0;
  let body: string;
  if (sci) {
    body = Math.abs(v).toExponential(decimals).replace(/e([+-])(\d+)/, (_, sign, exp) => `E${sign === "-" ? "-" : sci[1] === "+" ? "+" : ""}${exp.padStart(sci[2].length, "0")}`);
  } else {
    let fixed = Math.abs(v).toFixed(decimals);
    if (minDecimals < decimals) fixed = fixed.replace(new RegExp(`0{1,${decimals - minDecimals}}$`), "").replace(/\.$/, "");
    let [ip, dp] = fixed.split(".");
    const minInt = (intPat.replace(/,/g, "").match(/0/g) ?? []).length;
    if (ip === "0" && minInt === 0) ip = "";
    ip = ip.padStart(minInt, "0");
    if (/[0#],[0#]/.test(intPat)) ip = group(ip, /#,##,##/.test(intPat) || currency === "₹" || prefix.includes("₹"));
    body = dp !== undefined ? `${ip}.${dp}` : ip;
  }
  // A % inside the number pattern ("0.00%") is printed right after the digits.
  const pctSign = "%".repeat((pattern.match(/%/g) ?? []).length);
  return `${neg ? "-" : ""}${prefix}${body}${pctSign}${suffix}`;
}

/** Text shown for a value in a cell with number format `fmt`. */
export function formatValue(v: Scalar | Error, fmt?: string): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Error) return v.message;
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "string") {
    const secs = fmt ? sections(fmt) : [];
    const textSec = secs[3];
    return textSec ? textSec.replace(/"([^"]*)"/g, "$1").replace("@", v) : v;
  }
  if (!fmt || /^General$/i.test(fmt) || fmt === "@") return general(v);
  const secs = sections(fmt);
  let sec = secs[0];
  let n = v;
  if (v < 0 && secs[1] !== undefined && secs[1] !== "") {
    sec = secs[1];
    n = -v;
  } else if (v === 0 && secs[2] !== undefined && secs[2] !== "") sec = secs[2];
  if (/General/i.test(sec)) return sec.replace(/General/i, general(n)).replace(/"/g, "");
  if (isDateFormat(sec)) return n < 0 ? "#####" : formatDate(n, sec);
  return formatNumber(n, sec);
}

/** What typing `text` into a cell means: a value (and a format it implies) or a formula. */
export function parseInput(text: string, dayFirst = true): { formula: string } | { v: Scalar; fmt?: string } {
  const t = text.trim();
  if (text.startsWith("=") && text.length > 1) return { formula: text.slice(1) };
  if (text.startsWith("'")) return { v: text.slice(1) };
  if (t === "") return { v: null };
  if (/^(true|false)$/i.test(t)) return { v: t.toLowerCase() === "true" };
  let m = t.match(/^([-+]?)(\d+(?:\.\d*)?|\.\d+)%$/);
  if (m) return { v: Number(m[1] + m[2]) / 100, fmt: m[2].includes(".") ? `0.${"0".repeat(Math.min(4, m[2].split(".")[1].length))}%` : "0%" };
  m = t.match(/^(-?)\s*([₹$€£])\s*(\d{1,3}(?:,\d{2,3})*|\d+)(\.\d+)?$/);
  if (m) {
    const n = Number(`${m[1]}${m[3].replace(/,/g, "")}${m[4] ?? ""}`);
    return { v: n, fmt: m[2] === "₹" ? "[$₹-4009]#,##,##0.00" : `${m[2]}#,##0.00` };
  }
  if (/^[-+]?\d{1,3}(,\d{2,3})+(\.\d+)?$/.test(t)) {
    const n = Number(t.replace(/,/g, ""));
    const dec = t.split(".")[1]?.length ?? 0;
    return { v: n, fmt: `#,##0${dec ? `.${"0".repeat(dec)}` : ""}` };
  }
  if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return { v: Number(t) };
  // Dates: 2026-09-28, 28/09/2026 (or 09/28/2026 for month-first locales), 28-Sep-2026, Sep 28 2026.
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m && valid(+m[1], +m[2], +m[3])) return { v: dateToSerial(+m[1], +m[2], +m[3]), fmt: "yyyy-mm-dd" };
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const [d, mo] = dayFirst ? [+m[1], +m[2]] : [+m[2], +m[1]];
    if (valid(y, mo, d)) return { v: dateToSerial(y, mo, d), fmt: dayFirst ? "dd/mm/yyyy" : "mm/dd/yyyy" };
  }
  m = t.match(/^(\d{1,2})[\s-]([A-Za-z]{3,9})[\s-,]+(\d{4})$/) ?? null;
  const m2 = t.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
  const named = m ? { d: +m[1], mon: m[2], y: +m[3] } : m2 ? { d: +m2[2], mon: m2[1], y: +m2[3] } : null;
  if (named) {
    const mo = MONTHS.findIndex((x) => x.toLowerCase().startsWith(named.mon.toLowerCase().slice(0, 3))) + 1;
    if (mo && valid(named.y, mo, named.d)) return { v: dateToSerial(named.y, mo, named.d), fmt: "d mmm yyyy" };
  }
  m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (m) {
    let h = +m[1];
    if (m[4]) h = (h % 12) + (m[4].toLowerCase() === "pm" ? 12 : 0);
    if (h < 24 && +m[2] < 60) return { v: (h * 3600 + +m[2] * 60 + +(m[3] ?? 0)) / 86400, fmt: m[4] ? "h:mm AM/PM" : m[3] ? "hh:mm:ss" : "hh:mm" };
  }
  return { v: text };
}

function valid(y: number, m: number, d: number) {
  if (m < 1 || m > 12 || d < 1 || y < 1900 || y > 9999) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Change the number of decimals a format shows (for the .0 / .00 buttons). */
export function stepDecimals(fmt: string | undefined, value: Scalar, delta: 1 | -1): string {
  let f = fmt && !/^General$/i.test(fmt) ? fmt : typeof value === "number" && !Number.isInteger(value) ? `0.${"0".repeat(Math.min(9, (String(value).split(".")[1] ?? "").length))}` : "0";
  if (isDateFormat(f)) return f;
  return sections(f)
    .map((sec) => {
      // Keep quoted text and [tags] (e.g. [$₹-4009]) out of the way while editing the number part.
      const kept: string[] = [];
      // Placeholders use private-use characters, so they can't look like digits.
      const masked = sec.replace(/"[^"]*"|\[[^\]]*\]|\\./g, (m) => String.fromCharCode(0xe000 + kept.push(m) - 1));
      const edited = masked.replace(/([#0?,]*[0#?])(?:\.([0#?]*))?/, (_m, int: string, dec = "") => {
        const n = Math.max(0, dec.length + delta);
        return `${int}${n ? `.${"0".repeat(n)}` : ""}`;
      });
      return edited.replace(/[-]/g, (ch) => kept[ch.charCodeAt(0) - 0xe000]);
    })
    .join(";");
}

/** Number formats offered in the toolbar. */
export const FORMAT_PRESETS: { label: string; fmt: string }[] = [
  { label: "General", fmt: "General" },
  { label: "Number", fmt: "#,##0.00" },
  { label: "Whole number", fmt: "#,##0" },
  { label: "Rupees", fmt: "[$₹-4009]#,##,##0.00" },
  { label: "Dollars", fmt: "$#,##0.00" },
  { label: "Euros", fmt: "€#,##0.00" },
  { label: "Percent", fmt: "0%" },
  { label: "Percent 0.00", fmt: "0.00%" },
  { label: "Date 28/09/2026", fmt: "dd/mm/yyyy" },
  { label: "Date 2026-09-28", fmt: "yyyy-mm-dd" },
  { label: "Date 28 Sep 2026", fmt: "d mmm yyyy" },
  { label: "Time 14:30", fmt: "hh:mm" },
  { label: "Scientific", fmt: "0.00E+00" },
  { label: "Text", fmt: "@" },
];
