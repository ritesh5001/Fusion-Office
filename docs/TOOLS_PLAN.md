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
| Intelligence | Translate PDF | AI | Claude API + text replacement | 2 |
| Workflows | Chain tools and reuse them | B | tool processors | 1 |

Not in scope for the web app now (roadmap): desktop and mobile apps, an image
suite (iLoveIMG), signature *requests* to other people (Fusion Sign),
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
  ToolPage.tsx         shared shell: drop files → options → run → results
  options/*.tsx        per-tool option panels and special UIs
client/src/app/tools/  /tools and /tools/[slug] (static pages)
server/src/routes/convert.ts   LibreOffice + Chromium conversions (phase 2)
server/src/routes/ai.ts        summarize / translate via Claude (phase 2)
```

Every browser processor is a pure function over bytes, so the same code powers
single tools, **workflows** (chains of processors), and unit tests.

## Phases

1. **Tool platform + all browser tools** (merge through compare above), tools
   hub, navigation, workflows, tests.
2. **Server engines:** LibreOffice and Chromium conversions (Docker image on
   Render), Claude-powered summarize and translate. Requires
   `ANTHROPIC_API_KEY` for the AI tools.
3. **Archival and deep repair:** Ghostscript for PDF/A and heavy repair.

## Quality bar

- Each processor has unit tests on real PDFs (Node + pdf.js legacy build).
- Tools that change content report what they did (sizes, pages, matches).
- Nothing is uploaded by a browser tool; server tools state it up front.
- Output files open in Acrobat, Preview and Chrome.
