"use client";

/** Build a Word document from translated page text (any language/script). */
export async function translatedDocx(pages: string[], language: string): Promise<Uint8Array> {
  const docx = await import("docx");
  const children = pages.flatMap((page, i) => [
    new docx.Paragraph({ text: `Page ${i + 1}`, heading: docx.HeadingLevel.HEADING_2, pageBreakBefore: i > 0 }),
    ...page
      .split(/\n{2,}|\n/)
      .filter((l) => l.trim())
      .map((l) => new docx.Paragraph({ children: [new docx.TextRun(l)], spacing: { after: 120 } })),
  ]);
  const doc = new docx.Document({ creator: "Fusion Office", title: `Translation (${language})`, sections: [{ children }] });
  return new Uint8Array(await (await docx.Packer.toBlob(doc)).arrayBuffer());
}
