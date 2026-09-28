"use client";

import { create } from "zustand";
import { OBJECT_LABELS, cloneObject, detachReplacement, newId, rotateObjectWithPage, translateObject } from "./objects";
import {
  viewSize,
  type DocumentState,
  type EditorObject,
  type EditorPage,
  type SourceMeta,
  type ToolId,
} from "./types";
import type { SearchHit } from "../pdf/text";

const HISTORY_LIMIT = 150;

export interface ToolOptions {
  stroke: string;
  fill: string;
  strokeWidth: number;
  penColor: string;
  penWidth: number;
  highlighterColor: string;
  highlighterWidth: number;
  markupColor: string;
  textColor: string;
  fontSize: number;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

export interface Selection {
  pageId: string;
  ids: string[];
}

interface HistoryEntry {
  pages: EditorPage[];
  label: string;
}

export interface EditorState {
  doc: DocumentState | null;
  past: HistoryEntry[];
  future: HistoryEntry[];
  /** Incremented on every document change; drives autosave. */
  revision: number;
  lastCommit: { key?: string; at: number };

  tool: ToolId;
  toolOptions: ToolOptions;
  zoom: number;
  fitMode: "width" | "page" | null;
  currentPageId: string | null;
  selectedPageIds: string[];
  selection: Selection | null;
  clipboard: EditorObject[];
  /** A just-created text object that should enter edit mode. */
  pendingEditId: string | null;

  searchOpen: boolean;
  searchHits: SearchHit[];
  activeHit: number;

  saveStatus: SaveStatus;
  cloudId: string | null;
  dialog: null | "signature" | "export" | "split" | "shortcuts" | { type: "confirm-delete-pages"; ids: string[] };

  // Document
  loadDocument: (doc: DocumentState, opts?: { cloudId?: string | null }) => void;
  closeDocument: () => void;
  renameDocument: (name: string) => void;
  addSource: (source: SourceMeta) => void;

  // History-tracked edits
  commit: (label: string, fn: (pages: EditorPage[]) => EditorPage[], coalesceKey?: string) => void;
  addObject: (pageId: string, obj: EditorObject, opts?: { select?: boolean; edit?: boolean }) => void;
  updateObject: (pageId: string, id: string, patch: Partial<EditorObject>, coalesceKey?: string) => void;
  replaceObjects: (pageId: string, objects: EditorObject[], label?: string, coalesceKey?: string) => void;
  deleteObjects: (pageId: string, ids: string[], coalesceKey?: string) => void;
  /** Remove an object that was just added and never changed, leaving no trace in the history. */
  discardNew: (pageId: string, id: string) => void;
  reorderObjects: (pageId: string, ids: string[], where: "forward" | "backward" | "front" | "back") => void;
  undo: () => void;
  redo: () => void;

  // Pages
  addBlankPage: (afterIndex?: number) => void;
  insertPages: (pages: EditorPage[], atIndex: number) => void;
  duplicatePages: (ids: string[]) => void;
  deletePages: (ids: string[]) => void;
  rotatePages: (ids: string[], delta: 90 | -90 | 180) => void;
  movePages: (ids: string[], toIndex: number) => void;

  // Clipboard
  copySelection: () => void;
  cutSelection: () => void;
  paste: (pageId?: string) => void;
  duplicateSelection: () => void;
  deleteSelection: () => void;

  // UI
  setTool: (tool: ToolId) => void;
  setToolOptions: (patch: Partial<ToolOptions>) => void;
  setZoom: (zoom: number, fitMode?: "width" | "page" | null) => void;
  setCurrentPage: (id: string) => void;
  setSelectedPages: (ids: string[]) => void;
  setSelection: (sel: Selection | null) => void;
  setPendingEdit: (id: string | null) => void;
  setSearch: (patch: Partial<Pick<EditorState, "searchOpen" | "searchHits" | "activeHit">>) => void;
  setSaveStatus: (s: SaveStatus) => void;
  setCloudId: (id: string | null) => void;
  setDialog: (d: EditorState["dialog"]) => void;
}

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;
export const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

const mapPage = (pages: EditorPage[], pageId: string, fn: (p: EditorPage) => EditorPage) =>
  pages.map((p) => (p.id === pageId ? fn(p) : p));

const initialUi = {
  past: [] as HistoryEntry[],
  future: [] as HistoryEntry[],
  revision: 0,
  lastCommit: { at: 0 },
  tool: "select" as ToolId,
  selection: null,
  selectedPageIds: [] as string[],
  pendingEditId: null,
  searchOpen: false,
  searchHits: [] as SearchHit[],
  activeHit: -1,
  saveStatus: "idle" as SaveStatus,
  dialog: null,
};

export const useEditor = create<EditorState>()((set, get) => ({
  doc: null,
  ...initialUi,
  toolOptions: {
    stroke: "#2563eb",
    fill: "transparent",
    strokeWidth: 2,
    penColor: "#111827",
    penWidth: 2,
    highlighterColor: "#facc15",
    highlighterWidth: 14,
    markupColor: "#facc15",
    textColor: "#111827",
    fontSize: 16,
  },
  zoom: 1,
  fitMode: "width",
  currentPageId: null,
  clipboard: [],
  cloudId: null,

  loadDocument: (doc, opts) =>
    set({
      ...initialUi,
      doc,
      currentPageId: doc.pages[0]?.id ?? null,
      fitMode: "width",
      cloudId: opts?.cloudId ?? null,
    }),

  closeDocument: () => set({ ...initialUi, doc: null, currentPageId: null, cloudId: null }),

  renameDocument: (name) => {
    const { doc } = get();
    if (!doc) return;
    set({ doc: { ...doc, name }, revision: get().revision + 1 });
  },

  addSource: (source) => {
    const { doc } = get();
    if (!doc) return;
    set({ doc: { ...doc, sources: [...doc.sources, source] } });
  },

  commit: (label, fn, coalesceKey) => {
    const { doc, past, lastCommit, revision } = get();
    if (!doc) return;
    const next = fn(doc.pages);
    if (next === doc.pages) return;
    const now = Date.now();
    // "new:<id>" keys merge an object's creation with its first edit (e.g. typing
    // into a new text box) no matter how long the edit took.
    const coalesce =
      !!coalesceKey && lastCommit.key === coalesceKey && (coalesceKey.startsWith("new:") || now - lastCommit.at < 1200);
    set({
      doc: { ...doc, pages: next },
      past: coalesce ? past : [...past, { pages: doc.pages, label }].slice(-HISTORY_LIMIT),
      future: [],
      revision: revision + 1,
      lastCommit: { key: coalesceKey, at: now },
    });
  },

  addObject: (pageId, obj, opts) => {
    get().commit(
      obj.type === "text" && obj.replaces
        ? "Edit PDF text"
        : `Add ${obj.type === "image" && obj.isSignature ? "signature" : OBJECT_LABELS[obj.type].toLowerCase()}`,
      (pages) => mapPage(pages, pageId, (p) => ({ ...p, objects: [...p.objects, obj] })),
      opts?.edit ? `new:${obj.id}` : undefined,
    );
    if (opts?.select !== false) set({ selection: { pageId, ids: [obj.id] }, currentPageId: pageId });
    if (opts?.edit) set({ pendingEditId: obj.id });
  },

  updateObject: (pageId, id, patch, coalesceKey) =>
    get().commit(
      "Edit properties",
      (pages) =>
        mapPage(pages, pageId, (p) => ({
          ...p,
          objects: p.objects.map((o) => (o.id === id ? ({ ...o, ...patch } as EditorObject) : o)),
        })),
      coalesceKey,
    ),

  replaceObjects: (pageId, objects, label = "Transform", coalesceKey) => {
    const byId = new Map(objects.map((o) => [o.id, o]));
    get().commit(
      label,
      (pages) => mapPage(pages, pageId, (p) => ({ ...p, objects: p.objects.map((o) => byId.get(o.id) ?? o) })),
      coalesceKey,
    );
  },

  deleteObjects: (pageId, ids, coalesceKey) => {
    if (!ids.length) return;
    const set_ = new Set(ids);
    get().commit(
      ids.length > 1 ? `Delete ${ids.length} objects` : "Delete object",
      (pages) => mapPage(pages, pageId, (p) => ({ ...p, objects: p.objects.filter((o) => !set_.has(o.id)) })),
      coalesceKey,
    );
    const sel = get().selection;
    if (sel?.pageId === pageId) set({ selection: null });
  },

  discardNew: (pageId, id) => {
    const { doc, past, lastCommit, revision, selection } = get();
    if (!doc) return;
    // Only when the object's creation is still the last step; otherwise delete normally.
    if (lastCommit.key !== `new:${id}`) return get().deleteObjects(pageId, [id]);
    set({
      doc: { ...doc, pages: mapPage(doc.pages, pageId, (p) => ({ ...p, objects: p.objects.filter((o) => o.id !== id) })) },
      past: past.slice(0, -1),
      revision: revision + 1,
      lastCommit: { at: 0 },
      selection: selection?.ids.includes(id) ? null : selection,
    });
  },

  reorderObjects: (pageId, ids, where) => {
    const idSet = new Set(ids);
    get().commit("Arrange", (pages) =>
      mapPage(pages, pageId, (p) => {
        const objs = [...p.objects];
        const moving = objs.filter((o) => idSet.has(o.id));
        const rest = objs.filter((o) => !idSet.has(o.id));
        if (where === "front") return { ...p, objects: [...rest, ...moving] };
        if (where === "back") return { ...p, objects: [...moving, ...rest] };
        // forward/backward: swap each moving object one step
        const arr = [...objs];
        const order = where === "forward" ? [...arr.keys()].reverse() : [...arr.keys()];
        for (const i of order) {
          if (!idSet.has(arr[i].id)) continue;
          const j = where === "forward" ? i + 1 : i - 1;
          if (j < 0 || j >= arr.length || idSet.has(arr[j].id)) continue;
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return { ...p, objects: arr };
      }),
    );
  },

  undo: () => {
    const { doc, past, future, revision } = get();
    if (!doc || past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      doc: { ...doc, pages: prev.pages },
      past: past.slice(0, -1),
      future: [{ pages: doc.pages, label: prev.label }, ...future],
      revision: revision + 1,
      selection: null,
      lastCommit: { at: 0 },
    });
    fixCurrentPage();
  },

  redo: () => {
    const { doc, past, future, revision } = get();
    if (!doc || future.length === 0) return;
    const next = future[0];
    set({
      doc: { ...doc, pages: next.pages },
      past: [...past, { pages: doc.pages, label: next.label }],
      future: future.slice(1),
      revision: revision + 1,
      selection: null,
      lastCommit: { at: 0 },
    });
    fixCurrentPage();
  },

  addBlankPage: (afterIndex) => {
    const { doc, currentPageId } = get();
    if (!doc) return;
    const idx = afterIndex ?? Math.max(0, doc.pages.findIndex((p) => p.id === currentPageId));
    const ref = doc.pages[idx];
    const size = ref ? viewSize(ref) : { width: 595.28, height: 841.89 }; // A4
    const page: EditorPage = {
      id: newId(),
      source: { kind: "blank" },
      width: size.width,
      height: size.height,
      baseRotation: 0,
      rotation: 0,
      objects: [],
    };
    get().commit("Add page", (pages) => [...pages.slice(0, idx + 1), page, ...pages.slice(idx + 1)]);
    set({ currentPageId: page.id, selectedPageIds: [page.id] });
  },

  insertPages: (newPages, atIndex) => {
    get().commit(`Insert ${newPages.length} page(s)`, (pages) => [
      ...pages.slice(0, atIndex),
      ...newPages,
      ...pages.slice(atIndex),
    ]);
    set({ currentPageId: newPages[0]?.id ?? get().currentPageId, selectedPageIds: newPages.map((p) => p.id) });
  },

  duplicatePages: (ids) => {
    if (!ids.length) return;
    const idSet = new Set(ids);
    const created: string[] = [];
    get().commit("Duplicate page", (pages) =>
      pages.flatMap((p) => {
        if (!idSet.has(p.id)) return [p];
        const copy: EditorPage = { ...p, id: newId(), objects: p.objects.map((o) => cloneObject(o)) };
        created.push(copy.id);
        return [p, copy];
      }),
    );
    set({ selectedPageIds: created, currentPageId: created[0] ?? get().currentPageId });
  },

  deletePages: (ids) => {
    const { doc } = get();
    if (!doc) return;
    const idSet = new Set(ids);
    if (doc.pages.every((p) => idSet.has(p.id))) return; // keep at least one page
    get().commit(ids.length > 1 ? `Delete ${ids.length} pages` : "Delete page", (pages) =>
      pages.filter((p) => !idSet.has(p.id)),
    );
    set({ selectedPageIds: [], selection: null });
    fixCurrentPage();
  },

  rotatePages: (ids, delta) => {
    const idSet = new Set(ids);
    get().commit("Rotate page", (pages) =>
      pages.map((p) => {
        if (!idSet.has(p.id)) return p;
        const { width, height } = viewSize(p);
        return {
          ...p,
          rotation: (((p.rotation + delta) % 360) + 360) % 360,
          objects: p.objects.map((o) => rotateObjectWithPage(o, delta, width, height)),
        };
      }),
    );
    set({ selection: null });
  },

  movePages: (ids, toIndex) => {
    const idSet = new Set(ids);
    get().commit("Reorder pages", (pages) => {
      const moving = pages.filter((p) => idSet.has(p.id));
      const before = pages.slice(0, toIndex).filter((p) => !idSet.has(p.id));
      const after = pages.slice(toIndex).filter((p) => !idSet.has(p.id));
      const next = [...before, ...moving, ...after];
      return next.every((p, i) => p === pages[i]) ? pages : next;
    });
  },

  copySelection: () => {
    const { doc, selection } = get();
    if (!doc || !selection) return;
    const page = doc.pages.find((p) => p.id === selection.pageId);
    if (!page) return;
    const ids = new Set(selection.ids);
    set({ clipboard: page.objects.filter((o) => ids.has(o.id)).map((o) => structuredClone(o)) });
  },

  cutSelection: () => {
    const { selection } = get();
    if (!selection) return;
    get().copySelection();
    get().deleteObjects(selection.pageId, selection.ids);
  },

  paste: (pageId) => {
    const { clipboard, currentPageId, selection } = get();
    const target = pageId ?? selection?.pageId ?? currentPageId;
    if (!clipboard.length || !target) return;
    // A pasted copy is new text; only the original keeps hiding the PDF text.
    const copies = clipboard.map((o) => detachReplacement(cloneObject(o, 12)));
    get().commit("Paste", (pages) => mapPage(pages, target, (p) => ({ ...p, objects: [...p.objects, ...copies] })));
    // Next paste lands further along, like desktop editors.
    set({ clipboard: clipboard.map((o) => { const c = structuredClone(o); translateObject(c, 12, 12); return c; }) });
    set({ selection: { pageId: target, ids: copies.map((c) => c.id) } });
  },

  duplicateSelection: () => {
    const { doc, selection } = get();
    if (!doc || !selection) return;
    const page = doc.pages.find((p) => p.id === selection.pageId);
    if (!page) return;
    const ids = new Set(selection.ids);
    const copies = page.objects.filter((o) => ids.has(o.id)).map((o) => detachReplacement(cloneObject(o, 12)));
    get().commit("Duplicate", (pages) => mapPage(pages, page.id, (p) => ({ ...p, objects: [...p.objects, ...copies] })));
    set({ selection: { pageId: page.id, ids: copies.map((c) => c.id) } });
  },

  deleteSelection: () => {
    const { selection } = get();
    if (selection) get().deleteObjects(selection.pageId, selection.ids);
  },

  setTool: (tool) => set({ tool, selection: tool === "select" ? get().selection : null }),
  setToolOptions: (patch) => set({ toolOptions: { ...get().toolOptions, ...patch } }),
  setZoom: (zoom, fitMode = null) =>
    set({ zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(zoom * 100) / 100)), fitMode }),
  setCurrentPage: (id) => set({ currentPageId: id }),
  setSelectedPages: (ids) => set({ selectedPageIds: ids }),
  setSelection: (selection) => set({ selection }),
  setPendingEdit: (pendingEditId) => set({ pendingEditId }),
  setSearch: (patch) => set(patch),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setCloudId: (cloudId) => set({ cloudId }),
  setDialog: (dialog) => set({ dialog }),
}));

function fixCurrentPage() {
  const { doc, currentPageId } = useEditor.getState();
  if (!doc) return;
  if (!doc.pages.some((p) => p.id === currentPageId)) {
    useEditor.setState({ currentPageId: doc.pages[0]?.id ?? null });
  }
}

export const getPage = (pageId: string) => useEditor.getState().doc?.pages.find((p) => p.id === pageId);
