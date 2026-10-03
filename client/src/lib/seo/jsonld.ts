/**
 * Schema.org builders. Everything described here is visible on the page it's
 * attached to; no ratings, reviews or authors are invented.
 */
import type { ToolDef } from "@/lib/tools/registry";
import type { ToolSeo } from "./content/types";
import type { Cluster } from "./clusters";
import type { Guide } from "./guides";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "./site";

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

export const organization = () => ({
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE_NAME,
  url: absoluteUrl("/"),
  logo: { "@type": "ImageObject", url: absoluteUrl("/logo.png"), width: 512, height: 512 },
  description: SITE_DESCRIPTION,
});

export const website = () => ({
  "@type": "WebSite",
  "@id": SITE_ID,
  name: SITE_NAME,
  url: absoluteUrl("/"),
  description: SITE_DESCRIPTION,
  inLanguage: "en",
  publisher: { "@id": ORG_ID },
});

export const breadcrumbs = (items: { name: string; path: string }[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
});

const APP_CATEGORY: Record<ToolDef["category"], string> = {
  office: "BusinessApplication",
  organize: "BusinessApplication",
  optimize: "BusinessApplication",
  "convert-to": "BusinessApplication",
  "convert-from": "BusinessApplication",
  edit: "BusinessApplication",
  security: "SecurityApplication",
  intelligence: "BusinessApplication",
  image: "MultimediaApplication",
};

export const toolApplication = (tool: ToolDef, content: ToolSeo, path: string) => ({
  "@type": "WebApplication",
  "@id": `${absoluteUrl(path)}#app`,
  name: tool.name,
  url: absoluteUrl(path),
  description: content.description,
  applicationCategory: APP_CATEGORY[tool.category],
  operatingSystem: "Any",
  browserRequirements: "Requires a modern web browser with JavaScript enabled",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  ...(content.features.length ? { featureList: content.features } : {}),
  publisher: { "@id": ORG_ID },
});

export const faqPage = (faq: [string, string][]) => ({
  "@type": "FAQPage",
  mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
});

export const collectionPage = (cluster: Cluster, tools: ToolDef[], toolUrl: (t: ToolDef) => string) => ({
  "@type": "CollectionPage",
  "@id": `${absoluteUrl(cluster.path)}#page`,
  name: cluster.h1,
  url: absoluteUrl(cluster.path),
  description: cluster.description,
  isPartOf: { "@id": SITE_ID },
  mainEntity: {
    "@type": "ItemList",
    numberOfItems: tools.length,
    itemListElement: tools.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, url: absoluteUrl(toolUrl(t)) })),
  },
});

export const article = (guide: Guide, path: string) => ({
  "@type": "Article",
  "@id": `${absoluteUrl(path)}#article`,
  headline: guide.h1,
  description: guide.description,
  url: absoluteUrl(path),
  mainEntityOfPage: absoluteUrl(path),
  datePublished: guide.published,
  dateModified: guide.updated,
  inLanguage: "en",
  image: absoluteUrl(`${path}/opengraph-image`),
  author: { "@id": ORG_ID },
  publisher: { "@id": ORG_ID },
});
