// Prints per-page text, rotation, size and annotations of a PDF: node scripts/inspect-pdf.mjs file.pdf
import { readFileSync } from "node:fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const pdf = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(process.argv[2])), verbosity: 0 }).promise;
console.log("pages:", pdf.numPages);
for (let i = 1; i <= pdf.numPages; i++) {
  const p = await pdf.getPage(i);
  const text = (await p.getTextContent()).items.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim();
  const annots = (await p.getAnnotations()).map((a) => `${a.subtype}:${a.contentsObj?.str ?? ""}`);
  console.log(`\n[page ${i}] rotate=${p.rotate} size=${p.view.slice(2).map(Math.round).join("x")}`);
  console.log("  text:", text.slice(0, 260) || "(none)");
  if (annots.length) console.log("  annots:", annots.join(" | "));
}
