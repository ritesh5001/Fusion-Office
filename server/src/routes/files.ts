import { Router, type Request } from "express";
import { createReadStream, createWriteStream } from "node:fs";
import { rename, rm, stat } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { HttpError } from "../lib/http.js";
import { filePath, maxUploadBytes, verifySignature } from "../lib/storage.js";

/**
 * Signed-link file transfer for document sources. Access is granted by the
 * HMAC in the link (issued by the documents API to the owner), not by cookies.
 */
export const files = Router();

function resolve(req: Request): { key: string; full: string } {
  const parts = (req.params as { key?: string[] }).key ?? [];
  const key = parts.join("/");
  const q = req.query as Record<string, string | undefined>;
  const op = req.method === "PUT" ? "put" : "get";
  if (q.op !== op) throw new HttpError(403, "Invalid link");
  const problem = verifySignature(key, q.op, q.exp, q.sig);
  if (problem) throw new HttpError(403, problem);
  try {
    return { key, full: filePath(key) };
  } catch {
    throw new HttpError(400, "Invalid file path");
  }
}

files.put("/*key", async (req, res, next) => {
  let tmp = "";
  try {
    const { full } = resolve(req);
    const declared = Number(req.get("content-length") ?? 0);
    if (declared > maxUploadBytes) throw new HttpError(413, "File is too large.");
    tmp = `${full}.${randomBytes(6).toString("hex")}.part`;
    const out = createWriteStream(tmp, { flags: "wx" });
    let size = 0;
    let head = Buffer.alloc(0);
    await new Promise<void>((resolveUpload, reject) => {
      req.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (head.length < 5) head = Buffer.concat([head, chunk]).subarray(0, 5);
        if (size > maxUploadBytes) {
          req.unpipe(out);
          out.destroy();
          reject(new HttpError(413, "File is too large."));
          req.resume();
        }
      });
      req.on("error", reject);
      out.on("error", reject);
      out.on("finish", resolveUpload);
      req.pipe(out);
    });
    // Content inspection, not the file name: only real PDFs are stored.
    if (head.toString("latin1") !== "%PDF-") throw new HttpError(415, "Only PDF files can be stored.");
    await rename(tmp, full);
    tmp = "";
    res.status(201).json({ ok: true, size });
  } catch (err) {
    next(err);
  } finally {
    if (tmp) await rm(tmp, { force: true }).catch(() => {});
  }
});

files.get("/*key", async (req, res, next) => {
  try {
    const { full } = resolve(req);
    const info = await stat(full).catch(() => null);
    if (!info?.isFile()) throw new HttpError(404, "File not found");
    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": String(info.size),
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    });
    createReadStream(full).on("error", next).pipe(res);
  } catch (err) {
    next(err);
  }
});
