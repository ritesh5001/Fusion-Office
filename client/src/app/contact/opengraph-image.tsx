import { OG_SIZE, renderOg } from "@/lib/seo/ogImage";

export const alt = "Contact the Fusion Office team";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg({ eyebrow: "Contact us", title: "Talk to the people who build it", tagline: "Email, call or WhatsApp the NextGen Fusion team. Replies usually within one working day." });
}
