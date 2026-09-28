// Generates a small multi-page PDF for manual testing: node scripts/make-sample-pdf.mjs out.pdf
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { writeFileSync } from "node:fs";

const out = process.argv[2] ?? "sample.pdf";
const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const para = "Fusion Office is a document workspace. This paragraph exists so you can test highlighting, underlining and strikethrough across multiple lines of real PDF text.";

for (let i = 1; i <= 4; i++) {
  const page = doc.addPage([595.28, 841.89]);
  page.drawText(`Invoice #${1000 + i}`, { x: 60, y: 770, size: 24, font: bold, color: rgb(0.1, 0.1, 0.2) });
  page.drawText(`Page ${i} of 4`, { x: 460, y: 775, size: 10, font });
  let y = 720;
  for (const line of wrap(para, 80)) {
    page.drawText(line, { x: 60, y, size: 12, font });
    y -= 18;
  }
  page.drawText("Phone: 9876543210   Email: billing@example.com", { x: 60, y: y - 20, size: 12, font });
  page.drawText("Old price: Rs. 999   New price: Rs. 799", { x: 60, y: y - 44, size: 12, font });
  page.drawRectangle({ x: 60, y: 200, width: 475, height: 120, borderColor: rgb(0.7, 0.7, 0.75), borderWidth: 1 });
  page.drawText("Signature:", { x: 72, y: 290, size: 11, font });
  if (i === 3) page.setRotation(degrees(90));
}
writeFileSync(out, await doc.save());
console.log("wrote", out);

function wrap(t, n) {
  const words = t.split(" "), lines = [];
  let l = "";
  for (const w of words) { if ((l + " " + w).trim().length > n) { lines.push(l); l = w; } else l = (l + " " + w).trim(); }
  lines.push(l);
  return lines;
}
