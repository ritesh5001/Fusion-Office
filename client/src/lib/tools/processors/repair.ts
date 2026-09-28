import { PDFDocument } from "pdf-lib";

export interface RepairResult {
  bytes: Uint8Array;
  pages: number;
  notes: string[];
}

/**
 * Tolerant re-parse and rebuild: pdf-lib skips objects it can't read and
 * rebuilds the cross-reference table, which fixes truncated files, broken
 * offsets and damaged xref tables. Pages are copied into a clean document.
 */
export async function repairPdf(bytes: Uint8Array): Promise<RepairResult> {
  const notes: string[] = [];
  const text = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  let input = bytes;
  const start = text.indexOf("%PDF-");
  if (start > 0) {
    input = bytes.subarray(start);
    notes.push(`Removed ${start} bytes of junk before the PDF header.`);
  } else if (start < 0) throw new Error("This file has no PDF header, so it can't be repaired as a PDF.");
  const tail = new TextDecoder("latin1").decode(input.subarray(Math.max(0, input.length - 2048)));
  if (!tail.includes("%%EOF")) notes.push("The file was cut short (no end marker). Recovered what was readable.");

  let src: PDFDocument;
  try {
    src = await PDFDocument.load(input, { ignoreEncryption: true, throwOnInvalidObject: false, updateMetadata: false });
  } catch (err) {
    throw new Error(`The file is too damaged to recover (${(err as Error).message.slice(0, 80)}).`);
  }
  if (src.isEncrypted) throw new Error("This PDF is password-protected. Unlock it first.");
  const out = await PDFDocument.create();
  let pages = 0;
  for (const i of src.getPageIndices()) {
    try {
      const [p] = await out.copyPages(src, [i]);
      out.addPage(p);
      pages++;
    } catch {
      notes.push(`Page ${i + 1} could not be recovered and was skipped.`);
    }
  }
  if (!pages) throw new Error("No pages could be recovered from this file.");
  notes.push(`Rebuilt the file structure with ${pages} page${pages === 1 ? "" : "s"}.`);
  return { bytes: await out.save(), pages, notes };
}
