"use client";

/** The text of every page of a PDF, line by line (for the AI tools). */
export async function documentText(bytes: Uint8Array, progress?: (message: string, fraction?: number) => void): Promise<string[]> {
  const { openPdf, pageTextRuns } = await import("./pdfjs");
  const { groupLines } = await import("./text");
  const pdf = await openPdf(bytes);
  try {
    const pages: string[] = [];
    for (let i = 0; i < pdf.numPages; i++) {
      progress?.(`Reading page ${i + 1} of ${pdf.numPages}…`, i / pdf.numPages);
      pages.push(groupLines((await pageTextRuns(pdf, i)).runs).map((l) => l.text).join("\n"));
    }
    if (!pages.some((p) => p.trim())) throw new Error("This PDF has no selectable text. Run OCR PDF first.");
    return pages;
  } finally {
    await pdf.destroy();
  }
}
