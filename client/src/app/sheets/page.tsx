import type { Metadata } from "next";
import { SheetsEntry } from "@/components/office/sheets/SheetsEntry";

export const metadata: Metadata = { title: "Excel editor", description: "Edit Excel spreadsheets (.xlsx) in your browser: formulas, formatting, sheets and CSV." };

export default function SheetsPage() {
  return <SheetsEntry />;
}
