"use client";

/**
 * Autosaved drafts for the Word, Excel and PowerPoint editors, kept in this
 * browser (IndexedDB). Nothing is uploaded.
 */
export type DraftKind = "doc" | "sheet" | "slides";

export interface DraftInfo {
  id: string;
  kind: DraftKind;
  name: string;
  updatedAt: number;
}

interface Draft<T> extends DraftInfo {
  data: T;
}

const DB = "fusion-office-drafts";
let open: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  open ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const s = req.result.createObjectStore("drafts", { keyPath: "id" });
      s.createIndex("kind", "kind");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      open = null;
      reject(req.error);
    };
  });
  return open;
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const t = d.transaction("drafts", mode);
        const req = fn(t.objectStore("drafts"));
        t.oncomplete = () => resolve((req ? req.result : undefined) as T);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

export const newDraftId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export async function saveDraft<T>(info: Omit<DraftInfo, "updatedAt">, data: T) {
  await run("readwrite", (s) => s.put({ ...info, updatedAt: Date.now(), data } satisfies Draft<T>));
}

export async function loadDraft<T>(id: string): Promise<Draft<T> | null> {
  return (await run<Draft<T> | undefined>("readonly", (s) => s.get(id))) ?? null;
}

export async function listDrafts(kind: DraftKind): Promise<DraftInfo[]> {
  const all = await run<Draft<unknown>[]>("readonly", (s) => s.index("kind").getAll(kind));
  return all.map(({ id, kind, name, updatedAt }) => ({ id, kind, name, updatedAt })).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteDraft(id: string) {
  await run("readwrite", (s) => s.delete(id));
}
