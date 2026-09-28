/// <reference lib="webworker" />
/** Runs inpainting off the main thread so the page stays responsive. */
import { inpaint, patchInpaint } from "./inpaint";

export interface InpaintJob {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  mask: Uint8Array;
  method: "patch" | "smooth";
  radius: number;
  grain: number;
}

self.onmessage = (e: MessageEvent<InpaintJob>) => {
  const { pixels, width, height, mask, method, radius, grain } = e.data;
  try {
    if (method === "patch") patchInpaint(pixels, width, height, mask, { onProgress: (f) => self.postMessage({ progress: f }) });
    else inpaint(pixels, width, height, mask, { radius, grain });
    self.postMessage({ pixels }, { transfer: [pixels.buffer] });
  } catch (err) {
    self.postMessage({ error: (err as Error).message });
  }
};
