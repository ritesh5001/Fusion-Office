import type { Metadata } from "next";
import { SlidesEntry } from "@/components/office/slides/SlidesEntry";

// The editor itself is an app screen; /tools/powerpoint-editor is the page meant for search.
export const metadata: Metadata = { title: "PowerPoint editor", description: "Edit PowerPoint presentations (.pptx) in your browser: slides, text, shapes, pictures, tables and slideshows.", robots: { index: false, follow: true } };

export default function SlidesPage() {
  return <SlidesEntry />;
}
