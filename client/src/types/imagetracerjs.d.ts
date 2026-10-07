declare module "imagetracerjs" {
  interface ImageTracer {
    imagedataToSVG(imageData: { width: number; height: number; data: Uint8ClampedArray }, options?: Record<string, number | boolean | string>): string;
  }
  const tracer: ImageTracer;
  export default tracer;
}
