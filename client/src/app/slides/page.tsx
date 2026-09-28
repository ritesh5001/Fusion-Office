import type { Metadata } from "next";
import { SlidesEntry } from "@/components/office/slides/SlidesEntry";

export const metadata: Metadata = { title: "PowerPoint editor", description: "Edit PowerPoint presentations (.pptx) in your browser: slides, text, shapes, pictures, tables and slideshows." };

export default function SlidesPage() {
  return <SlidesEntry />;
}
