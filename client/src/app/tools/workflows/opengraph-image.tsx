import { OG_SIZE, renderOg } from "@/lib/seo/ogImage";

export const alt = "PDF workflows in Fusion Office";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({ eyebrow: "PDF Tools", title: "Workflows", tagline: "Chain PDF tools together, save the recipe, and run it on as many PDFs as you like." });
}
