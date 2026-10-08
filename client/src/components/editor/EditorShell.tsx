"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, SlidersHorizontal, Trash2, X } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { translateObject } from "@/lib/editor/objects";
import { downloadDocument, insertImageObject, printDocument } from "@/lib/editor/actions";
import { editorEvents, toast } from "@/lib/editor/events";
import { saveDocumentLocal } from "@/lib/storage/local";
import { TopBar, openDialog, selectAllOnPage, zoomIn, zoomOut } from "./TopBar";
import { ToolBar, TOOL_KEYS, activateTool } from "./ToolBar";
import { PageSidebar } from "./PageSidebar";
import { Viewport } from "./Viewport";
import { PropertiesPanel } from "./PropertiesPanel";
import { BottomBar } from "./BottomBar";
import { SearchPanel } from "./SearchPanel";
import { Dialogs } from "./Dialogs";
import { saveToCloud, useCloud } from "./cloud";

export function EditorShell() {
  const [sidebar, setSidebar] = useState(true);
  const [panel, setPanel] = useState(true);
  // Phones and small tablets: the side panels open over the page instead of beside it.
  const [compact, setCompact] = useState(false);
  useKeyboardShortcuts();
  useAutosave();

  // Collapse side panels on narrow screens.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => {
      setCompact(mq.matches);
      setSidebar(!mq.matches);
      setPanel(!mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-app">
      <TopBar onToggleSidebar={() => setSidebar((s) => !s)} onTogglePanel={() => setPanel((p) => !p)} />
      <ToolBar />
      <div className="flex min-h-0 flex-1">
        {sidebar && !compact && <PageSidebar />}
        <main className="relative min-w-0 flex-1">
          <Viewport />
          <SearchPanel />
          {compact && !panel && <SelectionBar onStyle={() => setPanel(true)} />}
        </main>
        {panel && !compact && <PropertiesPanel />}
      </div>
      <BottomBar />
      {compact && sidebar && (
        <PagesDrawer onClose={() => setSidebar(false)}>
          <PageSidebar />
        </PagesDrawer>
      )}
      {compact && panel && (
        <PropertiesSheet onClose={() => setPanel(false)}>
          <PropertiesPanel />
        </PropertiesSheet>
      )}
      <Dialogs />
    </div>
  );
}

/** Phones: the page list slides in from the left, over the document. Picking a page closes it. */
function PagesDrawer({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => editorEvents.on("scroll-to-page", () => onClose()), [onClose]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Pages">
      <button type="button" aria-label="Close pages" onClick={onClose} className="fo-intro-fade absolute inset-0 bg-black/55 [animation-duration:200ms]" />
      <div className="fo-drawer-in absolute inset-y-0 left-0 flex w-[min(82vw,280px)] flex-col pb-[env(safe-area-inset-bottom)] shadow-pop *:w-full *:border-r-0">{children}</div>
    </div>
  );
}

/** Phones: properties in a bottom sheet that leaves the top of the page visible and usable. */
function PropertiesSheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <section aria-label="Properties" className="fo-sheet-up fixed inset-x-0 bottom-0 z-50 flex max-h-[min(60dvh,520px)] flex-col overflow-hidden rounded-t-[22px] border-t border-line-strong bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-20px_50px_-20px_rgb(0_0_0/0.8)]">
      <div className="flex shrink-0 items-center justify-between border-b border-line py-1.5 pl-4 pr-1.5">
        <span className="text-[13px] font-semibold text-fg">Properties</span>
        <button type="button" onClick={onClose} aria-label="Close properties" className="flex h-10 w-10 items-center justify-center rounded-lg text-fg-muted hover:bg-raised hover:text-fg">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain *:h-auto *:w-full *:overflow-visible *:border-l-0">{children}</div>
    </section>
  );
}

/** Phones: quick actions for the selected objects, floating over the page. */
function SelectionBar({ onStyle }: { onStyle: () => void }) {
  const selected = useEditor((s) => s.selection?.ids.length ?? 0);
  if (!selected) return null;
  const st = useEditor.getState;
  const btn = "flex h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 text-[10.5px] font-medium text-fg-muted transition-colors active:bg-raised active:text-fg";
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
      <div role="toolbar" aria-label="Selection" className="fo-rise pointer-events-auto flex items-center gap-0.5 rounded-2xl border border-line-strong bg-overlay/95 p-1 shadow-pop backdrop-blur-xl">
        <button type="button" onClick={onStyle} className={btn}>
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Style
        </button>
        <button type="button" onClick={() => st().duplicateSelection()} className={btn}>
          <Copy className="h-4 w-4" aria-hidden="true" /> Duplicate
        </button>
        <button type="button" onClick={() => st().deleteSelection()} className={btn}>
          <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
        </button>
        <span className="mx-0.5 h-7 w-px bg-line-strong" aria-hidden="true" />
        <button type="button" onClick={() => st().setSelection(null)} className={btn}>
          <Check className="h-4 w-4 text-accent" aria-hidden="true" /> Done
        </button>
      </div>
    </div>
  );
}

function isTyping(e: Event) {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  return t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT";
}

function nudge(dx: number, dy: number) {
  const { selection, commit } = useEditor.getState();
  if (!selection) return;
  const ids = new Set(selection.ids);
  commit(
    "Move",
    (pages) =>
      pages.map((p) =>
        p.id !== selection.pageId
          ? p
          : {
              ...p,
              objects: p.objects.map((o) => {
                if (!ids.has(o.id)) return o;
                const c = structuredClone(o);
                translateObject(c, dx, dy);
                return c;
              }),
            },
      ),
    "nudge",
  );
}

function useKeyboardShortcuts() {
  useEffect(() => {
    const run = (p: Promise<unknown>) => p.catch((e: Error) => toast(e.message, "error"));

    const onKey = (e: KeyboardEvent) => {
      const st = useEditor.getState();
      if (st.dialog) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // These work even while typing in the search box.
      if (mod && key === "f") {
        e.preventDefault();
        st.setSearch({ searchOpen: true });
        return;
      }
      if (isTyping(e)) return;

      if (mod) {
        if (key === "z" && !e.shiftKey) st.undo();
        else if ((key === "z" && e.shiftKey) || key === "y") st.redo();
        else if (key === "s") run(downloadDocument());
        else if (key === "p") run(printDocument());
        else if (key === "o") openDialog();
        else if (key === "c") st.copySelection();
        else if (key === "x") st.cutSelection();
        else if (key === "d") st.duplicateSelection();
        else if (key === "a") selectAllOnPage();
        else if (key === "=" || key === "+") zoomIn();
        else if (key === "-") zoomOut();
        else if (key === "0") st.setZoom(1);
        else return; // let the browser handle everything else (incl. paste)
        e.preventDefault();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (st.selection) {
          e.preventDefault();
          st.deleteSelection();
        }
        return;
      }
      if (e.key === "Escape") {
        if (st.searchOpen) st.setSearch({ searchOpen: false });
        else if (st.selection) st.setSelection(null);
        else st.setTool("select");
        return;
      }
      if (e.key.startsWith("Arrow") && st.selection) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        nudge(e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0, e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0);
        return;
      }
      if (e.key === "?") {
        st.setDialog("shortcuts");
        return;
      }
      if (!e.altKey && TOOL_KEYS[key]) {
        e.preventDefault();
        activateTool(TOOL_KEYS[key]);
      }
    };

    // Paste: images from the system clipboard become image objects;
    // otherwise paste objects copied inside the editor.
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e) || useEditor.getState().dialog) return;
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
      e.preventDefault();
      if (file) run(insertImageObject(file));
      else useEditor.getState().paste();
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, []);
}

function useAutosave() {
  const cloud = useCloud();
  useEffect(() => {
    let localTimer: ReturnType<typeof setTimeout> | undefined;
    let cloudTimer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useEditor.subscribe((s, prev) => {
      if (s.revision === prev.revision || !s.doc) return;
      clearTimeout(localTimer);
      useEditor.getState().setSaveStatus("saving");
      localTimer = setTimeout(async () => {
        const { doc, cloudId } = useEditor.getState();
        if (!doc) return;
        try {
          await saveDocumentLocal(doc, cloudId);
          if (!cloudId) useEditor.getState().setSaveStatus("saved");
        } catch {
          useEditor.getState().setSaveStatus("error");
        }
      }, 600);
      // Cloud autosave only for documents already in the cloud.
      if (cloud.enabled && cloud.user && s.cloudId) {
        clearTimeout(cloudTimer);
        cloudTimer = setTimeout(() => saveToCloud(cloud, { silent: true }), 3000);
      }
    });
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (useEditor.getState().saveStatus === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      unsub();
      clearTimeout(localTimer);
      clearTimeout(cloudTimer);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [cloud]);
}
