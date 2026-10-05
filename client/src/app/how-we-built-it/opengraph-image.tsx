import { OG_SIZE, renderOg } from "@/lib/seo/ogImage";

export const alt = "How Fusion Office is built, and why it's free";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({ eyebrow: "Behind the platform", title: "How we built Fusion Office, and why it's free", tagline: "Browser-first PDF, Office and image tools: the tech stack, privacy and costs explained." });
}
