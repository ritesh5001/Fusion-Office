/**
 * Unicode Hindi ↔ Kruti Dev 010, the legacy font many government offices,
 * typing tests and older documents still use. Kruti Dev isn't a real
 * encoding: it draws Devanagari over Latin letters, so "भारत" is stored as
 * "Hkkjr". Converting means swapping letter sequences and moving two marks
 * that are typed in visual order there:
 *
 *  - the i-matra (ि), typed before its consonant cluster ("f"), and
 *  - the reph (र् on top), typed after its syllable ("Z").
 *
 * Pure functions, unit tested with known words.
 */

/** [Unicode, Kruti Dev] pairs. Longer sequences win, so order inside the table doesn't matter. */
const TABLE: [string, string][] = [
  // Conjuncts and special forms
  ["क्ष्", "{"], ["क्ष", "{k"], ["त्र्", "«"], ["त्र", "="], ["ज्ञ", "K"], ["श्र", "J"], ["द्य", "|"], ["द्व", "}"], ["द्ध", ")"], ["द्द", "í"],
  ["त्त्", "Ù"], ["त्त", "Ùk"], ["क्र", "Ø"], ["फ्र", "Ý"], ["द्र", "æ"], ["ट्र", "Vª"], ["ड्र", "Mª"], ["ढ्र", "<ª"], ["छ्र", "Nª"],
  ["ट्ट", "ê"], ["ट्ठ", "ë"], ["ड्ड", "ì"], ["ड्ढ", "ï"], ["न्न", "é"], ["ह्न", "à"], ["ह्य", "á"], ["हृ", "â"], ["ह्म", "ã"], ["ह्र", "ºz"], ["ह्", "º"],
  ["रु", "#"], ["रू", ":"],
  // Rakar (्र after a consonant) and halant
  ["्र", "z"], ["्", "~"],
  // Half forms
  ["क्", "D"], ["ख्", "["], ["ग्", "X"], ["घ्", "?"], ["च्", "P"], ["ज्", "T"], ["झ्", "÷"], ["ण्", "."], ["त्", "R"], ["थ्", "F"], ["ध्", "/"],
  ["न्", "U"], ["प्", "I"], ["फ्", "¶"], ["ब्", "C"], ["भ्", "H"], ["म्", "E"], ["य्", "¸"], ["ल्", "Y"], ["व्", "O"], ["श्", "'"], ["ष्", '"'],
  ["स्", "L"],
  // Consonants
  ["क", "d"], ["ख", "[k"], ["ग", "x"], ["घ", "?k"], ["ङ", "³"], ["च", "p"], ["छ", "N"], ["ज", "t"], ["झ", ">"], ["ञ", "¥"],
  ["ट", "V"], ["ठ", "B"], ["ड", "M"], ["ढ", "<"], ["ण", ".k"], ["त", "r"], ["थ", "Fk"], ["द", "n"], ["ध", "/k"], ["न", "u"],
  ["प", "i"], ["फ", "Q"], ["ब", "c"], ["भ", "Hk"], ["म", "e"], ["य", ";"], ["र", "j"], ["ल", "y"], ["ळ", "G"], ["व", "o"],
  ["श", "'k"], ["ष", '"k'], ["स", "l"], ["ह", "g"],
  // Independent vowels
  ["औ", "vkS"], ["ओ", "vks"], ["ऑ", "vkW"], ["आ", "vk"], ["अ", "v"], ["ई", "bZ"], ["इ", "b"], ["ऊ", "Å"], ["उ", "m"], ["ऋ", "_"], ["ऐ", ",s"], ["ए", ","],
  // Vowel signs and marks
  ["ौ", "kS"], ["ो", "ks"], ["ॉ", "kW"], ["ा", "k"], ["ी", "h"], ["ु", "q"], ["ू", "w"], ["ृ", "`"], ["े", "s"], ["ै", "S"], ["ॅ", "W"],
  ["ं", "a"], ["ँ", "¡"], ["ः", "%"], ["़", "+"], ["ऽ", "·"],
  // Digits and punctuation
  ["०", "å"], ["१", "ƒ"], ["२", "„"], ["३", "…"], ["४", "†"], ["५", "‡"], ["६", "ˆ"], ["७", "‰"], ["८", "Š"], ["९", "‹"],
  ["।", "A"], ["॥", "AA"], [".", "-"], ["-", "&"], [",", "]"], ["?", "\\"], [";", "("], ["(", "¼"], [")", "½"], ["{", "¿"], ["}", "À"],
  ["=", "¾"], ["/", "@"], ["‘", "^"], ["’", "*"], ["“", "Þ"], ["”", "ß"], ["॰", "Œ"],
];

/** Written into Kruti Dev only: these have no exact Kruti Dev key, so the nearest look-alike is used. */
const FORWARD_ONLY: [string, string][] = [["'", "*"], ['"', "ß"], [":", "%"], ["\u0002", "z"], ["\u0000", "Z"]];

/** Conjuncts with their own Kruti Dev glyph; every other consonant + ्र takes the rakar stroke "z". */
const OWN_RAKAR = new Set(["क्र", "फ्र", "द्र", "ट्र", "ड्र", "ढ्र", "छ्र", "त्र", "श्र", "ह्र"]);

/** Kruti Dev sequences that only ever appear when reading (alternative spellings). */
const KRUTI_ONLY: [string, string][] = [
  ["Ã", "ई"], ["Dr", "क्त"], ["—", "कृ"], ["–", "दृ"], ["±", "Zं"], ["ª", "्र"], ["Ê", "ीZ"], ["ç", "प्र"], ["Á", "प्र"], ["xz", "ग्र"],
];

function matcher(pairs: [string, string][]) {
  const map = new Map(pairs);
  const lengths = [...new Set(pairs.map(([k]) => k.length))].sort((a, b) => b - a);
  return (text: string) => {
    let out = "";
    for (let i = 0; i < text.length; ) {
      let hit = false;
      for (const len of lengths) {
        const piece = text.slice(i, i + len);
        const v = len === piece.length ? map.get(piece) : undefined;
        if (v !== undefined) {
          out += v;
          i += len;
          hit = true;
          break;
        }
      }
      if (!hit) out += text[i++];
    }
    return out;
  };
}

// A consonant (with an optional nukta), and a cluster of them joined by halants.
const C = "[\\u0915-\\u0939\\u0958-\\u095F]\\u093C?";
const CLUSTER = `(?:${C}\\u094D)*${C}`;
const SIGNS = "[\\u093E-\\u094C\\u0962\\u0963]";

const toKrutiTable = matcher([...TABLE, ...FORWARD_ONLY]);
const fromKrutiTable = matcher([...TABLE.map(([u, k]) => [k, u] as [string, string]), ...KRUTI_ONLY]);

/** Unicode Hindi → Kruti Dev 010 (type it, then set the font to Kruti Dev 010). */
export function unicodeToKrutidev(text: string): string {
  // Precomposed nukta letters (क़ ख़ ग़ ज़ ड़ ढ़ फ़ य़) become letter + nukta.
  let s = text.normalize("NFD");
  // Reph: र् before a cluster moves after the syllable (and its vowel sign), before ं / ँ.
  s = s.replace(new RegExp(`र्(${CLUSTER})(${SIGNS}?)`, "g"), (_m, cluster: string, sign: string) => `${cluster}${sign}\u0000`);
  // Rakar: consonant + ्र takes the "z" stroke, unless the pair has a glyph of its own.
  s = s.replace(new RegExp(`(${C})\u094D\u0930(?!\u094D)`, "g"), (m, c: string) => (OWN_RAKAR.has(m) ? m : `${c}\u0002`));
  // i-matra: typed before the whole consonant cluster.
  s = s.replace(new RegExp(`(${CLUSTER}\u0002?)ि`, "g"), "ि$1");
  s = s.replace(/ि/g, "f");
  return toKrutiTable(s);
}

/** Kruti Dev 010 → Unicode Hindi. */
export function krutidevToUnicode(text: string): string {
  // ई is written with the reph stroke: read it before the reph rule sees the "Z".
  let s = text.replace(/bZ/g, "ई").replace(/f/g, "\u0001");
  s = fromKrutiTable(s);
  // i-matra: move it after the consonant cluster that follows it.
  s = s.replace(new RegExp(`\u0001(${CLUSTER})`, "g"), "$1ि").replace(/\u0001/g, "ि");
  // Reph: "Z" after a syllable becomes र् before it.
  s = s.replace(new RegExp(`(${CLUSTER})(${SIGNS}*)Z`, "g"), "र्$1$2");
  // A stray Z (nothing to attach to) stays a reph on its own.
  s = s.replace(/Z/g, "र्");
  // Common typing variants: अ + ा etc. written as separate strokes.
  s = s.replace(/अा/g, "आ").replace(/आे/g, "ओ").replace(/आै/g, "औ").replace(/एे/g, "ऐ").replace(/ाे/g, "ो").replace(/ाै/g, "ौ");
  return s.normalize("NFC");
}

/** Does this text look like Kruti Dev (Latin letters standing in for Hindi) rather than English? */
export function looksLikeKrutidev(text: string): boolean {
  const words = text.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  if (!words.length) return false;
  // Letter pairs that are everyday in Kruti Dev (ा after a letter, आ, भ, है, में…) and rare in English.
  const kruti = words.filter((w) => /(kk|jk|Hk|vk|gS|esa|ks|kS|[a-z][A-Z]|^(dk|ds|dh|ls|fd|;g|rks|Fkk|Fkh)$)/.test(w)).length;
  return kruti >= Math.max(1, Math.ceil(words.length * 0.4));
}
