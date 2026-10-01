import { EncryptedPDFError, type PDFDocument, type PDFPage } from "pdf-lib";
import { loadSourcePdf } from "../../pdf/decrypt";
import { viewToUserMatrix, type Matrix } from "../../pdf/geometry";

/**
 * Load a PDF for processing. Files protected with an owner password only (they
 * open without one, typical for forms) are decrypted; files that need a
 * password to open get a friendly error.
 */
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  try {
    return await loadSourcePdf(bytes);
  } catch (err) {
    const msg = (err as Error)?.message ?? "";
    if (err instanceof EncryptedPDFError || /encrypted|password/i.test(msg)) throw new Error("This PDF is password-protected. Use Unlock PDF first.");
    throw new Error("This file could not be read as a PDF. Try Repair PDF.");
  }
}

/** Size of a page as displayed (after /Rotate), plus the view→user matrix. */
export function pageView(page: PDFPage): { width: number; height: number; rotation: number; matrix: Matrix } {
  const box = page.getCropBox();
  const rotation = ((page.getRotation().angle % 360) + 360) % 360;
  const swap = rotation === 90 || rotation === 270;
  return {
    width: swap ? box.height : box.width,
    height: swap ? box.width : box.height,
    rotation,
    matrix: viewToUserMatrix(rotation, box),
  };
}

export const save = (doc: PDFDocument) => doc.save({ useObjectStreams: true });
