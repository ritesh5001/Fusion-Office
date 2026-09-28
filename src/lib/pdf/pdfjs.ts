import type * as PdfjsLib from "pdfjs-dist";

export type Pdfjs = typeof PdfjsLib;

let pdfjsPromise: Promise<Pdfjs> | null = null;

/** Lazily load PDF.js in the browser; the worker is served from /public. */
export function getPdfjs(): Promise<Pdfjs> {
  if (typeof window === "undefined") throw new Error("PDF.js is browser-only");
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return mod;
    });
  }
  return pdfjsPromise;
}
