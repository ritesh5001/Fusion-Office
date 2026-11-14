/**
 * Markdown → Word (.docx): headings, paragraphs with bold / italic / code /
 * links, bullet and numbered lists (nested), quotes, code blocks, tables and
 * horizontal rules. Pure, so it runs in tests.
 */
import { marked, type Token, type Tokens } from "marked";

export async function markdownToDocx(markdown: string, title = "Document"): Promise<Uint8Array> {
  const d = await import("docx");
  type Run = InstanceType<typeof d.TextRun> | InstanceType<typeof d.ExternalHyperlink>;
  const children: (InstanceType<typeof d.Paragraph> | InstanceType<typeof d.Table>)[] = [];
  const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  const inline = (tokens: Token[] | undefined, style: { bold?: boolean; italics?: boolean; strike?: boolean } = {}): Run[] => {
    const out: Run[] = [];
    for (const t of tokens ?? []) {
      if (t.type === "strong") out.push(...inline((t as Tokens.Strong).tokens, { ...style, bold: true }));
      else if (t.type === "em") out.push(...inline((t as Tokens.Em).tokens, { ...style, italics: true }));
      else if (t.type === "del") out.push(...inline((t as Tokens.Del).tokens, { ...style, strike: true }));
      else if (t.type === "codespan") out.push(new d.TextRun({ text: decode((t as Tokens.Codespan).text), font: "Consolas", ...style }));
      else if (t.type === "link") {
        const l = t as Tokens.Link;
        out.push(new d.ExternalHyperlink({ link: l.href, children: [new d.TextRun({ text: decode(l.text), style: "Hyperlink", ...style })] }));
      } else if (t.type === "br") out.push(new d.TextRun({ text: "", break: 1 }));
      else if ("tokens" in t && Array.isArray((t as Tokens.Text).tokens)) out.push(...inline((t as Tokens.Text).tokens, style));
      else if ("text" in t) out.push(new d.TextRun({ text: decode(String((t as Tokens.Text).text)), ...style }));
    }
    return out;
  };

  const HEADINGS = [d.HeadingLevel.HEADING_1, d.HeadingLevel.HEADING_2, d.HeadingLevel.HEADING_3, d.HeadingLevel.HEADING_4, d.HeadingLevel.HEADING_5, d.HeadingLevel.HEADING_6];

  const block = (t: Token, level = 0, quote = false) => {
    switch (t.type) {
      case "heading": {
        const h = t as Tokens.Heading;
        children.push(new d.Paragraph({ heading: HEADINGS[h.depth - 1], children: inline(h.tokens) }));
        break;
      }
      case "paragraph":
        children.push(new d.Paragraph({ children: inline((t as Tokens.Paragraph).tokens), ...(quote ? { indent: { left: 567 }, border: { left: { style: d.BorderStyle.SINGLE, size: 12, color: "BBBBBB", space: 8 } } } : {}) }));
        break;
      case "list": {
        const l = t as Tokens.List;
        for (const item of l.items) {
          const [first, ...rest] = item.tokens;
          const runs = first && (first.type === "text" || first.type === "paragraph") ? inline((first as Tokens.Text).tokens ?? [first]) : [];
          children.push(new d.Paragraph({ children: runs, ...(l.ordered ? { numbering: { reference: "numbers", level: Math.min(level, 8) } } : { bullet: { level: Math.min(level, 8) } }) }));
          for (const sub of first && (first.type === "text" || first.type === "paragraph") ? rest : item.tokens) block(sub, level + 1, quote);
        }
        break;
      }
      case "blockquote":
        for (const q of (t as Tokens.Blockquote).tokens) block(q, level, true);
        break;
      case "code":
        for (const line of (t as Tokens.Code).text.split("\n")) children.push(new d.Paragraph({ shading: { type: d.ShadingType.CLEAR, fill: "F3F4F6", color: "auto" }, children: [new d.TextRun({ text: line || " ", font: "Consolas", size: 19 })] }));
        break;
      case "table": {
        const tb = t as Tokens.Table;
        const cell = (tokens: Token[], header: boolean) => new d.TableCell({ children: [new d.Paragraph({ children: inline(tokens, header ? { bold: true } : {}) })], ...(header ? { shading: { type: d.ShadingType.CLEAR, fill: "EEF0F3", color: "auto" } } : {}) });
        children.push(
          new d.Table({
            width: { size: 100, type: d.WidthType.PERCENTAGE },
            rows: [new d.TableRow({ tableHeader: true, children: tb.header.map((h) => cell(h.tokens, true)) }), ...tb.rows.map((r) => new d.TableRow({ children: r.map((c) => cell(c.tokens, false)) }))],
          }),
        );
        children.push(new d.Paragraph({}));
        break;
      }
      case "hr":
        children.push(new d.Paragraph({ border: { bottom: { style: d.BorderStyle.SINGLE, size: 6, color: "BBBBBB", space: 1 } }, children: [] }));
        break;
      case "space":
        break;
      default:
        if ("text" in t && String((t as Tokens.Text).text).trim()) children.push(new d.Paragraph({ children: [new d.TextRun(decode(String((t as Tokens.Text).text)))] }));
    }
  };

  for (const t of marked.lexer(markdown)) block(t);
  const doc = new d.Document({
    title,
    creator: "Fusion Office",
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    numbering: {
      config: [{ reference: "numbers", levels: Array.from({ length: 9 }, (_, i) => ({ level: i, format: d.LevelFormat.DECIMAL, text: `%${i + 1}.`, alignment: d.AlignmentType.START, style: { paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } } } })) }],
    },
    sections: [{ children: children.length ? children : [new d.Paragraph({})] }],
  });
  return new Uint8Array(await d.Packer.toArrayBuffer(doc));
}
