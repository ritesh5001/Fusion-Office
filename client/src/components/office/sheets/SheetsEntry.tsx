"use client";

import dynamic from "next/dynamic";

const SheetsApp = dynamic(() => import("./SheetsApp"), { ssr: false });

export function SheetsEntry() {
  return <SheetsApp />;
}
