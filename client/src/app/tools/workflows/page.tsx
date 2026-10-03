import type { Metadata } from "next";
import { TOOL_CONTENT } from "@/lib/seo/toolContent";
import { pageMetadata } from "@/lib/seo/site";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { ToolClient } from "@/components/tools/ToolClient";

const c = TOOL_CONTENT.workflows;
export const metadata: Metadata = pageMetadata({ title: `${c.title} | Fusion Office`, description: c.description, path: "/tools/workflows" });

export default function WorkflowsPage() {
  return (
    <ToolLayout
      tool={{
        slug: "workflows",
        name: "Workflows",
        description: "Chain tools together, save the recipe, and run it on as many PDFs as you like.",
        category: "optimize",
        icon: "Workflow",
        accept: "application/pdf",
        multiple: true,
        runs: "browser",
        status: "ready",
      }}
    >
      <ToolClient slug="workflows" />
    </ToolLayout>
  );
}
