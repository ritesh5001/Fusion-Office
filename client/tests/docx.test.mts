// Word editor: DOCX → document → DOCX keeps text, formatting, lists, tables, images and links.
import { test } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { DOMParser } from "@xmldom/xmldom";
import * as docx from "docx";
import { readDocx } from "../src/lib/office/docx/read.ts";
import { writeDocx, toPoints } from "../src/lib/office/docx/write.ts";
import { imageSize } from "../src/lib/office/imageInfo.ts";
import type { JSONContent } from "../src/lib/office/docx/model.ts";

const parse = (t: string) => new DOMParser().parseFromString(t, "application/xml") as unknown as Document;

/** A real 2×1 PNG. */
function png(): Uint8Array {
  const crc = (buf: Buffer) => zlib.crc32(buf);
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.from([0, 0, 0, 2, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
  const idat = zlib.deflateSync(Buffer.from([0, 255, 0, 0, 0, 0, 255]));
  return new Uint8Array(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]));
}

async function sample(): Promise<Uint8Array> {
  const d = new docx.Document({
    numbering: {
      config: [
        { reference: "b", levels: [0, 1].map((level) => ({ level, format: docx.LevelFormat.BULLET, text: "•", alignment: docx.AlignmentType.LEFT })) },
        { reference: "n", levels: [{ level: 0, format: docx.LevelFormat.DECIMAL, text: "%1.", alignment: docx.AlignmentType.LEFT }] },
      ],
    },
    sections: [
      {
        properties: { page: { size: { width: 12240, height: 15840 } } },
        children: [
          new docx.Paragraph({ heading: docx.HeadingLevel.HEADING_1, children: [new docx.TextRun("Quarterly report")] }),
          new docx.Paragraph({
            alignment: docx.AlignmentType.CENTER,
            children: [
              new docx.TextRun({ text: "Revenue ", bold: true }),
              new docx.TextRun({ text: "grew", italics: true, color: "C00000", size: 28, font: "Georgia" }),
              new docx.TextRun({ text: " 12%", underline: {}, highlight: "yellow" }),
              new docx.ExternalHyperlink({ link: "https://example.com", children: [new docx.TextRun({ text: " source", style: "Hyperlink" })] }),
            ],
          }),
          new docx.Paragraph({ numbering: { reference: "b", level: 0 }, children: [new docx.TextRun("First")] }),
          new docx.Paragraph({ numbering: { reference: "b", level: 1 }, children: [new docx.TextRun("Nested")] }),
          new docx.Paragraph({ numbering: { reference: "b", level: 0 }, children: [new docx.TextRun("Second")] }),
          new docx.Paragraph({ numbering: { reference: "n", level: 0 }, children: [new docx.TextRun("Step one")] }),
          new docx.Paragraph({ numbering: { reference: "n", level: 0 }, children: [new docx.TextRun("Step two")] }),
          new docx.Table({
            columnWidths: [3000, 3000],
            rows: [
              new docx.TableRow({ children: [new docx.TableCell({ columnSpan: 2, shading: { fill: "DDEEFF", type: docx.ShadingType.CLEAR, color: "auto" }, children: [new docx.Paragraph("Merged header")] })] }),
              new docx.TableRow({ children: [new docx.TableCell({ children: [new docx.Paragraph("A")] }), new docx.TableCell({ children: [new docx.Paragraph("B")] })] }),
            ],
          }),
          new docx.Paragraph({ children: [new docx.PageBreak()] }),
          new docx.Paragraph({ children: [new docx.TextRun("Logo:"), new docx.ImageRun({ type: "png", data: png(), transformation: { width: 40, height: 20 } })] }),
        ],
      },
    ],
  });
  return new Uint8Array(await docx.Packer.toBuffer(d));
}

const find = (node: JSONContent, pred: (n: JSONContent) => boolean): JSONContent[] => [...(pred(node) ? [node] : []), ...(node.content ?? []).flatMap((c) => find(c, pred))];
const textOf = (n: JSONContent): string => (n.text ?? "") + (n.content ?? []).map(textOf).join("");

function check(content: JSONContent) {
  const h = find(content, (n) => n.type === "heading")[0];
  assert.equal(h.attrs?.level, 1);
  assert.equal(textOf(h), "Quarterly report");

  const texts = find(content, (n) => n.type === "text");
  const grew = texts.find((t) => t.text === "grew")!;
  assert.ok(grew.marks?.some((m) => m.type === "italic"));
  const ts = grew.marks?.find((m) => m.type === "textStyle")!;
  assert.equal(ts.attrs?.color, "#c00000");
  assert.equal(ts.attrs?.fontSize, "14pt");
  assert.equal(ts.attrs?.fontFamily, "Georgia");
  assert.ok(texts.find((t) => t.text === "Revenue ")!.marks?.some((m) => m.type === "bold"));
  const pct = texts.find((t) => t.text === " 12%")!;
  assert.ok(pct.marks?.some((m) => m.type === "underline"));
  assert.ok(pct.marks?.some((m) => m.type === "highlight"));
  const link = texts.find((t) => t.text === " source")!;
  assert.equal(link.marks?.find((m) => m.type === "link")?.attrs?.href, "https://example.com");
  const centered = find(content, (n) => n.type === "paragraph" && n.attrs?.textAlign === "center");
  assert.equal(centered.length, 1);

  const bullets = find(content, (n) => n.type === "bulletList");
  assert.equal(bullets.length, 2, "outer + nested bullet list");
  assert.deepEqual(bullets[0].content!.map((li) => textOf(li.content![0])), ["First", "Second"]);
  assert.equal(textOf(bullets[1]), "Nested");
  const ordered = find(content, (n) => n.type === "orderedList");
  assert.equal(ordered.length, 1);
  assert.equal(ordered[0].content!.length, 2);

  const table = find(content, (n) => n.type === "table")[0];
  const firstRow = table.content![0].content!;
  assert.equal(firstRow.length, 1);
  assert.equal(firstRow[0].attrs?.colspan, 2);
  assert.equal(firstRow[0].attrs?.backgroundColor, "#ddeeff");
  assert.equal(textOf(table.content![1]), "AB");

  assert.equal(find(content, (n) => n.type === "pageBreak").length, 1);
  const img = find(content, (n) => n.type === "image")[0];
  assert.match(String(img.attrs?.src), /^data:image\/png;base64,/);
  assert.equal(img.attrs?.width, 40);
}

test("reads a DOCX with formatting, lists, a merged table, an image and a link", async () => {
  const { doc } = readDocx(await sample(), parse);
  check(doc.content);
  // US Letter from the section properties.
  assert.equal(doc.meta.page.width, 612);
  assert.equal(doc.meta.page.height, 792);
});

test("writes it back to DOCX without losing any of that", async () => {
  const first = readDocx(await sample(), parse).doc;
  const bytes = await writeDocx(first);
  assert.equal(String.fromCharCode(bytes[0], bytes[1]), "PK");
  const again = readDocx(bytes, parse).doc;
  check(again.content);
  assert.equal(again.meta.page.width, 612);
});

test("unit helpers: sizes and image headers", () => {
  assert.equal(toPoints("14pt", 11), 14);
  assert.equal(toPoints("16px", 11), 12);
  assert.equal(toPoints("2em", 11), 22);
  assert.equal(toPoints("big", 11), undefined);
  assert.deepEqual(imageSize(png()), { width: 2, height: 1 });
});
