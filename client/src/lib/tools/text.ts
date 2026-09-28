/**
 * Layout analysis over positioned text runs (no pdf.js, no DOM): lines,
 * cells, paragraphs, headings, lists and tables. Powers PDF → Markdown /
 * Word / Excel and Compare.
 */

export interface TextRun {
  str: string;
  /** left edge, points from the page's left (as displayed) */
  x: number;
  /** baseline, points from the page's top (as displayed) */
  baseline: number;
  width: number;
  size: number;
  bold: boolean;
  italic: boolean;
  eol?: boolean;
  user?: { x: number; y: number; dx: number; dy: number; ux: number; uy: number; width: number };
}

export interface Line {
  runs: TextRun[];
  text: string;
  x: number;
  x1: number;
  baseline: number;
  size: number;
  bold: boolean;
  italic: boolean;
}

export interface PageText {
  lines: Line[];
  width: number;
  height: number;
}

/** Group runs into visual lines (top to bottom, left to right). */
export function groupLines(runs: TextRun[]): Line[] {
  const sorted = [...runs].filter((r) => r.str.trim()).sort((a, b) => a.baseline - b.baseline || a.x - b.x);
  const rows: TextRun[][] = [];
  for (const r of sorted) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row[0].baseline - r.baseline) < Math.max(row[0].size, r.size) * 0.4) row.push(r);
    else rows.push([r]);
  }
  return rows.map((row) => {
    row.sort((a, b) => a.x - b.x);
    let text = "";
    row.forEach((r, i) => {
      if (i > 0) {
        const prev = row[i - 1];
        const gap = r.x - (prev.x + prev.width);
        if (gap > r.size * 0.15 && !text.endsWith(" ") && !r.str.startsWith(" ")) text += " ";
      }
      text += r.str;
    });
    const chars = row.reduce((n, r) => n + r.str.length, 0) || 1;
    const size = row.reduce((s, r) => s + r.size * r.str.length, 0) / chars;
    return {
      runs: row,
      text: text.replace(/\s+/g, " ").trim(),
      x: row[0].x,
      x1: Math.max(...row.map((r) => r.x + r.width)),
      baseline: row[0].baseline,
      size,
      bold: row.every((r) => r.bold),
      italic: row.every((r) => r.italic),
    };
  });
}

export interface Cell {
  text: string;
  x: number;
  x1: number;
}

/** Split a line into cells wherever the horizontal gap is wide (table columns). */
export function lineCells(line: Line, gapFactor = 1.2): Cell[] {
  const cells: Cell[] = [];
  for (const r of line.runs) {
    const last = cells[cells.length - 1];
    if (last && r.x - last.x1 < r.size * gapFactor) {
      const gap = r.x - last.x1;
      last.text += (gap > r.size * 0.15 && !last.text.endsWith(" ") ? " " : "") + r.str;
      last.x1 = Math.max(last.x1, r.x + r.width);
    } else {
      cells.push({ text: r.str, x: r.x, x1: r.x + r.width });
    }
  }
  return cells.map((c) => ({ ...c, text: c.text.replace(/\s+/g, " ").trim() })).filter((c) => c.text);
}

/** Most common line size, weighted by characters: the "body" text size. */
export function bodySize(lines: Line[]): number {
  const weight = new Map<number, number>();
  for (const l of lines) {
    const k = Math.round(l.size * 2) / 2;
    weight.set(k, (weight.get(k) ?? 0) + l.text.length);
  }
  return [...weight].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 11;
}

// ─── Blocks (paragraphs, headings, lists, tables) ────────────────────

export type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string; bold: boolean; italic: boolean }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "table"; rows: string[][] };

const BULLET = /^[•·▪◦‣●○■□–\-*]\s+/;
const NUMBERED = /^(\d{1,3}|[a-z])[.)]\s+/i;

/** Consecutive lines that share 2+ cell columns → a table. */
function findTables(lines: Line[]): { start: number; end: number; rows: string[][] }[] {
  const out: { start: number; end: number; rows: string[][] }[] = [];
  let i = 0;
  while (i < lines.length) {
    const cells = lineCells(lines[i]);
    if (cells.length < 2) {
      i++;
      continue;
    }
    // Extend while following lines also have 2+ cells and stay close vertically.
    let j = i + 1;
    const rowCells: Cell[][] = [cells];
    while (j < lines.length) {
      const c = lineCells(lines[j]);
      const gap = lines[j].baseline - lines[j - 1].baseline;
      if (c.length < 2 || gap > lines[j].size * 3.2) break;
      rowCells.push(c);
      j++;
    }
    if (rowCells.length >= 2) {
      out.push({ start: i, end: j, rows: alignColumns(rowCells) });
      i = j;
    } else i++;
  }
  return out;
}

/** Snap cells from several rows onto shared column anchors. */
export function alignColumns(rows: Cell[][]): string[][] {
  const anchors: number[] = [];
  const tol = 14;
  for (const row of rows) {
    for (const c of row) {
      if (!anchors.some((a) => Math.abs(a - c.x) < tol)) anchors.push(c.x);
    }
  }
  anchors.sort((a, b) => a - b);
  return rows.map((row) => {
    const out = anchors.map(() => "");
    for (const c of row) {
      let best = 0;
      for (let k = 1; k < anchors.length; k++) if (Math.abs(anchors[k] - c.x) < Math.abs(anchors[best] - c.x)) best = k;
      out[best] = out[best] ? `${out[best]} ${c.text}` : c.text;
    }
    return out;
  });
}

/** Turn a page's lines into structured blocks. `body` is the document's body size. */
export function toBlocks(lines: Line[], body = bodySize(lines)): Block[] {
  const blocks: Block[] = [];
  const tables = findTables(lines);
  let t = 0;
  let para: { lines: Line[] } | null = null;
  const flushPara = () => {
    if (!para) return;
    let text = "";
    for (const l of para.lines) {
      if (text.endsWith("-") && /^[a-z]/.test(l.text)) text = text.slice(0, -1) + l.text; // de-hyphenate
      else text += (text ? " " : "") + l.text;
    }
    blocks.push({ kind: "paragraph", text, bold: para.lines.every((l) => l.bold), italic: para.lines.every((l) => l.italic) });
    para = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const table = tables[t];
    if (table && i === table.start) {
      flushPara();
      blocks.push({ kind: "table", rows: table.rows });
      i = table.end - 1;
      t++;
      continue;
    }
    const l = lines[i];
    const ratio = l.size / body;
    if ((ratio >= 1.15 || (l.bold && l.text.length < 90 && ratio >= 0.95)) && l.text.length < 140) {
      flushPara();
      const level: 1 | 2 | 3 = ratio >= 1.6 ? 1 : ratio >= 1.15 ? 2 : 3;
      // Headings that wrap onto a second line of the same size merge.
      const prev = blocks[blocks.length - 1];
      const prevLine = lines[i - 1];
      if (prev?.kind === "heading" && prev.level === level && prevLine && l.baseline - prevLine.baseline < l.size * 1.6) {
        prev.text += ` ${l.text}`;
      } else blocks.push({ kind: "heading", level, text: l.text });
      continue;
    }
    const bullet = BULLET.test(l.text);
    const numbered = !bullet && NUMBERED.test(l.text) && l.text.length > 3;
    if (bullet || numbered) {
      flushPara();
      const item = l.text.replace(bullet ? BULLET : NUMBERED, "");
      const prev = blocks[blocks.length - 1];
      if (prev?.kind === "list" && prev.ordered === numbered) prev.items.push(item);
      else blocks.push({ kind: "list", ordered: numbered, items: [item] });
      continue;
    }
    // Continuation of a list item (indented, close below)?
    const prev = blocks[blocks.length - 1];
    const prevLine = lines[i - 1];
    if (!para && prev?.kind === "list" && prevLine && l.baseline - prevLine.baseline < l.size * 1.7 && l.x > prevLine.x) {
      prev.items[prev.items.length - 1] += ` ${l.text}`;
      continue;
    }
    if (para) {
      const last = para.lines[para.lines.length - 1];
      const gap = l.baseline - last.baseline;
      const sameStyle = Math.abs(l.size - last.size) < 0.8;
      if (gap < l.size * 1.75 && sameStyle && Math.abs(l.x - para.lines[0].x) < l.size * 2.5) {
        para.lines.push(l);
        continue;
      }
      flushPara();
    }
    para = { lines: [l] };
  }
  flushPara();
  return blocks;
}

// ─── Markdown ───────────────────────────────────────────────────────

const mdEscape = (s: string) => s.replace(/([\\`*_[\]#|])/g, "\\$1");

export function blocksToMarkdown(blocks: Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.kind === "heading") out.push(`${"#".repeat(b.level)} ${mdEscape(b.text)}`);
    else if (b.kind === "paragraph") {
      const t = mdEscape(b.text);
      out.push(b.bold ? `**${t}**` : b.italic ? `*${t}*` : t);
    } else if (b.kind === "list") out.push(b.items.map((it, i) => `${b.ordered ? `${i + 1}.` : "-"} ${mdEscape(it)}`).join("\n"));
    else {
      const width = Math.max(...b.rows.map((r) => r.length));
      const row = (r: string[]) => `| ${Array.from({ length: width }, (_, k) => mdEscape(r[k] ?? "")).join(" | ")} |`;
      out.push([row(b.rows[0]), `| ${Array(width).fill("---").join(" | ")} |`, ...b.rows.slice(1).map(row)].join("\n"));
    }
  }
  return out.join("\n\n");
}

export function pagesToMarkdown(pages: PageText[], opts: { pageBreaks?: boolean } = {}): string {
  const all = pages.flatMap((p) => p.lines);
  const body = bodySize(all);
  return pages
    .map((p) => blocksToMarkdown(toBlocks(p.lines, body)))
    .filter(Boolean)
    .join(opts.pageBreaks === false ? "\n\n" : "\n\n---\n\n")
    .concat("\n");
}

// ─── Diff (Compare PDF) ─────────────────────────────────────────────

export type DiffOp = { op: "same" | "add" | "del"; text: string };

/** Line diff via longest common subsequence (fine for documents up to a few thousand lines). */
export function diffLines(a: string[], b: string[]): DiffOp[] {
  const n = a.length;
  const m = b.length;
  // Strip identical prefix/suffix to keep the table small.
  let pre = 0;
  while (pre < n && pre < m && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < n - pre && suf < m - pre && a[n - 1 - suf] === b[m - 1 - suf]) suf++;
  const A = a.slice(pre, n - suf);
  const B = b.slice(pre, m - suf);
  const dp: Uint32Array[] = Array.from({ length: A.length + 1 }, () => new Uint32Array(B.length + 1));
  for (let i = A.length - 1; i >= 0; i--)
    for (let j = B.length - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const mid: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) {
      mid.push({ op: "same", text: A[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) mid.push({ op: "del", text: A[i++] });
    else mid.push({ op: "add", text: B[j++] });
  }
  while (i < A.length) mid.push({ op: "del", text: A[i++] });
  while (j < B.length) mid.push({ op: "add", text: B[j++] });
  return [...a.slice(0, pre).map((t) => ({ op: "same" as const, text: t })), ...mid, ...a.slice(n - suf).map((t) => ({ op: "same" as const, text: t }))];
}
