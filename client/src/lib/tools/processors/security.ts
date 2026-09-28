// Password protection uses @cantoo/pdf-lib (a pdf-lib fork with AES encryption).
import { PDFDict, PDFDocument, PDFName, PDFStream } from "@cantoo/pdf-lib";

export interface ProtectOptions {
  userPassword: string;
  /** Owner password unlocks the restrictions; defaults to a random value. */
  ownerPassword?: string;
  allowPrinting: boolean;
  allowCopying: boolean;
  allowEditing: boolean;
}

export async function protectPdf(bytes: Uint8Array, opts: ProtectOptions): Promise<Uint8Array> {
  if (!opts.userPassword) throw new Error("Choose a password.");
  const doc = await PDFDocument.load(bytes, { updateMetadata: false }).catch(() => {
    throw new Error("This PDF is already protected or can't be read. Unlock it first.");
  });
  const random = Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(36)).join("");
  doc.encrypt({
    userPassword: opts.userPassword,
    ownerPassword: opts.ownerPassword || random,
    permissions: {
      printing: opts.allowPrinting ? "highResolution" : false,
      copying: opts.allowCopying,
      modifying: opts.allowEditing,
      annotating: opts.allowEditing,
      fillingForms: true,
      contentAccessibility: true,
      documentAssembly: opts.allowEditing,
    },
  });
  return doc.save();
}

/** Remove the password. Needs the password that opens the file. */
export async function unlockPdf(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { password, updateMetadata: false });
  } catch (err) {
    if (/password/i.test((err as Error)?.message ?? "")) throw new Error("That password is not correct.");
    throw new Error("This file could not be opened. Check the password.");
  }
  // Drop leftovers that would make readers think the file is still encrypted:
  // the old encryption dictionary and cross-reference streams pointing at it.
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    const dict = obj instanceof PDFStream ? obj.dict : obj instanceof PDFDict ? obj : null;
    if (!dict) continue;
    const type = dict.get(PDFName.of("Type"));
    const isXRef = type instanceof PDFName && type.decodeText() === "XRef";
    const isEncrypt = dict.has(PDFName.of("O")) && dict.has(PDFName.of("U")) && dict.has(PDFName.of("Filter"));
    if (isXRef || isEncrypt) doc.context.delete(ref);
  }
  return doc.save();
}

/** True if the file needs a password to open (or has an encryption dictionary). */
export async function isEncrypted(bytes: Uint8Array): Promise<boolean> {
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    return doc.isEncrypted;
  } catch {
    return false;
  }
}
