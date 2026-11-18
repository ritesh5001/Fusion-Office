/** Text helpers for the viewer: JSON error position and XML indenting. Pure, so they're unit tested. */

/**
 * Offset of the first JSON syntax error. Browsers don't always say where
 * (newer Chrome only quotes the text), so this scans the text itself.
 */
export function jsonErrorAt(t: string): number {
  let i = 0;
  const ws = () => {
    while (i < t.length && " \t\n\r".includes(t[i])) i++;
  };
  const fail = () => {
    throw i;
  };
  const str = () => {
    i++;
    while (i < t.length && t[i] !== '"') {
      if (t[i] === "\\") i++;
      else if (t.charCodeAt(i) < 0x20) fail();
      i++;
    }
    if (t[i] !== '"') fail();
    i++;
  };
  const value = (): void => {
    ws();
    const c = t[i];
    if (c === "{") {
      i++;
      ws();
      if (t[i] === "}") return void i++;
      for (;;) {
        ws();
        if (t[i] !== '"') fail();
        str();
        ws();
        if (t[i] !== ":") fail();
        i++;
        value();
        ws();
        if (t[i] === ",") i++;
        else if (t[i] === "}") return void i++;
        else fail();
      }
    }
    if (c === "[") {
      i++;
      ws();
      if (t[i] === "]") return void i++;
      for (;;) {
        value();
        ws();
        if (t[i] === ",") i++;
        else if (t[i] === "]") return void i++;
        else fail();
      }
    }
    if (c === '"') return str();
    const m = /^(-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?|true|false|null)/.exec(t.slice(i, i + 400));
    if (!m) fail();
    i += m![0].length;
  };
  try {
    value();
    ws();
    return i < t.length ? i : -1;
  } catch (at) {
    return typeof at === "number" ? at : -1;
  }
}

/** Indents XML one element per line. Text-only elements stay on one line. */
export function formatXml(xml: string): string {
  let depth = 0;
  return xml
    .replace(/>\s+</g, "><")
    .replace(/></g, ">\n<")
    .split("\n")
    .map((line) => {
      const closing = /^<\//.test(line);
      const opening = /^<[^!?/][^>]*[^/]>$/.test(line) || /^<[^!?/]>$/.test(line);
      if (closing) depth = Math.max(0, depth - 1);
      const out = "  ".repeat(depth) + line;
      if (opening) depth++;
      return out;
    })
    .join("\n");
}
