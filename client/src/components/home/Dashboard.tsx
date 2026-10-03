"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Cloud, Loader2 } from "lucide-react";
import { signInUrl, signOutUrl, useCloudConfig } from "@/lib/cloudConfig";
import { SiteShell } from "../site/SiteShell";
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
    body = <Loader2 className="mt-10 h-5 w-5 animate-spin text-fg-subtle" />;
  } else if (!config.cloudEnabled) {
    body = (
      <Notice title="Cloud storage isn't set up">
        Start the backend in <code className="rounded bg-raised px-1 font-mono text-[13px] text-fg">server/</code> with database, Auth.js and S3/R2 settings (see{" "}
        <code className="rounded bg-raised px-1 font-mono text-[13px] text-fg">server/.env.example</code>). The editor works fully without it: documents are saved in your browser.
      </Notice>
    );
  } else if (!config.user) {
    body = (
      <Notice title="Sign in to see your cloud documents">
        <a href={signInUrl("/dashboard")} className="btn btn-secondary mt-4">
          Sign in
        </a>
      </Notice>
    );
  } else if (error) {
    body = <Notice title="Something went wrong">{error}</Notice>;
  } else if (docs && docs.length === 0) {
    body = (
      <div className="card mt-8 flex flex-col items-center px-6 py-12 text-center">
        <Mascot mood="curious" size={120} interactive label="No documents yet" />
        <h2 className="mt-4 text-lg font-semibold text-fg">Nothing up here yet</h2>
        <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-fg-muted">
          Open a PDF in the editor and choose <strong>File → Save to cloud</strong>. Folio will keep it ready for you.
        </p>
        <Link
          href="/editor"
          className="btn btn-primary mt-6"
        >
          Open editor
        </Link>
      </div>
    );
  } else {
    body = <DocumentList docs={docs!} onChange={load} />;
  }

  return (
    <SiteShell rail={false}>
      <main id="main" className="mx-auto max-w-[960px] px-4 pb-20 pt-10 sm:px-6 md:pt-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Cloud</p>
            <h1 className="mt-2 font-display text-[clamp(1.75rem,3.4vw,2.25rem)] font-bold tracking-[-0.03em] text-fg">My documents</h1>
            {config.user && <p className="mt-1 truncate text-[14px] text-fg-muted">{config.user.email ?? config.user.name}</p>}
          </div>
          <div className="flex items-center gap-2">
            {config.user && (
              <a href={signOutUrl()} className="btn btn-ghost">
                Sign out
              </a>
            )}
            <Link href="/editor" className="btn btn-primary">
              Open editor
            </Link>
          </div>
        </div>
        {body}
      </main>
    </SiteShell>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card mt-8 p-6">
      <div className="flex items-center gap-2 font-medium text-fg">
        <Cloud className="h-4 w-4 text-fg-subtle" /> {title}
      </div>
      <div className="mt-1.5 text-[14px] leading-relaxed text-fg-muted">{children}</div>
    </div>
  );
}
