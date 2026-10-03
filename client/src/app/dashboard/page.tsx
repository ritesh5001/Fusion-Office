import type { Metadata } from "next";
import { Dashboard } from "@/components/home/Dashboard";

export const metadata: Metadata = { title: "My documents", robots: { index: false, follow: false } };

export default function DashboardPage() {
  return <Dashboard />;
}
