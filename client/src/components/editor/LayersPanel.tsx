"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Ban,
  Circle,
  Eraser,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  Highlighter,
  Image as ImageIcon,
  Lock,
  MessageSquare,
  Minus,
  PenLine,
  Signature,
  Square,
  Triangle,
  Type,
  Unlock,
} from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import type { EditorObject } from "@/lib/editor/types";
import { cn } from "../ui/primitives";

const clip = (s: string, n = 28) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/** What a layer is called when the user hasn't named it. */
export function layerName(o: EditorObject): string {
  if (o.name) return o.name;
  switch (o.type) {
    case "text":
      return clip(o.text) || "Empty text";
    case "image":
      return o.isSignature ? "Signature" : "Image";
    case "shape":
      return { rect: "Rectangle", ellipse: "Ellipse", triangle: "Triangle", line: "Line", arrow: "Arrow" }[o.shape];
    case "path":
      return "Drawing";
    case "markup":
      return { highlight: "Highlight", underline: "Underline", strikeout: "Strikeout" }[o.style];
    case "comment":
      return `Comment: ${clip(o.text, 20) || "empty"}`;
    case "redact":
      return "Redaction";
    case "whiteout":
      return "Whiteout";
  }
}

function layerIcon(o: EditorObject): ReactNode {
  const c = "h-3.5 w-3.5 shrink-0";
  switch (o.type) {
    case "text":
      return o.replaces ? <PenLine className={c} /> : <Type className={c} />;
    case "image":
      return o.isSignature ? <Signature className={c} /> : <ImageIcon className={c} />;
    case "shape":
      return o.shape === "ellipse" ? (
        <Circle className={c} />
      ) : o.shape === "triangle" ? (
        <Triangle className={c} />
      ) : o.shape === "line" ? (
        <Minus className={c} />
      ) : o.shape === "arrow" ? (
        <ArrowRight className={c} />
      ) : (
        <Square className={c} />
      );
    case "path":
      return <PenLine className={c} />;
    case "markup":
      return <Highlighter className={c} />;
    case "comment":
      return <MessageSquare className={c} />;
    case "redact":
      return <Ban className={c} />;
    case "whiteout":
      return <Eraser className={c} />;
  }
}

/** Why a layer can't be hidden (it would change the file differently from what you see). */
function cannotHide(o: EditorObject): string | null {
  if (o.type === "redact") return "Redactions always apply, so they can't be hidden";
  if (o.type === "text" && o.replaces) return "Edited PDF text can't be hidden; delete it to restore the original";
  return null;
}

/**
 * Layers of the current page, front to back: select, reorder by dragging,
 * hide, lock and rename. The PDF's own content is always the bottom layer.
 */
export function LayersPanel() {
  const pageId = useEditor((s) => s.currentPageId);
  const page = useEditor((s) => s.doc?.pages.find((p) => p.id === s.currentPageId));
  const pageNumber = useEditor((s) => (s.doc?.pages.findIndex((p) => p.id === s.currentPageId) ?? -1) + 1);
  const selection = useEditor((s) => s.selection);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; above: boolean } | null>(null);
  // Refs as well as state: drag events can arrive before React re-renders.
  const dragRef = useRef<string | null>(null);
  const dropRef = useRef<{ id: string; above: boolean } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const st = useEditor.getState;

  if (!page || !pageId) return null;
  const objects = page.objects;
  const layers = [...objects].reverse(); // front first, like every design tool
  const selected = new Set(selection?.pageId === pageId ? selection.ids : []);

  const select = (e: React.MouseEvent, id: string) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      const ids = new Set(selected);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      st().setSelection(ids.size ? { pageId, ids: [...ids] } : null);
    } else st().setSelection({ pageId, ids: [id] });
  };

  const onDrop = () => {
    const dragId = dragRef.current;
    const drop = dropRef.current;
    if (!dragId || !drop || drop.id === dragId) return;
    const from = objects.findIndex((o) => o.id === dragId);
    let target = objects.findIndex((o) => o.id === drop.id);
    if (from < 0 || target < 0) return;
    if (from < target) target -= 1; // index after the dragged layer is taken out
    // "Above" in the list means in front of the target, i.e. later in the stack.
    st().moveObjectTo(pageId, dragId, drop.above ? target + 1 : target);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="px-3 pt-2.5 text-[11px] text-slate-500">
        Page {pageNumber} · {objects.length} layer{objects.length === 1 ? "" : "s"}
      </p>
      <ul className="thin-scroll flex-1 overflow-y-auto px-2 py-2" aria-label={`Layers on page ${pageNumber}, front to back`}>
        {layers.length === 0 && (
          <li className="px-2 py-6 text-center text-[12px] leading-relaxed text-slate-500">
            No layers yet. Add text, a signature, an image or a shape and it appears here.
          </li>
        )}
        {layers.map((o) => {
          const isSel = selected.has(o.id);
          const noHide = cannotHide(o);
          return (
            <li
              key={o.id}
              draggable={renaming !== o.id}
              onDragStart={(e) => {
                dragRef.current = o.id;
                setDragId(o.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (!dragRef.current) return;
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                dropRef.current = { id: o.id, above: e.clientY < r.top + r.height / 2 };
                setDrop(dropRef.current);
              }}
              onDrop={(e) => {
                e.preventDefault();
                onDrop();
                dragRef.current = dropRef.current = null;
                setDragId(null);
                setDrop(null);
              }}
              onDragEnd={() => {
                dragRef.current = dropRef.current = null;
                setDragId(null);
                setDrop(null);
              }}
              className={cn(
                "group relative mb-0.5 flex items-center gap-1 rounded-md pr-1 text-[12px] transition-colors",
                isSel ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200" : "text-slate-700 hover:bg-white",
                dragId === o.id && "opacity-40",
                o.hidden && "text-slate-400",
              )}
            >
              {drop?.id === o.id && dragId !== o.id && (
                <span className={cn("absolute inset-x-1 h-0.5 rounded-full bg-brand-500", drop.above ? "-top-px" : "-bottom-px")} aria-hidden="true" />
              )}
              <GripVertical className="ml-0.5 h-3.5 w-3.5 shrink-0 cursor-grab text-slate-300 group-hover:text-slate-400" aria-hidden="true" />
              {renaming === o.id ? (
                <input
                  autoFocus
                  defaultValue={o.name ?? layerName(o)}
                  aria-label="Layer name"
                  className="min-w-0 flex-1 rounded border border-brand-300 bg-white px-1 py-0.5 text-[12px] outline-none"
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    setRenaming(null);
                    if (name !== (o.name ?? layerName(o))) st().replaceObjects(pageId, [{ ...o, name: name || undefined }], "Rename layer");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") setRenaming(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={(e) => select(e, o.id)}
                  onDoubleClick={() => setRenaming(o.id)}
                  title="Click to select · double-click to rename · drag to reorder"
                  className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left"
                >
                  {layerIcon(o)}
                  <span className={cn("truncate", o.hidden && "line-through")}>{layerName(o)}</span>
                </button>
              )}
              <button
                type="button"
                disabled={!!noHide}
                onClick={() => st().replaceObjects(pageId, [{ ...o, hidden: !o.hidden || undefined }], o.hidden ? "Show" : "Hide")}
                aria-label={o.hidden ? `Show ${layerName(o)}` : `Hide ${layerName(o)}`}
                title={noHide ?? (o.hidden ? "Show" : "Hide")}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-slate-200/70 disabled:cursor-not-allowed disabled:opacity-30",
                  !o.hidden && "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
                )}
              >
                {o.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => st().replaceObjects(pageId, [{ ...o, locked: !o.locked || undefined }], o.locked ? "Unlock" : "Lock")}
                aria-label={o.locked ? `Unlock ${layerName(o)}` : `Lock ${layerName(o)}`}
                title={o.locked ? "Unlock (can be moved again)" : "Lock (can't be moved on the page)"}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-slate-200/70",
                  !o.locked && "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
                )}
              >
                {o.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </button>
            </li>
          );
        })}
        {/* The PDF itself is always underneath everything you add. */}
        <li className="mt-1 flex items-center gap-1.5 rounded-md border border-dashed border-slate-200 px-2 py-1.5 text-[12px] text-slate-400">
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">PDF page content</span>
        </li>
      </ul>
      <p className="border-t border-slate-200 px-3 py-2 text-[11px] leading-snug text-slate-500">Top of the list is in front. Drag to reorder.</p>
    </div>
  );
}
