"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Bold,
  Copy,
  Eye,
  EyeOff,
  FlipHorizontal2,
  FlipVertical2,
  ImageUp,
  Italic,
  Lock,
  Trash2,
  Underline,
  Unlock,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useEditor } from "@/lib/editor/store";
import { HIGHLIGHT_COLORS, OBJECT_LABELS } from "@/lib/editor/objects";
import { readImageFile } from "@/lib/editor/images";
import { toast } from "@/lib/editor/events";
import { viewSize, type EditorObject, type FontFamily, type Rect, type TextAlign } from "@/lib/editor/types";
import { styleSelection } from "@/lib/editor/liveText";
import { pickFiles } from "./filePicker";
import { Button, ColorInput, Field, IconButton, NumberInput, Select, cn } from "../ui/primitives";
import { MOD } from "./TopBar";

export function PropertiesPanel() {
  const selection = useEditor((s) => s.selection);
  const objects = useEditor(
    useShallow((s) => {
      const sel = s.selection;
      if (!sel || !s.doc) return null;
      const page = s.doc.pages.find((p) => p.id === sel.pageId);
      return page ? page.objects.filter((o) => sel.ids.includes(o.id)) : null;
    }),
  );

  return (
    <aside className="thin-scroll flex h-full w-[264px] shrink-0 flex-col overflow-y-auto border-l border-line bg-surface">
      {selection && objects && objects.length === 1 ? (
        <ObjectProperties pageId={selection.pageId} obj={objects[0]} />
      ) : selection && objects && objects.length > 1 ? (
        <MultiProperties pageId={selection.pageId} ids={selection.ids} />
      ) : (
        <DocumentInfo />
      )}
    </aside>
  );
}

function Section({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("border-b border-line px-4 py-3.5", className)}>
      {title && <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{title}</h3>}
      {children}
    </section>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-line px-4 py-3">
      <div className="text-[13px] font-semibold text-fg">{title}</div>
      {subtitle && <div className="mt-0.5 text-[11px] text-fg-muted">{subtitle}</div>}
    </div>
  );
}

function ArrangeActions({ pageId, ids }: { pageId: string; ids: string[] }) {
  const st = useEditor.getState;
  const objs = useEditor(
    useShallow((s) => s.doc?.pages.find((p) => p.id === pageId)?.objects.filter((o) => ids.includes(o.id)) ?? []),
  );
  const allLocked = objs.length > 0 && objs.every((o) => o.locked);
  const allHidden = objs.length > 0 && objs.every((o) => o.hidden);
  // Hiding a redaction or edited PDF text would make the file differ from the page.
  const canHide = objs.every((o) => o.type !== "redact" && !(o.type === "text" && o.replaces));
  const setFlag = (flag: "locked" | "hidden", on: boolean) =>
    st().replaceObjects(pageId, objs.map((o) => ({ ...o, [flag]: on || undefined })), flag === "locked" ? (on ? "Lock" : "Unlock") : on ? "Hide" : "Show");
  return (
    <Section title="Layer">
      <div className="flex items-center justify-between">
        <div className="flex">
          <IconButton size="sm" label="Bring to front" onClick={() => st().reorderObjects(pageId, ids, "front")}>
            <ArrowUpToLine className="h-4 w-4" />
          </IconButton>
          <IconButton size="sm" label="Bring forward" onClick={() => st().reorderObjects(pageId, ids, "forward")}>
            <ArrowUp className="h-4 w-4" />
          </IconButton>
          <IconButton size="sm" label="Send backward" onClick={() => st().reorderObjects(pageId, ids, "backward")}>
            <ArrowDown className="h-4 w-4" />
          </IconButton>
          <IconButton size="sm" label="Send to back" onClick={() => st().reorderObjects(pageId, ids, "back")}>
            <ArrowDownToLine className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="flex">
          <IconButton
            size="sm"
            label={allHidden ? "Show layer" : canHide ? "Hide layer" : "Can't hide redactions or edited PDF text"}
            active={allHidden}
            disabled={!canHide}
            onClick={() => setFlag("hidden", !allHidden)}
          >
            {allHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </IconButton>
          <IconButton size="sm" label={allLocked ? "Unlock layer" : "Lock layer"} active={allLocked} onClick={() => setFlag("locked", !allLocked)}>
            {allLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </IconButton>
          <IconButton size="sm" label="Duplicate" shortcut={`${MOD}D`} onClick={() => st().duplicateSelection()}>
            <Copy className="h-4 w-4" />
          </IconButton>
          <IconButton size="sm" label="Delete" shortcut="Del" className="hover:bg-red-500/10 hover:text-red-300" onClick={() => st().deleteObjects(pageId, ids)}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    </Section>
  );
}

function MultiProperties({ pageId, ids }: { pageId: string; ids: string[] }) {
  return (
    <>
      <Header title={`${ids.length} objects selected`} subtitle="Drag to move them together" />
      <ArrangeActions pageId={pageId} ids={ids} />
    </>
  );
}

function ObjectProperties({ pageId, obj }: { pageId: string; obj: EditorObject }) {
  const update = (patch: Partial<EditorObject>, key?: string) => useEditor.getState().updateObject(pageId, obj.id, patch, key);
  const label = obj.type === "image" && obj.isSignature ? "Signature" : obj.type === "shape" ? capitalize(obj.shape) : OBJECT_LABELS[obj.type];

  return (
    <>
      <Header
        title={obj.type === "text" && obj.replaces ? "Edited PDF text" : label}
        subtitle={obj.type === "text" ? "Double-click the text on the page to edit it" : undefined}
      />
      {"cx" in obj && obj.type !== "comment" && <Geometry obj={obj} update={update} />}
      {(obj.type === "redact" || obj.type === "whiteout") && <RectGeometry rect={obj.rect} update={(rect) => update({ rect })} />}

      {obj.type === "text" && obj.replaces && (
        <Section title="Replaces original text">
          <p className="rounded-md bg-sunken px-2.5 py-2 text-[12px] leading-relaxed text-fg-muted ring-1 ring-line">
            “{obj.replaces.original}”
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
            On export the original words are removed from the file and this text takes their place. Clear the text to delete the line.
          </p>
          <Button size="sm" className="mt-2.5 w-full" onClick={() => useEditor.getState().deleteObjects(pageId, [obj.id])}>
            Restore original
          </Button>
        </Section>
      )}

      {obj.type === "text" && (
        <Section title="Text">
          <div className="grid grid-cols-[1fr_72px] gap-2">
            <Select<FontFamily>
              ariaLabel="Font"
              value={obj.fontFamily}
              onChange={(fontFamily) => update({ fontFamily, pdfFont: undefined, charStyles: undefined })}
              options={[
                { value: "Helvetica", label: "Helvetica / Arial" },
                { value: "Times", label: "Times" },
                { value: "Courier", label: "Courier" },
              ]}
            />
            <NumberInput value={obj.fontSize} min={4} max={400} step={1} precision={obj.fontSize % 1 ? 1 : 0} suffix="pt" onChange={(fontSize) => update({ fontSize })} />
          </div>
          <div className="mt-2 flex items-center gap-1">
            {/* With letters selected while editing, these style just the selection. mouseDown is
                prevented so the click doesn't take focus (and the selection) away from the text. */}
            <IconButton
              size="sm"
              label="Bold"
              active={obj.bold}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => styleSelection(obj, { kind: "bold" }) || update({ bold: !obj.bold, pdfFont: undefined, charStyles: undefined })}
            >
              <Bold className="h-4 w-4" />
            </IconButton>
            <IconButton
              size="sm"
              label="Italic"
              active={obj.italic}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => styleSelection(obj, { kind: "italic" }) || update({ italic: !obj.italic, pdfFont: undefined, charStyles: undefined })}
            >
              <Italic className="h-4 w-4" />
            </IconButton>
            <IconButton
              size="sm"
              label="Underline"
              active={obj.underline}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => styleSelection(obj, { kind: "underline" }) || update({ underline: !obj.underline })}
            >
              <Underline className="h-4 w-4" />
            </IconButton>
            <div className="mx-1 h-5 w-px bg-line" />
            {(["left", "center", "right"] as TextAlign[]).map((a) => (
              <IconButton key={a} size="sm" label={`Align ${a}`} active={obj.align === a} onClick={() => update({ align: a })}>
                {a === "left" ? <AlignLeft className="h-4 w-4" /> : a === "center" ? <AlignCenter className="h-4 w-4" /> : <AlignRight className="h-4 w-4" />}
              </IconButton>
            ))}
            <div className="ml-auto">
              <ColorInput label="Text color" value={obj.color} onChange={(color) => styleSelection(obj, { kind: "color", value: color }) || update({ color }, "color")} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Field label="Line height">
              <NumberInput value={obj.lineHeight} min={0.6} max={4} step={0.05} precision={2} onChange={(lineHeight) => update({ lineHeight })} />
            </Field>
            <Field label="Letter spacing">
              <NumberInput value={obj.letterSpacing} min={-200} max={2000} step={10} onChange={(letterSpacing) => update({ letterSpacing })} />
            </Field>
          </div>
        </Section>
      )}

      {obj.type === "image" && <ImageSection obj={obj} update={update} />}

      {obj.type === "shape" && (
        <Section title="Style">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stroke">
              <ColorInput label="Stroke color" value={obj.stroke} allowTransparent={obj.shape !== "line" && obj.shape !== "arrow"} onChange={(stroke) => update({ stroke }, "color")} />
            </Field>
            {obj.shape !== "line" && obj.shape !== "arrow" && (
              <Field label="Fill">
                <ColorInput label="Fill color" value={obj.fill} allowTransparent onChange={(fill) => update({ fill }, "color")} />
              </Field>
            )}
            <Field label="Stroke width">
              <NumberInput value={obj.strokeWidth} min={0} max={60} step={0.5} precision={1} suffix="pt" onChange={(strokeWidth) => update({ strokeWidth })} />
            </Field>
          </div>
        </Section>
      )}

      {obj.type === "path" && (
        <Section title="Ink">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Color">
              <ColorInput label="Ink color" value={obj.stroke} onChange={(stroke) => update({ stroke }, "color")} />
            </Field>
            <Field label="Thickness">
              <NumberInput value={obj.strokeWidth} min={0.5} max={60} step={0.5} precision={1} suffix="pt" onChange={(strokeWidth) => update({ strokeWidth })} />
            </Field>
          </div>
        </Section>
      )}

      {obj.type === "markup" && (
        <Section title="Markup">
          <div className="mb-3 flex gap-1 rounded-lg bg-sunken p-0.5 ring-1 ring-line">
            {(["highlight", "underline", "strikeout"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => update({ style: s, opacity: s === "highlight" ? 0.4 : 1 })}
                className={cn("flex-1 rounded-md py-1 text-[12px] capitalize", obj.style === s ? "bg-raised font-medium text-fg shadow-sm ring-1 ring-line-strong" : "text-fg-muted")}
              >
                {s === "strikeout" ? "Strike" : s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                aria-label={c.name}
                onClick={() => update({ color: c.value })}
                className={cn("h-6 w-6 rounded-full ring-offset-1 ring-offset-surface", obj.color === c.value ? "ring-2 ring-brand-500" : "ring-1 ring-white/15")}
                style={{ background: c.value }}
              />
            ))}
            <ColorInput label="Custom color" value={obj.color} onChange={(color) => update({ color }, "color")} />
          </div>
        </Section>
      )}

      {obj.type === "comment" && <CommentSection obj={obj} update={update} />}

      {obj.type === "redact" && (
        <Section>
          <p className="rounded-md bg-red-500/10 px-3 py-2 text-[12px] leading-relaxed text-red-200">
            On export, this page is flattened to an image and everything under the box is <strong>permanently removed</strong>, including hidden text. Text on this page will no longer be selectable.
          </p>
        </Section>
      )}
      {obj.type === "whiteout" && (
        <Section title="Cover color">
          <ColorInput label="Cover color" value={obj.color} onChange={(color) => update({ color }, "color")} />
          <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">Whiteout only hides content visually. Use Redact to remove sensitive information.</p>
        </Section>
      )}

      {"opacity" in obj && obj.type !== "markup" && (
        <Section title="Opacity">
          <div className="flex items-center gap-3">
            <input
              type="range"
              aria-label="Opacity"
              min={5}
              max={100}
              value={Math.round(obj.opacity * 100)}
              onChange={(e) => update({ opacity: +e.target.value / 100 }, `opacity-${obj.id}`)}
              className="flex-1 accent-brand-500"
            />
            <span className="w-9 text-right text-[12px] tabular-nums text-fg-muted">{Math.round(obj.opacity * 100)}%</span>
          </div>
        </Section>
      )}

      <ArrangeActions pageId={pageId} ids={[obj.id]} />
    </>
  );
}

type Positioned = Extract<EditorObject, { cx: number; width: number }>;

function Geometry({ obj, update }: { obj: Positioned; update: (p: Partial<EditorObject>, key?: string) => void }) {
  const [lockRatio, setLockRatio] = useState(obj.type === "image" || obj.type === "path");
  const isLine = obj.type === "shape" && (obj.shape === "line" || obj.shape === "arrow");
  const isText = obj.type === "text";
  const left = obj.cx - obj.width / 2;
  const top = obj.cy - obj.height / 2;

  const resize = (w: number, h: number) => {
    let width = Math.max(1, w);
    let height = Math.max(1, h);
    if (lockRatio && obj.width > 0 && obj.height > 0) {
      if (width !== obj.width) height = (width * obj.height) / obj.width;
      else width = (height * obj.width) / obj.height;
    }
    // Keep the top-left corner fixed while resizing.
    const patch: Record<string, number> = { width, height, cx: left + width / 2, cy: top + height / 2 };
    if (obj.type === "path") {
      patch.scaleX = obj.scaleX * (width / obj.width);
      patch.scaleY = obj.scaleY * (height / obj.height);
    }
    if (isText) {
      delete patch.height;
      patch.cy = obj.cy;
    }
    update(patch as Partial<EditorObject>);
  };

  return (
    <Section title="Position & size">
      <div className="grid grid-cols-2 gap-2">
        <Field label="X">
          <NumberInput value={left} precision={1} suffix="pt" onChange={(x) => update({ cx: x + obj.width / 2 })} />
        </Field>
        <Field label="Y">
          <NumberInput value={top} precision={1} suffix="pt" onChange={(y) => update({ cy: y + obj.height / 2 })} />
        </Field>
        <Field label={isLine ? "Length" : "Width"}>
          <NumberInput value={obj.width} min={1} precision={1} suffix="pt" onChange={(w) => resize(w, obj.height)} />
        </Field>
        {!isLine && (
          <Field label="Height">
            <div className="flex items-center gap-1">
              <div className={cn("flex-1", isText && "pointer-events-none opacity-50")}>
                <NumberInput value={obj.height} min={1} precision={1} suffix="pt" onChange={(h) => resize(obj.width, h)} />
              </div>
              {!isText && (
                <IconButton size="sm" label={lockRatio ? "Unlock aspect ratio" : "Lock aspect ratio"} active={lockRatio} onClick={() => setLockRatio(!lockRatio)}>
                  {lockRatio ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                </IconButton>
              )}
            </div>
          </Field>
        )}
        <Field label="Rotation">
          <NumberInput value={obj.angle} min={-360} max={360} precision={0} suffix="°" onChange={(angle) => update({ angle: ((angle % 360) + 360) % 360 })} />
        </Field>
      </div>
    </Section>
  );
}

function RectGeometry({ rect, update }: { rect: Rect; update: (r: Rect) => void }) {
  return (
    <Section title="Position & size">
      <div className="grid grid-cols-2 gap-2">
        <Field label="X">
          <NumberInput value={rect.x} precision={1} suffix="pt" onChange={(x) => update({ ...rect, x })} />
        </Field>
        <Field label="Y">
          <NumberInput value={rect.y} precision={1} suffix="pt" onChange={(y) => update({ ...rect, y })} />
        </Field>
        <Field label="Width">
          <NumberInput value={rect.w} min={1} precision={1} suffix="pt" onChange={(w) => update({ ...rect, w })} />
        </Field>
        <Field label="Height">
          <NumberInput value={rect.h} min={1} precision={1} suffix="pt" onChange={(h) => update({ ...rect, h })} />
        </Field>
      </div>
    </Section>
  );
}

function ImageSection({ obj, update }: { obj: Extract<EditorObject, { type: "image" }>; update: (p: Partial<EditorObject>) => void }) {
  const replace = async () => {
    const [file] = await pickFiles("image/png,image/jpeg,image/webp,image/gif");
    if (!file) return;
    try {
      const img = await readImageFile(file);
      // Keep the current width; adopt the new image's aspect ratio.
      const height = (obj.width * img.height) / img.width;
      update({ src: img.src, height });
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  return (
    <Section title="Image">
      <div className="flex items-center gap-1">
        <IconButton size="sm" label="Flip horizontal" active={obj.flipX} onClick={() => update({ flipX: !obj.flipX })}>
          <FlipHorizontal2 className="h-4 w-4" />
        </IconButton>
        <IconButton size="sm" label="Flip vertical" active={obj.flipY} onClick={() => update({ flipY: !obj.flipY })}>
          <FlipVertical2 className="h-4 w-4" />
        </IconButton>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={replace}>
          <ImageUp className="h-3.5 w-3.5" /> Replace
        </Button>
      </div>
    </Section>
  );
}

function CommentSection({ obj, update }: { obj: Extract<EditorObject, { type: "comment" }>; update: (p: Partial<EditorObject>, key?: string) => void }) {
  const [draft, setDraft] = useState(obj.text);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setDraft(obj.text);
    if (!obj.text) ref.current?.focus();
  }, [obj.id, obj.text]);
  return (
    <Section title="Comment">
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== obj.text && update({ text: draft })}
        placeholder="Write a comment…"
        rows={5}
        className="w-full resize-y rounded-md border border-line-strong p-2 text-[13px] leading-relaxed outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 bg-sunken text-fg"
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-1.5">
          {["#fde047", "#86efac", "#93c5fd", "#f9a8d4", "#fdba74"].map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Note color ${c}`}
              onClick={() => update({ color: c })}
              className={cn("h-5 w-5 rounded ring-offset-1 ring-offset-surface", obj.color === c ? "ring-2 ring-brand-500" : "ring-1 ring-white/15")}
              style={{ background: c }}
            />
          ))}
        </div>
        <span className="text-[11px] text-fg-subtle">{new Date(obj.createdAt).toLocaleDateString()}</span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">Exported as a PDF sticky note that opens in any PDF reader.</p>
    </Section>
  );
}

function DocumentInfo() {
  const doc = useEditor((s) => s.doc!);
  const currentPageId = useEditor((s) => s.currentPageId);
  const past = useEditor((s) => s.past);
  const future = useEditor((s) => s.future);
  const page = doc.pages.find((p) => p.id === currentPageId) ?? doc.pages[0];
  const index = doc.pages.indexOf(page);
  const size = viewSize(page);
  const objCount = doc.pages.reduce((n, p) => n + p.objects.length, 0);
  const mm = (pt: number) => Math.round((pt / 72) * 25.4);

  return (
    <>
      <Header title="Document" subtitle={`${doc.pages.length} page${doc.pages.length === 1 ? "" : "s"} · ${objCount} edit${objCount === 1 ? "" : "s"}`} />
      <Section title={`Page ${index + 1}`}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[12px]">
          <dt className="text-fg-muted">Size</dt>
          <dd className="tabular-nums text-fg">
            {mm(size.width)} × {mm(size.height)} mm
          </dd>
          <dt className="text-fg-muted">Points</dt>
          <dd className="tabular-nums text-fg">
            {Math.round(size.width)} × {Math.round(size.height)}
          </dd>
          <dt className="text-fg-muted">Rotation</dt>
          <dd className="tabular-nums text-fg">{page.rotation}°</dd>
          <dt className="text-fg-muted">Source</dt>
          <dd className="truncate text-fg">
            {page.source.kind === "blank" ? "Blank page" : (doc.sources.find((s) => page.source.kind === "pdf" && s.id === page.source.sourceId)?.name ?? "PDF")}
          </dd>
        </dl>
      </Section>
      <Section title="History">
        {past.length === 0 && future.length === 0 ? (
          <p className="text-[12px] text-fg-subtle">No changes yet.</p>
        ) : (
          <ol className="max-h-72 space-y-0.5 overflow-y-auto text-[12px]">
            {future
              .slice()
              .reverse()
              .map((h, i) => (
                <li key={`f${i}`} className="truncate rounded px-2 py-1 text-fg-subtle line-through decoration-fg-subtle">
                  {h.label}
                </li>
              ))}
            {past
              .slice()
              .reverse()
              .map((h, i) => (
                <li key={`p${i}`} className={cn("truncate rounded px-2 py-1", i === 0 ? "bg-brand-500/15 font-medium text-brand-300" : "text-fg-muted")}>
                  {h.label}
                </li>
              ))}
          </ol>
        )}
      </Section>
      <Section>
        <p className="text-[12px] leading-relaxed text-fg-muted">
          Select an object to edit its properties. Your file stays in this browser. Nothing is uploaded unless you save to the cloud.
        </p>
      </Section>
    </>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
