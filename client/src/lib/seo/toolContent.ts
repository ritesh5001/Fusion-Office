import { TOOLS, type ToolDef } from "@/lib/tools/registry";
import type { ToolSeo } from "./content/types";
import { ORGANIZE } from "./content/organize";
import { OPTIMIZE, EDIT } from "./content/optimize-edit";
import { CONVERT_TO, CONVERT_FROM } from "./content/convert";
import { SECURITY, AI } from "./content/security-ai";
import { IMAGE, OFFICE } from "./content/image-office";

export type { ToolSeo };

/** Page content and search intent for every tool, keyed by slug. */
export const TOOL_CONTENT: Record<string, ToolSeo> = {
  workflows: {
    title: "PDF Workflows – Chain PDF Tools and Run Them in One Go",
    description: "Build a reusable PDF workflow: chain steps like rotate, OCR, compress, watermark and protect, save it, and run it on as many PDFs as you like. Free.",
    intent: ["pdf workflow", "batch process pdf", "automate pdf tasks", "pdf batch processing"],
    anchor: "Automate PDF tasks with a workflow",
    howTo: "create a PDF workflow",
    intro: "Do the same PDF steps often? Chain tools into a workflow, save it on this device, and run the whole sequence on any number of PDFs at once.",
    steps: ["Add steps in the order they should run, such as Repair, Rotate, Compress and Protect.", "Adjust each step's settings.", "Give the workflow a name and save it to reuse later.", "Choose your PDFs and run it; download each result or all of them as a ZIP."],
    features: ["Chain any tool that turns one PDF into another PDF.", "Saved workflows stay on this device.", "Runs on many files in one go, in your browser."],
    uses: ["Compress and watermark every report before sending it out.", "OCR and protect batches of scanned documents."],
    related: ["compress-pdf", "ocr-pdf", "watermark-pdf", "protect-pdf", "rotate-pdf"],
  },
  ...OFFICE,
  ...ORGANIZE,
  ...OPTIMIZE,
  ...CONVERT_TO,
  ...CONVERT_FROM,
  ...EDIT,
  ...SECURITY,
  ...AI,
  ...IMAGE,
};

export function contentFor(tool: Pick<ToolDef, "slug" | "name" | "description">): ToolSeo {
  return (
    TOOL_CONTENT[tool.slug] ?? {
      title: `${tool.name} – Free Online Tool`,
      description: tool.description,
      intent: [tool.name.toLowerCase()],
      anchor: tool.name,
      intro: tool.description,
      steps: [],
      features: [],
      uses: [],
    }
  );
}

/** Slugs in the registry without written content (should be empty; checked by tests). */
export const missingContent = () => TOOLS.filter((t) => !TOOL_CONTENT[t.slug]).map((t) => t.slug);

/** Is this tool's page meant to be in search results? */
export const isIndexable = (t: Pick<ToolDef, "status">) => t.status === "ready";
