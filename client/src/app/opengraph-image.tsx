import { OG_SIZE, renderOg } from "@/lib/seo/ogImage";
import { TOOL_COUNT } from "@/lib/seo/site";

export const alt = "Fusion Office: free online PDF, Office and image tools";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({
    eyebrow: `${TOOL_COUNT} free online tools`,
    title: "All your files. One private workspace.",
    tagline: "Edit, convert, compress and sign PDFs, Office documents and images in your browser.",
  });
}
