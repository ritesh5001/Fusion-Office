import { OG_SIZE, renderOg } from "@/lib/seo/ogImage";

export const alt = "Pay it forward: support Fusion Office by helping someone";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({ eyebrow: "Pay it forward", title: "Want to support us? Help someone.", tagline: "Help a random person today and share the story, or buy us a coffee." });
}
