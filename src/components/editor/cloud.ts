"use client";

import { createContext, useContext } from "react";
import { useEditor } from "@/lib/editor/store";
import { getSourceBytes } from "@/lib/pdf/sources";
import { saveDocumentLocal } from "@/lib/storage/local";
import { openFromState } from "@/lib/editor/actions";
import { toast } from "@/lib/editor/events";
import type { DocumentState } from "@/lib/editor/types";

export interface CloudInfo {
  enabled: boolean;
  user: { name?: string | null; email?: string | null; image?: string | null } | null;
}

export const CloudContext = createContext<CloudInfo>({ enabled: false, user: null });
export const useCloud = () => useContext(CloudContext);

interface UploadTicket {
  sourceId: string;
  url: string;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

async function uploadSources(docId: string, uploads: UploadTicket[]) {
  if (!uploads.length) return;
  const done: string[] = [];
  for (const u of uploads) {
    const res = await fetch(u.url, {
      method: "PUT",
      headers: { "content-type": "application/pdf" },
      body: getSourceBytes(u.sourceId) as BodyInit,
    });
    if (!res.ok) throw new Error(`Uploading the original file failed (${res.status}). Check the bucket's CORS settings.`);
    done.push(u.sourceId);
  }
  await api(`/api/documents/${docId}`, { method: "PUT", body: JSON.stringify({ confirm: done }) });
}

const payload = (doc: DocumentState) => ({
  name: doc.name,
  state: doc,
  sources: doc.sources.map(({ id, name, size }) => ({ id, name, size })),
});

/**
 * Save the open document to the cloud. Creates it on first save; later saves
 * update state (and upload any newly inserted source PDFs).
 */
export async function saveToCloud(cloud: CloudInfo, opts: { version?: boolean; silent?: boolean } = {}) {
  const st = useEditor.getState();
  const doc = st.doc;
  if (!doc || !cloud.enabled) return;
  if (!cloud.user) {
    const { signIn } = await import("next-auth/react");
    // Local autosave has the document; reopen it after signing in.
    await saveDocumentLocal(doc, st.cloudId);
    await signIn(undefined, { callbackUrl: `/editor?doc=${encodeURIComponent(doc.id)}&cloudsave=1` });
    return;
  }
  st.setSaveStatus("saving");
  try {
    if (!st.cloudId) {
      const res = await api<{ id: string; uploads: UploadTicket[] }>("/api/documents", { method: "POST", body: JSON.stringify(payload(doc)) });
      useEditor.getState().setCloudId(res.id);
      await uploadSources(res.id, res.uploads);
      await saveDocumentLocal(doc, res.id);
    } else {
      const res = await api<{ uploads: UploadTicket[] }>(`/api/documents/${st.cloudId}`, {
        method: "PUT",
        body: JSON.stringify({ ...payload(doc), version: opts.version }),
      });
      await uploadSources(st.cloudId, res.uploads);
    }
    useEditor.getState().setSaveStatus("saved");
    if (!opts.silent) toast(opts.version ? "Saved to cloud as a new version" : "Saved to cloud", "success");
  } catch (err) {
    useEditor.getState().setSaveStatus(navigator.onLine ? "error" : "offline");
    if (!opts.silent) throw err;
  }
}

/** Download a cloud document's sources and open it in the editor. */
export async function openCloudDocument(id: string) {
  const data = await api<{ id: string; state: DocumentState; sources: { id: string; url: string }[] }>(`/api/documents/${id}`);
  const sources = new Map<string, Uint8Array>();
  for (const s of data.sources) {
    const res = await fetch(s.url);
    if (!res.ok) throw new Error("Could not download the original file from storage.");
    sources.set(s.id, new Uint8Array(await res.arrayBuffer()));
  }
  openFromState(data.state, sources, data.id);
}
