/// <reference lib="webworker" />
/** Traces an image to SVG off the main thread so the page stays responsive. */
import ImageTracer from "imagetracerjs";
import { finishSvg, threshold, traceOptions, type TraceJob } from "./trace";

self.onmessage = (e: MessageEvent<TraceJob>) => {
  const { data, width, height, mode, detail, dropWhite } = e.data;
  try {
    if (mode === "lineart") threshold(data);
    const svg = ImageTracer.imagedataToSVG({ width, height, data }, traceOptions(mode, detail));
    self.postMessage({ svg: finishSvg(svg, width, height, dropWhite || mode === "lineart") });
  } catch (err) {
    self.postMessage({ error: (err as Error).message || "Couldn't trace this image." });
  }
};
