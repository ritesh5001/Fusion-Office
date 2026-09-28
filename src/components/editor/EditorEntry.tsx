"use client";

import dynamic from "next/dynamic";
import type { CloudInfo } from "./cloud";

// PDF.js and Fabric.js are browser-only, so the editor never renders on the server.
const EditorApp = dynamic(() => import("./EditorApp"), { ssr: false });

export function EditorEntry({ cloud }: { cloud: CloudInfo }) {
  return <EditorApp cloud={cloud} />;
}
