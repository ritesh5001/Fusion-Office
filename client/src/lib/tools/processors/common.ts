import { PDFDocument, EncryptedPDFError, type PDFPage } from "pdf-lib";
import { viewToUserMatrix, type Matrix } from "../../pdf/geometry";

/** Load with a friendly error for password-protected files. */
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (err) {
    if (err instanceof EncryptedPDFError || /encrypted/i.test((err as Error)?.message ?? ""))
      throw new Error("This PDF is password-protected. Use Unlock PDF first.");
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
