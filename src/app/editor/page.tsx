import type { Metadata } from "next";
import { cloudEnabled, currentUser } from "@/auth";
import { EditorEntry } from "@/components/editor/EditorEntry";

export const metadata: Metadata = { title: "PDF Editor" };
export const dynamic = "force-dynamic";

export default async function EditorPage() {
  const user = cloudEnabled ? await currentUser() : null;
  return (
    <EditorEntry
      cloud={{ enabled: cloudEnabled, user: user ? { name: user.name, email: user.email, image: user.image } : null }}
    />
  );
}
