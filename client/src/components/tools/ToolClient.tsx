"use client";

import dynamic from "next/dynamic";
import { toolBySlug } from "@/lib/tools/registry";
import { SPECS } from "./specs";
import { ToolRunner } from "./ToolRunner";

// Tools with their own interface (browser-only, so no server rendering).
const CUSTOM: Record<string, React.ComponentType> = {
  "organize-pdf": dynamic(() => import("./custom/OrganizeTool").then((m) => m.OrganizeTool), { ssr: false }),
  "crop-pdf": dynamic(() => import("./custom/CropTool").then((m) => m.CropTool), { ssr: false }),
  "pdf-forms": dynamic(() => import("./custom/FormsTool").then((m) => m.FormsTool), { ssr: false }),
  "compare-pdf": dynamic(() => import("./custom/CompareTool").then((m) => m.CompareTool), { ssr: false }),
  "scan-to-pdf": dynamic(() => import("./custom/ScanTool").then((m) => m.ScanTool), { ssr: false }),
  workflows: dynamic(() => import("./custom/WorkflowsTool").then((m) => m.WorkflowsTool), { ssr: false }),
};

export function ToolClient({ slug }: { slug: string }) {
  const Custom = CUSTOM[slug];
  if (Custom) return <Custom />;
  const tool = toolBySlug(slug);
  const spec = SPECS[slug];
  if (!tool || !spec) return null;
  return <ToolRunner tool={tool} spec={spec} />;
}
