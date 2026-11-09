import type { Metadata } from "next";
import { ViewerEntry } from "@/components/viewer/ViewerEntry";

// The viewer is an app screen; /tools/document-viewer is the page meant for search.
export const metadata: Metadata = {
  title: "Document viewer",
  description: "Open and read PDF, Word, Excel, PowerPoint, image and text files in your browser. Free, no sign-in, files stay on your device.",
  robots: { index: false, follow: true },
};

export default function ViewerPage() {
  return <ViewerEntry />;
}
