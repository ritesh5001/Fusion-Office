import { PDFDocument } from "pdf-lib";

/**
 * Load a source PDF for copying its pages. Many forms are protected with an
 * owner password only: they open without a password (the viewer shows them
 * normally) but their contents are encrypted. pdf-lib can't decrypt, so
 * copying those pages as-is produces blank pages. Decrypt them first.
 */
export async function loadSourcePdf(bytes: Uint8Array): Promise<PDFDocument> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  if (!doc.isEncrypted) return doc;
  const { unlockPdf } = await import("../tools/processors/security");
  let plain: Uint8Array;
  try {
    plain = await unlockPdf(bytes, "");
  } catch {
    throw new Error("This PDF is protected with a password, so its pages can't be saved. Use the Unlock PDF tool first, then edit it.");
  }
  return PDFDocument.load(plain, { updateMetadata: false });
}
