"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  Copy,
  FilePlus2,
  FileDown,
  Plus,
  RotateCcw,
  RotateCw,
  Trash2,
} from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { totalRotation, viewSize, type EditorPage } from "@/lib/editor/types";
import { renderPreview } from "@/lib/editor/thumbnail";
import { editorEvents, toast } from "@/lib/editor/events";
import { extractPages, insertFile } from "@/lib/editor/actions";
import { pickFiles } from "./filePicker";
import { IconButton, Menu, cn } from "../ui/primitives";
import { LayersPanel } from "./LayersPanel";

const THUMB_W = 132;

export function PageSidebar() {
  const pages = useEditor((s) => s.doc!.pages);
  const currentPageId = useEditor((s) => s.currentPageId);
  const selectedPageIds = useEditor((s) => s.selectedPageIds);
  const [dragIds, setDragIds] = useState<string[] | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const anchor = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"pages" | "layers">("pages");
  const layerCount = useEditor(
    (s) =>
      s.doc?.pages.find((p) => p.id === s.currentPageId)?.objects.length ?? 0,
  );

  // Keep the current page's thumbnail in view while scrolling the document.
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-thumb-id="${currentPageId}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [currentPageId]);

  const st = useEditor.getState;
  const selection = selectedPageIds.length
    ? selectedPageIds
    : currentPageId
      ? [currentPageId]
      : [];

  const onClick = (e: React.MouseEvent, index: number, id: string) => {
    const { setSelectedPages } = st();
    if (e.shiftKey && anchor.current !== null) {
      const [a, b] = [
        Math.min(anchor.current, index),
        Math.max(anchor.current, index),
      ];
      setSelectedPages(pages.slice(a, b + 1).map((p) => p.id));
    } else if (e.metaKey || e.ctrlKey) {
      const set = new Set(selectedPageIds);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      setSelectedPages([...set]);
      anchor.current = index;
    } else {
      setSelectedPages([id]);
      anchor.current = index;
      editorEvents.emit("scroll-to-page", { pageId: id });
    }
  };

  const onDrop = () => {
    if (dragIds && dropIndex !== null) st().movePages(dragIds, dropIndex);
    setDragIds(null);
    setDropIndex(null);
  };

  const multi = selectedPageIds.length > 1;

  return (
    <aside className="flex h-full w-[208px] shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex h-10 items-center justify-between border-b border-line pl-1.5 pr-1.5">
        <div role="tablist" aria-label="Sidebar" className="flex gap-0.5">
          {(
            [
              ["pages", "Pages", pages.length],
              ["layers", "Layers", layerCount],
            ] as const
          ).map(([id, label, n]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "h-7 rounded-md px-2 text-[12px] font-semibold transition-colors",
                tab === id
                  ? "bg-raised text-fg shadow-sm ring-1 ring-line-strong"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {label} <span className="font-normal text-fg-subtle">{n}</span>
            </button>
          ))}
        </div>
        {tab === "pages" && (
          <Menu
            align="right"
            label={
              <span className="flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Add
              </span>
            }
            items={[
              {
                label: "Blank page",
                icon: <Plus className="h-3.5 w-3.5" />,
                onSelect: () => st().addBlankPage(),
              },
              {
                label: "Pages from PDF…",
                icon: <FilePlus2 className="h-3.5 w-3.5" />,
                onSelect: async () => {
                  const [f] = await pickFiles("application/pdf");
                  if (f) insertFile(f).catch((e) => toast(e.message, "error"));
                },
              },
              {
                label: "Image as page…",
                icon: <FilePlus2 className="h-3.5 w-3.5" />,
                onSelect: async () => {
                  const [f] = await pickFiles(
                    "image/png,image/jpeg,image/webp",
                  );
                  if (f) insertFile(f).catch((e) => toast(e.message, "error"));
                },
              },
            ]}
          />
        )}
      </div>

      {tab === "layers" ? (
        <LayersPanel />
      ) : (
        <>
          <div
            ref={listRef}
            className="thin-scroll flex-1 overflow-y-auto px-3 py-3"
            onDragOver={(e) => {
              if (!dragIds) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={onDrop}
          >
            {pages.map((p, i) => (
              <div key={p.id}>
                <DropLine show={dropIndex === i} />
                <Thumb
                  page={p}
                  index={i}
                  current={p.id === currentPageId}
                  selected={selectedPageIds.includes(p.id)}
                  dragging={!!dragIds?.includes(p.id)}
                  onClick={(e) => onClick(e, i, p.id)}
                  onDragStart={() => {
                    const ids = selectedPageIds.includes(p.id)
                      ? pages
                          .filter((x) => selectedPageIds.includes(x.id))
                          .map((x) => x.id)
                      : [p.id];
                    setDragIds(ids);
                  }}
                  onDragOverHalf={(after) => setDropIndex(after ? i + 1 : i)}
                  onDragEnd={() => {
                    setDragIds(null);
                    setDropIndex(null);
                  }}
                />
              </div>
            ))}
            <DropLine show={dropIndex === pages.length} />
          </div>

          <div className="flex items-center justify-between border-t border-line px-2 py-1.5">
            <span className="pl-1 text-[11px] text-fg-muted">
              {multi ? `${selectedPageIds.length} selected` : "Page"}
            </span>
            <div className="flex">
              <IconButton
                size="sm"
                label="Rotate left"
                onClick={() => st().rotatePages(selection, -90)}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton
                size="sm"
                label="Rotate right"
                onClick={() => st().rotatePages(selection, 90)}
              >
                <RotateCw className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton
                size="sm"
                label="Duplicate"
                onClick={() => st().duplicatePages(selection)}
              >
                <Copy className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton
                size="sm"
                label="Extract to new PDF"
                onClick={() =>
                  extractPages(selection).catch((e) =>
                    toast(e.message, "error"),
                  )
                }
              >
                <FileDown className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton
                size="sm"
                label="Delete"
                className="hover:bg-red-500/10 hover:text-red-300"
                onClick={() => requestDeletePages(selection)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

export function requestDeletePages(ids: string[]) {
  const { doc, setDialog } = useEditor.getState();
  if (!doc || !ids.length) return;
  if (ids.length >= doc.pages.length) {
    toast("A document needs at least one page.", "error");
    return;
  }
  setDialog({ type: "confirm-delete-pages", ids });
}

function DropLine({ show }: { show: boolean }) {
  return (
    <div
      className={cn(
        "mx-2 h-0.5 rounded-full transition-colors",
        show ? "bg-brand-500" : "bg-transparent",
      )}
    />
  );
}

const Thumb = memo(function Thumb({
  page,
  index,
  current,
  selected,
  dragging,
  onClick,
  onDragStart,
  onDragOverHalf,
  onDragEnd,
}: {
  page: EditorPage;
  index: number;
  current: boolean;
  selected: boolean;
  dragging: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDragStart: () => void;
  onDragOverHalf: (after: boolean) => void;
  onDragEnd: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const view = viewSize(page);
  const h = (THUMB_W * view.height) / view.width;
  const key = `${page.source.kind === "pdf" ? page.source.sourceId + page.source.pageIndex : "blank"}:${totalRotation(page)}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The preview includes your edits and follows them as you work (a short
  // pause first, so dragging or typing doesn't redraw it on every step).
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    const t = setTimeout(
      () => {
        renderPreview(page, THUMB_W)
          .then((url) => alive && setSrc(url))
          .catch(() => {});
      },
      page.objects.length ? 250 : 0,
    );
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, key, page.objects]);

  const count = page.objects.length;

  return (
    <button
      ref={ref}
      type="button"
      data-thumb-id={page.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", page.id);
        onDragStart();
      }}
      onDragOver={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onDragOverHalf(e.clientY > r.top + r.height / 2);
      }}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "group my-1.5 flex w-full flex-col items-center gap-1 rounded-lg p-1.5 outline-none transition",
        dragging && "opacity-40",
        selected ? "bg-brand-500/15" : "hover:bg-raised",
      )}
      aria-label={`Page ${index + 1}`}
      aria-current={current ? "page" : undefined}
    >
      <div
        className={cn(
          "paper relative overflow-hidden rounded-[3px] shadow-sm ring-1",
          current || selected
            ? "ring-2 ring-brand-500"
            : "ring-line group-hover:ring-line-strong",
        )}
        style={{ width: THUMB_W, height: h }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src && (
          <img
            src={src}
            alt=""
            className="h-full w-full object-contain"
            draggable={false}
          />
        )}
        {count > 0 && (
          <span
            className="absolute right-1 top-1 rounded bg-brand-600 px-1 text-[9px] font-semibold leading-4 text-white"
            title={`${count} edit(s) on this page`}
          >
            {count}
          </span>
        )}
      </div>
      <span
        className={cn(
          "text-[11px] tabular-nums",
          current ? "font-semibold text-brand-300" : "text-fg-muted",
        )}
      >
        {index + 1}
      </span>
    </button>
  );
});
