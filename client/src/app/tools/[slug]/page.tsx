import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { ToolClient } from "@/components/tools/ToolClient";
import { AppLauncher } from "@/components/tools/AppLauncher";
import { TOOLS, toolBySlug, type ToolDef } from "@/lib/tools/registry";
import { contentFor, isIndexable } from "@/lib/seo/toolContent";
import { pageMetadata } from "@/lib/seo/site";

// Every tool page is generated at build time; unknown slugs are a real 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const tool = toolBySlug((await params).slug);
  if (!tool) return {};
  const c = contentFor(tool);
  return pageMetadata({ title: `${c.title} | Fusion Office`, description: c.description, path: `/tools/${tool.slug}`, noindex: !isIndexable(tool) });
}

/** Editors run full-screen elsewhere; their tool page starts them, with a file or without. */
const LAUNCH: Record<string, { accept: string; label: string; open: string }> = {
  "edit-pdf": { accept: "application/pdf,.pdf,image/png,image/jpeg,image/webp", label: "Choose a PDF to edit", open: "Open the PDF editor" },
  "sign-pdf": { accept: "application/pdf,.pdf", label: "Choose a PDF to sign", open: "Open the PDF editor" },
  "word-editor": { accept: ".docx,.doc,.odt,.rtf", label: "Choose a Word document", open: "Open the Word editor" },
  "excel-editor": { accept: ".xlsx,.xlsm,.xls,.ods,.csv,.tsv,.txt", label: "Choose a spreadsheet", open: "Open the Excel editor" },
  "powerpoint-editor": { accept: ".pptx,.ppt,.odp", label: "Choose a presentation", open: "Open the PowerPoint editor" },
};

function Tool({ tool }: { tool: ToolDef }) {
  if (tool.status === "soon") {
    return (
      <div className="card mx-auto max-w-[520px] p-8 text-center">
        <h2 className="font-display text-[22px] font-semibold text-fg">Coming soon</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">This tool needs a new processing engine on our server. It&apos;s on the roadmap.</p>
      </div>
    );
  }
  if (tool.href) {
    const l = LAUNCH[tool.slug] ?? { accept: tool.accept, label: "Choose a file", open: `Open ${tool.name}` };
    return <AppLauncher href={tool.href} {...l} />;
  }
  return <ToolClient slug={tool.slug} />;
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const tool = toolBySlug((await params).slug);
  if (!tool) notFound();
  return (
    <ToolLayout tool={tool}>
      <Tool tool={tool} />
    </ToolLayout>
  );
}
