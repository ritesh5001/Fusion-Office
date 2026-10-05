import { OG_SIZE, renderOg } from "@/lib/seo/ogImage";

export const alt = "Pay it forward: support Fusion Office by helping someone";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({ eyebrow: "Pay it forward", title: "Don't pay us. Help someone.", tagline: "Help a random person today, then share the story with us. That's your contribution." });
}
