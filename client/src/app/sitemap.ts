import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/tools/registry";
import { CLUSTERS } from "@/lib/seo/clusters";
import { GUIDES } from "@/lib/seo/guides";
import { isIndexable } from "@/lib/seo/toolContent";
import { CONTENT_UPDATED, absoluteUrl } from "@/lib/seo/site";

/**
 * Every indexable page, generated from the same data the pages are built
 * from. Left out on purpose: the full-screen editors (noindex; their tool
 * pages are listed instead), the dashboard, unreleased tools and the API.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const at = new Date(`${CONTENT_UPDATED}T00:00:00Z`);
  const entry = (path: string, priority: number, lastModified = at): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency: "monthly",
    priority,
  });
  return [
    entry("/", 1),
    entry("/tools", 0.8),
    ...CLUSTERS.map((c) => entry(c.path, 0.9)),
    ...TOOLS.filter(isIndexable).map((t) => entry(`/tools/${t.slug}`, 0.8)),
    entry("/tools/workflows", 0.6),
    entry("/guides", 0.6),
    ...GUIDES.map((g) => entry(`/guides/${g.slug}`, 0.6, new Date(`${g.updated}T00:00:00Z`))),
  ];
}
