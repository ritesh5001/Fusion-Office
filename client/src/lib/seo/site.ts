import type { Metadata } from "next";

/**
 * Canonical origin. The apex domain redirects here, so every canonical URL,
 * sitemap entry and structured-data URL uses this host.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.fusionoffice.online").replace(/\/+$/, "");
export const SITE_NAME = "Fusion Office";
export const SITE_TAGLINE = "Free online PDF, Office and image tools";
export const SITE_DESCRIPTION =
  "Fusion Office is a free workspace of 75 online tools to edit, convert, compress, merge, split, sign and protect PDFs, edit Word, Excel and PowerPoint files, and resize or compress images. No sign-up, and most tools run in your browser so files stay on your device.";

/** Date the current editorial content (tool pages, categories, guides) was last reviewed. */
export const CONTENT_UPDATED = "2026-10-04";

export const absoluteUrl = (path = "/") => (path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`);

/**
 * Page metadata with a self-referencing canonical URL and matching Open Graph
 * and X (Twitter) cards. `title` is used as-is (pages write their own full
 * titles), so no two page types share one template.
 */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
  noindex = false,
  publishedTime,
  modifiedTime,
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
}): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type,
      url: path,
      title,
      description,
      siteName: SITE_NAME,
      locale: "en_US",
      ...(type === "article" ? { publishedTime, modifiedTime } : {}),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
