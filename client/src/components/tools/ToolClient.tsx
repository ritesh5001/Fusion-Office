"use client";

import dynamic from "next/dynamic";
import { toolBySlug } from "@/lib/tools/registry";
import { isCustomTool, type CustomTool } from "@/lib/tools/custom";
import { SPECS } from "./specs";
import { ToolRunner } from "./ToolRunner";

// Tools with their own interface (browser-only, so no server rendering).
const CUSTOM: Record<CustomTool, React.ComponentType> = {
  "organize-pdf": dynamic(() => import("./custom/OrganizeTool").then((m) => m.OrganizeTool), { ssr: false }),
  "crop-pdf": dynamic(() => import("./custom/CropTool").then((m) => m.CropTool), { ssr: false }),
  "pdf-forms": dynamic(() => import("./custom/FormsTool").then((m) => m.FormsTool), { ssr: false }),
  "compare-pdf": dynamic(() => import("./custom/CompareTool").then((m) => m.CompareTool), { ssr: false }),
  "scan-to-pdf": dynamic(() => import("./custom/ScanTool").then((m) => m.ScanTool), { ssr: false }),
  workflows: dynamic(() => import("./custom/WorkflowsTool").then((m) => m.WorkflowsTool), { ssr: false }),
  "remove-watermark": dynamic(() => import("./custom/UnwatermarkTool").then((m) => m.UnwatermarkTool), { ssr: false }),
  "remove-watermark-image": dynamic(() => import("./custom/ImageUnwatermarkTool").then((m) => m.ImageUnwatermarkTool), { ssr: false }),
  "image-editor": dynamic(() => import("./custom/ImageEditor").then((m) => m.ImageEditor), { ssr: false }),
  "crop-image": dynamic(() => import("./custom/ImageEditor").then((m) => () => <m.ImageEditor mode="crop" />), { ssr: false }),
  "chat-with-pdf": dynamic(() => import("./custom/ChatPdfTool").then((m) => m.ChatPdfTool), { ssr: false }),
  "pdf-to-audio": dynamic(() => import("./custom/ReadAloudTool").then((m) => m.ReadAloudTool), { ssr: false }),
  "gst-invoice": dynamic(() => import("./custom/GstInvoiceTool").then((m) => m.GstInvoiceTool), { ssr: false }),
};

export function ToolClient({ slug }: { slug: string }) {
  if (isCustomTool(slug)) {
    const Custom = CUSTOM[slug];
    return <Custom />;
  }
  const tool = toolBySlug(slug);
  const spec = SPECS[slug];
  if (!tool || !spec) return null;
  return <ToolRunner tool={tool} spec={spec} />;
}
