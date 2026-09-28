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
