/**
 * PDF engines that run as separate programs: Ghostscript (PDF/A), qpdf
 * (web-optimized, "linearized" PDFs) and pdftocairo from Poppler (PDF → SVG).
 * Each run gets its own throwaway folder, a time limit and a place in a
 * small queue, like the LibreOffice converter.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { HttpError } from "./http.js";
import { semaphore } from "./rateLimit.js";

export const GS = process.env.GS_PATH || "gs";
export const QPDF = process.env.QPDF_PATH || "qpdf";
export const PDFTOCAIRO = process.env.PDFTOCAIRO_PATH || "pdftocairo";
const TIMEOUT_MS = Number(process.env.ENGINE_TIMEOUT_MS) || 120_000;
const queue = semaphore(Number(process.env.ENGINE_CONCURRENCY) || 1);

/** Most pages a single PDF → SVG request turns into pictures. */
export const SVG_MAX_PAGES = 40;

export const isPdf = (bytes: Uint8Array) => {
  // "%PDF-" within the first kilobyte (some files start with a few junk bytes).
  const head = Buffer.from(bytes.buffer, bytes.byteOffset, Math.min(bytes.byteLength, 1024)).toString("latin1");
  return head.includes("%PDF-");
};

function needPdf(bytes: Uint8Array) {
  if (!bytes.length) throw new HttpError(400, "No file was sent.");
  if (!isPdf(bytes)) throw new HttpError(415, "This doesn't look like a PDF.");
}

interface RunResult {
  code: number;
  stderr: string;
  stdout: string;
}

function run(cmd: string, args: string[], unavailable: string): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, HOME: tmpdir() } });
    let stderr = "";
    let stdout = "";
    child.stdout.on("data", (d) => (stdout = (stdout + d).slice(-4000)));
    child.stderr.on("data", (d) => (stderr = (stderr + d).slice(-4000)));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new HttpError(504, "Processing this file took too long."));
    }, TIMEOUT_MS);
    child.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(err.code === "ENOENT" ? new HttpError(503, unavailable) : err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stderr, stdout });
    });
  });
}

/** A throwaway folder with the input written to it; removed afterwards. */
async function inFolder<T>(bytes: Uint8Array, fn: (dir: string, input: string) => Promise<T>): Promise<T> {
  return queue(async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "fo-engine-"));
    try {
      const input = path.join(dir, "input.pdf");
      await writeFile(input, bytes);
      return await fn(dir, input);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

const PASSWORD = /password|encrypt/i;

// ─── PDF/A (Ghostscript) ──────────────────────────────────────────

export type PdfaLevel = "1b" | "2b" | "3b";
export const isPdfaLevel = (v: unknown): v is PdfaLevel => v === "1b" || v === "2b" || v === "3b";

/** Ghostscript's sRGB colour profile, which every PDF/A file must carry. */
export function srgbProfile(): string | null {
  const fixed = [
    process.env.GS_ICC_PROFILE,
    "/usr/share/color/icc/ghostscript/srgb.icc", // Debian / Ubuntu (libgs-common)
    "/opt/homebrew/share/ghostscript/iccprofiles/srgb.icc",
    "/usr/local/share/ghostscript/iccprofiles/srgb.icc",
  ];
  for (const p of fixed) if (p && existsSync(p)) return p;
  // Versioned layouts: …/ghostscript/10.03/iccprofiles/srgb.icc, Homebrew's Cellar.
  for (const root of ["/usr/share/ghostscript", "/usr/local/share/ghostscript", "/opt/homebrew/Cellar/ghostscript"]) {
    try {
      for (const v of readdirSync(root)) {
        for (const p of [path.join(root, v, "iccprofiles", "srgb.icc"), path.join(root, v, "share", "ghostscript", "iccprofiles", "srgb.icc")]) if (existsSync(p)) return p;
      }
    } catch {
      /* not there */
    }
  }
  return null;
}

/** PostScript string literal: backslashes and parentheses escaped. */
const psString = (s: string) => `(${s.replace(/[\\()]/g, (c) => `\\${c}`)})`;

/** The PDFA_def.ps that attaches the sRGB OutputIntent. */
export function pdfaDefinition(icc: string): string {
  return [
    "%!",
    `/ICCProfile ${psString(icc)} def`,
    "[/_objdef {icc_PDFA} /type /stream /OBJ pdfmark",
    "[{icc_PDFA} << /N 3 >> /PUT pdfmark",
    "[{icc_PDFA} ICCProfile (r) file /PUT pdfmark",
    "[/_objdef {OutputIntent_PDFA} /type /dict /OBJ pdfmark",
    "[{OutputIntent_PDFA} << /Type /OutputIntent /S /GTS_PDFA1 /DestOutputProfile {icc_PDFA} /OutputConditionIdentifier (sRGB) /Info (sRGB IEC61966-2.1) >> /PUT pdfmark",
    "[{Catalog} << /OutputIntents [ {OutputIntent_PDFA} ] >> /PUT pdfmark",
    "",
  ].join("\n");
}

/**
 * Convert to PDF/A with Ghostscript. Fonts are embedded, colours put in sRGB,
 * and transparency flattened for PDF/A-1b. Files that need a password to open
 * are refused.
 */
export function toPdfA(bytes: Uint8Array, level: PdfaLevel): Promise<Uint8Array> {
  needPdf(bytes);
  const icc = srgbProfile();
  if (!icc) return Promise.reject(new HttpError(503, "PDF/A conversion isn't available on this server yet."));
  return inFolder(bytes, async (dir, input) => {
    const def = path.join(dir, "PDFA_def.ps");
    const out = path.join(dir, "out.pdf");
    await writeFile(def, pdfaDefinition(icc));
    const r = await run(
      GS,
      [
        `-dPDFA=${level[0]}`,
        "-dBATCH",
        "-dNOPAUSE",
        "-dQUIET",
        "-dSAFER",
        `--permit-file-read=${icc}`,
        `--permit-file-read=${dir}/`,
        "-sDEVICE=pdfwrite",
        "-sColorConversionStrategy=RGB",
        "-dPDFACompatibilityPolicy=1",
        "-dEmbedAllFonts=true",
        "-dSubsetFonts=true",
        `-sOutputFile=${out}`,
        def,
        input,
      ],
      "PDF/A conversion isn't available on this server yet.",
    );
    if (r.code !== 0 || !existsSync(out)) {
      console.error("[pdfa] gs exited with", r.code, r.stderr || r.stdout);
      if (PASSWORD.test(r.stderr + r.stdout)) throw new HttpError(422, "This PDF is password-protected. Unlock it first.");
      throw new HttpError(422, "This PDF couldn't be converted to PDF/A. It may be damaged; try Repair PDF first.");
    }
    return new Uint8Array(await readFile(out));
  });
}

// ─── Web-optimized PDF (qpdf) ─────────────────────────────────────

/** Linearize: reorder the file so a browser can show page 1 before the rest has downloaded. Lossless. */
export function linearize(bytes: Uint8Array): Promise<Uint8Array> {
  needPdf(bytes);
  return inFolder(bytes, async (dir, input) => {
    const out = path.join(dir, "out.pdf");
    const r = await run(QPDF, ["--linearize", "--object-streams=generate", "--compress-streams=y", input, out], "Web optimization isn't available on this server yet.");
    // qpdf exits 3 when it fixed small problems on the way: the output is fine.
    if ((r.code !== 0 && r.code !== 3) || !existsSync(out)) {
      console.error("[linearize] qpdf exited with", r.code, r.stderr);
      if (PASSWORD.test(r.stderr)) throw new HttpError(422, "This PDF is password-protected. Unlock it first.");
      throw new HttpError(422, "This PDF couldn't be optimized. It may be damaged; try Repair PDF first.");
    }
    return new Uint8Array(await readFile(out));
  });
}

/** Is a PDF already linearized? (qpdf --check-linearization) */
export function isLinearized(bytes: Uint8Array): Promise<boolean> {
  needPdf(bytes);
  return inFolder(bytes, async (_dir, input) => {
    const r = await run(QPDF, ["--check-linearization", input], "Web optimization isn't available on this server yet.");
    return r.code === 0 && /no linearization errors/i.test(r.stdout + r.stderr);
  });
}

// ─── PDF → SVG (Poppler) ──────────────────────────────────────────

/** One SVG per page (vectors and text kept), for at most SVG_MAX_PAGES pages. */
export function pdfToSvg(bytes: Uint8Array, first: number, last: number): Promise<string[]> {
  needPdf(bytes);
  if (!(first >= 1 && last >= first)) throw new HttpError(400, "Choose the pages to convert.");
  if (last - first + 1 > SVG_MAX_PAGES) throw new HttpError(413, `Convert at most ${SVG_MAX_PAGES} pages at a time.`);
  return inFolder(bytes, async (dir, input) => {
    const pages: string[] = [];
    for (let p = first; p <= last; p++) {
      const out = path.join(dir, `page-${p}.svg`);
      const r = await run(PDFTOCAIRO, ["-svg", "-f", String(p), "-l", String(p), input, out], "PDF to SVG isn't available on this server yet.");
      if (r.code !== 0 || !existsSync(out)) {
        if (p > first && /wrong page range|first page .* last page/i.test(r.stderr)) break; // past the last page
        console.error("[svg] pdftocairo exited with", r.code, r.stderr);
        if (PASSWORD.test(r.stderr)) throw new HttpError(422, "This PDF is password-protected. Unlock it first.");
        if (p > first) break;
        throw new HttpError(422, "This PDF couldn't be converted to SVG.");
      }
      pages.push(await readFile(out, "utf8"));
    }
    return pages;
  });
}
