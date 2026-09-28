# Fusion Office: PDF tools plan

Goal: every tool from the iLovePDF catalogue, inside Fusion Office, sharing one
look, one upload flow and one privacy model.

**Privacy rule:** a tool runs in the browser whenever that is technically
possible (the file never leaves the device). Only tools that need a heavy
engine (LibreOffice, Chromium, Ghostscript) or an AI model use the server, and
the tool page says so before the user uploads anything.

## Tool inventory

Legend: **B** = runs in the browser · **S** = server engine · **AI** = server + language model.

| Category | Tool | Runs | Engine | Phase |
| --- | --- | --- | --- | --- |
| Organize | Merge PDF | B | pdf-lib | 1 |
| Organize | Split PDF (ranges, every N, extract selected) | B | pdf-lib | 1 |
| Organize | Organize PDF (reorder, rotate, delete, insert blank) | B | pdf-lib + page grid | 1 |
| Organize | Rotate PDF (many files at once) | B | pdf-lib | 1 |
| Optimize | Compress PDF (images re-encoded, text kept) | B | pdf-lib + canvas | 1 |
| Optimize | Repair PDF (tolerant re-parse and rebuild) | B | pdf-lib / pdf.js | 1 |
| Optimize | OCR PDF (searchable text layer) | B | Tesseract.js (self-hosted) | 1 |
| Convert to PDF | JPG / PNG / WEBP to PDF | B | pdf-lib | 1 |
| Convert to PDF | Scan to PDF (camera) | B | getUserMedia + canvas | 1 |
| Convert to PDF | Word to PDF | S | LibreOffice (headless) | 2 |
| Convert to PDF | PowerPoint to PDF | S | LibreOffice | 2 |
| Convert to PDF | Excel to PDF | S | LibreOffice | 2 |
| Convert to PDF | HTML / URL to PDF | S | Chromium (puppeteer-core) | 2 |
| Convert from PDF | PDF to JPG (pages or embedded images) | B | pdf.js | 1 |
| Convert from PDF | PDF to Word | B | pdf.js text + `docx` | 1 |
| Convert from PDF | PDF to PowerPoint | B | pdf.js render + `pptxgenjs` | 1 |
| Convert from PDF | PDF to Excel (table detection) | B | pdf.js text + `exceljs` | 1 |
| Convert from PDF | PDF to Markdown | B | pdf.js text | 1 |
| Convert from PDF | PDF to PDF/A | S | Ghostscript | 3 |
| Edit | Edit PDF | B | Fusion editor | done |
| Edit | Sign PDF | B | Fusion editor (signature tool) | done |
| Edit | Watermark (text or image) | B | pdf-lib | 1 |
| Edit | Page numbers | B | pdf-lib | 1 |
| Edit | Crop PDF | B | pdf-lib (CropBox) | 1 |
| Edit | PDF Forms (detect, fill, flatten) | B | pdf-lib forms | 1 |
| Security | Protect PDF (AES-256 password + permissions) | B | @cantoo/pdf-lib | 1 |
| Security | Unlock PDF | B | @cantoo/pdf-lib | 1 |
| Security | Redact PDF (find and remove text for real) | B | Fusion glyph-removal engine | 1 |
| Intelligence | Compare PDF (text diff + visual overlay) | B | pdf.js | 1 |
| Intelligence | AI Summarizer | AI | Claude API | 2 |
| Intelligence | Translate PDF (to Word + Markdown) | AI | Claude API | 2 |
| Workflows | Chain tools and reuse them | B | tool processors | 1 |

### Office editors

Word (`/write`), Excel (`/sheets`) and PowerPoint (`/slides`) editors open and save real Office files in the browser. Readers and writers live in `client/src/lib/office/` and are round-trip tested in `client/tests/docx.test.mts`, `sheets.test.mts` and `slides.test.mts`. The server's `/api/convert/office?to=docx|xlsx|pptx` turns old formats (.doc, .xls, .ppt, OpenDocument) into the modern ones first, and `?to=pdf` makes the PDF exports.

### Image tools (all in the browser)

| Tool | What it does |
| --- | --- |
| Image editor | Crop (free, square, 4:5, 3:4, 4:3, 3:2, 16:9, 9:16, passport 35×45), rotate, flip, straighten; exposure, brightness, contrast, highlights, shadows, saturation, warmth, vignette, sharpen, blur; 10 filters; text layers; undo/redo; resize and save as JPG/PNG/WEBP with an optional KB limit |
| Compress image | By quality level, or to a target size (e.g. 50 KB): best quality that fits, shrinking dimensions only if needed |
| Resize image | By percent (10%, 25%…), pixels, or print size in cm/mm/in at a DPI (written into the file); crop-to-fill, borders or stretch; optional KB limit |
| Crop image | The editor's crop step on its own |
| Convert image | To JPG, PNG or WEBP (HEIC where the browser can decode it, GIF, BMP, AVIF, SVG in) |
| Rotate image | Quarter turns and mirroring, many files at once |

Code: `client/src/lib/image/` (pure math in `geometry.ts`, `pixels.ts`, `encode.ts`, tested in `client/tests/image.test.mts`; canvas pipeline in `canvas.ts`).

Not in scope for the web app now (roadmap): desktop and mobile apps, signature *requests* to other people (Fusion Sign),
business/teams plans.

## Architecture

```
client/src/lib/tools/
  registry.ts          one entry per tool: slug, name, category, accepts, runs (B/S/AI)
  files.ts             ToolFile type, zip (fflate), downloads, naming
  pdfjs.ts             render / text extraction from raw bytes (no editor state)
  processors/*.ts      pure functions: (files, options) → files
client/src/components/tools/
  ToolsHub.tsx         the catalogue page with category filters
  ToolRunner.tsx       shared shell: drop files → options → run → results
  specs.tsx            per-tool options panel + run function (processors load lazily)
  custom/*.tsx         tools with their own UI: organize, crop, forms, compare, scan, workflows
client/src/app/tools/  /tools and /tools/[slug] (static pages)
server/src/routes/convert.ts   POST /api/convert/office (LibreOffice), /api/convert/html (Chromium)
server/src/routes/ai.ts        POST /api/ai/summarize, /api/ai/translate (Claude)
server/src/lib/netGuard.ts     SSRF guard: public-address checks + egress proxy for Chromium
server/src/lib/rateLimit.ts    per-IP limits and a concurrency queue for the heavy routes
```

Every browser processor is a pure function over bytes, so the same code powers
single tools, **workflows** (chains of processors), and unit tests.

## Phases

1. **Done.** Tool platform + all browser tools (merge through compare above),
   tools hub, navigation, workflows, tests.
2. **Done.** Server engines: LibreOffice and Chromium conversions (Docker image
   on Render), Claude-powered summarize and translate. The AI tools need
   `ANTHROPIC_API_KEY` on the server; without it they answer "not available".
3. **Next.** Archival and deep repair: Ghostscript for PDF/A and heavy repair.
   PDF/A shows as "Coming soon" until then.

### Server tool safeguards

- **Office → PDF:** extension allowlist plus a file-signature check, size cap
  (`CONVERT_MAX_MB`), one throwaway LibreOffice profile and folder per file,
  a timeout, and a queue (`CONVERT_CONCURRENCY`).
- **HTML → PDF:** only public `http(s)` addresses. The address is checked
  before loading, and Chromium is forced through a local proxy that resolves
  every host itself and refuses private, loopback, link-local and metadata
  addresses (covers redirects, sub-resources, fetch, workers and WebSockets;
  WebRTC is disabled). Each page runs in a fresh browser context.
- **AI:** Claude (`claude-opus-5`) with server-side fallbacks turned on
  (`fallbacks: "default"`): if Claude's safety checks decline a request, the
  API retries it on Anthropic's recommended fallback model. Oversized
  documents get a clear "too long" error instead of being cut short. When
  sign-in is configured, only signed-in users can use AI tools.
- All heavy routes: origin check and per-IP rate limits.

## Quality bar

- Each processor has unit tests on real PDFs (Node + pdf.js legacy build).
- Tools that change content report what they did (sizes, pages, matches).
- Nothing is uploaded by a browser tool; server tools state it up front.
- Output files open in Acrobat, Preview and Chrome.
