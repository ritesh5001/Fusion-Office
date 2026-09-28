import express, { Router } from "express";
import { HttpError } from "../lib/http.js";
import { officeFormat, officeToPdf } from "../lib/office.js";
import { htmlToPdf } from "../lib/html.js";

export const convert = Router();

const MAX_MB = Number(process.env.CONVERT_MAX_MB) || 50;

const sendPdf = (res: express.Response, bytes: Uint8Array, name: string) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
  res.setHeader("Cache-Control", "no-store");
  res.end(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
};

/**
 * Word / PowerPoint / Excel (and OpenDocument, RTF, CSV) to PDF.
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
    const pdf = await officeToPdf(bytes, ext);
    sendPdf(res, pdf, name.replace(/\.[^.]+$/, "") + ".pdf");
  } catch (err) {
    next(err);
  }
});

/** A public web page to PDF. Body: { url, pageSize: "A4" | "Letter", landscape }. */
convert.post("/html", async (req, res, next) => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (typeof b.url !== "string" || !b.url.trim()) throw new HttpError(400, "Enter a web address.");
    const pageSize = b.pageSize === "Letter" ? "Letter" : "A4";
    const pdf = await htmlToPdf({ url: b.url, pageSize, landscape: b.landscape === true });
    sendPdf(res, pdf, `${new URL(b.url.trim()).hostname.replace(/^www\./, "")}.pdf`);
  } catch (err) {
    next(err);
  }
});
