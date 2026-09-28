// Copies the PDF.js worker into /public so it is served as a static file.
// Loading it from /public avoids bundler-specific worker handling.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

try {
  const pkg = require.resolve("pdfjs-dist/package.json");
  const src = join(dirname(pkg), "build", "pdf.worker.min.mjs");
  const dest = join(process.cwd(), "public", "pdf.worker.min.mjs");
  if (!existsSync(dirname(dest))) mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log("[fusion-office] copied pdf.js worker to public/");
} catch (err) {
  console.warn("[fusion-office] could not copy pdf.js worker:", err.message);
}

// Tesseract (OCR) runs fully in the browser; serve its engine and English
// language data from /public so no third-party CDN is contacted.
try {
  const { readdirSync } = await import("node:fs");
  const tjs = dirname(require.resolve("tesseract.js/package.json"));
  const core = dirname(require.resolve("tesseract.js-core/package.json"));
  const lang = dirname(require.resolve("@tesseract.js-data/eng/package.json"));
  const out = join(process.cwd(), "public", "tesseract");
  mkdirSync(join(out, "core"), { recursive: true });
  mkdirSync(join(out, "lang"), { recursive: true });
  copyFileSync(join(tjs, "dist", "worker.min.js"), join(out, "worker.min.js"));
  // Only the LSTM builds are used (the default OCR engine); .wasm.js embeds the wasm.
  for (const f of readdirSync(core)) if (/lstm\.wasm\.js$/.test(f)) copyFileSync(join(core, f), join(out, "core", f));
  copyFileSync(join(lang, "4.0.0_best_int", "eng.traineddata.gz"), join(out, "lang", "eng.traineddata.gz"));
  console.log("[fusion-office] copied tesseract engine + English data to public/tesseract");
} catch (err) {
  console.warn("[fusion-office] could not copy tesseract assets:", err.message);
}
