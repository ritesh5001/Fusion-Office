"use client";

/**
 * Render text as handwritten pages: a handwriting font with small, random
 * wobbles (baseline, slant, size, spacing) so it doesn't look typeset, on
 * plain, lined or squared paper. Pages become images in a PDF.
 */
import { PDFDocument } from "pdf-lib";
import { HAND_FONTS, type HandStyle } from "../fonts/handwriting";

export type Paper = "plain" | "lined" | "grid";

export interface HandwritingOptions {
  style: HandStyle;
  paper: Paper;
  ink: string;
  /** Text size in points on an A4 page. */
  size: number;
  /** 0 (tidy) … 100 (messy). */
  messiness: number;
}

const A4 = { w: 595.28, h: 841.89 };
const PX = 2; // pixels per point

/** Small deterministic random generator, so a re-render looks the same. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1; // −1 … 1
  };
}

function drawPaper(ctx: CanvasRenderingContext2D, paper: Paper, lineGap: number, top: number, marginX: number) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.fillStyle = paper === "plain" ? "#ffffff" : "#fffef9";
  ctx.fillRect(0, 0, W, H);
  if (paper === "lined") {
    ctx.strokeStyle = "rgba(76, 125, 214, 0.35)";
    ctx.lineWidth = 1.2;
    for (let y = top; y < H - lineGap * 0.5; y += lineGap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(220, 70, 70, 0.45)";
    ctx.beginPath();
    ctx.moveTo(marginX - 18, 0);
    ctx.lineTo(marginX - 18, H);
    ctx.stroke();
  } else if (paper === "grid") {
    ctx.strokeStyle = "rgba(76, 125, 214, 0.18)";
    ctx.lineWidth = 1;
    const g = lineGap / 2;
    for (let x = g; x < W; x += g) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = top % g; y < H; y += g) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }
}

/** Render `text` as handwriting; returns a PDF. */
export async function textToHandwriting(text: string, o: HandwritingOptions, progress?: (m: string, f?: number) => void): Promise<Uint8Array> {
  const font = HAND_FONTS[o.style];
  const size = o.size * font.scale * PX;
  await document.fonts.load(`${size}px ${font.family}`, text.slice(0, 200) || "a");

  const W = Math.round(A4.w * PX);
  const H = Math.round(A4.h * PX);
  const lineGap = size * 1.5;
  const marginX = 64 * PX;
  const top = 72 * PX;
  const bottom = H - 56 * PX;
  const right = W - 48 * PX;
  const wobble = o.messiness / 100;
  const rand = rng(text.length * 2654435761 + o.size);

  const canvases: HTMLCanvasElement[] = [];
  let ctx!: CanvasRenderingContext2D;
  let y = 0;
  const newPage = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    ctx = c.getContext("2d")!;
    drawPaper(ctx, o.paper, lineGap, top, marginX);
    ctx.fillStyle = o.ink;
    ctx.textBaseline = "alphabetic";
    canvases.push(c);
    // Sit on the ruled lines (which start at `top`), just above each one.
    y = top + lineGap * (o.paper === "plain" ? 0.7 : 0.94);
  };
  newPage();
  const setFont = (scale: number) => (ctx.font = `${size * scale}px ${font.family}`);

  const paragraphs = text.replace(/\r\n?/g, "\n").split("\n");
  for (const para of paragraphs) {
    let x = marginX + rand() * 4 * wobble;
    const words = para.split(/(\s+)/).filter((w) => w.length);
    if (!words.length) {
      y += lineGap;
      if (y > bottom) newPage();
      continue;
    }
    for (const word of words) {
      if (/^\s+$/.test(word)) {
        setFont(1);
        x += ctx.measureText(" ").width * word.length * (1 + rand() * 0.25 * wobble);
        continue;
      }
      const scale = 1 + rand() * 0.05 * wobble;
      setFont(scale);
      const w = ctx.measureText(word).width;
      if (x + w > right && x > marginX + 1) {
        x = marginX + rand() * 4 * wobble;
        y += lineGap;
        if (y > bottom) newPage();
        setFont(scale);
      }
      // Each word sits slightly off the line and leans a little.
      ctx.save();
      ctx.translate(x, y + rand() * size * 0.06 * wobble);
      ctx.rotate(((rand() * 1.6 * wobble) * Math.PI) / 180);
      ctx.globalAlpha = 0.88 + Math.abs(rand()) * 0.12;
      ctx.fillText(word, 0, 0);
      ctx.restore();
      x += w;
    }
    y += lineGap;
    if (y > bottom) newPage();
  }

  const doc = await PDFDocument.create();
  for (const [i, c] of canvases.entries()) {
    progress?.(`Writing page ${i + 1} of ${canvases.length}…`, i / canvases.length);
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't draw the page"))), "image/jpeg", 0.9));
    const img = await doc.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    doc.addPage([A4.w, A4.h]).drawImage(img, { x: 0, y: 0, width: A4.w, height: A4.h });
  }
  return doc.save();
}
