# SEO architecture

How Fusion Office is set up to rank for PDF, document and image tool searches, and how to keep it that way when tools are added.

## Audit (before this work, live site, 2026-10-04)

**Strengths**
- Every tool already had its own URL (`/tools/<slug>`), statically generated, with a working tool as the main content.
- Server-rendered HTML (Next.js App Router), fast first load, self-hosted fonts, no third-party scripts.
- Genuine differentiators worth stating plainly: free, no sign-up, no watermark, most tools run in the browser.

**Problems**
- `robots.txt` and `sitemap.xml` returned 404.
- No `metadataBase`, canonical URLs, Open Graph, X/Twitter cards or structured data on any page.
- Homepage `<title>` was just "Fusion Office"; the H1 ("All your files. One private workspace.") didn't say what the site does.
- Tool titles were the bare tool name ("Merge PDF · Fusion Office") and descriptions were one-line registry blurbs.
- Tool pages had almost no supporting content: generic three-step "How it works" and four related links.
- No category pages: categories existed only as `/#cat-…` hash anchors, so "PDF tools", "PDF converter", "image tools" had nowhere to rank.
- No informational content for "how to…" searches.
- The editor tools (`/tools/edit-pdf`, `/tools/sign-pdf`, Word/Excel/PowerPoint editors) redirected to client-only app screens whose HTML is an empty loader, so the highest-value queries ("PDF editor online") had no crawlable page.
- Unknown `/tools/<slug>` URLs were rendered on demand instead of being static 404s.
- The `onrender.com` address and `www` serve the same pages (duplicate hosts) without canonical tags to consolidate them.

## Structure

| Level | URL | Targets | Source |
| --- | --- | --- | --- |
| Home | `/` | Brand + broad category ("free online PDF tools", "online office tools") | `app/page.tsx` |
| Category | `/pdf-tools`, `/pdf-converter`, `/office-tools`, `/image-tools`, `/ai-pdf-tools` | Groups of tools ("PDF converter", "image tools online") | `lib/seo/clusters.ts` |
| Tool | `/tools/<slug>` (73 live tools + `/tools/workflows`) | One high-intent task each ("compress PDF online", "PDF to Word") | `lib/seo/content/*.ts` |
| Guide | `/guides`, `/guides/<slug>` (11 guides) | "How to…" searches | `lib/seo/guides.ts` |
| Directory | `/tools` | Full catalogue | `app/tools/page.tsx` |

Each registry category belongs to exactly one category page (`CATEGORY_CLUSTER`), which is the breadcrumb parent of its tools: Home → PDF Tools → Compress PDF.

**Editors.** `/editor`, `/write`, `/sheets` and `/slides` are full-screen app screens and are `noindex, follow`. The pages meant for search are their tool pages (`/tools/edit-pdf`, `/tools/sign-pdf`, `/tools/word-editor`, `/tools/excel-editor`, `/tools/powerpoint-editor`), which have real content and a working start panel that hands the chosen file to the editor.

**Not indexed:** `/dashboard` (also disallowed in robots.txt), `/api/*`, unreleased ("soon") tools, the editor screens, and the 404 page.

## Content rules

Per tool (`ToolSeo` in `lib/seo/content/types.ts`): a unique title and description, the search intent it serves (`intent`, not rendered), a descriptive anchor text other pages link with, a short intro, specific steps, features, uses, honest limits, questions people actually ask, and hand-picked related tools. Content describes what the tool really does; check the tool's options before writing a claim.

Not allowed: invented ratings, reviews, statistics or authors; FAQ markup for questions that aren't shown on the page; near-duplicate pages for the same intent; keyword lists in visible text.

## Structured data (`lib/seo/jsonld.ts`)

- Home: `Organization`, `WebSite`, `FAQPage` (visible FAQ)
- Tool pages: `WebApplication` (free offer, feature list), `BreadcrumbList`, `FAQPage` where the page shows questions
- Category pages: `CollectionPage` with an `ItemList` of its tools, `BreadcrumbList`, `FAQPage`
- Guides: `Article` (publisher and author are the organisation), `BreadcrumbList`, `FAQPage` where shown

## Technical

- Canonical origin: `NEXT_PUBLIC_SITE_URL`, default `https://fusionoffice.online`. Every page sets a self-referencing canonical via `pageMetadata()` in `lib/seo/site.ts`, plus matching Open Graph and X cards.
- `app/sitemap.ts` and `app/robots.ts` are generated from the same data as the pages.
- Open Graph images are generated per page type (`opengraph-image.tsx` files, rendered by `lib/seo/ogImage.tsx`).
- `/tools/[slug]` and `/guides/[slug]` use `dynamicParams = false`: unknown slugs are real 404s.
- `tests/seo.test.mts` fails the build's test run if a tool lacks content, titles or descriptions repeat or run long, or a link in a guide points at a page that doesn't exist.

## Hosting (needs doing outside the code)

The live site currently redirects `fusionoffice.online` → `www.fusionoffice.online`, but canonical URLs now use the apex domain. In the hosting dashboard, make `fusionoffice.online` the primary domain so `www` (and ideally the `onrender.com` address) redirect to it with a 301/308. Then submit `https://fusionoffice.online/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

## Adding a tool

1. Add it to `lib/tools/registry.ts` as usual.
2. Add its entry to the matching file in `lib/seo/content/`. `npm test` fails until you do.
3. If it fits an existing guide, add its slug to that guide's `tools`.

The sitemap, category page, related-tool links, structured data and Open Graph image follow automatically.
