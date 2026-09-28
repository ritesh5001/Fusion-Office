// Excel editor: number formats, input parsing, formulas and reference rewriting.
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatValue, parseInput, stepDecimals, dateToSerial } from "../src/lib/office/sheets/format.ts";
import { Engine, translateFormula, shiftForStructure } from "../src/lib/office/sheets/formula.ts";
import { addr, colIndex, colName, parseRange, type Cell, type Workbook } from "../src/lib/office/sheets/model.ts";

test("addresses", () => {
  assert.equal(colName(0), "A");
  assert.equal(colName(25), "Z");
  assert.equal(colName(26), "AA");
  assert.equal(colName(701), "ZZ");
  assert.equal(colIndex("AA"), 26);
  assert.equal(addr(11, 1), "B12");
  assert.deepEqual(parseRange("C5:A1"), { r1: 0, c1: 0, r2: 4, c2: 2 });
});

test("number formats", () => {
  assert.equal(formatValue(1234.5, "#,##0.00"), "1,234.50");
  assert.equal(formatValue(1234567.891, "#,##0"), "1,234,568");
  assert.equal(formatValue(1234567.5, "[$₹-4009]#,##,##0.00"), "₹12,34,567.50");
  assert.equal(formatValue(-42, "$#,##0.00"), "-$42.00");
  assert.equal(formatValue(-42, "#,##0;(#,##0)"), "(42)");
  assert.equal(formatValue(0.256, "0%"), "26%");
  assert.equal(formatValue(0.2567, "0.00%"), "25.67%");
  assert.equal(formatValue(12345.678, "0.00E+00"), "1.23E+04");
  assert.equal(formatValue(1500000, "#,##0.0,,\"M\""), "1.5M");
  const d = dateToSerial(2026, 9, 28);
  assert.equal(d, 46293);
  assert.equal(formatValue(d, "dd/mm/yyyy"), "28/09/2026");
  assert.equal(formatValue(d, "yyyy-mm-dd"), "2026-09-28");
  assert.equal(formatValue(d, "d mmm yyyy"), "28 Sep 2026");
  assert.equal(formatValue(d, "dddd, mmmm d"), "Monday, September 28");
  assert.equal(formatValue(0.5 + 1 / 1440 * 5, "hh:mm"), "12:05");
  assert.equal(formatValue(0.75, "h:mm AM/PM"), "6:00 PM");
  assert.equal(formatValue(1 / 3, undefined), "0.3333333333");
  assert.equal(formatValue(true, undefined), "TRUE");
  assert.equal(stepDecimals("#,##0", 5, 1), "#,##0.0");
  assert.equal(stepDecimals("0.00%", 5, -1), "0.0%");
  assert.equal(stepDecimals("[$₹-4009]#,##,##0.00", 5, 1), "[$₹-4009]#,##,##0.000");
});

test("typing values", () => {
  assert.deepEqual(parseInput("=SUM(A1:A3)"), { formula: "SUM(A1:A3)" });
  assert.deepEqual(parseInput("42"), { v: 42 });
  assert.deepEqual(parseInput("12%"), { v: 0.12, fmt: "0%" });
  assert.deepEqual(parseInput("₹1,20,000"), { v: 120000, fmt: "[$₹-4009]#,##,##0.00" });
  assert.deepEqual(parseInput("1,234.50"), { v: 1234.5, fmt: "#,##0.00" });
  assert.deepEqual(parseInput("28/09/2026"), { v: 46293, fmt: "dd/mm/yyyy" });
  assert.deepEqual(parseInput("09/28/2026", false), { v: 46293, fmt: "mm/dd/yyyy" });
  assert.deepEqual(parseInput("2026-09-28"), { v: 46293, fmt: "yyyy-mm-dd" });
  assert.deepEqual(parseInput("28 Sep 2026"), { v: 46293, fmt: "d mmm yyyy" });
  assert.deepEqual(parseInput("TRUE"), { v: true });
  assert.deepEqual(parseInput("'00123"), { v: "00123" });
  assert.deepEqual(parseInput("31/02/2026"), { v: "31/02/2026" });
  assert.deepEqual(parseInput("hello"), { v: "hello" });
});

function book(cells: Record<string, Cell>, extra: Record<string, Record<string, Cell>> = {}): Workbook {
  const toKeys = (m: Record<string, Cell>) => Object.fromEntries(Object.entries(m).map(([a, c]) => {
    const g = parseRange(a)!;
    return [`${g.r1},${g.c1}`, c];
  }));
  return { sheets: [{ id: "a", name: "Sheet1", cells: toKeys(cells), cols: {}, rows: {}, merges: [] }, ...Object.entries(extra).map(([name, m]) => ({ id: name, name, cells: toKeys(m), cols: {}, rows: {}, merges: [] }))] };
}
const val = (wb: Workbook, a: string, s = 0) => {
  const g = parseRange(a)!;
  const v = new Engine(wb).value(s, g.r1, g.c1);
  return v instanceof Error ? v.message : v;
};

test("formulas: arithmetic, precedence, text, comparison", () => {
  const wb = book({ A1: { v: 10 }, A2: { v: 20 }, A3: { v: "5" }, B1: { f: "A1+A2*2" }, B2: { f: "(A1+A2)*2" }, B3: { f: "-2^2" }, B4: { f: "A1&\" items\"" }, B5: { f: "A1>A2" }, B6: { f: "A1/0" }, B7: { f: "A3*2" }, B8: { f: "50%*A1" }, B9: { f: "\"abc\"=\"ABC\"" }, B10: { f: "A99+1" } });
  assert.equal(val(wb, "B1"), 50);
  assert.equal(val(wb, "B2"), 60);
  assert.equal(val(wb, "B3"), 4);
  assert.equal(val(wb, "B4"), "10 items");
  assert.equal(val(wb, "B5"), false);
  assert.equal(val(wb, "B6"), "#DIV/0!");
  assert.equal(val(wb, "B7"), 10);
  assert.equal(val(wb, "B8"), 5);
  assert.equal(val(wb, "B9"), true);
  assert.equal(val(wb, "B10"), 1);
});

test("formulas: functions, ranges, errors, other sheets", () => {
  const wb = book(
    {
      A1: { v: "Region" }, B1: { v: "Sales" },
      A2: { v: "North" }, B2: { v: 120 },
      A3: { v: "South" }, B3: { v: 95 },
      A4: { v: "North" }, B4: { v: 30 },
      C1: { f: "SUM(B2:B4)" },
      C2: { f: "AVERAGE(B:B)" },
      C3: { f: "SUMIF(A2:A4,\"North\",B2:B4)" },
      C4: { f: "VLOOKUP(\"South\",A2:B4,2,FALSE)" },
      C5: { f: "IFERROR(VLOOKUP(\"East\",A2:B4,2,FALSE),\"none\")" },
      C6: { f: "IF(B2>100,\"big\",\"small\")" },
      C7: { f: "COUNTA(A:A)" },
      C8: { f: "ROUND(C2,1)" },
      C9: { f: "Data!A1*2" },
      C10: { f: "'My data'!B2+1" },
      C11: { f: "SUMPRODUCT((A2:A4=\"North\")*B2:B4)" },
      C12: { f: "TEXT(DATE(2026,9,28),\"d mmm yyyy\")" },
      C13: { f: "NOPE(1)" },
      C14: { f: "C14+1" },
      C15: { f: "MAX(B2:B4)-MIN(B2:B4)" },
      C16: { f: "UPPER(LEFT(A3,2))" },
      C17: { f: "ISBLANK(Z9)" },
      C18: { f: "INDEX(B2:B4,MATCH(\"South\",A2:A4,0))" },
      C19: { f: "NORM.DIST(0,0,1,TRUE)" },
    },
    { Data: { A1: { v: 21 } }, "My data": { B2: { v: 1 } } },
  );
  assert.equal(val(wb, "C1"), 245);
  assert.ok(Math.abs((val(wb, "C2") as number) - 81.6667) < 0.001);
  assert.equal(val(wb, "C3"), 150);
  assert.equal(val(wb, "C4"), 95);
  assert.equal(val(wb, "C5"), "none");
  assert.equal(val(wb, "C6"), "big");
  assert.equal(val(wb, "C7"), 4);
  assert.equal(val(wb, "C8"), 81.7);
  assert.equal(val(wb, "C9"), 42);
  assert.equal(val(wb, "C10"), 2);
  assert.equal(val(wb, "C11"), 150);
  assert.equal(val(wb, "C12"), "28 Sep 2026");
  assert.equal(val(wb, "C13"), "#NAME?");
  assert.equal(val(wb, "C14"), "#CALC!");
  assert.equal(val(wb, "C15"), 90);
  assert.equal(val(wb, "C16"), "SO");
  assert.equal(val(wb, "C17"), true);
  assert.equal(val(wb, "C18"), 95);
  assert.equal(val(wb, "C19"), 0.5);
});

test("a long running-total chain computes after warming", () => {
  const cells: Record<string, Cell> = { A1: { v: 1 } };
  for (let r = 2; r <= 5000; r++) cells[`A${r}`] = { f: `A${r - 1}+1` };
  const wb = book(cells);
  const e = new Engine(wb);
  e.warm(0);
  assert.equal(e.value(0, 4999, 0), 5000);
});

test("copying formulas moves relative references only", () => {
  assert.equal(translateFormula("A1+$B$1+B$2+$C3", 2, 1), "B3+$B$1+C$2+$C5");
  assert.equal(translateFormula("SUM(A1:A3)", 1, 0), "SUM(A2:A4)");
  assert.equal(translateFormula("Sheet2!A1*2", 0, 1), "Sheet2!B1*2");
  assert.equal(translateFormula("A1", -1, 0), "#REF!");
  assert.equal(translateFormula("SUM(B:B)", 5, 1), "SUM(C:C)");
});

test("inserting and deleting rows keeps references pointing at the same cells", () => {
  assert.equal(shiftForStructure("A1+A5", "Sheet1", "Sheet1", "row", 2, 3), "A1+A8");
  assert.equal(shiftForStructure("SUM(A1:A10)", "Sheet1", "Sheet1", "row", 4, -2), "SUM(A1:A8)");
  assert.equal(shiftForStructure("A5*2", "Sheet1", "Sheet1", "row", 4, -1), "#REF!*2");
  assert.equal(shiftForStructure("Data!B2+B2", "Sheet1", "Data", "col", 0, 1), "Data!C2+B2");
  assert.equal(shiftForStructure("SUM(C:C)", "Sheet1", "Sheet1", "col", 1, 1), "SUM(D:D)");
});

test("xlsx: read a workbook, edit it, save it back with formulas, styles, merges and widths", async () => {
  const ExcelJS = (await import("exceljs")).default;
  const { readXlsx, writeXlsx, csvToWorkbook, sheetToCsv, parseCsv } = await import("../src/lib/office/sheets/xlsx.ts");
  const src = new ExcelJS.Workbook();
  const ws = src.addWorksheet("Sales");
  ws.getCell("A1").value = "Region";
  ws.getCell("B1").value = "Amount";
  ws.getCell("A1").font = { bold: true, color: { argb: "FFC00000" } };
  ws.getCell("A2").value = "North";
  ws.getCell("B2").value = 1200;
  ws.getCell("B2").numFmt = "#,##0.00";
  ws.getCell("A3").value = "South";
  ws.getCell("B3").value = 800;
  ws.getCell("B4").value = { formula: "SUM(B2:B3)", result: 2000 } as never;
  ws.getCell("C1").value = new Date(Date.UTC(2026, 8, 28));
  ws.getCell("A5").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };
  ws.mergeCells("D1:E2");
  ws.getColumn(1).width = 20;
  ws.addConditionalFormatting({ ref: "B2:B3", rules: [{ type: "cellIs", operator: "greaterThan", formulae: [1000], style: { font: { bold: true } }, priority: 1 }] } as never);
  src.addWorksheet("Notes").getCell("A1").value = "keep me";
  const bytes = new Uint8Array(await src.xlsx.writeBuffer());

  const { wb, source, warnings } = await readXlsx(bytes);
  assert.deepEqual(wb.sheets.map((s) => s.name), ["Sales", "Notes"]);
  const s0 = wb.sheets[0];
  assert.equal(s0.cells["0,0"].v, "Region");
  assert.equal(s0.cells["0,0"].s?.b, true);
  assert.equal(s0.cells["0,0"].s?.color, "#c00000");
  assert.equal(s0.cells["1,1"].s?.fmt, "#,##0.00");
  assert.equal(s0.cells["3,1"].f, "SUM(B2:B3)");
  assert.equal(s0.cells["0,2"].v, 46293);
  assert.equal(s0.cells["4,0"].s?.fill, "#ffff00");
  assert.deepEqual(s0.merges, [{ r1: 0, c1: 3, r2: 1, c2: 4 }]);
  assert.equal(s0.cols[0], 145);
  assert.ok(warnings.some((w) => /Conditional/.test(w)));

  // Edit: change a number, add a formula, rename the second sheet.
  s0.cells["1,1"] = { ...s0.cells["1,1"], v: 1500 };
  s0.cells["4,1"] = { f: "B4*2" };
  wb.sheets[1].name = "Read me";
  const engine = new Engine(wb);
  assert.equal(engine.value(0, 3, 1), 2300);
  const out = await writeXlsx(wb, engine, source);

  const again = new ExcelJS.Workbook();
  await again.xlsx.load(out.buffer as ArrayBuffer);
  const w = again.getWorksheet("Sales")!;
  assert.equal(w.getCell("B2").value, 1500);
  assert.equal(w.getCell("B2").numFmt, "#,##0.00");
  assert.deepEqual(w.getCell("B4").value, { formula: "SUM(B2:B3)", result: 2300 });
  assert.equal((w.getCell("B5").value as { formula: string }).formula, "B4*2");
  assert.equal(w.getCell("A1").font?.bold, true);
  assert.ok(w.getCell("D1").isMerged);
  assert.equal(Math.round(w.getColumn(1).width!), 20);
  assert.ok(again.getWorksheet("Read me"));
  // Conditional formatting survives because we saved into the original workbook.
  assert.equal((w as unknown as { conditionalFormattings: unknown[] }).conditionalFormattings.length, 1);

  // CSV in and out.
  assert.deepEqual(parseCsv('a,"b, c",d\n1,"he said ""hi""",3\n'), [["a", "b, c", "d"], ["1", 'he said "hi"', "3"]]);
  const csvWb = csvToWorkbook("Item;Price\nTea;₹120\nDate;28/09/2026\n", "prices");
  assert.equal(csvWb.sheets[0].cells["1,1"].v, 120);
  assert.equal(csvWb.sheets[0].cells["2,1"].v, 46293);
  assert.equal(sheetToCsv(csvWb, 0, new Engine(csvWb)), "Item,Price\r\nTea,₹120.00\r\nDate,28/09/2026");
});

test("sheet operations: fill series, sort, insert/delete rows, rename, paste", async () => {
  const { fillRange, sortRange, insertAxis, renameSheet, pasteClip, parseTsv } = await import("../src/lib/office/sheets/ops.ts");
  const mk = (cells: Record<string, Cell>) => book(cells).sheets[0];
  const v = (s: { cells: Record<string, Cell> }, a: string) => {
    const g = parseRange(a)!;
    const c = s.cells[`${g.r1},${g.c1}`];
    return c?.f !== undefined ? `=${c.f}` : c?.v;
  };
  // 1, 2 → 3, 4, 5 ; "Item 1" → Item 2… ; Mon → Tue… ; formula shifts ; single date counts days.
  const s = mk({ A1: { v: 1 }, A2: { v: 2 }, B1: { v: "Item 1" }, C1: { v: "Mon" }, D1: { f: "A1*2" }, E1: { v: 46293, s: { fmt: "dd/mm/yyyy" } } });
  const f1 = fillRange(s, { r1: 0, c1: 0, r2: 1, c2: 0 }, { r1: 0, c1: 0, r2: 4, c2: 0 });
  assert.deepEqual(["A3", "A4", "A5"].map((a) => v(f1, a)), [3, 4, 5]);
  const f2 = fillRange(s, { r1: 0, c1: 1, r2: 0, c2: 4 }, { r1: 0, c1: 1, r2: 2, c2: 4 });
  assert.deepEqual(["B2", "B3", "C2", "C3", "D2", "D3", "E2"].map((a) => v(f2, a)), ["Item 2", "Item 3", "Tue", "Wed", "=A2*2", "=A3*2", 46294]);
  const sunday = fillRange(mk({ A1: { v: "Sunday" } }), { r1: 0, c1: 0, r2: 0, c2: 0 }, { r1: 0, c1: 0, r2: 1, c2: 0 });
  assert.equal(v(sunday, "A2"), "Monday");

  // Sort by the second column, descending, with a header row; blanks last.
  const table = mk({ A1: { v: "Name" }, B1: { v: "Score" }, A2: { v: "Asha" }, B2: { v: 70 }, A3: { v: "Ravi" }, B3: { v: 95 }, A4: { v: "Meera" }, A5: { v: "Kabir" }, B5: { v: 82 } });
  const sorted = sortRange(table, { r1: 0, c1: 0, r2: 4, c2: 1 }, 1, false, true, (r, c) => table.cells[`${r},${c}`]?.v ?? null);
  assert.deepEqual(["A1", "A2", "A3", "A4", "A5"].map((a) => v(sorted, a)), ["Name", "Ravi", "Kabir", "Asha", "Meera"]);

  // Insert two rows above row 2: data and formulas (also on other sheets) follow.
  const wb = book({ A1: { v: 1 }, A2: { v: 2 }, A3: { f: "SUM(A1:A2)" } }, { Other: { A1: { f: "Sheet1!A2*10" } } });
  const ins = insertAxis(wb, 0, "row", 1, 2);
  assert.equal(v(ins.sheets[0], "A4"), 2);
  assert.equal(v(ins.sheets[0], "A5"), "=SUM(A1:A4)");
  assert.equal(v(ins.sheets[1], "A1"), "=Sheet1!A4*10");
  const del = insertAxis(ins, 0, "row", 1, -2);
  assert.equal(v(del.sheets[0], "A3"), "=SUM(A1:A2)");
  assert.equal(new Engine(del).value(0, 2, 0), 3);

  // Renaming a sheet updates references to it.
  const ren = renameSheet(wb, 0, "Q3 data");
  assert.equal(v(ren.sheets[1], "A1"), "='Q3 data'!A2*10");
  assert.equal(new Engine(ren).value(1, 0, 0), 20);

  // Paste: formulas move with the paste position.
  const pasted = pasteClip(mk({}), { sheet: 0, range: { r1: 0, c1: 0, r2: 0, c2: 1 }, cells: [[{ v: 5 }, { f: "A1*2" }]], cut: false, text: "" }, 3, 2);
  assert.equal(v(pasted, "C4"), 5);
  assert.equal(v(pasted, "D4"), "=C4*2");
  assert.deepEqual(parseTsv('a\tb\n"x\ny"\t2\n'), [["a", "b"], ["x\ny", "2"]]);
});
