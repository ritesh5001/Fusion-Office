import type { Metadata } from "next";
import { EditorEntry } from "@/components/editor/EditorEntry";

export const metadata: Metadata = { title: "PDF Editor" };

export default function EditorPage() {
  return <EditorEntry />;
}
