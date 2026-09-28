"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Cloud, Loader2 } from "lucide-react";
import { signInUrl, signOutUrl, useCloudConfig } from "@/lib/cloudConfig";
import { Logo } from "../Logo";
import { DocumentList, type CloudDoc } from "./DocumentList";
import { apiFetch } from "@/lib/api";

export function Dashboard() {
  const config = useCloudConfig();
  const [docs, setDocs] = useState<CloudDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await apiFetch("/api/documents");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error ?? `Could not load documents (${res.status})`);
    setDocs(data.documents);
  }, []);

  useEffect(() => {
    if (config.cloudEnabled && config.user) load();
  }, [config.cloudEnabled, config.user, load]);

  let body: React.ReactNode;
  if (config.loading || (config.user && config.cloudEnabled && !docs && !error)) {
    body = <Loader2 className="mt-8 h-5 w-5 animate-spin text-slate-400" />;
  } else if (!config.cloudEnabled) {
    body = (
      <Notice title="Cloud storage isn't set up">
        Start the backend in <code className="rounded bg-slate-100 px-1">server/</code> with database, Auth.js and S3/R2 settings (see{" "}
        <code className="rounded bg-slate-100 px-1">server/.env.example</code>). The editor works fully without it: documents are saved in your browser.
      </Notice>
    );
  } else if (!config.user) {
    body = (
      <Notice title="Sign in to see your cloud documents">
        <a href={signInUrl("/dashboard")} className="mt-3 inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Sign in
        </a>
      </Notice>
    );
  } else if (error) {
    body = <Notice title="Something went wrong">{error}</Notice>;
  } else if (docs && docs.length === 0) {
    body = (
      <Notice title="No cloud documents yet">
        Open a PDF in the editor and choose <strong>File → Save to cloud</strong>.
      </Notice>
    );
  } else {
    body = <DocumentList docs={docs!} onChange={load} />;
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
            <Logo className="h-7 w-7" /> Fusion Office
          </Link>
          <div className="flex items-center gap-2">
            {config.user && <span className="hidden text-[13px] text-slate-500 sm:inline">{config.user.email ?? config.user.name}</span>}
            {config.user && (
              <a href={signOutUrl()} className="h-9 rounded-md px-3 text-sm leading-9 text-slate-600 hover:bg-slate-100">
                Sign out
              </a>
            )}
            <Link href="/editor" className="inline-flex h-9 items-center rounded-md bg-brand-600 px-3.5 text-sm font-medium text-white hover:bg-brand-700">
              Open editor
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My documents</h1>
        {body}
      </main>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2 font-medium text-slate-800">
        <Cloud className="h-4 w-4 text-slate-400" /> {title}
      </div>
      <div className="mt-1.5 text-[14px] leading-relaxed text-slate-600">{children}</div>
    </div>
  );
}
