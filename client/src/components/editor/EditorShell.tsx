"use client";

import { useEffect, useState } from "react";
import { useEditor } from "@/lib/editor/store";
import { translateObject } from "@/lib/editor/objects";
import { downloadDocument, insertImageObject, printDocument } from "@/lib/editor/actions";
import { toast } from "@/lib/editor/events";
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
  useKeyboardShortcuts();
  useAutosave();

  // Collapse side panels on narrow screens.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => {
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
        {sidebar && <PageSidebar />}
        <main className="relative min-w-0 flex-1">
          <Viewport />
          <SearchPanel />
        </main>
        {panel && <PropertiesPanel />}
      </div>
      <BottomBar />
      <Dialogs />
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
