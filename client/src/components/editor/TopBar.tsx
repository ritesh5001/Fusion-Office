"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Check,
  CloudOff,
  CloudUpload,
  Download,
  FileDown,
  FolderOpen,
  Loader2,
  Printer,
  Redo2,
  Search,
  Undo2,
  X,
} from "lucide-react";
import { useEditor, ZOOM_STEPS } from "@/lib/editor/store";
import { downloadDocument, insertFile, newBlankDocument, openFile, printDocument, extractPages } from "@/lib/editor/actions";
import { toast } from "@/lib/editor/events";
import { pickFiles } from "./filePicker";
import { activateTool } from "./ToolBar";
import { requestDeletePages } from "./PageSidebar";
import { useCloud, saveToCloud } from "./cloud";
import { Button, Divider, IconButton, Menu } from "../ui/primitives";
import { Logo } from "../Logo";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
export const MOD = isMac ? "⌘" : "Ctrl+";

export function zoomIn() {
  const { zoom, setZoom } = useEditor.getState();
  setZoom(ZOOM_STEPS.find((z) => z > zoom + 0.01) ?? zoom);
}
export function zoomOut() {
  const { zoom, setZoom } = useEditor.getState();
  setZoom([...ZOOM_STEPS].reverse().find((z) => z < zoom - 0.01) ?? zoom);
}

const run = (p: Promise<unknown>) => p.catch((e: Error) => toast(e.message, "error"));

export function TopBar({ onToggleSidebar, onTogglePanel }: { onToggleSidebar: () => void; onTogglePanel: () => void }) {
  const doc = useEditor((s) => s.doc!);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const undoLabel = useEditor((s) => s.past[s.past.length - 1]?.label);
  const redoLabel = useEditor((s) => s.future[0]?.label);
  const hasSelection = useEditor((s) => !!s.selection);
  const st = useEditor.getState;
  const cloud = useCloud();
  const [busy, setBusy] = useState(false);

  const pageSelection = () => {
    const { selectedPageIds, currentPageId } = st();
    return selectedPageIds.length ? selectedPageIds : currentPageId ? [currentPageId] : [];
  };

  const download = async () => {
    setBusy(true);
    try {
      await downloadDocument();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-2">
      <Link href="/" className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-50" title="Fusion Office home">
        <Logo className="h-6 w-6" />
      </Link>
      <DocName />
      <SaveStatus />

      <nav className="ml-2 hidden items-center md:flex">
        <Menu
          label="File"
          items={[
            { label: "Open PDF…", icon: <FolderOpen className="h-3.5 w-3.5" />, shortcut: `${MOD}O`, onSelect: () => openDialog() },
            { label: "New blank document", onSelect: () => newBlankDocument() },
            "divider",
            { label: "Download", icon: <Download className="h-3.5 w-3.5" />, shortcut: `${MOD}S`, onSelect: () => download() },
            { label: "Export options…", icon: <FileDown className="h-3.5 w-3.5" />, onSelect: () => st().setDialog("export") },
            { label: "Print", icon: <Printer className="h-3.5 w-3.5" />, shortcut: `${MOD}P`, onSelect: () => run(printDocument()) },
            ...(cloud.enabled
              ? (["divider", { label: cloud.user ? "Save to cloud" : "Sign in to save to cloud", icon: <CloudUpload className="h-3.5 w-3.5" />, onSelect: () => run(saveToCloud(cloud, { version: true })) }] as const)
              : []),
            "divider",
            { label: "Close document", icon: <X className="h-3.5 w-3.5" />, onSelect: () => st().closeDocument() },
          ]}
        />
        <Menu
          label="Edit"
          items={[
            { label: undoLabel ? `Undo ${undoLabel.toLowerCase()}` : "Undo", shortcut: `${MOD}Z`, disabled: !canUndo, onSelect: () => st().undo() },
            { label: redoLabel ? `Redo ${redoLabel.toLowerCase()}` : "Redo", shortcut: isMac ? "⇧⌘Z" : "Ctrl+Y", disabled: !canRedo, onSelect: () => st().redo() },
            "divider",
            { label: "Cut", shortcut: `${MOD}X`, disabled: !hasSelection, onSelect: () => st().cutSelection() },
            { label: "Copy", shortcut: `${MOD}C`, disabled: !hasSelection, onSelect: () => st().copySelection() },
            { label: "Paste", shortcut: `${MOD}V`, onSelect: () => st().paste() },
            { label: "Duplicate", shortcut: `${MOD}D`, disabled: !hasSelection, onSelect: () => st().duplicateSelection() },
            { label: "Delete", shortcut: "Del", disabled: !hasSelection, onSelect: () => st().deleteSelection() },
            "divider",
            { label: "Edit PDF text", shortcut: "G", onSelect: () => activateTool("edittext") },
            { label: "Select all on page", shortcut: `${MOD}A`, onSelect: () => selectAllOnPage() },
            { label: "Find…", shortcut: `${MOD}F`, onSelect: () => st().setSearch({ searchOpen: true }) },
          ]}
        />
        <Menu
          label="View"
          items={[
            { label: "Zoom in", shortcut: `${MOD}+`, onSelect: zoomIn },
            { label: "Zoom out", shortcut: `${MOD}−`, onSelect: zoomOut },
            { label: "Actual size", shortcut: `${MOD}0`, onSelect: () => st().setZoom(1) },
            { label: "Fit width", onSelect: () => st().setZoom(st().zoom, "width") },
            { label: "Fit page", onSelect: () => st().setZoom(st().zoom, "page") },
            "divider",
            { label: "Toggle page sidebar", onSelect: onToggleSidebar },
            { label: "Toggle properties panel", onSelect: onTogglePanel },
            {
              label: "Full screen",
              shortcut: "F11",
              onSelect: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {}),
            },
          ]}
        />
        <Menu
          label="Insert"
          items={[
            { label: "Text", shortcut: "T", onSelect: () => activateTool("text") },
            { label: "Image…", shortcut: "I", onSelect: () => activateTool("image") },
            { label: "Signature…", shortcut: "S", onSelect: () => activateTool("signature") },
            { label: "Comment", shortcut: "C", onSelect: () => activateTool("comment") },
            "divider",
            { label: "Blank page", onSelect: () => st().addBlankPage() },
            { label: "Pages from PDF…", onSelect: () => insertDialog("application/pdf") },
            { label: "Image as page…", onSelect: () => insertDialog("image/png,image/jpeg,image/webp") },
          ]}
        />
        <Menu
          label="Page"
          items={[
            { label: "Rotate right", onSelect: () => st().rotatePages(pageSelection(), 90) },
            { label: "Rotate left", onSelect: () => st().rotatePages(pageSelection(), -90) },
            { label: "Rotate 180°", onSelect: () => st().rotatePages(pageSelection(), 180) },
            "divider",
            { label: "Duplicate", onSelect: () => st().duplicatePages(pageSelection()) },
            { label: "Delete", onSelect: () => requestDeletePages(pageSelection()) },
            "divider",
            { label: "Extract selected pages…", onSelect: () => run(extractPages(pageSelection())) },
            { label: "Split document…", onSelect: () => st().setDialog("split") },
          ]}
        />
        <Menu label="Help" items={[{ label: "Keyboard shortcuts", shortcut: "?", onSelect: () => st().setDialog("shortcuts") }]} />
      </nav>

      <div className="ml-auto flex items-center gap-0.5">
        <IconButton label={undoLabel ? `Undo ${undoLabel.toLowerCase()}` : "Undo"} shortcut={`${MOD}Z`} disabled={!canUndo} onClick={() => st().undo()}>
          <Undo2 className="h-4 w-4" />
        </IconButton>
        <IconButton label={redoLabel ? `Redo ${redoLabel.toLowerCase()}` : "Redo"} shortcut={isMac ? "⇧⌘Z" : "Ctrl+Y"} disabled={!canRedo} onClick={() => st().redo()}>
          <Redo2 className="h-4 w-4" />
        </IconButton>
        <Divider />
        <IconButton label="Search" shortcut={`${MOD}F`} onClick={() => st().setSearch({ searchOpen: !st().searchOpen })}>
          <Search className="h-4 w-4" />
        </IconButton>
        <IconButton label="Print" shortcut={`${MOD}P`} onClick={() => run(printDocument())}>
          <Printer className="h-4 w-4" />
        </IconButton>
        {cloud.enabled && (
          <IconButton label={cloud.user ? "Save to cloud" : "Sign in to save to cloud"} onClick={() => run(saveToCloud(cloud, { version: true }))}>
            <CloudUpload className="h-4 w-4" />
          </IconButton>
        )}
        <Button variant="primary" size="sm" className="ml-1.5" onClick={download} disabled={busy} title={`Download (${MOD}S)`}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Download
        </Button>
      </div>
      <span className="sr-only">{doc.pages.length} pages</span>
    </header>
  );
}

export async function openDialog() {
  const [f] = await pickFiles("application/pdf,image/png,image/jpeg,image/webp");
  if (f) run(openFile(f));
}

async function insertDialog(accept: string) {
  const [f] = await pickFiles(accept);
  if (f) run(insertFile(f));
}

export function selectAllOnPage() {
  const { doc, currentPageId, setSelection, setTool } = useEditor.getState();
  const page = doc?.pages.find((p) => p.id === currentPageId);
  if (!page || !page.objects.length) return;
  setTool("select");
  setSelection({ pageId: page.id, ids: page.objects.map((o) => o.id) });
}

function DocName() {
  const name = useEditor((s) => s.doc!.name);
  const rename = useEditor((s) => s.renameDocument);
  const [draft, setDraft] = useState(name);
  useEffect(() => setDraft(name), [name]);
  const commit = () => {
    let v = draft.trim() || "Untitled";
    if (!/\.pdf$/i.test(v)) v += ".pdf";
    if (v !== name) rename(v);
    setDraft(v);
  };
  return (
    <input
      aria-label="Document name"
      value={draft.replace(/\.pdf$/i, "")}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className="h-8 w-[min(28vw,260px)] truncate rounded-md border border-transparent px-2 text-[14px] font-medium text-slate-800 outline-none hover:border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
    />
  );
}

function SaveStatus() {
  const status = useEditor((s) => s.saveStatus);
  const map = {
    idle: null,
    saving: (
      <>
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </>
    ),
    saved: (
      <>
        <Check className="h-3 w-3" /> Saved
      </>
    ),
    error: (
      <>
        <CloudOff className="h-3 w-3" /> Not saved
      </>
    ),
    offline: (
      <>
        <CloudOff className="h-3 w-3" /> Offline
      </>
    ),
  } as const;
  const content = map[status];
  if (!content) return null;
  return (
    <span
      className={`hidden items-center gap-1 whitespace-nowrap text-[11px] sm:flex ${status === "error" ? "text-red-600" : "text-slate-400"}`}
      title={status === "saved" ? "Changes are saved in this browser" : undefined}
    >
      {content}
    </span>
  );
}
