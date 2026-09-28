import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { HttpError } from "./http.js";
import { semaphore } from "./rateLimit.js";

const SOFFICE = process.env.SOFFICE_PATH || "soffice";
const TIMEOUT_MS = Number(process.env.CONVERT_TIMEOUT_MS) || 120_000;

const ZIP = [0x50, 0x4b, 0x03, 0x04];
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const RTF = [0x7b, 0x5c, 0x72, 0x74, 0x66]; // {\rtf

/** Accepted inputs and the signature each must start with (null = plain text). */
const FORMATS: Record<string, number[] | null> = {
  doc: OLE,
  docx: ZIP,
  odt: ZIP,
  rtf: RTF,
  ppt: OLE,
  pptx: ZIP,
  odp: ZIP,
  xls: OLE,
  xlsx: ZIP,
  ods: ZIP,
  csv: null,
};

export const OFFICE_EXTENSIONS = Object.keys(FORMATS);

/** Check the file name and the leading bytes agree with a supported format. */
export function officeFormat(filename: string, bytes: Uint8Array): string {
  const ext = path.extname(filename).slice(1).toLowerCase();
  if (!(ext in FORMATS)) throw new HttpError(415, `Unsupported file type. Use one of: ${OFFICE_EXTENSIONS.map((e) => `.${e}`).join(", ")}.`);
  const magic = FORMATS[ext];
  if (magic) {
    if (!magic.every((b, i) => bytes[i] === b)) throw new HttpError(415, `This doesn't look like a real .${ext} file.`);
  } else if (bytes.subarray(0, 4096).includes(0)) {
    throw new HttpError(415, `This doesn't look like a text .${ext} file.`);
  }
  return ext;
}

// LibreOffice is memory hungry; convert one or two files at a time.
const queue = semaphore(Number(process.env.CONVERT_CONCURRENCY) || 1);

/**
 * Convert an office document to PDF with headless LibreOffice. Each run gets a
 * throwaway profile and working folder so conversions can't affect each other.
 */
export function officeToPdf(bytes: Uint8Array, ext: string): Promise<Uint8Array> {
  return queue(async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "fo-office-"));
    try {
      const input = path.join(dir, `input.${ext}`);
      await writeFile(input, bytes);
      await run(SOFFICE, [
        `-env:UserInstallation=${pathToFileURL(path.join(dir, "profile")).href}`,
        "--headless",
        "--norestore",
        "--nologo",
        "--nolockcheck",
        "--nodefault",
        "--convert-to",
        "pdf",
        "--outdir",
        dir,
        input,
      ]);
      try {
        return new Uint8Array(await readFile(path.join(dir, "input.pdf")));
      } catch {
        throw new HttpError(422, "This file couldn't be converted. It may be damaged or password protected.");
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, HOME: tmpdir() } });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr = (stderr + d).slice(-2000)));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new HttpError(504, "Converting this file took too long."));
    }, TIMEOUT_MS);
    child.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(err.code === "ENOENT" ? new HttpError(503, "Office conversion isn't available on this server yet.") : err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else {
        console.error("[office] soffice exited with", code, stderr);
        reject(new HttpError(422, "This file couldn't be converted. It may be damaged or password protected."));
      }
    });
  });
}
