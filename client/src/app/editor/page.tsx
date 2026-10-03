import type { Metadata } from "next";
import { EditorEntry } from "@/components/editor/EditorEntry";

// The editor itself is an app screen; /tools/edit-pdf is the page meant for search.
export const metadata: Metadata = { title: "PDF Editor", robots: { index: false, follow: true } };

export default function EditorPage() {
  return <EditorEntry />;
}
