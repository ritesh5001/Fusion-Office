import { OG_SIZE, renderOg } from "@/lib/seo/ogImage";

export const alt = "Fusion Office how-to guides";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({ eyebrow: "Guides", title: "How to work with PDFs, documents and images", tagline: "Step-by-step help for compressing, converting, editing, signing and protecting files." });
}
