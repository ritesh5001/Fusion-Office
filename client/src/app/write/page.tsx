import type { Metadata } from "next";
import { WriteEntry } from "@/components/office/write/WriteEntry";

// The editor itself is an app screen; /tools/word-editor is the page meant for search.
export const metadata: Metadata = { title: "Word editor", description: "Edit Word documents (.docx) in your browser: text, formatting, lists, tables and images.", robots: { index: false, follow: true } };

export default function WritePage() {
  return <WriteEntry />;
}
