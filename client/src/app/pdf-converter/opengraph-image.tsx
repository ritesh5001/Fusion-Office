import { OG_SIZE, renderOg } from "@/lib/seo/ogImage";
import { clusterById } from "@/lib/seo/clusters";

const c = clusterById("pdf-converter");
export const alt = c.h1;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({ eyebrow: c.name, title: c.h1, tagline: c.intro[0] });
}
