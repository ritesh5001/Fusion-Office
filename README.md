# Fusion Office

A document workspace. The first product is a **browser-based PDF editor**: upload a PDF, edit it visually, annotate, sign, redact and reorganize pages, then export a real PDF. Files are processed on the user's device. Nothing is uploaded unless the user saves to the cloud.

## Project layout

```
fusion-office/
├── client/    Frontend: Next.js + React + Tailwind. The PDF editor (PDF.js, pdf-lib, Fabric.js, Zustand)
└── server/    Backend: Node.js + Express + TypeScript. API, Auth.js, Prisma/PostgreSQL, disk file storage
```

The two are separate npm workspaces. The browser only talks to the client. The client proxies `/api/*` to the server (`SERVER_URL`, default `http://localhost:4000`), so sign-in cookies stay same-origin and no CORS setup is needed.

## Quick start

```bash
npm install          # installs both apps (copies the PDF.js worker, generates the Prisma client)
npm run dev          # server on :4000 + client on :3000  →  http://localhost:3000/editor
```

No `.env` is needed to use the editor. Documents autosave to the browser (IndexedDB) and show up under "Recent on this device". If the server isn't running, the editor still works; only cloud features are hidden.

| Command (from the root) | What it does |
| --- | --- |
| `npm run dev` | Both apps in watch mode (`dev:client` / `dev:server` for one) |
| `npm run build` / `npm start` | Production build / run both |
| `npm test` | Server API tests + client geometry/text-wrap tests |
| `npm run typecheck` | Type-check both apps |
| `npm run db:push` | Create the database tables (server) |

Test helpers: `node client/scripts/make-sample-pdf.mjs sample.pdf` (test PDF with a pre-rotated page) and `node client/scripts/inspect-pdf.mjs out.pdf` (dump text, rotation, annotations).

## What v1 does

| Area | Features |
| --- | --- |
| Open | Drag & drop, file picker, paste, images → PDF page, recent files, blank document |
| View | Page thumbnails, lazy page rendering, zoom (steps, ⌘/Ctrl+wheel, pinch), fit width / fit page, page navigation, full screen |
| Edit | Edit existing text in place (click a line, retype; originals removed on export), add text (font, size, bold/italic/underline, color, align, line height, letter spacing), images (flip, replace, opacity), rectangle / ellipse / triangle / line / arrow, pen and marker drawing, eraser |
| Annotate | Highlight / underline / strikethrough **snapped to the real PDF text** (multi-line), sticky-note comments (exported as real PDF annotations) |
| Sign | Draw, type (script fonts) or upload (with white-background removal), saved signatures |
| Protect | **True redaction**: redacted pages are rasterized on export, so the text underneath is removed from the file. Whiteout for visual cover |
| Objects | Select, multi-select, move / resize / rotate, properties panel, layer order, copy / cut / paste / duplicate, arrow-key nudge |
| Pages | Add blank, insert pages from another PDF, image as page, duplicate, delete (with confirm), rotate, drag to reorder, multi-select, extract to new PDF, split (every N pages or ranges) |
| History | Undo / redo for every edit, with a visible history list |
| Search | ⌘/Ctrl+F across all pages, results by page, highlighted matches |
| Export | Download, flatten (forms + comments), print |
| Cloud (optional) | Auth.js sign-in, save to Postgres + server disk, autosave, versions + restore, dashboard |

Keyboard shortcuts are listed in the editor under **Help → Keyboard shortcuts** (or press `?`).

## PDF and image tools (`/tools`)

37 single-purpose tools (the iLovePDF-style PDF catalogue plus image tools) share one upload → options → result flow. Most run **entirely in the browser**, so the file never leaves the device. Plan and details: [docs/TOOLS_PLAN.md](docs/TOOLS_PLAN.md).

| Runs | Tools |
| --- | --- |
| In the browser | Merge, Split, Organize, Rotate, Compress, Repair, OCR (Tesseract.js, self-hosted), JPG → PDF, Scan to PDF (camera), PDF → JPG / Word / PowerPoint / Excel / Markdown, Watermark, Page numbers, Crop, Forms, Protect, Unlock, Redact, Compare, Workflows (chain tools and save the recipe) |
| On the server | Word / PowerPoint / Excel → PDF (LibreOffice), HTML → PDF (headless Chromium) |
| AI (server + Claude) | AI Summarizer, Translate PDF (Word + Markdown output). Needs `ANTHROPIC_API_KEY` |
| In the editor | Edit PDF, Sign PDF |
| Images (in the browser) | **Image editor** (crop with shapes incl. passport 35×45, rotate, flip, straighten, 10 adjustments, 10 filters, text with fonts/colours/outline/box, undo/redo, resize and save with a KB limit), Compress image (by quality or to a target like 50 KB), Resize image (by %, pixels, print size in cm/mm/in with DPI, optional KB limit), Crop image, Convert image (JPG/PNG/WEBP, incl. HEIC where the browser can open it, GIF, BMP, SVG), Rotate image |
| Coming soon | PDF → PDF/A (Ghostscript) |

Running the server tools locally: install LibreOffice (`brew install --cask libreoffice`) so `soffice` is on your PATH; Chrome is found automatically. Without them those tools say they aren't available.

**AI tools** use `claude-opus-5` with server-side fallbacks turned on (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`): if Claude's safety checks decline a request, the API re-runs it on Anthropic's recommended fallback model instead of failing. Remove those two fields in `server/src/lib/ai.ts` to turn that off.

## Architecture

```
client/src/
├── app/                      Pages: suite home, /editor, /dashboard (all static)
├── components/editor/        TopBar, ToolBar, PageSidebar, Viewport, PageView,
│                             PropertiesPanel, BottomBar, SearchPanel, Dialogs, cloud.ts
├── components/home/          Account links, dashboard, cloud document list
├── lib/editor/               Editor core (no UI)
│   ├── types.ts              Data model: pages[] → objects[]
│   ├── store.ts              Zustand store: document, history, tools, selection, clipboard
│   ├── objects.ts            Object factories, cloning, rotate-with-page
│   ├── fabricAdapter.ts      Model ⇄ Fabric.js objects + canvas reconciliation
│   └── actions.ts            Open / insert / export / extract / split / print
├── lib/pdf/
│   ├── sources.ts            Registry of original PDF bytes + PDF.js documents
│   ├── renderer.ts           Page + thumbnail rendering (PDF.js)
│   ├── text.ts               Text layer: search and text-snapped markup rects
│   ├── exporter.ts           Original PDF + edits → new PDF (pdf-lib)
│   └── geometry.ts           View-space ⇄ PDF-space math (tested against pdf.js)
├── lib/storage/local.ts      IndexedDB autosave + recent files
├── lib/image/                Image tools: geometry.ts (resize/crop/units), pixels.ts (adjustments, filters),
│                             encode.ts (fit-under-KB search, DPI tags), canvas.ts (decode, edit pipeline, export)
└── lib/cloudConfig.ts        Asks the server which cloud features are on

server/src/
├── index.ts                  Entry point (loads .env, starts Express)
├── app.ts                    Express app: middleware, /api/config, /api/health, routes
├── auth.ts                   Auth.js (@auth/express): GitHub/Google, Prisma adapter, JWT sessions
├── routes/documents.ts       Documents CRUD, signed upload links, versions + restore
├── routes/files.ts           Signed-link file upload/download to the server disk
├── routes/convert.ts         Office → PDF (LibreOffice), HTML → PDF (Chromium)
├── routes/ai.ts              Summarize / translate (Claude)
└── lib/                      db.ts (Prisma), storage.ts (disk + signed links), security.ts (CORS, CSRF, headers), http.ts,
                              office.ts, html.ts, netGuard.ts (SSRF guard + egress proxy), ai.ts, rateLimit.ts
server/prisma/schema.prisma   Users, accounts, documents, versions
```

**API** (all under `/api`): `GET /config`, `GET /health`, `/auth/*` (Auth.js), `GET|POST /documents`, `GET|PUT|DELETE /documents/:id`, `GET|POST /documents/:id/versions`, `POST /convert/office` (raw file body + `X-Filename`), `POST /convert/html`, `POST /ai/summarize`, `POST /ai/translate`.

**Key design decisions**

- **The original PDF is never modified while editing.** The store holds `pages[]` (each pointing at a page of a source PDF, or a blank page) plus user `objects[]` per page. Export combines them with pdf-lib. This keeps undo cheap (immutable snapshots) and makes future tools (merge, reorder, convert) straightforward.
- **The model is the source of truth; Fabric.js is the view.** Each page has its own Fabric canvas that is reconciled against the model. User transforms are read back into the model. That's why every change is undoable and the properties panel and canvas never drift.
- **Objects are stored by center + angle in "view space"** (points, top-left origin, as displayed). Page rotation transforms objects with the page. Export maps view space to PDF space with one matrix per rotation, verified against pdf.js in `tests/geometry.test.mts`.
- **Uploaded PDFs live on the server's disk** and move through short-lived signed links, so the API never trusts a path from the browser. Autosave sends only editor state, not the file.

## Enabling cloud save (optional)

Cloud save needs PostgreSQL, `AUTH_SECRET` and one OAuth provider. Uploaded PDFs are stored on the server's own disk (`STORAGE_DIR`, default `server/.data/files`) and moved with short-lived signed links (`/api/files/...`). No S3 or other bucket is involved.

1. Copy `server/.env.example` to `server/.env` and fill in `DATABASE_URL`, `AUTH_SECRET` (`npx auth secret`) and GitHub or Google OAuth keys.
2. `npm run db:migrate -w server` (production) or `npm run db:push` (quick local setup).
3. OAuth callback URL: `<site>/api/auth/callback/<github|google>`, where site is the **frontend's** address.

Without these settings the cloud buttons are hidden and the documents API returns `503`.

## Deploying on Render

`render.yaml` is a Render Blueprint that creates everything:

| Resource | Name | Notes |
| --- | --- | --- |
| Backend (web service) | `fusion-office` | API + Auth.js + file storage + converters. **Docker** (`server/Dockerfile`: Node 22, LibreOffice, Chromium, Noto fonts incl. Indic and CJK). Paid instance (`0.5c-512mb`) because it needs a **persistent disk** (5 GB at `/var/data`) for uploaded PDFs. Runs `prisma migrate deploy` on every start. 512 MB handles one conversion at a time; pick a 2 GB plan for heavier use |
| Frontend (web service) | `fusion-office-web` | Next.js site and editor. Free plan works; it reaches the backend over Render's private network (`SERVER_HOSTPORT`) |
| Database | `fusion-office-db` | Render Postgres, wired to the backend's `DATABASE_URL` |

Steps:

1. Push to GitHub, then in Render: **New → Blueprint** and pick the repo. All services are in the Singapore region, the closest to India.
2. When prompted, set on the backend:
   - `AUTH_URL` = `https://fusion-office-web.onrender.com/api/auth` (the **frontend** address; use your custom domain later)
   - `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` (and/or Google). The GitHub OAuth app's callback is `https://fusion-office-web.onrender.com/api/auth/callback/github`.
   - `CLIENT_ORIGIN` only if you add custom domains.
   - `ANTHROPIC_API_KEY` to turn on the AI tools (optional).
3. `AUTH_SECRET` is generated automatically. Uploaded files survive deploys and restarts because they live on the disk.

Good to know:

- A service with a disk can't run more than one instance, and deploys have a few seconds of downtime while the disk moves to the new instance.
- Free frontend instances sleep after inactivity; the first visit after that takes a while to wake up.
- If a service named `fusion-office` already exists in your workspace (created by hand), Render may not let the Blueprint create one with the same name. Delete or rename the old one first, or rename the backend in `render.yaml` and update the `fromService` name to match.
- `client/.env` is not used on Render (it's git-ignored). Don't set `SERVER_URL` there in production; the Blueprint provides `SERVER_HOSTPORT`.

## Security: CORS and headers

| Layer | What is enforced | Where |
| --- | --- | --- |
| API CORS | Only allowlisted origins get CORS headers, with credentials. List = `CLIENT_ORIGIN` + origin of `AUTH_URL` + `localhost:3000` outside production | `server/src/lib/security.ts` |
| CSRF | Any write to `/api/documents` with an `Origin` not on the list gets `403`. Auth.js routes use their own CSRF token | `originGuard` in the same file |
| API headers | helmet: strict CSP (`default-src 'none'`), `nosniff`, `frame-ancestors 'none'`, HSTS, no `X-Powered-By` | `securityHeaders` |
| Site headers | CSP, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, COOP, HSTS | `client/next.config.ts` |
| Server tools | `/api/convert` and `/api/ai` are origin-checked and rate limited per IP. Office uploads are checked by extension **and** file signature. HTML → PDF only reaches public addresses: Chromium is forced through a local proxy that refuses private, loopback and cloud-metadata addresses (redirects and sub-resources included) | `server/src/lib/netGuard.ts`, `server/src/app.ts` |
| File links | Uploads/downloads use HMAC-signed links that expire after 15 minutes; only real PDFs (checked by content) are stored, size-capped by `MAX_UPLOAD_MB` | `server/src/lib/storage.ts`, `server/src/routes/files.ts` |

By default the browser calls `/api/*` on the site itself and Next proxies it to the server, so CORS never comes into play. To call the server directly, set `NEXT_PUBLIC_API_URL` on the client and add the site to `CLIENT_ORIGIN` on the server. Both must share a parent domain (for example `app.example.com` and `api.example.com`) so the session cookie is sent.

## Known limitations (v1)

- **Editing existing text** works line by line on PDFs with a text layer. The original glyphs are removed from the page's content stream on export (`client/src/lib/pdf/textRemoval.ts`); lines the engine can't measure safely (Type3 fonts, unusual encodings, text inside form XObjects) are covered with the sampled background colour instead. Replacement text uses the standard fonts matched by family and weight, not the document's embedded font, and is left-aligned at the original position.
- **Export uses the standard PDF fonts** (Helvetica/Times/Courier, Latin characters). Characters outside that set are replaced (`₹` becomes `Rs.`). Embedding a Unicode font (e.g. Noto Sans via `@pdf-lib/fontkit`) fixes this.
- Redacted pages become images on export, so their text is no longer selectable. That's the trade-off for real removal.
- In the editor: image cropping, form-field creation and find & replace are not built yet (password-protected PDFs, OCR and form filling are available as tools under `/tools`). PDF/A is not built yet.
- Translate PDF returns the translation as Word and Markdown; it doesn't rebuild the original page layout.
- The Docker image couldn't be built on the development machine (no Docker installed); its first real build happens on Render.
- Pinned to stable majors: Next 15, Fabric 6, PDF.js 4, Prisma 6, Express 5. Fabric 6 has advisories that only affect its SVG export (`toSVG`), which this app doesn't use. Upgrade to Fabric 7 when convenient.

## Roadmap

1. Unicode font embedding, image crop, form fields (text, checkbox, radio, dropdown, date, signature)
2. In-place editing of existing text, find & replace, font detection
3. PDF/A and deep repair with Ghostscript
4. Layout-preserving translation (translated text placed back on the page)
5. Word, spreadsheet and presentation editors on the same document/storage model
