"use client";

import dynamic from "next/dynamic";

const SlidesApp = dynamic(() => import("./SlidesApp"), { ssr: false });

export function SlidesEntry() {
  return <SlidesApp />;
}
