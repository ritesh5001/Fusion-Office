# Fusion Office

A document workspace. The first product is a **browser-based PDF editor**: upload a PDF, edit it visually, annotate, sign, redact and reorganize pages, then export a real PDF. Files are processed on the user's device. Nothing is uploaded unless the user saves to the cloud.

## Project layout

```
fusion-office/
├── client/    Frontend: Next.js + React + Tailwind. The PDF editor (PDF.js, pdf-lib, Fabric.js, Zustand)
└── server/    Backend: Node.js + Express + TypeScript. API, Auth.js, Prisma/PostgreSQL, S3/R2
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
| Edit | Text (font, size, bold/italic/underline, color, align, line height, letter spacing), images (flip, replace, opacity), rectangle / ellipse / triangle / line / arrow, pen and marker drawing, eraser |
| Annotate | Highlight / underline / strikethrough **snapped to the real PDF text** (multi-line), sticky-note comments (exported as real PDF annotations) |
| Sign | Draw, type (script fonts) or upload (with white-background removal), saved signatures |
| Protect | **True redaction**: redacted pages are rasterized on export, so the text underneath is removed from the file. Whiteout for visual cover |
| Objects | Select, multi-select, move / resize / rotate, properties panel, layer order, copy / cut / paste / duplicate, arrow-key nudge |
| Pages | Add blank, insert pages from another PDF, image as page, duplicate, delete (with confirm), rotate, drag to reorder, multi-select, extract to new PDF, split (every N pages or ranges) |
| History | Undo / redo for every edit, with a visible history list |
| Search | ⌘/Ctrl+F across all pages, results by page, highlighted matches |
| Export | Download, flatten (forms + comments), print |
| Cloud (optional) | Auth.js sign-in, save to S3/R2 + Postgres, autosave, versions + restore, dashboard |

Keyboard shortcuts are listed in the editor under **Help → Keyboard shortcuts** (or press `?`).

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
└── lib/cloudConfig.ts        Asks the server which cloud features are on

server/src/
├── index.ts                  Entry point (loads .env, starts Express)
├── app.ts                    Express app: middleware, /api/config, /api/health, routes
├── auth.ts                   Auth.js (@auth/express): GitHub/Google, Prisma adapter, JWT sessions
├── routes/documents.ts       Documents CRUD, presigned uploads, versions + restore
└── lib/                      db.ts (Prisma), storage.ts (S3/R2 presigned URLs), http.ts (auth guard, validation, errors)
server/prisma/schema.prisma   Users, accounts, documents, versions
```

**API** (all under `/api`): `GET /config`, `GET /health`, `/auth/*` (Auth.js), `GET|POST /documents`, `GET|PUT|DELETE /documents/:id`, `GET|POST /documents/:id/versions`.

**Key design decisions**

- **The original PDF is never modified while editing.** The store holds `pages[]` (each pointing at a page of a source PDF, or a blank page) plus user `objects[]` per page. Export combines them with pdf-lib. This keeps undo cheap (immutable snapshots) and makes future tools (merge, reorder, convert) straightforward.
- **The model is the source of truth; Fabric.js is the view.** Each page has its own Fabric canvas that is reconciled against the model. User transforms are read back into the model. That's why every change is undoable and the properties panel and canvas never drift.
- **Objects are stored by center + angle in "view space"** (points, top-left origin, as displayed). Page rotation transforms objects with the page. Export maps view space to PDF space with one matrix per rotation, verified against pdf.js in `tests/geometry.test.mts`.
- **Cloud uploads go straight from the browser to S3/R2** with presigned URLs, so large PDFs never hit serverless body-size limits. Autosave sends only editor state.

## Enabling cloud save (optional)

1. Copy `server/.env.example` to `server/.env` and fill in `DATABASE_URL`, `AUTH_SECRET` (`npx auth secret`), at least one OAuth provider (GitHub or Google) and the S3/R2 settings.
2. `npm run db:push` to create the tables.
3. Add a CORS rule to the bucket allowing `PUT` and `GET` from the site's origin (browsers upload and download directly).
4. OAuth callback URL: `<site-url>/api/auth/callback/<github|google>`, where site-url is the **client's** address (e.g. `http://localhost:3000` locally).

Without these settings, the cloud buttons are hidden and the documents API returns `503`.

## Deploying

- **client/** can go on Vercel (or any Next.js host). Set `SERVER_URL` to the server's URL.
- **server/** runs anywhere Node runs (Render, Railway, Fly, a VPS): `npm run build -w server && npm run start -w server`. Set `AUTH_URL=https://<your-site>/api/auth` so OAuth callbacks use the public address.
- Keep the server reachable only through the client proxy where possible. If the browser must call it directly, set `CLIENT_ORIGIN` on the server to enable CORS.

## Security: CORS and headers

| Layer | What is enforced | Where |
| --- | --- | --- |
| API CORS | Only allowlisted origins get CORS headers, with credentials. List = `CLIENT_ORIGIN` + origin of `AUTH_URL` + `localhost:3000` outside production | `server/src/lib/security.ts` |
| CSRF | Any write to `/api/documents` with an `Origin` not on the list gets `403`. Auth.js routes use their own CSRF token | `originGuard` in the same file |
| API headers | helmet: strict CSP (`default-src 'none'`), `nosniff`, `frame-ancestors 'none'`, HSTS, no `X-Powered-By` | `securityHeaders` |
| Site headers | CSP, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, COOP, HSTS | `client/next.config.ts` |
| Bucket CORS | `GET`/`PUT`/`HEAD` from the same origin list, for presigned uploads and downloads | `npm run storage:cors -w server` |

By default the browser calls `/api/*` on the site itself and Next proxies it to the server, so CORS never comes into play. To call the server directly, set `NEXT_PUBLIC_API_URL` on the client and add the site to `CLIENT_ORIGIN` on the server. Both must share a parent domain (for example `app.example.com` and `api.example.com`) so the session cookie is sent. Set `NEXT_PUBLIC_STORAGE_ORIGIN` to lock the CSP's `connect-src` to your bucket.

## Known limitations (v1)

- **Existing PDF text can't be edited in place yet.** Text is added as new objects. Use whiteout plus new text to replace wording. True in-place editing is the Phase 7 work.
- **Export uses the standard PDF fonts** (Helvetica/Times/Courier, Latin characters). Characters outside that set are replaced (`₹` becomes `Rs.`). Embedding a Unicode font (e.g. Noto Sans via `@pdf-lib/fontkit`) fixes this.
- Redacted pages become images on export, so their text is no longer selectable. That's the trade-off for real removal.
- Password-protected PDFs, image cropping, form-field creation, find & replace, OCR and PDF/A are not built yet.
- Pinned to stable majors: Next 15, Fabric 6, PDF.js 4, Prisma 6, Express 5. Fabric 6 has advisories that only affect its SVG export (`toSVG`), which this app doesn't use. Upgrade to Fabric 7 when convenient.

## Roadmap

1. Unicode font embedding, image crop, form fields (text, checkbox, radio, dropdown, date, signature)
2. In-place editing of existing text, find & replace, font detection
3. OCR with Tesseract.js (scanned PDFs → searchable/editable)
4. Python service for heavy work: compression, PDF ↔ DOCX/XLSX/PPTX, PDF/A
5. Word, spreadsheet and presentation editors on the same document/storage model
