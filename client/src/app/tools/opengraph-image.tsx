import { OG_SIZE, renderOg } from "@/lib/seo/ogImage";
import { TOOL_COUNT } from "@/lib/seo/site";

export const alt = "Every Fusion Office tool for PDFs, Office files and images";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({ eyebrow: `${TOOL_COUNT} free tools`, title: "Every PDF, Office and image tool", tagline: "Merge, split, compress, convert, edit, sign and protect, in your browser." });
}
