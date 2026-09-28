// PowerPoint editor: a deck survives PPTX export and import (text runs, bullets,
// shapes, pictures, tables, backgrounds, notes).
import { test } from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { DOMParser } from "@xmldom/xmldom";
import { writePptx, textRuns } from "../src/lib/office/slides/pptxWrite.ts";
import { readPptx } from "../src/lib/office/slides/pptxRead.ts";
import { layoutSlide, newDeck, plainText, textBox, THEMES, type Deck, type JSONContent } from "../src/lib/office/slides/model.ts";

const parse = (t: string) => new DOMParser().parseFromString(t, "application/xml") as unknown as Document;

function pngDataUrl(): string {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(zlib.crc32(td));
    return Buffer.concat([len, td, c]);
  };
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0])), chunk("IDAT", zlib.deflateSync(Buffer.from([0, 255, 0, 0]))), chunk("IEND", Buffer.alloc(0))]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

const find = (n: JSONContent, pred: (x: JSONContent) => boolean): JSONContent[] => [...(pred(n) ? [n] : []), ...(n.content ?? []).flatMap((c) => find(c, pred))];

function sampleDeck(): Deck {
  const deck = newDeck(THEMES[1]);
  const title = deck.slides[0].elements[0];
  if (title.type === "box") title.text = { type: "doc", content: [{ type: "paragraph", attrs: { textAlign: "center" }, content: [{ type: "text", text: "Quarterly review", marks: [{ type: "bold" }] }] }] };
  const s2 = layoutSlide(deck, "content");
  const [t2, body] = s2.elements;
  if (t2.type === "box") t2.text = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Highlights" }] }] };
  if (body.type === "box")
    body.text = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Revenue up " }, { type: "text", text: "12%", marks: [{ type: "textStyle", attrs: { color: "#16a34a", fontSize: "28pt" } }] }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Two new markets", marks: [{ type: "italic" }, { type: "link", attrs: { href: "https://example.com" } }] }] }] },
          ],
        },
      ],
    };
  s2.elements.push({ id: "shape", type: "box", shape: "ellipse", fill: "#fbbf24", stroke: "#111111", strokeW: 2, x: 900, y: 500, w: 200, h: 120, rot: 15, text: { type: "doc", content: [{ type: "paragraph", attrs: { textAlign: "center" }, content: [{ type: "text", text: "New!" }] }] }, valign: "middle", pad: [6, 6, 6, 6] });
  s2.elements.push({ id: "img", type: "image", src: pngDataUrl(), x: 1000, y: 40, w: 160, h: 160, rot: 0 });
  s2.notes = "Mention the Pune office.";
  const s3 = layoutSlide(deck, "blank");
  s3.background = { color: "#eef2ff" };
  s3.elements.push({ id: "t", type: "table", x: 100, y: 100, w: 600, h: 120, rot: 0, cols: [300, 300], rows: [{ h: 40, cells: [{ text: "Region", bold: true, fill: "#2f54eb", color: "#ffffff" }, { text: "Sales", bold: true, fill: "#2f54eb", color: "#ffffff" }] }, { h: 40, cells: [{ text: "North" }, { text: "₹1,20,000" }] }], border: "#9aa3b2", size: 16 });
  s3.elements.push(textBox(100, 400, 500, 60, { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Plain note" }] }] }, { size: 20, color: "#334155" }));
  deck.slides.push(s2, s3);
  return deck;
}

test("rich text becomes pptx runs with bullets and paragraph breaks", () => {
  const runs = textRuns({ type: "doc", content: [{ type: "paragraph", attrs: { textAlign: "center" }, content: [{ type: "text", text: "A", marks: [{ type: "bold" }] }, { type: "text", text: "B" }] }, { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "C" }] }] }] }] }, {});
  assert.deepEqual(runs.map((r) => r.text), ["A", "B", "C"]);
  assert.equal(runs[0].options?.bold, true);
  assert.equal(runs[0].options?.align, "center");
  assert.equal(runs[1].options?.breakLine, true);
  assert.equal(runs[2].options?.bullet, true);
});

test("a deck survives PPTX export and import", async () => {
  const bytes = await writePptx(sampleDeck());
  assert.equal(String.fromCharCode(bytes[0], bytes[1]), "PK");
  const { deck } = await readPptx(bytes, parse);
  assert.equal(deck.slides.length, 3);
  assert.equal(deck.width, 1280);
  assert.equal(deck.height, 720);

  const s1 = deck.slides[0];
  assert.equal(s1.background.color, "#0f172a");
  const title = s1.elements.find((e) => e.type === "box" && plainText(e.text).includes("Quarterly review"));
  assert.ok(title && title.type === "box");
  assert.ok(find(title.text!, (n) => n.type === "text")[0].marks?.some((m) => m.type === "bold"));
  assert.equal(find(title.text!, (n) => n.type === "paragraph")[0].attrs?.textAlign, "center");

  const s2 = deck.slides[1];
  const body = s2.elements.find((e) => e.type === "box" && plainText(e.text).includes("Revenue"));
  assert.ok(body && body.type === "box");
  const list = find(body.text!, (n) => n.type === "bulletList");
  assert.equal(list.length, 1);
  assert.equal(list[0].content!.length, 2);
  const pct = find(body.text!, (n) => n.type === "text" && n.text === "12%")[0];
  const ts = pct.marks?.find((m) => m.type === "textStyle");
  assert.equal(ts?.attrs?.color, "#16a34a");
  assert.equal(ts?.attrs?.fontSize, "28pt");
  const linked = find(body.text!, (n) => n.type === "text" && n.text === "Two new markets")[0];
  assert.ok(linked.marks?.some((m) => m.type === "italic"));
  assert.equal(linked.marks?.find((m) => m.type === "link")?.attrs?.href, "https://example.com");

  const shape = s2.elements.find((e) => e.type === "box" && e.shape === "ellipse");
  assert.ok(shape && shape.type === "box");
  assert.equal(shape.fill, "#fbbf24");
  assert.equal(shape.stroke, "#111111");
  assert.equal(Math.round(shape.rot), 15);
  assert.equal(Math.round(shape.x), 900);
  assert.equal(Math.round(shape.w), 200);
  assert.equal(plainText(shape.text).trim(), "New!");

  const img = s2.elements.find((e) => e.type === "image");
  assert.ok(img && img.type === "image" && img.src.startsWith("data:image/png;base64,"));
  assert.equal(s2.notes, "Mention the Pune office.");

  const s3 = deck.slides[2];
  assert.equal(s3.background.color, "#eef2ff");
  const table = s3.elements.find((e) => e.type === "table");
  assert.ok(table && table.type === "table");
  assert.deepEqual(table.rows.map((r) => r.cells.map((c) => c.text)), [["Region", "Sales"], ["North", "₹1,20,000"]]);
  assert.equal(table.rows[0].cells[0].fill, "#2f54eb");
  assert.equal(table.rows[0].cells[0].bold, true);
});
