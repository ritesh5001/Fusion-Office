"use client";

import dynamic from "next/dynamic";

// The editor is browser-only (TipTap, IndexedDB), so it never renders on the server.
const WriteApp = dynamic(() => import("./WriteApp"), { ssr: false });

export function WriteEntry() {
  return <WriteApp />;
}
