import { OG_SIZE, renderOg } from "@/lib/seo/ogImage";

export const alt = "About Fusion Office and the NextGen Fusion team";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({ eyebrow: "About us", title: "Built by the NextGen Fusion team", tagline: "A small web and product team in Lucknow and Mumbai, making document work free and private." });
}
