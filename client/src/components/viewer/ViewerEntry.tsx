"use client";

import dynamic from "next/dynamic";

// The viewer reads files with browser-only libraries (PDF.js, DOMParser), so it never renders on the server.
const ViewerApp = dynamic(() => import("./ViewerApp"), { ssr: false });

export function ViewerEntry() {
  return <ViewerApp />;
}
