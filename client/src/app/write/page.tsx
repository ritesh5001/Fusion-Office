import type { Metadata } from "next";
import { WriteEntry } from "@/components/office/write/WriteEntry";

export const metadata: Metadata = { title: "Word editor", description: "Edit Word documents (.docx) in your browser: text, formatting, lists, tables and images." };

export default function WritePage() {
  return <WriteEntry />;
}
