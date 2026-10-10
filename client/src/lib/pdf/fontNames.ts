/**
 * What a font's name says about its style. Used both when reading a line
 * (pdf.js font names) and when writing it back (the PDF's BaseFont), so the
 * two agree on which of a document's fonts is the bold or the italic one.
 */
export interface NameStyle {
  /** Only set when the name leaves no doubt (TeX fonts). */
  family?: "Helvetica" | "Times" | "Courier";
  bold: boolean;
  italic: boolean;
}

export function fontNameStyle(rawName: string): NameStyle {
  const name = rawName.replace(/^[A-Z]{6}\+/, ""); // strip subset prefix
  // TeX fonts (most LaTeX documents) say their style in a short code and nothing
  // else: CMR10 roman, CMBX10 bold, CMTI10 italic, CMSS10 sans, CMTT10 typewriter.
  const tex = /^(?:cm|sf|ec)([a-z]+)\d+$/i.exec(name)?.[1].toLowerCase();
  const family = tex === undefined || /^(sy|ex)/.test(tex) ? undefined : /tt$|^st$/.test(tex) ? "Courier" : /^ss|^s[xio]$/.test(tex) ? "Helvetica" : "Times";
  return {
    family,
    bold: /bold|black|heavy|semibold|demi/i.test(name) || (!!tex && /^b(x|$)|^ssbx|^sx$|^ssdc/.test(tex)),
    italic: /italic|oblique/i.test(name) || (!!tex && /ti$|sl$|^sl|^mi$|^u$|^it|^ssi$|^s[io]$/.test(tex)),
  };
}
