/**
 * Tidies PDF text for a text-to-speech voice, with no AI: drops bullets and
 * separators the voice would read out, removes addresses it would spell letter
 * by letter, rejoins words the PDF split, and turns symbols into words.
 * Used for "Read as it is" and as the fallback when AI narration isn't available.
 */
export function cleanForSpeech(text: string): string {
  return (
    text
      // Web and e-mail addresses are spelled out letter by letter; skip them.
      .replace(/\b(?:https?:\/\/|www\.)\S+/gi, " ")
      .replace(/\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g, " ")
      // Year ranges first, before lone dashes are dropped.
      .replace(/\b(\d{4})\s?[-–]\s?(\d{4})\b/g, "$1 to $2")
      // Bullets, pipes, arrows, boxes and decorative separators.
      .replace(/[•·▪■◆●○◦►▶→←↔|¦]/g, " ")
      .replace(/[_=~*#^]{2,}/g, " ")
      .replace(/(?:^|\s)[-–—](?=\s)/g, " ")
      // Words split by extraction: "React. js", "Node. js", "Express. js" → "React.js".
      .replace(/\b([A-Za-z]+)\.\s+(js|ts|py|net|io|ai)\b/g, "$1.$2")
      // Symbols as a person would say them.
      .replace(/\s&\s/g, " and ")
      .replace(/(\d)\s?%/g, "$1 percent")
      .replace(/(\d)\s?\+/g, "$1 plus")
      // Tidy the leftovers: repeated spaces, space before punctuation, stray quotes.
      .replace(/[ \t]+/g, " ")
      .replace(/ +([,.;:!?])/g, "$1")
      .replace(/\n[ \t]+/g, "\n")
      .trim()
  );
}
