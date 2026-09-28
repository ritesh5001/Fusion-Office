"use client";

import type { ReactNode } from "react";
import {
  ArrowUpRight,
  Brush,
  Circle,
  Eraser,
  EyeOff,
  Highlighter,
  ImagePlus,
  MessageSquarePlus,
  Minus,
  MousePointer2,
  PaintRoller,
  Pencil,
  Signature,
  Square,
  Strikethrough,
  TextCursorInput,
  Triangle,
  Type,
  Underline,
} from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import type { ToolId } from "@/lib/editor/types";
import { HIGHLIGHT_COLORS } from "@/lib/editor/objects";
import { insertImageObject } from "@/lib/editor/actions";
import { toast } from "@/lib/editor/events";
import { pickFiles } from "./filePicker";
import { ColorInput, Divider, IconButton, NumberInput, cn } from "../ui/primitives";

const I = "h-[17px] w-[17px]";

interface ToolDef {
  id: ToolId;
  label: string;
  key?: string;
  icon: ReactNode;
}

const GROUPS: ToolDef[][] = [
  [{ id: "select", label: "Select", key: "V", icon: <MousePointer2 className={I} /> }],
  [
    { id: "edittext", label: "Edit existing text", key: "G", icon: <TextCursorInput className={I} /> },
    { id: "text", label: "Add text", key: "T", icon: <Type className={I} /> },
    { id: "image", label: "Add image", key: "I", icon: <ImagePlus className={I} /> },
    { id: "signature", label: "Signature", key: "S", icon: <Signature className={I} /> },
  ],
  [
    { id: "rect", label: "Rectangle", key: "R", icon: <Square className={I} /> },
    { id: "ellipse", label: "Ellipse", key: "O", icon: <Circle className={I} /> },
    { id: "triangle", label: "Triangle", icon: <Triangle className={I} /> },
    { id: "line", label: "Line", key: "L", icon: <Minus className={cn(I, "-rotate-45")} /> },
    { id: "arrow", label: "Arrow", key: "A", icon: <ArrowUpRight className={I} /> },
  ],
  [
    { id: "draw", label: "Pen", key: "P", icon: <Pencil className={I} /> },
    { id: "highlighter", label: "Marker", key: "M", icon: <Brush className={I} /> },
    { id: "eraser", label: "Eraser (removes drawings & markups)", key: "E", icon: <Eraser className={I} /> },
  ],
  [
    { id: "highlight", label: "Highlight text", key: "H", icon: <Highlighter className={I} /> },
    { id: "underline", label: "Underline text", key: "U", icon: <Underline className={I} /> },
    { id: "strikeout", label: "Strikethrough text", key: "K", icon: <Strikethrough className={I} /> },
    { id: "comment", label: "Comment", key: "C", icon: <MessageSquarePlus className={I} /> },
  ],
  [
    { id: "redact", label: "Redact (permanently removes content)", key: "X", icon: <EyeOff className={I} /> },
    { id: "whiteout", label: "Whiteout", key: "W", icon: <PaintRoller className={I} /> },
  ],
];

export const TOOL_KEYS: Record<string, ToolId> = Object.fromEntries(
  GROUPS.flat()
    .filter((t) => t.key)
    .map((t) => [t.key!.toLowerCase(), t.id]),
);

/** Tools that do something immediately rather than becoming the active tool. */
export async function activateTool(id: ToolId) {
  const st = useEditor.getState();
  if (id === "image") {
    const [file] = await pickFiles("image/png,image/jpeg,image/webp,image/gif");
    if (file) insertImageObject(file).catch((e) => toast(e.message, "error"));
    return;
  }
  if (id === "signature") {
    st.setDialog("signature");
    return;
  }
  st.setTool(st.tool === id && id !== "select" ? "select" : id);
}

const HINTS: Partial<Record<ToolId, string>> = {
  edittext: "Click any line of text in the PDF to change it",
  text: "Click on the page to add text",
  rect: "Drag to draw · click for default size",
  ellipse: "Drag to draw · click for default size",
  triangle: "Drag to draw · click for default size",
  line: "Drag from start to end",
  arrow: "Drag from tail to head",
  draw: "Draw freehand",
  highlighter: "Draw with a translucent marker",
  eraser: "Click or drag over drawings and markups to erase",
  highlight: "Drag across text to highlight it",
  underline: "Drag across text to underline it",
  strikeout: "Drag across text to strike it out",
  comment: "Click to place a sticky note",
  redact: "Drag over content to redact · removed permanently on export",
  whiteout: "Drag to cover an area with white",
};

export function ToolBar() {
  const tool = useEditor((s) => s.tool);
  return (
    <div className="flex h-11 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-slate-200 bg-white px-2 [scrollbar-width:none]">
      {GROUPS.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <Divider />}
          {group.map((t) => (
            <IconButton key={t.id} label={t.label} shortcut={t.key} active={tool === t.id} onClick={() => activateTool(t.id)}>
              {t.icon}
            </IconButton>
          ))}
        </div>
      ))}
      <Divider />
      <ToolOptions />
      <div className="ml-auto hidden shrink-0 pl-3 pr-1 text-[12px] text-slate-400 xl:block">{HINTS[tool]}</div>
    </div>
  );
}

function ToolOptions() {
  const tool = useEditor((s) => s.tool);
  const o = useEditor((s) => s.toolOptions);
  const set = useEditor((s) => s.setToolOptions);

  const label = (text: string) => <span className="text-[11px] text-slate-500">{text}</span>;

  if (["rect", "ellipse", "triangle", "line", "arrow"].includes(tool)) {
    const hasFill = tool !== "line" && tool !== "arrow";
    return (
      <div className="flex items-center gap-2 pl-1">
        {label("Stroke")}
        <ColorInput label="Stroke color" value={o.stroke} onChange={(stroke) => set({ stroke })} />
        <div className="w-16">
          <NumberInput value={o.strokeWidth} min={0} max={40} suffix="pt" onChange={(strokeWidth) => set({ strokeWidth })} />
        </div>
        {hasFill && (
          <>
            {label("Fill")}
            <ColorInput label="Fill color" value={o.fill} allowTransparent onChange={(fill) => set({ fill })} />
          </>
        )}
      </div>
    );
  }
  if (tool === "draw" || tool === "highlighter") {
    const pen = tool === "draw";
    return (
      <div className="flex items-center gap-2 pl-1">
        {label("Color")}
        <ColorInput
          label="Color"
          value={pen ? o.penColor : o.highlighterColor}
          onChange={(c) => set(pen ? { penColor: c } : { highlighterColor: c })}
        />
        {label("Size")}
        <input
          type="range"
          aria-label="Brush size"
          min={1}
          max={pen ? 24 : 40}
          value={pen ? o.penWidth : o.highlighterWidth}
          onChange={(e) => set(pen ? { penWidth: +e.target.value } : { highlighterWidth: +e.target.value })}
          className="w-24 accent-brand-600"
        />
      </div>
    );
  }
  if (tool === "highlight" || tool === "underline" || tool === "strikeout") {
    const colors = tool === "highlight" ? HIGHLIGHT_COLORS : [{ name: "Red", value: "#dc2626" }, { name: "Blue", value: "#2563eb" }, { name: "Black", value: "#111827" }, ...HIGHLIGHT_COLORS.slice(1, 2)];
    return (
      <div className="flex items-center gap-1.5 pl-1">
        {colors.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.name}
            aria-label={c.name}
            onClick={() => set({ markupColor: c.value })}
            className={cn("h-5 w-5 rounded-full ring-offset-1 transition", o.markupColor === c.value ? "ring-2 ring-brand-500" : "ring-1 ring-black/10")}
            style={{ background: c.value }}
          />
        ))}
        <ColorInput label="Custom color" value={o.markupColor} onChange={(markupColor) => set({ markupColor })} />
      </div>
    );
  }
  if (tool === "text") {
    return (
      <div className="flex items-center gap-2 pl-1">
        {label("Size")}
        <div className="w-16">
          <NumberInput value={o.fontSize} min={4} max={200} suffix="pt" onChange={(fontSize) => set({ fontSize })} />
        </div>
        <ColorInput label="Text color" value={o.textColor} onChange={(textColor) => set({ textColor })} />
      </div>
    );
  }
  return null;
}
