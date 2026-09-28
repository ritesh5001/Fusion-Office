import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ToolLayout } from "@/components/tools/ToolLayout";
import { ToolClient } from "@/components/tools/ToolClient";
import { TOOLS, toolBySlug } from "@/lib/tools/registry";

export function generateStaticParams() {
  return TOOLS.filter((t) => !t.href).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const tool = toolBySlug((await params).slug);
  return tool ? { title: tool.name, description: tool.description } : {};
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const tool = toolBySlug((await params).slug);
  if (!tool) notFound();
  if (tool.href) redirect(tool.href);
  return (
    <ToolLayout tool={tool}>
      {tool.status === "soon" ? (
        <div className="mx-auto max-w-[520px] rounded-2xl bg-white p-8 text-center ring-1 ring-ink/10">
          <h2 className="font-display text-[22px] font-semibold">Coming soon</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">This tool needs a new processing engine on our server. It&apos;s on the roadmap.</p>
        </div>
      ) : (
        <ToolClient slug={tool.slug} />
      )}
    </ToolLayout>
  );
}
