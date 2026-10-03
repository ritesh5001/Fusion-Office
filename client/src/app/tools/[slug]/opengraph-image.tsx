import { OG_SIZE, renderOg } from "@/lib/seo/ogImage";
import { TOOLS, toolBySlug } from "@/lib/tools/registry";
import { clusterOf } from "@/lib/seo/clusters";

export const alt = "Fusion Office tool";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const tool = toolBySlug((await params).slug);
  return renderOg({
    eyebrow: tool ? clusterOf(tool.category).name : "Fusion Office",
    title: tool?.name ?? "Fusion Office",
    tagline: tool?.description,
  });
}
