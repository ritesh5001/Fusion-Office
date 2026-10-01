/**
 * Tools with their own full-width interface (components/tools/custom). The
 * tool page gives them the whole width and puts its side panels underneath.
 */
export const CUSTOM_TOOLS = [
  "organize-pdf",
  "crop-pdf",
  "pdf-forms",
  "compare-pdf",
  "scan-to-pdf",
  "workflows",
  "remove-watermark",
  "remove-watermark-image",
  "image-editor",
  "crop-image",
  "chat-with-pdf",
  "pdf-to-audio",
  "gst-invoice",
] as const;

export type CustomTool = (typeof CUSTOM_TOOLS)[number];

export const isCustomTool = (slug: string): slug is CustomTool => (CUSTOM_TOOLS as readonly string[]).includes(slug);
