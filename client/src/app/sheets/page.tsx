import type { Metadata } from "next";
import { SheetsEntry } from "@/components/office/sheets/SheetsEntry";

// The editor itself is an app screen; /tools/excel-editor is the page meant for search.
export const metadata: Metadata = { title: "Excel editor", description: "Edit Excel spreadsheets (.xlsx) in your browser: formulas, formatting, sheets and CSV.", robots: { index: false, follow: true } };

export default function SheetsPage() {
  return <SheetsEntry />;
}
