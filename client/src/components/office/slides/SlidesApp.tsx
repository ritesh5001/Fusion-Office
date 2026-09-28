"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowDown, ArrowUp, Baseline, Bold, BringToFront, ChevronDown, Copy, Download, EyeOff, FlipHorizontal2,
  FlipVertical2, Highlighter, ImagePlus, Italic, List, ListOrdered, Loader2, Lock, Minus, Play, Plus, Presentation, Redo2, SendToBack, Shapes, Strikethrough,
  Table2, Trash2, Type, Underline, Undo2, Unlock, X,
} from "lucide-react";
import { wordExtensions } from "@/lib/office/docx/extensions";
import { browserXml } from "@/lib/office/ooxml";
import { readPptx } from "@/lib/office/slides/pptxRead";
import { writePptx } from "@/lib/office/slides/pptxWrite";
import {
  LAYOUT_NAMES, LAYOUTS, newDeck, plainText, textBox, textDoc, THEMES, uid, type BoxEl, type Deck, type El, type ImageEl, type LayoutId, type ShapeKind, type TableEl,
} from "@/lib/office/slides/model";
import { useSlides } from "@/lib/office/slides/store";
import { loadDraft, newDraftId, type DraftInfo } from "@/lib/office/drafts";
import { convertOnServer, extOf } from "@/lib/office/convert";
import { imageFileToDataUrl } from "@/lib/office/images";
import { downloadFile } from "@/lib/tools/files";
import { toast } from "@/lib/editor/events";
import { pickFiles } from "../../editor/filePicker";
import { Toaster } from "../../editor/Toaster";
import { Button, NumberInput, cn } from "../../ui/primitives";
import { OfficeHeader, StartScreen, readOfficeFile, useAutosave, type AppIdentity } from "../OfficeShell";
import { ColorPick, Sep, TB, TSelect } from "../controls";
import { ElementView, shapeSvg, SlideView, Thumb } from "./SlideView";

const APP: AppIdentity = { kind: "slides", name: "Fusion Slides", icon: Presentation, tint: "bg-orange-50 text-orange-700" };
const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const ACCEPT = ".pptx,.ppt,.odp";
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl+";
const FONTS = ["Calibri", "Aptos", "Arial", "Georgia", "Times New Roman", "Trebuchet MS", "Verdana", "Segoe UI", "Courier New", "Impact"];
const SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 54, 60, 72, 96];
const SHAPE_CHOICES: ShapeKind[] = ["rect", "roundRect", "ellipse", "triangle", "rtTriangle", "diamond", "pentagon", "hexagon", "octagon", "star5", "rightArrow", "leftArrow", "upArrow", "downArrow", "chevron", "parallelogram", "trapezoid", "heart"];
const CLIP_MARK = "fusion-slides-clipboard";

/** Crop a picture to the part PowerPoint shows (srcRect). */
async function cropImage(src: string, c: { l: number; t: number; r: number; b: number }): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const sx = img.naturalWidth * c.l;
  const sy = img.naturalHeight * c.t;
  const sw = Math.max(1, img.naturalWidth * (1 - c.l - c.r));
  const sh = Math.max(1, img.naturalHeight * (1 - c.t - c.b));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw);
  canvas.height = Math.round(sh);
  canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(src.startsWith("data:image/jpeg") ? "image/jpeg" : "image/png", 0.9);
}

interface Session {
  id: string;
  name: string;
  deck: Deck;
  warnings: string[];
}

export default function SlidesApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async (file: File) => {
    setError(null);
    const ext = extOf(file.name);
    setBusy(["ppt", "odp"].includes(ext) ? "Converting on the server…" : "Opening…");
    try {
      if (!["pptx", "ppt", "odp"].includes(ext)) throw new Error("Open a PowerPoint presentation (.pptx, .ppt) or an .odp file.");
      const f = await readOfficeFile(file, "pptx");
      const { deck, warnings } = await readPptx(f.bytes, browserXml, cropImage);
      setSession({ id: newDraftId(), name: f.name, deck, warnings });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const openDraft = async (d: DraftInfo) => {
    const draft = await loadDraft<Deck>(d.id);
    if (draft) setSession({ id: draft.id, name: draft.name, deck: draft.data, warnings: [] });
  };

  const previews = useMemo(
    () =>
      THEMES.map((t) => {
        const d = newDeck(t);
        const title = d.slides[0].elements[0] as BoxEl;
        title.text = textDoc({ type: "paragraph", attrs: { textAlign: "center" }, content: [{ type: "text", text: "Presentation title" }] });
        return d;
      }),
    [],
  );

  if (!session) {
    return (
      <StartScreen
        app={APP}
        title="PowerPoint presentations"
        subtitle="Open a .pptx to edit it, or start from a theme."
        accept={ACCEPT}
        onFile={open}
        busy={busy}
        error={error}
        onDraft={openDraft}
        templates={THEMES.map((t, i) => ({
          label: i === 0 ? "Blank" : t.name,
          hint: i === 0 ? "White, clean 16:9" : `${t.name} theme, 16:9`,
          preview: (
            <span className="m-auto overflow-hidden rounded-sm shadow-sm">
              <Thumb slide={previews[i].slides[0]} deck={previews[i]} width={200} />
            </span>
          ),
          onSelect: () => setSession({ id: newDraftId(), name: "Untitled presentation", deck: newDeck(t), warnings: [] }),
        }))}
      />
    );
  }
  return (
    <SlidesEditor
      key={session.id}
      session={session}
      onExit={() => setSession(null)}
      onOpen={async () => {
        const [f] = await pickFiles(ACCEPT);
        if (f) {
          setSession(null);
          await open(f);
        }
      }}
    />
  );
}

// ─── Editor ─────────────────────────────────────────────────────────

function SlidesEditor({ session, onExit, onOpen }: { session: Session; onExit: () => void; onOpen: () => void }) {
  const deck = useSlides((s) => s.deck);
  const current = useSlides((s) => s.current);
  const selected = useSlides((s) => s.selected);
  const canUndo = useSlides((s) => s.past.length > 0);
  const canRedo = useSlides((s) => s.future.length > 0);
  const st = useSlides.getState;
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState(session.name);
  const [warnings, setWarnings] = useState(session.warnings);
  const [presenting, setPresenting] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  /** Formatting asked for before the text editor existed; applied once it mounts. */
  const pending = useRef<((e: Editor) => void) | null>(null);

  useEffect(() => {
    st().load(session.deck);
    setLoaded(true);
  }, [session, st]);

  const status = useAutosave("slides", session.id, name, loaded && deck.slides.length ? deck : null);
  const slide = deck.slides[current];
  const sel = slide?.elements.filter((e) => selected.includes(e.id)) ?? [];

  const center = (w: number, h: number) => ({ x: (deck.width - w) / 2, y: (deck.height - h) / 2 });
  const addText = () => {
    const w = deck.width * 0.5;
    const el = textBox(center(w, 80).x, center(w, 80).y, w, 80, textDoc(), { size: 24, color: deck.theme.text, font: deck.theme.body, hint: "Type something" });
    st().addEls([el]);
    st().setEditing(el.id);
  };
  const addShape = (shape: ShapeKind) => {
    const w = shape.includes("Arrow") ? 260 : 220;
    const h = shape.includes("Arrow") ? 120 : 160;
    st().addEls([{ id: uid(), type: "box", shape, fill: deck.theme.accent, stroke: null, strokeW: 0, ...center(w, h), w, h, rot: 0, text: null, valign: "middle", pad: [10, 6, 10, 6], color: "#ffffff", size: 20, font: deck.theme.body }]);
  };
  const addLine = () => st().addEls([{ id: uid(), type: "box", shape: "line", fill: null, stroke: deck.theme.text, strokeW: 2, ...center(300, 0), w: 300, h: 0.01, rot: 0, text: null, valign: "middle", pad: [0, 0, 0, 0] }]);
  const addImageFiles = async (files: File[]) => {
    const els: ImageEl[] = [];
    for (const f of files.filter((x) => x.type.startsWith("image/"))) {
      try {
        const img = await imageFileToDataUrl(f, 2000);
        const s = Math.min(1, (deck.width * 0.6) / img.width, (deck.height * 0.6) / img.height);
        const w = img.width * s;
        const h = img.height * s;
        els.push({ id: uid(), type: "image", src: img.src, ...center(w, h), w, h, rot: 0 });
      } catch (e) {
        toast((e as Error).message, "error");
      }
    }
    if (els.length) st().addEls(els);
  };
  const addTable = () => {
    const accent = deck.theme.accent;
    const cols = [200, 200, 200];
    const t: TableEl = {
      id: uid(),
      type: "table",
      ...center(600, 120),
      w: 600,
      h: 120,
      rot: 0,
      cols,
      rows: [
        { h: 40, cells: ["Heading", "Heading", "Heading"].map((text) => ({ text, fill: accent, color: "#ffffff", bold: true })) },
        { h: 40, cells: cols.map(() => ({ text: "" })) },
        { h: 40, cells: cols.map(() => ({ text: "" })) },
      ],
      border: "#9aa3b2",
      size: 16,
      font: deck.theme.body,
    };
    st().addEls([t]);
  };

  /** Apply text formatting: to the text being edited, or to all text of the selected box. */
  const withText = (fn: (e: Editor) => void) => {
    if (activeEditor) return fn(activeEditor);
    const box = sel.length === 1 && sel[0].type === "box" && sel[0].shape !== "line" ? sel[0] : null;
    if (!box) return toast("Select a text box first.");
    pending.current = (e) => {
      e.commands.selectAll();
      fn(e);
    };
    st().setEditing(box.id);
  };

  const download = async (kind: "pptx" | "pdf") => {
    st().setEditing(null);
    setBusy(kind === "pdf" ? "Creating PDF…" : "Preparing…");
    try {
      const bytes = await writePptx(st().deck);
      const dropped = st().deck.slides.flatMap((s) => s.elements).filter((e) => e.type === "unsupported").length;
      if (kind === "pptx") {
        downloadFile({ name: `${name}.pptx`, bytes, type: PPTX_MIME });
        toast(dropped ? `Downloaded. ${dropped} chart${dropped === 1 ? "" : "s"} or object${dropped === 1 ? "" : "s"} that can't be edited here were left out.` : `Downloaded ${name}.pptx`, "success");
      } else {
        try {
          downloadFile({ name: `${name}.pdf`, bytes: await convertOnServer(`${name}.pptx`, bytes, "pdf"), type: "application/pdf" });
        } catch (e) {
          toast(`${(e as Error).message} Use File → Print and choose "Save as PDF" instead.`, "error");
        }
      }
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  const print = () => {
    st().setEditing(null);
    const style = document.createElement("style");
    style.textContent = `@page { size: ${deck.width / 96}in ${deck.height / 96}in; margin: 0; }`;
    document.head.appendChild(style);
    setTimeout(() => {
      window.print();
      setTimeout(() => style.remove(), 1000);
    }, 50);
  };

  // Keyboard shortcuts (when not typing in a field or in slide text).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.closest("input, textarea, select, [contenteditable=true]");
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === "s") return void (e.preventDefault(), download("pptx"));
      if (e.key === "F5") return void (e.preventDefault(), setPresenting(e.shiftKey ? st().current : 0));
      if (typing) {
        if (e.key === "Escape" && st().editing) st().setEditing(null);
        return;
      }
      const s = st();
      if (mod && k === "z") (e.preventDefault(), e.shiftKey ? s.redo() : s.undo());
      else if (mod && k === "y") (e.preventDefault(), s.redo());
      else if (mod && k === "d") (e.preventDefault(), s.duplicateSelected());
      else if (mod && k === "a") (e.preventDefault(), s.select(s.deck.slides[s.current].elements.filter((x) => !x.locked).map((x) => x.id)));
      else if ((e.key === "Delete" || e.key === "Backspace") && s.selected.length) (e.preventDefault(), s.removeSelected());
      else if (e.key === "Escape") s.select([]);
      else if ((e.key === "Enter" || e.key === "F2") && s.selected.length === 1) {
        const el = s.deck.slides[s.current].elements.find((x) => x.id === s.selected[0]);
        if (el?.type === "box" && el.shape !== "line") (e.preventDefault(), s.setEditing(el.id));
      } else if (e.key.startsWith("Arrow") && s.selected.length) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0;
        const dy = e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0;
        s.updateEls(s.selected, (x) => ({ ...x, x: x.x + dx, y: x.y + dy }));
      } else if ((e.key === "PageDown" || e.key === "PageUp") && !s.selected.length) (e.preventDefault(), s.go(s.current + (e.key === "PageDown" ? 1 : -1)));
    };
    const onCopy = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement).closest?.("input, textarea, [contenteditable=true]") || !st().selected.length) return;
      e.preventDefault();
      st().copy(e.type === "cut");
      e.clipboardData?.setData("text/plain", CLIP_MARK);
    };
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement).closest?.("input, textarea, [contenteditable=true]")) return;
      const files = [...(e.clipboardData?.files ?? [])];
      const text = e.clipboardData?.getData("text/plain") ?? "";
      e.preventDefault();
      if (files.some((f) => f.type.startsWith("image/"))) addImageFiles(files);
      else if (text === CLIP_MARK) st().paste();
      else if (text.trim()) {
        const w = deck.width * 0.6;
        st().addEls([textBox(center(w, 120).x, center(w, 120).y, w, 120, textDoc(...text.split(/\r?\n/).map((l) => (l ? { type: "paragraph", content: [{ type: "text", text: l }] } : { type: "paragraph" }))), { size: 20, color: deck.theme.text, font: deck.theme.body })]);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("copy", onCopy);
    window.addEventListener("cut", onCopy);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("copy", onCopy);
      window.removeEventListener("cut", onCopy);
      window.removeEventListener("paste", onPaste);
    };
  });

  const menus = [
    {
      label: "File",
      items: [
        { label: "New presentation", onSelect: onExit },
        { label: "Open…", onSelect: onOpen },
        "divider" as const,
        { label: "Download as PowerPoint (.pptx)", shortcut: `${MOD}S`, onSelect: () => download("pptx") },
        { label: "Download as PDF", onSelect: () => download("pdf") },
        { label: "Print", onSelect: print },
        "divider" as const,
        { label: "Close", onSelect: onExit },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Undo", shortcut: `${MOD}Z`, disabled: !canUndo, onSelect: () => st().undo() },
        { label: "Redo", shortcut: isMac ? "⇧⌘Z" : "Ctrl+Y", disabled: !canRedo, onSelect: () => st().redo() },
        "divider" as const,
        { label: "Duplicate", shortcut: `${MOD}D`, disabled: !selected.length, onSelect: () => st().duplicateSelected() },
        { label: "Delete", shortcut: "Del", disabled: !selected.length, onSelect: () => st().removeSelected() },
        { label: "Select all", shortcut: `${MOD}A`, onSelect: () => st().select(slide.elements.filter((x) => !x.locked).map((x) => x.id)) },
      ],
    },
    {
      label: "Insert",
      items: [
        ...LAYOUTS.map((l) => ({ label: `New slide: ${LAYOUT_NAMES[l]}`, onSelect: () => st().addSlide(l) })),
        "divider" as const,
        { label: "Text box", onSelect: addText },
        { label: "Image…", onSelect: async () => addImageFiles(await pickFiles("image/*", true)) },
        { label: "Table", onSelect: addTable },
        { label: "Line", onSelect: addLine },
      ],
    },
    {
      label: "Arrange",
      items: [
        { label: "Bring to front", disabled: !selected.length, onSelect: () => st().arrange("front") },
        { label: "Bring forward", disabled: !selected.length, onSelect: () => st().arrange("forward") },
        { label: "Send backward", disabled: !selected.length, onSelect: () => st().arrange("backward") },
        { label: "Send to back", disabled: !selected.length, onSelect: () => st().arrange("back") },
      ],
    },
    {
      label: "Slideshow",
      items: [
        { label: "Present from start", shortcut: "F5", onSelect: () => setPresenting(0) },
        { label: "Present from this slide", shortcut: "⇧F5", onSelect: () => setPresenting(current) },
      ],
    },
  ];

  if (!loaded || !slide) return <div className="flex h-dvh items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="flex h-dvh flex-col bg-[#eef0f3]">
      <div className="print:hidden">
        <OfficeHeader
          app={APP}
          docName={name}
          onRename={setName}
          status={status}
          menus={menus}
          actions={
            <>
              <Button size="sm" onClick={() => setPresenting(current)} title="Present (F5)">
                <Play className="h-3.5 w-3.5" /> Present
              </Button>
              <Button variant="primary" size="sm" className="ml-1.5" onClick={() => download("pptx")} disabled={!!busy} title={`Download .pptx (${MOD}S)`}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {busy ?? "Download"}
              </Button>
            </>
          }
        />
        <Toolbar
          editor={activeEditor}
          canUndo={canUndo}
          canRedo={canRedo}
          onText={addText}
          onShape={addShape}
          onLine={addLine}
          onImage={async () => addImageFiles(await pickFiles("image/*", true))}
          onTable={addTable}
          withText={withText}
        />
        {warnings.length > 0 && (
          <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12px] text-amber-900">
            <ul className="flex-1 list-disc pl-4">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <button type="button" aria-label="Dismiss" onClick={() => setWarnings([])} className="rounded p-0.5 hover:bg-amber-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 print:hidden">
        <Sorter />
        <div className="flex min-w-0 flex-1 flex-col">
          <Canvas
            onEditor={(e) => {
              setActiveEditor(e);
              if (e && pending.current) {
                pending.current(e);
                pending.current = null;
              }
            }}
            onDropFiles={addImageFiles}
          />
          <Notes />
        </div>
        <Properties sel={sel} />
      </div>

      {/* Print: every slide on its own page. */}
      <div className="fo-print-root fo-slides-print hidden">
        {deck.slides.filter((s) => !s.hidden).map((s) => (
          <div key={s.id}>
            <SlideView slide={s} deck={deck} />
          </div>
        ))}
      </div>

      {presenting !== null && <Presenter start={presenting} onClose={() => setPresenting(null)} />}
      <Toaster />
    </div>
  );
}

// ─── Toolbar ────────────────────────────────────────────────────────

function Toolbar({
  editor,
  canUndo,
  canRedo,
  onText,
  onShape,
  onLine,
  onImage,
  onTable,
  withText,
}: {
  editor: Editor | null;
  canUndo: boolean;
  canRedo: boolean;
  onText: () => void;
  onShape: (s: ShapeKind) => void;
  onLine: () => void;
  onImage: () => void;
  onTable: () => void;
  withText: (fn: (e: Editor) => void) => void;
}) {
  const st = useSlides.getState;
  const [layoutsOpen, setLayoutsOpen] = useState(false);
  const [shapesOpen, setShapesOpen] = useState(false);
  const live = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      const ts = e.getAttributes("textStyle");
      return {
        font: (ts.fontFamily as string | undefined)?.replace(/["']/g, "").split(",")[0] ?? "",
        size: (ts.fontSize as string | undefined)?.replace(/pt$/, "") ?? "",
        color: (ts.color as string) ?? null,
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        strike: e.isActive("strike"),
        align: (["center", "right", "justify"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left",
        bullet: e.isActive("bulletList"),
        ordered: e.isActive("orderedList"),
      };
    },
  });
  // The hook can hold on to the last editor's state after editing ends.
  const s = editor ? live : null;
  const run = (fn: (c: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => withText((e) => fn(e.chain().focus()).run());

  return (
    <div className="thin-scroll flex items-center gap-0.5 overflow-x-auto border-b border-slate-200 bg-white px-2 py-1">
      <TB label="Undo" shortcut={`${MOD}Z`} disabled={!canUndo} onClick={() => st().undo()}>
        <Undo2 className="h-4 w-4" />
      </TB>
      <TB label="Redo" disabled={!canRedo} onClick={() => st().redo()}>
        <Redo2 className="h-4 w-4" />
      </TB>
      <Sep />
      <Dropdown open={layoutsOpen} setOpen={setLayoutsOpen} button={<><Plus className="h-4 w-4" /> <span className="text-[13px]">New slide</span><ChevronDown className="h-3 w-3 opacity-60" /></>} label="New slide">
        {LAYOUTS.map((l) => (
          <button key={l} type="button" onClick={() => (st().addSlide(l as LayoutId), setLayoutsOpen(false))} className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-slate-50">
            {LAYOUT_NAMES[l]}
          </button>
        ))}
      </Dropdown>
      <TB label="Text box" onClick={onText}>
        <Type className="h-4 w-4" />
      </TB>
      <Dropdown open={shapesOpen} setOpen={setShapesOpen} button={<><Shapes className="h-4 w-4" /><ChevronDown className="h-3 w-3 opacity-60" /></>} label="Shapes">
        <div className="grid w-[216px] grid-cols-6 gap-1 p-2">
          {SHAPE_CHOICES.map((k) => (
            <button key={k} type="button" title={k} aria-label={k} onClick={() => (onShape(k), setShapesOpen(false))} className="flex h-8 w-8 items-center justify-center rounded hover:bg-slate-100">
              <svg width={22} height={18} className="overflow-visible">{shapeSvg(k, 22, 18, "#dbe3ff", "#2f54eb", 1.2)}</svg>
            </button>
          ))}
        </div>
      </Dropdown>
      <TB label="Line" onClick={onLine}>
        <Minus className="h-4 w-4" />
      </TB>
      <TB label="Image" onClick={onImage}>
        <ImagePlus className="h-4 w-4" />
      </TB>
      <TB label="Table" onClick={onTable}>
        <Table2 className="h-4 w-4" />
      </TB>
      <Sep />
      <TSelect label="Font" value={s?.font ?? ""} width={120} onChange={(f) => run((c) => (f ? c.setFontFamily(f) : c.unsetFontFamily()))} options={[{ value: "", label: "Theme font" }, ...FONTS.map((f) => ({ value: f, label: f, style: { fontFamily: f } }))]} />
      <TSelect label="Font size" value={s?.size ?? ""} width={60} onChange={(v) => run((c) => (v ? c.setFontSize(`${v}pt`) : c.unsetFontSize()))} options={[{ value: "", label: "Auto" }, ...[...new Set([...SIZES, ...(s?.size ? [Number(s.size)] : [])])].sort((a, b) => a - b).map((z) => ({ value: String(z), label: String(z) }))]} />
      <TB label="Bold" shortcut={`${MOD}B`} active={s?.bold} onClick={() => run((c) => c.toggleBold())}>
        <Bold className="h-4 w-4" />
      </TB>
      <TB label="Italic" shortcut={`${MOD}I`} active={s?.italic} onClick={() => run((c) => c.toggleItalic())}>
        <Italic className="h-4 w-4" />
      </TB>
      <TB label="Underline" shortcut={`${MOD}U`} active={s?.underline} onClick={() => run((c) => c.toggleUnderline())}>
        <Underline className="h-4 w-4" />
      </TB>
      <TB label="Strikethrough" active={s?.strike} onClick={() => run((c) => c.toggleStrike())}>
        <Strikethrough className="h-4 w-4" />
      </TB>
      <ColorPick label="Text colour" icon={<Baseline className="h-4 w-4" />} value={s?.color ?? "#000000"} resetLabel="Automatic" onChange={(v) => run((c) => (v ? c.setColor(v) : c.unsetColor()))} />
      <ColorPick label="Highlight" icon={<Highlighter className="h-4 w-4" />} value="#ffe066" resetLabel="No highlight" onChange={(v) => run((c) => (v ? c.setHighlight({ color: v }) : c.unsetHighlight()))} />
      {(
        [
          ["left", AlignLeft],
          ["center", AlignCenter],
          ["right", AlignRight],
          ["justify", AlignJustify],
        ] as const
      ).map(([a, Icon]) => (
        <TB key={a} label={`Align ${a}`} active={s?.align === a} onClick={() => run((c) => c.setTextAlign(a))}>
          <Icon className="h-4 w-4" />
        </TB>
      ))}
      <TB label="Bullets" active={s?.bullet} onClick={() => run((c) => c.toggleBulletList())}>
        <List className="h-4 w-4" />
      </TB>
      <TB label="Numbering" active={s?.ordered} onClick={() => run((c) => c.toggleOrderedList())}>
        <ListOrdered className="h-4 w-4" />
      </TB>
    </div>
  );
}

function Dropdown({ open, setOpen, button, label, children }: { open: boolean; setOpen: (o: boolean) => void; button: ReactNode; label: string; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open, setOpen]);
  return (
    <div ref={root} className="relative">
      <TB label={label} onClick={() => setOpen(!open)}>
        {button}
      </TB>
      {open && <div className="absolute left-0 top-full z-50 mt-1 min-w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">{children}</div>}
    </div>
  );
}

// ─── Slide sorter ───────────────────────────────────────────────────

function Sorter() {
  const deck = useSlides((s) => s.deck);
  const current = useSlides((s) => s.current);
  const st = useSlides.getState;
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [menu, setMenu] = useState<{ i: number; x: number; y: number } | null>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-slide="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current]);
  return (
    <aside className="flex w-[196px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div ref={list} className="thin-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-3" aria-label="Slides">
        {deck.slides.map((s, i) => (
          <div
            key={s.id}
            data-slide={i}
            draggable
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => (e.preventDefault(), setOver(i))}
            onDrop={() => (drag !== null && st().moveSlide(drag, i), setDrag(null), setOver(null))}
            onDragEnd={() => (setDrag(null), setOver(null))}
            onClick={() => st().go(i)}
            onContextMenu={(e) => (e.preventDefault(), setMenu({ i, x: e.clientX, y: e.clientY }))}
            className={cn("flex cursor-pointer gap-2", over === i && drag !== null && drag !== i && "border-t-2 border-brand-500 pt-1")}
          >
            <span className="w-4 shrink-0 pt-0.5 text-right text-[11px] tabular-nums text-slate-500">{i + 1}</span>
            <div className={cn("relative overflow-hidden rounded ring-2", i === current ? "ring-orange-500" : "ring-transparent hover:ring-slate-300", s.hidden && "opacity-45")}>
              <div className="pointer-events-none ring-1 ring-slate-200">
                <Thumb slide={s} deck={deck} width={148} />
              </div>
              {s.hidden && <EyeOff className="absolute right-1 top-1 h-3.5 w-3.5 text-slate-600" />}
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => st().addSlide("content")} className="m-3 inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-dashed border-slate-300 text-[13px] text-slate-600 hover:border-orange-400 hover:text-orange-700">
        <Plus className="h-4 w-4" /> New slide
      </button>
      {menu && (
        <SlideMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            { label: "New slide after", onSelect: () => st().addSlide("content", menu.i) },
            { label: "Duplicate", onSelect: () => st().duplicateSlide(menu.i) },
            { label: deck.slides[menu.i]?.hidden ? "Show slide" : "Hide slide", onSelect: () => st().updateSlide(menu.i, (s) => ({ ...s, hidden: !s.hidden || undefined })) },
            { label: "Move up", onSelect: () => st().moveSlide(menu.i, Math.max(0, menu.i - 1)) },
            { label: "Move down", onSelect: () => st().moveSlide(menu.i, Math.min(deck.slides.length - 1, menu.i + 1)) },
            { label: "Delete", danger: true, disabled: deck.slides.length <= 1, onSelect: () => st().deleteSlide(menu.i) },
          ]}
        />
      )}
    </aside>
  );
}

function SlideMenu({ x, y, items, onClose }: { x: number; y: number; items: { label: string; onSelect: () => void; disabled?: boolean; danger?: boolean }[]; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && onClose();
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [onClose]);
  return (
    <div ref={root} role="menu" className="fixed z-50 w-48 rounded-lg border border-slate-200 bg-white py-1 text-[13px] shadow-xl" style={{ left: x, top: Math.min(y, window.innerHeight - items.length * 32 - 12) }}>
      {items.map((it) => (
        <button key={it.label} type="button" role="menuitem" disabled={it.disabled} onClick={() => (onClose(), it.onSelect())} className={cn("block w-full px-3 py-1.5 text-left hover:bg-slate-50 disabled:opacity-40", it.danger && "text-red-600")}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

// ─── Canvas ─────────────────────────────────────────────────────────

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

function Canvas({ onEditor, onDropFiles }: { onEditor: (e: Editor | null) => void; onDropFiles: (f: File[]) => void }) {
  const deck = useSlides((s) => s.deck);
  const current = useSlides((s) => s.current);
  const selected = useSlides((s) => s.selected);
  const editing = useSlides((s) => s.editing);
  const st = useSlides.getState;
  const slide = deck.slides[current];
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ w: 800, h: 500 });
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const el = wrap.current!;
    const ro = new ResizeObserver(() => setArea({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.max(0.1, Math.min((area.w - 48) / deck.width, (area.h - 48) / deck.height));

  const toSlide = (e: { clientX: number; clientY: number }) => {
    const r = stage.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };

  const drag = (onMove: (p: { x: number; y: number }, e: PointerEvent) => void, onUp?: (moved: boolean) => void) => {
    let moved = false;
    const mv = (e: PointerEvent) => {
      moved = true;
      onMove(toSlide(e), e);
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      onUp?.(moved);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  /** Snap a moving box to the slide's edges/centre and other elements. */
  const snap = (box: { x: number; y: number; w: number; h: number }, ignore: Set<string>) => {
    const tol = 6 / scale;
    const xs = [0, deck.width / 2, deck.width];
    const ys = [0, deck.height / 2, deck.height];
    for (const o of slide.elements)
      if (!ignore.has(o.id) && !o.rot) {
        xs.push(o.x, o.x + o.w / 2, o.x + o.w);
        ys.push(o.y, o.y + o.h / 2, o.y + o.h);
      }
    let dx = 0;
    let dy = 0;
    const gx: number[] = [];
    const gy: number[] = [];
    let best = tol;
    for (const edge of [box.x, box.x + box.w / 2, box.x + box.w])
      for (const t of xs)
        if (Math.abs(t - edge) < best) {
          best = Math.abs(t - edge);
          dx = t - edge;
          gx.splice(0, gx.length, t);
        }
    best = tol;
    for (const edge of [box.y, box.y + box.h / 2, box.y + box.h])
      for (const t of ys)
        if (Math.abs(t - edge) < best) {
          best = Math.abs(t - edge);
          dy = t - edge;
          gy.splice(0, gy.length, t);
        }
    return { dx, dy, gx, gy };
  };

  const startMove = (e: React.PointerEvent, el: El) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const s = st();
    const wasSelected = s.selected.includes(el.id);
    let ids = s.selected;
    if (e.shiftKey) ids = wasSelected ? ids.filter((x) => x !== el.id) : [...ids, el.id];
    else if (!wasSelected) ids = [el.id];
    s.select(ids);
    if (s.editing && s.editing !== el.id) s.setEditing(null);
    const start = toSlide(e);
    const origin = new Map(s.deck.slides[s.current].elements.filter((x) => ids.includes(x.id)).map((x) => [x.id, { x: x.x, y: x.y }]));
    const bounds = [...origin.keys()].map((id) => s.deck.slides[s.current].elements.find((x) => x.id === id)!).reduce(
      (b, x) => ({ x1: Math.min(b.x1, x.x), y1: Math.min(b.y1, x.y), x2: Math.max(b.x2, x.x + x.w), y2: Math.max(b.y2, x.y + x.h) }),
      { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity },
    );
    let begun = false;
    drag(
      (p, ev) => {
        let dx = p.x - start.x;
        let dy = p.y - start.y;
        if (!begun) {
          if (Math.hypot(dx, dy) * scale < 3) return;
          begun = true;
          st().beginGesture();
        }
        if (ev.shiftKey) Math.abs(dx) > Math.abs(dy) ? (dy = 0) : (dx = 0);
        const g = snap({ x: bounds.x1 + dx, y: bounds.y1 + dy, w: bounds.x2 - bounds.x1, h: bounds.y2 - bounds.y1 }, new Set(origin.keys()));
        if (!ev.altKey) {
          dx += g.dx;
          dy += g.dy;
          setGuides({ x: g.gx, y: g.gy });
        }
        st().updateEls([...origin.keys()], (x) => ({ ...x, x: origin.get(x.id)!.x + dx, y: origin.get(x.id)!.y + dy }));
      },
      () => {
        setGuides({ x: [], y: [] });
        if (begun) st().endGesture();
        // A click on a selected text box starts typing in it.
        else if (wasSelected && !e.shiftKey && el.type === "box" && el.shape !== "line") st().setEditing(el.id);
      },
    );
  };

  const startResize = (e: React.PointerEvent, el: El, h: Handle) => {
    e.stopPropagation();
    e.preventDefault();
    const start = toSlide(e);
    const o = { ...el };
    const th = (o.rot * Math.PI) / 180;
    const cos = Math.cos(th);
    const sin = Math.sin(th);
    const sx = h.includes("e") ? 1 : h.includes("w") ? -1 : 0;
    const sy = h.includes("s") ? 1 : h.includes("n") ? -1 : 0;
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    // The opposite corner/edge stays where it is.
    const ax = cx + cos * (-sx * o.w) / 2 - sin * (-sy * o.h) / 2;
    const ay = cy + sin * (-sx * o.w) / 2 + cos * (-sy * o.h) / 2;
    st().beginGesture();
    drag(
      (p, ev) => {
        const dx = p.x - start.x;
        const dy = p.y - start.y;
        const lx = dx * cos + dy * sin;
        const ly = -dx * sin + dy * cos;
        let w = sx ? Math.max(8, o.w + sx * lx) : o.w;
        let hh = sy ? Math.max(8, o.h + sy * ly) : o.h;
        const keep = (o.type === "image" && sx && sy) !== ev.shiftKey;
        if (keep && sx && sy && o.h > 0.5) {
          const ratio = o.w / o.h;
          if (w / hh > ratio) hh = w / ratio;
          else w = hh * ratio;
        }
        // New centre = fixed anchor + half the new size along the dragged directions
        // (for edge handles the other direction contributes nothing).
        const ncx = ax + cos * ((sx * w) / 2) - sin * ((sy * hh) / 2);
        const ncy = ay + sin * ((sx * w) / 2) + cos * ((sy * hh) / 2);
        const flat = o.type === "box" && o.shape === "line" && o.h < 1;
        st().updateEls([o.id], (x) => ({ ...x, x: ncx - w / 2, y: flat ? o.y : ncy - hh / 2, w, h: flat ? o.h : hh }));
      },
      () => st().endGesture(),
    );
  };

  const startRotate = (e: React.PointerEvent, el: El) => {
    e.stopPropagation();
    e.preventDefault();
    const cx = el.x + el.w / 2;
    const cy = el.y + el.h / 2;
    st().beginGesture();
    drag(
      (p, ev) => {
        let a = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90;
        a = ((a % 360) + 360) % 360;
        if (ev.shiftKey) a = Math.round(a / 15) * 15;
        else for (const t of [0, 90, 180, 270, 360]) if (Math.abs(a - t) < 3) a = t % 360;
        st().updateEls([el.id], (x) => ({ ...x, rot: Math.round(a * 10) / 10 }));
      },
      () => st().endGesture(),
    );
  };

  const onBackground = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (st().editing) st().setEditing(null);
    if (!e.shiftKey) st().select([]);
    const start = toSlide(e);
    drag(
      (p) => {
        const box = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) };
        setMarquee(box);
        st().select(slide.elements.filter((x) => !x.locked && x.x < box.x + box.w && x.x + x.w > box.x && x.y < box.y + box.h && x.y + x.h > box.y).map((x) => x.id));
      },
      () => setMarquee(null),
    );
  };

  const single = selected.length === 1 ? slide.elements.find((x) => x.id === selected[0]) : null;
  const hs = 9 / scale;

  return (
    <div
      ref={wrap}
      className="relative min-h-0 flex-1 overflow-hidden"
      onPointerDown={onBackground}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onDropFiles([...e.dataTransfer.files]);
      }}
    >
      <div
        ref={stage}
        className="absolute shadow-[0_2px_10px_rgb(16_19_26/0.12),0_24px_60px_-24px_rgb(16_19_26/0.35)]"
        style={{ left: (area.w - deck.width * scale) / 2, top: (area.h - deck.height * scale) / 2, width: deck.width * scale, height: deck.height * scale }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0", width: deck.width, height: deck.height }} className="relative">
          <div className="absolute inset-0 overflow-hidden" style={{ background: slide.background.image ? `center / cover no-repeat url("${slide.background.image}")` : (slide.background.color ?? deck.theme.bg) }}>
            {slide.elements.map((el) =>
              el.id === editing && el.type === "box" ? (
                <ElementView key={el.id} el={el} theme={deck.theme} textOverride={<InlineText el={el} onEditor={onEditor} />} />
              ) : (
                <ElementView key={el.id} el={el} theme={deck.theme} showHints />
              ),
            )}
          </div>
          {/* Hit targets, above the artwork. */}
          {slide.elements.map((el) =>
            el.locked || el.id === editing ? null : (
              <div
                key={el.id}
                className="absolute cursor-move"
                style={{ left: el.x, top: el.y, width: Math.max(el.w, 6 / scale), height: Math.max(el.h, 8 / scale), marginTop: el.h < 8 / scale ? -4 / scale : 0, transform: el.rot ? `rotate(${el.rot}deg)` : undefined }}
                onPointerDown={(e) => startMove(e, el)}
                onDoubleClick={() => el.type === "box" && el.shape !== "line" && st().setEditing(el.id)}
              />
            ),
          )}
          {/* Selection outlines and handles. */}
          {slide.elements
            .filter((el) => selected.includes(el.id))
            .map((el) => (
              <div key={`sel-${el.id}`} className="pointer-events-none absolute" style={{ left: el.x, top: el.y, width: el.w, height: el.h, transform: el.rot ? `rotate(${el.rot}deg)` : undefined, outline: `${1.5 / scale}px solid #2f54eb` }}>
                {single?.id === el.id && el.id !== editing && (
                  <>
                    {HANDLES.filter((h) => !(el.type === "box" && el.shape === "line" && el.h < 1 && (h.includes("n") || h.includes("s")))).map((h) => (
                      <span
                        key={h}
                        onPointerDown={(e) => startResize(e, el, h)}
                        className="pointer-events-auto absolute rounded-[2px] border border-[#2f54eb] bg-white"
                        style={{
                          width: hs,
                          height: hs,
                          left: (h.includes("w") ? 0 : h.includes("e") ? el.w : el.w / 2) - hs / 2,
                          top: (h.includes("n") ? 0 : h.includes("s") ? el.h : el.h / 2) - hs / 2,
                          cursor: `${h}-resize`,
                          borderWidth: 1 / scale,
                        }}
                      />
                    ))}
                    <span className="absolute left-1/2 bg-[#2f54eb]" style={{ width: 1 / scale, height: 18 / scale, top: -18 / scale }} />
                    <span
                      onPointerDown={(e) => startRotate(e, el)}
                      title="Rotate"
                      className="pointer-events-auto absolute rounded-full border bg-white"
                      style={{ width: hs * 1.3, height: hs * 1.3, left: el.w / 2 - (hs * 1.3) / 2, top: -18 / scale - hs * 1.3, borderColor: "#2f54eb", borderWidth: 1.5 / scale, cursor: "grab" }}
                    />
                  </>
                )}
              </div>
            ))}
          {guides.x.map((x) => (
            <div key={`gx${x}`} className="pointer-events-none absolute top-0 bg-pink-500" style={{ left: x, width: 1 / scale, height: deck.height }} />
          ))}
          {guides.y.map((y) => (
            <div key={`gy${y}`} className="pointer-events-none absolute left-0 bg-pink-500" style={{ top: y, height: 1 / scale, width: deck.width }} />
          ))}
          {marquee && <div className="pointer-events-none absolute border border-brand-600 bg-brand-600/10" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h, borderWidth: 1 / scale }} />}
        </div>
      </div>
    </div>
  );
}

/** Live text editing inside a box; saves into the deck as you type (one undo step per edit session). */
function InlineText({ el, onEditor }: { el: BoxEl; onEditor: (e: Editor | null) => void }) {
  const st = useSlides.getState;
  const extensions = useMemo(() => wordExtensions(el.hint ?? "Type something"), [el.hint]);
  const editor = useEditor({
    extensions,
    content: el.text ?? textDoc(),
    immediatelyRender: false,
    autofocus: "end",
    editorProps: { attributes: { class: "fo-slide-text" } },
    onUpdate: ({ editor: ed }) => st().updateEls([el.id], (x) => ({ ...x, text: ed.getJSON() }) as El),
  });
  useEffect(() => {
    if (!editor) return;
    st().beginGesture();
    onEditor(editor);
    return () => {
      onEditor(null);
      st().endGesture();
    };
  }, [editor, onEditor, st]);
  return <EditorContent editor={editor} className="cursor-text" onPointerDown={(e) => e.stopPropagation()} />;
}

// ─── Notes ──────────────────────────────────────────────────────────

function Notes() {
  const notes = useSlides((s) => s.deck.slides[s.current]?.notes ?? "");
  const current = useSlides((s) => s.current);
  const [draft, setDraft] = useState(notes);
  useEffect(() => setDraft(notes), [notes, current]);
  return (
    <div className="h-[92px] shrink-0 border-t border-slate-200 bg-white px-4 py-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== notes && useSlides.getState().updateSlide(current, (s) => ({ ...s, notes: draft }))}
        placeholder="Speaker notes"
        aria-label="Speaker notes"
        className="h-full w-full resize-none text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
      />
    </div>
  );
}

// ─── Properties ─────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function Properties({ sel }: { sel: El[] }) {
  const deck = useSlides((s) => s.deck);
  const current = useSlides((s) => s.current);
  const st = useSlides.getState;
  const slide = deck.slides[current];
  const up = (fn: (e: El) => El) => st().updateEls(sel.map((x) => x.id), fn);
  const one = sel.length === 1 ? sel[0] : null;

  return (
    <aside className="thin-scroll w-[248px] shrink-0 space-y-5 overflow-y-auto border-l border-slate-200 bg-white p-4 text-[13px]">
      {!sel.length ? (
        <>
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Slide {current + 1}</h3>
          <Row label="Background">
            <ColorPick label="Background colour" icon={<span className="text-[12px]">Colour</span>} value={slide.background.color ?? deck.theme.bg} onChange={(c) => st().updateSlide(current, (s) => ({ ...s, background: { color: c ?? deck.theme.bg } }))} />
          </Row>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                const [f] = await pickFiles("image/*");
                if (!f) return;
                const img = await imageFileToDataUrl(f, 2400);
                st().updateSlide(current, (s) => ({ ...s, background: { ...s.background, image: img.src } }));
              }}
            >
              Picture…
            </Button>
            {slide.background.image && (
              <Button size="sm" onClick={() => st().updateSlide(current, (s) => ({ ...s, background: { color: s.background.color } }))}>
                Remove
              </Button>
            )}
          </div>
          <Button size="sm" onClick={() => st().change((d) => ({ ...d, slides: d.slides.map((s) => ({ ...s, background: { ...slide.background } })) }))}>
            Apply background to all slides
          </Button>
          <p className="text-[12px] leading-relaxed text-slate-500">Select something on the slide to change it. Double-click text to edit it; drag to move, corners to resize, the round handle to rotate.</p>
          {slide.elements.some((e) => e.locked) && (
            <Button size="sm" onClick={() => st().change((d) => ({ ...d, slides: d.slides.map((s, i) => (i === current ? { ...s, elements: s.elements.map((e) => ({ ...e, locked: undefined })) } : s)) }))}>
              <Unlock className="h-3.5 w-3.5" /> Unlock background artwork
            </Button>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-1">
            <TB label="Bring to front" onClick={() => st().arrange("front")}>
              <BringToFront className="h-4 w-4" />
            </TB>
            <TB label="Bring forward" onClick={() => st().arrange("forward")}>
              <ArrowUp className="h-4 w-4" />
            </TB>
            <TB label="Send backward" onClick={() => st().arrange("backward")}>
              <ArrowDown className="h-4 w-4" />
            </TB>
            <TB label="Send to back" onClick={() => st().arrange("back")}>
              <SendToBack className="h-4 w-4" />
            </TB>
            <TB label="Duplicate" onClick={() => st().duplicateSelected()}>
              <Copy className="h-4 w-4" />
            </TB>
            <TB label="Flip horizontally" onClick={() => up((e) => ({ ...e, flipH: !e.flipH || undefined }))}>
              <FlipHorizontal2 className="h-4 w-4" />
            </TB>
            <TB label="Flip vertically" onClick={() => up((e) => ({ ...e, flipV: !e.flipV || undefined }))}>
              <FlipVertical2 className="h-4 w-4" />
            </TB>
            <TB label="Delete" onClick={() => st().removeSelected()} className="text-red-600">
              <Trash2 className="h-4 w-4" />
            </TB>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Align on slide</h3>
            <div className="grid grid-cols-3 gap-1 text-[12px]">
              {(
                [
                  ["Left", (e: El) => ({ ...e, x: 0 })],
                  ["Centre", (e: El) => ({ ...e, x: (deck.width - e.w) / 2 })],
                  ["Right", (e: El) => ({ ...e, x: deck.width - e.w })],
                  ["Top", (e: El) => ({ ...e, y: 0 })],
                  ["Middle", (e: El) => ({ ...e, y: (deck.height - e.h) / 2 })],
                  ["Bottom", (e: El) => ({ ...e, y: deck.height - e.h })],
                ] as const
              ).map(([l, fn]) => (
                <button key={l} type="button" onClick={() => up(fn)} className="h-7 rounded-md border border-slate-200 hover:bg-slate-50">
                  {l}
                </button>
              ))}
            </div>
          </div>

          {one && (
            <div className="grid grid-cols-2 gap-2">
              {(["x", "y", "w", "h"] as const).map((k) => (
                <label key={k} className="grid gap-1">
                  <span className="text-[11px] uppercase text-slate-500">{k === "w" ? "Width" : k === "h" ? "Height" : k.toUpperCase()}</span>
                  <NumberInput value={Math.round(one[k])} onChange={(v) => up((e) => ({ ...e, [k]: k === "w" || k === "h" ? Math.max(1, v) : v }))} suffix="px" />
                </label>
              ))}
              <label className="col-span-2 grid gap-1">
                <span className="text-[11px] uppercase text-slate-500">Rotation</span>
                <NumberInput value={one.rot} onChange={(v) => up((e) => ({ ...e, rot: ((v % 360) + 360) % 360 }))} suffix="°" />
              </label>
            </div>
          )}

          {sel.every((e) => e.type === "box") && (
            <div className="space-y-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Shape</h3>
              {!(one?.type === "box" && one.shape === "line") && (
                <Row label="Fill">
                  <ColorPick
                    label="Fill"
                    icon={<span className="text-[12px]">Fill</span>}
                    value={(one as BoxEl | null)?.fill ?? null}
                    resetLabel="No fill"
                    onChange={(c) => up((e) => (e.type === "box" ? { ...e, fill: c, shape: e.shape === "none" && c ? "rect" : e.shape } : e))}
                  />
                </Row>
              )}
              <Row label="Outline">
                <ColorPick
                  label="Outline"
                  icon={<span className="text-[12px]">Line</span>}
                  value={(one as BoxEl | null)?.stroke ?? null}
                  resetLabel="No outline"
                  onChange={(c) => up((e) => (e.type === "box" ? { ...e, stroke: c, strokeW: c ? Math.max(1, e.strokeW || 1.5) : 0, shape: e.shape === "none" && c ? "rect" : e.shape } : e))}
                />
              </Row>
              {one?.type === "box" && one.stroke && (
                <Row label="Line width">
                  <div className="w-24">
                    <NumberInput value={one.strokeW} min={0.5} max={40} step={0.5} precision={1} onChange={(v) => up((e) => (e.type === "box" ? { ...e, strokeW: v } : e))} suffix="px" />
                  </div>
                </Row>
              )}
              {one?.type === "box" && one.shape !== "line" && (
                <>
                  <Row label="Text position">
                    <select value={one.valign} onChange={(ev) => up((e) => (e.type === "box" ? { ...e, valign: ev.target.value as BoxEl["valign"] } : e))} className="h-8 rounded-md border border-slate-200 px-1.5 text-[13px]">
                      <option value="top">Top</option>
                      <option value="middle">Middle</option>
                      <option value="bottom">Bottom</option>
                    </select>
                  </Row>
                  <Button size="sm" onClick={() => useSlides.getState().setEditing(one.id)}>
                    <Type className="h-3.5 w-3.5" /> Edit text
                  </Button>
                </>
              )}
            </div>
          )}

          {one?.type === "image" && (
            <Button
              size="sm"
              onClick={async () => {
                const [f] = await pickFiles("image/*");
                if (!f) return;
                const img = await imageFileToDataUrl(f, 2000);
                up((e) => (e.type === "image" ? { ...e, src: img.src, h: (e.w * img.height) / img.width } : e));
              }}
            >
              <ImagePlus className="h-3.5 w-3.5" /> Replace picture
            </Button>
          )}

          {one?.type === "table" && <TableProps el={one} onChange={(t) => up(() => t)} />}
          {one?.type === "unsupported" && <p className="text-[12px] leading-relaxed text-slate-500">This {one.label.toLowerCase()} came from the original file and can't be edited here. It won't be included when you save.</p>}
          {sel.some((e) => e.locked) && (
            <Button size="sm" onClick={() => up((e) => ({ ...e, locked: undefined }))}>
              <Lock className="h-3.5 w-3.5" /> Unlock
            </Button>
          )}
        </>
      )}
    </aside>
  );
}

function TableProps({ el, onChange }: { el: TableEl; onChange: (t: TableEl) => void }) {
  const [cell, setCell] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const r = Math.min(cell.r, el.rows.length - 1);
  const c = Math.min(cell.c, el.cols.length - 1);
  const cur = el.rows[r]?.cells[c];
  const scaleRows = (rows: TableEl["rows"]) => ({ ...el, rows, h: rows.reduce((n, x) => n + x.h, 0) });
  return (
    <div className="space-y-2">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Table</h3>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${el.cols.length}, minmax(0,1fr))` }}>
        {el.rows.map((row, ri) =>
          row.cells.map((cl, ci) => (
            <button key={`${ri}-${ci}`} type="button" onClick={() => setCell({ r: ri, c: ci })} className={cn("h-6 truncate rounded border px-1 text-left text-[11px]", ri === r && ci === c ? "border-brand-500 bg-brand-50" : "border-slate-200")}>
              {cl.merged ? "·" : cl.text || " "}
            </button>
          )),
        )}
      </div>
      {cur && (
        <textarea
          value={cur.text}
          onChange={(e) => onChange({ ...el, rows: el.rows.map((row, ri) => (ri === r ? { ...row, cells: row.cells.map((x, ci) => (ci === c ? { ...x, text: e.target.value } : x)) } : row)) })}
          rows={2}
          aria-label="Cell text"
          className="w-full rounded-md border border-slate-200 px-2 py-1 text-[13px] outline-none focus:border-brand-500"
        />
      )}
      <Row label="Cell fill">
        <ColorPick label="Cell fill" icon={<span className="text-[12px]">Fill</span>} value={cur?.fill ?? null} resetLabel="No fill" onChange={(f) => onChange({ ...el, rows: el.rows.map((row, ri) => (ri === r ? { ...row, cells: row.cells.map((x, ci) => (ci === c ? { ...x, fill: f ?? undefined } : x)) } : row)) })} />
      </Row>
      <div className="grid grid-cols-2 gap-1 text-[12px]">
        <button type="button" className="h-7 rounded-md border border-slate-200 hover:bg-slate-50" onClick={() => onChange(scaleRows([...el.rows.slice(0, r + 1), { h: 40, cells: el.cols.map(() => ({ text: "" })) }, ...el.rows.slice(r + 1)]))}>
          + Row
        </button>
        <button
          type="button"
          className="h-7 rounded-md border border-slate-200 hover:bg-slate-50"
          onClick={() => {
            const w = el.w / (el.cols.length + 1);
            onChange({ ...el, cols: el.cols.map(() => w).concat(w), rows: el.rows.map((row) => ({ ...row, cells: [...row.cells.slice(0, c + 1), { text: "" }, ...row.cells.slice(c + 1)] })) });
          }}
        >
          + Column
        </button>
        <button type="button" disabled={el.rows.length <= 1} className="h-7 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40" onClick={() => onChange(scaleRows(el.rows.filter((_, i) => i !== r)))}>
          − Row
        </button>
        <button
          type="button"
          disabled={el.cols.length <= 1}
          className="h-7 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          onClick={() => {
            const w = el.w / (el.cols.length - 1);
            onChange({ ...el, cols: el.cols.filter((_, i) => i !== c).map(() => w), rows: el.rows.map((row) => ({ ...row, cells: row.cells.filter((_, i) => i !== c) })) });
          }}
        >
          − Column
        </button>
      </div>
    </div>
  );
}

// ─── Present ────────────────────────────────────────────────────────

function Presenter({ start, onClose }: { start: number; onClose: () => void }) {
  const deck = useSlides((s) => s.deck);
  const shown = useMemo(() => deck.slides.map((s, i) => ({ s, i })).filter((x) => !x.s.hidden), [deck]);
  const [pos, setPos] = useState(() => Math.max(0, shown.findIndex((x) => x.i >= start)));
  const root = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: typeof window !== "undefined" ? window.innerWidth : 1280, h: typeof window !== "undefined" ? window.innerHeight : 720 });
  const next = useCallback(() => setPos((p) => (p + 1 >= shown.length ? (onClose(), p) : p + 1)), [shown.length, onClose]);
  const prev = () => setPos((p) => Math.max(0, p - 1));

  useEffect(() => {
    root.current?.requestFullscreen?.().catch(() => {});
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    const onFs = () => !document.fullscreenElement && onClose();
    window.addEventListener("resize", onResize);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("fullscreenchange", onFs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [onClose]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter", "n"].includes(e.key)) (e.preventDefault(), next());
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace", "p"].includes(e.key)) (e.preventDefault(), prev());
      else if (e.key === "Home") setPos(0);
      else if (e.key === "End") setPos(shown.length - 1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [next, onClose, shown.length]);

  const cur = shown[pos];
  if (!cur) return null;
  const scale = Math.min(size.w / deck.width, size.h / deck.height);
  return (
    <div ref={root} className="fixed inset-0 z-[100] flex items-center justify-center bg-black" onClick={next} role="dialog" aria-label="Slideshow">
      <div style={{ width: deck.width * scale, height: deck.height * scale }} className="relative overflow-hidden">
        <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}>
          <SlideView slide={cur.s} deck={deck} />
        </div>
      </div>
      <div className="group absolute bottom-0 left-0 right-0 flex h-16 items-end justify-center pb-3 opacity-0 transition hover:opacity-100">
        <div className="flex items-center gap-3 rounded-full bg-black/60 px-4 py-1.5 text-[13px] text-white" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={prev} aria-label="Previous slide">‹</button>
          <span className="tabular-nums">
            {pos + 1} / {shown.length}
          </span>
          <button type="button" onClick={next} aria-label="Next slide">›</button>
          <button type="button" onClick={onClose} aria-label="End slideshow" className="ml-2 text-white/70 hover:text-white">
            End
          </button>
        </div>
      </div>
    </div>
  );
}
