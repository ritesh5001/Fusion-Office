/**
 * Maps between the editor's view space and PDF user space.
 *
 * "View space, y-up": origin at the bottom-left of the page as displayed
 * (after rotation), in points. The returned matrix [a b c d e f] maps a
 * view-space y-up point (u, v) to PDF user space:  x = a·u + c·v + e,
 * y = b·u + d·v + f. It is used as a `cm` operator so anything drawn in view
 * space lands correctly on a page that carries a /Rotate entry.
 */
export type Matrix = [number, number, number, number, number, number];

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function viewToUserMatrix(rotation: number, box: Box): Matrix {
  const { x, y, width: W, height: H } = box;
  switch (((rotation % 360) + 360) % 360) {
    case 90:
      return [0, 1, -1, 0, x + W, y];
    case 180:
      return [-1, 0, 0, -1, x + W, y + H];
    case 270:
      return [0, -1, 1, 0, x, y + H];
    default:
      return [1, 0, 0, 1, x, y];
  }
}

export function applyMatrix(m: Matrix, u: number, v: number): [number, number] {
  return [m[0] * u + m[2] * v + m[4], m[1] * u + m[3] * v + m[5]];
}

/** Matrix for an object centered at (cx, cyUp) rotated `angle` degrees clockwise. */
export function objectMatrix(cx: number, cyUp: number, angleDeg: number, sx = 1, sy = 1): Matrix {
  const t = (-angleDeg * Math.PI) / 180;
  const cos = Math.cos(t);
  const sin = Math.sin(t);
  return [cos * sx, sin * sx, -sin * sy, cos * sy, cx, cyUp];
}

export function hexToRgb01(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Text layout constants matching Fabric.js Textbox rendering. */
export const FABRIC_FONT_SIZE_MULT = 1.13;
export const FABRIC_FONT_SIZE_FRACTION = 0.222;

/** Baseline of line `i`, measured down from the top of the text box. */
export const textBaseline = (i: number, fontSize: number, lineHeight: number) =>
  fontSize * (FABRIC_FONT_SIZE_MULT * lineHeight * i + FABRIC_FONT_SIZE_MULT * (1 - FABRIC_FONT_SIZE_FRACTION));

/** Greedy word wrap. `measure` returns the width of a string in points. */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const out: string[] = [];
  // Break a word longer than the box into character chunks; returns the tail.
  const breakWord = (word: string) => {
    let chunk = "";
    for (const ch of word) {
      if (chunk && measure(chunk + ch) > maxWidth) {
        out.push(chunk);
        chunk = ch;
      } else chunk += ch;
    }
    return chunk;
  };
  for (const para of text.split("\n")) {
    let line = "";
    for (const token of para.split(/(\s+)/).filter(Boolean)) {
      if (/^\s+$/.test(token)) {
        if (line) line += token;
        continue;
      }
      if (measure(line + token) <= maxWidth) {
        line += token;
        continue;
      }
      if (line.trim()) out.push(line.trimEnd());
      line = measure(token) <= maxWidth ? token : breakWord(token);
    }
    out.push(line.trimEnd());
  }
  return out;
}

/** SVG path for a line/arrow centered on the origin, pointing right. */
export function linePath(shape: "line" | "arrow", w: number, strokeWidth: number) {
  const main = `M ${-w / 2} 0 L ${w / 2} 0`;
  if (shape === "line") return main;
  const head = Math.max(8, strokeWidth * 4);
  return `${main} M ${w / 2 - head} ${-head * 0.6} L ${w / 2} 0 L ${w / 2 - head} ${head * 0.6}`;
}
