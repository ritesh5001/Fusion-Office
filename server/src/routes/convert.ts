import express, { Router } from "express";
import { HttpError } from "../lib/http.js";
import { checkTarget, officeConvert, officeFormat } from "../lib/office.js";
import { documentToPdf, htmlToPdf } from "../lib/html.js";
import { SVG_MAX_PAGES, isLinearized, isPdfaLevel, linearize, pdfToSvg, toPdfA } from "../lib/engines.js";

export const convert = Router();

const MAX_MB = Number(process.env.CONVERT_MAX_MB) || 50;

const MIME = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  svg: "image/svg+xml",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  rtf: "application/rtf",
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  doc: "application/msword",
  xls: "application/vnd.ms-excel",
  ppt: "application/vnd.ms-powerpoint",
};

/** A raw PDF body and its name, for the PDF engines. */
const rawPdf = express.raw({ type: () => true, limit: `${MAX_MB}mb` });
function pdfBody(req: express.Request): { bytes: Uint8Array; name: string } {
  let name = "document.pdf";
  try {
    name = decodeURIComponent(req.get("x-filename") ?? "").slice(0, 200) || name;
  } catch {
    throw new HttpError(400, "Invalid file name.");
  }
  const body = req.body as Buffer | undefined;
  if (!Buffer.isBuffer(body) || !body.length) throw new HttpError(400, "No file was sent.");
  return { bytes: new Uint8Array(body.buffer, body.byteOffset, body.byteLength), name: name.replace(/\.[^.]+$/, "") };
}

const sendPdf = (res: express.Response, bytes: Uint8Array, name: string) => sendFile(res, bytes, name, MIME.pdf);

const sendFile = (res: express.Response, bytes: Uint8Array, name: string, type: string) => {
  res.setHeader("Content-Type", type);
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
  res.setHeader("Cache-Control", "no-store");
  res.end(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
};

/**
 * Word / PowerPoint / Excel (and OpenDocument, RTF, CSV) and CorelDRAW (.cdr)
 * to PDF, old formats to DOCX / XLSX / PPTX for the editors (?to=docx|xlsx|pptx),
 * or a CorelDRAW drawing to SVG (?to=svg).
 * Body: the raw file. Header X-Filename: its URI-encoded name.
 */
convert.post("/office", express.raw({ type: () => true, limit: `${MAX_MB}mb` }), async (req, res, next) => {
  try {
    let name = "document";
    try {
      name = decodeURIComponent(req.get("x-filename") ?? "").slice(0, 200) || name;
    } catch {
      throw new HttpError(400, "Invalid file name.");
    }
    const body = req.body as Buffer | undefined;
    if (!Buffer.isBuffer(body) || !body.length) throw new HttpError(400, "No file was sent.");
    const bytes = new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    const ext = officeFormat(name, bytes);
    const to = checkTarget(ext, typeof req.query.to === "string" ? req.query.to : "pdf");
    const out = await officeConvert(bytes, ext, to);
    sendFile(res, out, name.replace(/\.[^.]+$/, "") + "." + to, MIME[to]);
  } catch (err) {
    next(err);
  }
});

/** PDF → PDF/A (Ghostscript). Query level=1b|2b|3b (default 2b). Body: the raw PDF. */
convert.post("/pdfa", rawPdf, async (req, res, next) => {
  try {
    const { bytes, name } = pdfBody(req);
    const level = isPdfaLevel(req.query.level) ? req.query.level : "2b";
    sendPdf(res, await toPdfA(bytes, level), `${name}-pdfa.pdf`);
  } catch (err) {
    next(err);
  }
});

/** Web-optimized (linearized) PDF with qpdf. Body: the raw PDF. Header X-Already-Linearized says whether it was before. */
convert.post("/linearize", rawPdf, async (req, res, next) => {
  try {
    const { bytes, name } = pdfBody(req);
    const already = await isLinearized(bytes).catch(() => false);
    res.setHeader("X-Already-Linearized", already ? "1" : "0");
    sendPdf(res, await linearize(bytes), `${name}-web.pdf`);
  } catch (err) {
    next(err);
  }
});

/** PDF → SVG, one per page (Poppler). Query first, last (1-based). → { pages: string[] }. */
convert.post("/svg", rawPdf, async (req, res, next) => {
  try {
    const { bytes } = pdfBody(req);
    const first = Math.max(1, Math.floor(Number(req.query.first) || 1));
    const last = Math.max(first, Math.floor(Number(req.query.last) || first + SVG_MAX_PAGES - 1));
    res.json({ pages: await pdfToSvg(bytes, first, Math.min(last, first + SVG_MAX_PAGES - 1)) });
  } catch (err) {
    next(err);
  }
});

/** A public web page to PDF. Body: { url, pageSize: "A4" | "Letter", landscape }. */
convert.post("/html", async (req, res, next) => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const pageSize = b.pageSize === "Letter" ? "Letter" : "A4";
    // A complete document (Markdown, CSV, eBook converters) instead of a web address.
    if (typeof b.html === "string") {
      if (!b.html.trim()) throw new HttpError(400, "The document is empty.");
      if (Buffer.byteLength(b.html) > MAX_MB * 1024 * 1024) throw new HttpError(413, "This document is too large to convert.");
      const name = typeof b.name === "string" && b.name.trim() ? b.name.trim().replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120) : "document";
      const pdf = await documentToPdf({ html: b.html, pageSize, landscape: b.landscape === true });
      return sendPdf(res, pdf, `${name}.pdf`);
    }
    if (typeof b.url !== "string" || !b.url.trim()) throw new HttpError(400, "Enter a web address.");
    const pdf = await htmlToPdf({ url: b.url, pageSize, landscape: b.landscape === true });
    sendPdf(res, pdf, `${new URL(b.url.trim()).hostname.replace(/^www\./, "")}.pdf`);
  } catch (err) {
    next(err);
  }
});
