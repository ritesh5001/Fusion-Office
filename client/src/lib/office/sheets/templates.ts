import { emptySheet, emptyWorkbook, parseRange, type Cell, type CellStyle, type Workbook } from "./model";

const RUPEES = "[$₹-4009]#,##,##0.00";

function sheetFrom(name: string, cells: Record<string, Cell>, cols: Record<number, number> = {}, freezeRows = 0): Workbook {
  const s = emptySheet(name);
  for (const [a, c] of Object.entries(cells)) {
    const g = parseRange(a)!;
    s.cells[`${g.r1},${g.c1}`] = c;
  }
  s.cols = cols;
  if (freezeRows) s.freeze = { rows: freezeRows, cols: 0 };
  return { sheets: [s] };
}

const head: CellStyle = { b: true, fill: "#e8eefc", border: { b: "#8da2d8" } };

export interface SheetTemplate {
  id: string;
  label: string;
  hint: string;
  build: () => Workbook;
}

export const SHEET_TEMPLATES: SheetTemplate[] = [
  { id: "blank", label: "Blank", hint: "An empty workbook", build: emptyWorkbook },
  {
    id: "budget",
    label: "Monthly budget",
    hint: "Income, expenses, what's left",
    build: () => {
      const rows: [string, number][] = [
        ["Rent", 18000],
        ["Groceries", 9000],
        ["Utilities", 3500],
        ["Transport", 4000],
        ["Eating out", 3000],
        ["Savings", 10000],
      ];
      const cells: Record<string, Cell> = {
        A1: { v: "Monthly budget", s: { b: true, size: 16 } },
        A3: { v: "Income", s: { b: true } },
        B3: { v: 60000, s: { fmt: RUPEES } },
        A5: { v: "Expense", s: head },
        B5: { v: "Amount", s: { ...head, h: "right" } },
        C5: { v: "% of income", s: { ...head, h: "right" } },
      };
      rows.forEach(([label, amt], i) => {
        const r = 6 + i;
        cells[`A${r}`] = { v: label };
        cells[`B${r}`] = { v: amt, s: { fmt: RUPEES } };
        cells[`C${r}`] = { f: `B${r}/$B$3`, s: { fmt: "0.0%" } };
      });
      const last = 5 + rows.length;
      cells[`A${last + 1}`] = { v: "Total spent", s: { b: true, border: { t: "#8da2d8" } } };
      cells[`B${last + 1}`] = { f: `SUM(B6:B${last})`, s: { b: true, fmt: RUPEES, border: { t: "#8da2d8" } } };
      cells[`C${last + 1}`] = { f: `B${last + 1}/$B$3`, s: { b: true, fmt: "0.0%", border: { t: "#8da2d8" } } };
      cells[`A${last + 2}`] = { v: "Left over", s: { b: true } };
      cells[`B${last + 2}`] = { f: `B3-B${last + 1}`, s: { b: true, fmt: RUPEES, color: "#2f9e44" } };
      return sheetFrom("Budget", cells, { 0: 160, 1: 130, 2: 110 });
    },
  },
  {
    id: "invoice",
    label: "Invoice",
    hint: "Items, GST and total",
    build: () => {
      const items: [string, number, number][] = [
        ["Website design", 1, 40000],
        ["Hosting (12 months)", 12, 800],
        ["Logo refresh", 1, 8000],
      ];
      const cells: Record<string, Cell> = {
        A1: { v: "INVOICE", s: { b: true, size: 18, color: "#2f54eb" } },
        A3: { v: "Bill to", s: { b: true } },
        A4: { v: "Client name" },
        D3: { v: "Invoice no.", s: { b: true } },
        E3: { v: "INV-001" },
        D4: { v: "Date", s: { b: true } },
        E4: { f: "TODAY()", s: { fmt: "dd/mm/yyyy", h: "left" } },
        A6: { v: "Description", s: head },
        B6: { v: "Qty", s: { ...head, h: "right" } },
        C6: { v: "Rate", s: { ...head, h: "right" } },
        D6: { v: "Amount", s: { ...head, h: "right" } },
      };
      items.forEach(([d, q, rate], i) => {
        const r = 7 + i;
        cells[`A${r}`] = { v: d };
        cells[`B${r}`] = { v: q };
        cells[`C${r}`] = { v: rate, s: { fmt: RUPEES } };
        cells[`D${r}`] = { f: `B${r}*C${r}`, s: { fmt: RUPEES } };
      });
      const end = 6 + items.length;
      cells[`C${end + 2}`] = { v: "Subtotal", s: { h: "right" } };
      cells[`D${end + 2}`] = { f: `SUM(D7:D${end})`, s: { fmt: RUPEES } };
      cells[`C${end + 3}`] = { v: "GST 18%", s: { h: "right" } };
      cells[`D${end + 3}`] = { f: `ROUND(D${end + 2}*18%,2)`, s: { fmt: RUPEES } };
      cells[`C${end + 4}`] = { v: "Total", s: { b: true, h: "right" } };
      cells[`D${end + 4}`] = { f: `D${end + 2}+D${end + 3}`, s: { b: true, fmt: RUPEES, border: { t: "#111111", b: "#111111" } } };
      return sheetFrom("Invoice", cells, { 0: 220, 1: 60, 2: 120, 3: 130, 4: 110 });
    },
  },
];
