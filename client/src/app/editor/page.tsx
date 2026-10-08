import type { Metadata, Viewport } from "next";
import { EditorEntry } from "@/components/editor/EditorEntry";

// The editor itself is an app screen; /tools/edit-pdf is the page meant for search.
export const metadata: Metadata = { title: "PDF Editor", robots: { index: false, follow: true } };

// The editor zooms the document itself (pinch on phones), so the browser's
// page zoom stays off here. That also stops iOS zooming the whole screen in
// when a small field (page number, font size) gets focus.
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#0a0c11", colorScheme: "dark" };

export default function EditorPage() {
  return <EditorEntry />;
}
