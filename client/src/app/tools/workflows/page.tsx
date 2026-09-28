import type { Metadata } from "next";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { ToolClient } from "@/components/tools/ToolClient";

export const metadata: Metadata = { title: "Workflows", description: "Chain PDF tools together and run them on any file." };

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
