import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/AdminPanel";

// Reached only through the secret ADMIN_PATH (see src/middleware.ts); this path itself returns 404.
export const metadata: Metadata = {
  title: { absolute: "Admin · Fusion Office" },
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPanel />;
}
