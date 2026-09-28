"use client";

import type { DocumentState } from "../editor/types";

/**
 * Browser-local persistence (IndexedDB). Files never leave the device.
 * - "docs":    editor state per document (small, written on every autosave)
 * - "sources": original PDF bytes (large, written once per source)
 */
const DB_NAME = "fusion-office";
const DB_VERSION = 1;

export interface RecentDoc {
  id: string;
  name: string;
  pageCount: number;
  updatedAt: number;
  cloudId?: string | null;
}

interface StoredDoc extends RecentDoc {
  state: DocumentState;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains("docs")) d.createObjectStore("docs", { keyPath: "id" });
        if (!d.objectStoreNames.contains("sources")) d.createObjectStore("sources");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | IDBRequest | void): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const t = d.transaction(store, mode);
        const req = fn(t.objectStore(store));
        t.oncomplete = () => resolve(req ? (req.result as T) : (undefined as T));
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

export async function saveDocumentLocal(state: DocumentState, cloudId?: string | null) {
  const record: StoredDoc = {
    id: state.id,
    name: state.name,
    pageCount: state.pages.length,
    updatedAt: Date.now(),
    cloudId,
    state,
  };
  await tx("docs", "readwrite", (s) => s.put(record));
}

export async function saveSourceLocal(id: string, bytes: Uint8Array) {
  const existing = await tx<IDBValidKey | undefined>("sources", "readonly", (s) => s.getKey(id));
  if (existing !== undefined) return;
  await tx("sources", "readwrite", (s) => s.put(bytes, id));
}

export async function listRecent(): Promise<RecentDoc[]> {
  const all = await tx<StoredDoc[]>("docs", "readonly", (s) => s.getAll());
  return all
    .map(({ id, name, pageCount, updatedAt, cloudId }) => ({ id, name, pageCount, updatedAt, cloudId }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadDocumentLocal(
  id: string,
): Promise<{ state: DocumentState; cloudId?: string | null; sources: Map<string, Uint8Array> } | null> {
  const doc = await tx<StoredDoc | undefined>("docs", "readonly", (s) => s.get(id));
  if (!doc) return null;
  const sources = new Map<string, Uint8Array>();
  for (const src of doc.state.sources) {
    const bytes = await tx<Uint8Array | undefined>("sources", "readonly", (s) => s.get(src.id));
    if (bytes) sources.set(src.id, bytes);
  }
  return { state: doc.state, cloudId: doc.cloudId, sources };
}

export async function deleteDocumentLocal(id: string) {
  const doc = await tx<StoredDoc | undefined>("docs", "readonly", (s) => s.get(id));
  await tx("docs", "readwrite", (s) => s.delete(id));
  if (!doc) return;
  // Remove sources no other document references.
  const others = await tx<StoredDoc[]>("docs", "readonly", (s) => s.getAll());
  const inUse = new Set(others.flatMap((d) => d.state.sources.map((s) => s.id)));
  for (const src of doc.state.sources) {
    if (!inUse.has(src.id)) await tx("sources", "readwrite", (s) => s.delete(src.id));
  }
}
