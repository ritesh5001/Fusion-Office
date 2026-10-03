"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { handFiles } from "@/lib/tools/handoff";
import { Dropzone } from "./Dropzone";

/**
 * Start panel on an editor's tool page: drop a file to open it straight in
 * the full-screen editor, or open the editor empty (blank documents, templates
 * and recent drafts live there).
 */
export function AppLauncher({ href, accept, label, open }: { href: string; accept: string; label: string; open: string }) {
  const router = useRouter();
  return (
    <div>
      <Dropzone
        accept={accept}
        multiple={false}
        label={label}
        onFiles={(files) => {
          handFiles(href, files);
          router.push(href);
        }}
      />
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[14px] text-fg-muted">
        <Link href={href} className="btn btn-secondary">
          {open} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <span>Blank documents, templates and your recent files are in the editor.</span>
      </div>
    </div>
  );
}
