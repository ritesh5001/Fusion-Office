"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Cloud, Loader2 } from "lucide-react";
import { signInUrl, signOutUrl, useCloudConfig } from "@/lib/cloudConfig";
import { Logo } from "../Logo";
import { Mascot } from "../mascot/Mascot";
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
    body = <Loader2 className="mt-8 h-5 w-5 animate-spin text-fg-subtle" />;
  } else if (!config.cloudEnabled) {
    body = (
      <Notice title="Cloud storage isn't set up">
        Start the backend in <code className="rounded bg-raised px-1">server/</code> with database, Auth.js and S3/R2 settings (see{" "}
        <code className="rounded bg-raised px-1">server/.env.example</code>). The editor works fully without it: documents are saved in your browser.
      </Notice>
    );
  } else if (!config.user) {
    body = (
      <Notice title="Sign in to see your cloud documents">
        <a href={signInUrl("/dashboard")} className="mt-3 inline-flex h-9 items-center rounded-md border border-line bg-surface px-3.5 text-sm font-medium text-fg hover:bg-raised">
          Sign in
        </a>
      </Notice>
    );
  } else if (error) {
    body = <Notice title="Something went wrong">{error}</Notice>;
  } else if (docs && docs.length === 0) {
    body = (
      <div className="mt-6 flex flex-col items-center rounded-xl border border-line bg-surface px-6 py-10 text-center">
        <Mascot mood="curious" size={120} interactive label="No documents yet" />
        <h2 className="mt-4 text-lg font-semibold text-fg">Nothing up here yet</h2>
        <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-fg-muted">
          Open a PDF in the editor and choose <strong>File → Save to cloud</strong>. Folio will keep it ready for you.
        </p>
        <Link
          href="/editor"
          className="mt-5 inline-flex h-9 items-center rounded-md bg-accent px-3.5 text-sm font-medium text-on-accent hover:bg-accent-hover"
        >
          Open editor
        </Link>
      </div>
    );
  } else {
    body = <DocumentList docs={docs!} onChange={load} />;
  }

  return (
    <div className="min-h-dvh bg-sunken">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold text-fg">
            <Logo className="h-7 w-7" /> Fusion Office
          </Link>
          <div className="flex items-center gap-2">
            {config.user && <span className="hidden text-[13px] text-fg-muted sm:inline">{config.user.email ?? config.user.name}</span>}
            {config.user && (
              <a href={signOutUrl()} className="h-9 rounded-md px-3 text-sm leading-9 text-fg-muted hover:bg-raised">
                Sign out
              </a>
            )}
            <Link href="/editor" className="inline-flex h-9 items-center rounded-md bg-accent px-3.5 text-sm font-medium text-on-accent hover:bg-accent-hover">
              Open editor
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">My documents</h1>
        {body}
      </main>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-line bg-surface p-6">
      <div className="flex items-center gap-2 font-medium text-fg">
        <Cloud className="h-4 w-4 text-fg-subtle" /> {title}
      </div>
      <div className="mt-1.5 text-[14px] leading-relaxed text-fg-muted">{children}</div>
    </div>
  );
}
