import { OG_SIZE, renderOg } from "@/lib/seo/ogImage";
import { guideBySlug, liveGuides } from "@/lib/seo/guides";

export const alt = "Fusion Office guide";
export const size = OG_SIZE;
export const contentType = "image/png";

export const revalidate = 1800;

export function generateStaticParams() {
  return liveGuides().map((g) => ({ slug: g.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const g = guideBySlug((await params).slug);
  return renderOg({ eyebrow: "Guide", title: g?.h1 ?? "Fusion Office guides" });
}
