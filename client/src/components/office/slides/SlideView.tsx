"use client";

import { memo, type CSSProperties, type ReactNode } from "react";
import { generateHTML } from "@tiptap/core";
import { wordExtensions } from "@/lib/office/docx/extensions";
import { plainText, type BoxEl, type Deck, type El, type JSONContent, type ShapeKind, type Slide, type TableEl } from "@/lib/office/slides/model";

const EXT = wordExtensions("");
const htmlCache = new WeakMap<JSONContent, string>();

/** Slide text as HTML. generateHTML only emits nodes/marks from the schema, and escapes text. */
export function textHtml(doc: JSONContent): string {
  let h = htmlCache.get(doc);
  if (h === undefined) {
    try {
      h = generateHTML(doc, EXT);
    } catch {
      h = "";
    }
    htmlCache.set(doc, h);
  }
  return h;
}

/** SVG outline of a preset shape in a w×h box. */
export function shapeSvg(kind: ShapeKind, w: number, h: number, fill: string, stroke: string, sw: number): ReactNode {
  const p = { fill, stroke, strokeWidth: sw, vectorEffect: "non-scaling-stroke" as const, strokeLinejoin: "round" as const };
  const pts = (arr: [number, number][]) => arr.map(([x, y]) => `${x},${y}`).join(" ");
  const i = sw / 2;
  switch (kind) {
    case "rect":
      return <rect x={i} y={i} width={Math.max(0, w - sw)} height={Math.max(0, h - sw)} {...p} />;
    case "roundRect":
      return <rect x={i} y={i} width={Math.max(0, w - sw)} height={Math.max(0, h - sw)} rx={Math.min(w, h) * 0.16} {...p} />;
    case "ellipse":
      return <ellipse cx={w / 2} cy={h / 2} rx={Math.max(0, w / 2 - i)} ry={Math.max(0, h / 2 - i)} {...p} />;
    case "triangle":
      return <polygon points={pts([[w / 2, i], [w - i, h - i], [i, h - i]])} {...p} />;
    case "rtTriangle":
      return <polygon points={pts([[i, i], [w - i, h - i], [i, h - i]])} {...p} />;
    case "diamond":
      return <polygon points={pts([[w / 2, i], [w - i, h / 2], [w / 2, h - i], [i, h / 2]])} {...p} />;
    case "pentagon":
      return <polygon points={pts([[w / 2, i], [w - i, h * 0.38], [w * 0.81, h - i], [w * 0.19, h - i], [i, h * 0.38]])} {...p} />;
    case "hexagon":
      return <polygon points={pts([[w * 0.25, i], [w * 0.75, i], [w - i, h / 2], [w * 0.75, h - i], [w * 0.25, h - i], [i, h / 2]])} {...p} />;
    case "octagon":
      return <polygon points={pts([[w * 0.29, i], [w * 0.71, i], [w - i, h * 0.29], [w - i, h * 0.71], [w * 0.71, h - i], [w * 0.29, h - i], [i, h * 0.71], [i, h * 0.29]])} {...p} />;
    case "star5": {
      const out: [number, number][] = [];
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const r = k % 2 ? 0.2 : 0.5;
        out.push([w / 2 + Math.cos(a) * r * w, h / 2 + Math.sin(a) * r * h * 1.05 + h * 0.03]);
      }
      return <polygon points={pts(out)} {...p} />;
    }
    case "rightArrow":
      return <polygon points={pts([[i, h * 0.25], [w * 0.62, h * 0.25], [w * 0.62, i], [w - i, h / 2], [w * 0.62, h - i], [w * 0.62, h * 0.75], [i, h * 0.75]])} {...p} />;
    case "leftArrow":
      return <polygon points={pts([[w - i, h * 0.25], [w * 0.38, h * 0.25], [w * 0.38, i], [i, h / 2], [w * 0.38, h - i], [w * 0.38, h * 0.75], [w - i, h * 0.75]])} {...p} />;
    case "upArrow":
      return <polygon points={pts([[w * 0.25, h - i], [w * 0.25, h * 0.38], [i, h * 0.38], [w / 2, i], [w - i, h * 0.38], [w * 0.75, h * 0.38], [w * 0.75, h - i]])} {...p} />;
    case "downArrow":
      return <polygon points={pts([[w * 0.25, i], [w * 0.25, h * 0.62], [i, h * 0.62], [w / 2, h - i], [w - i, h * 0.62], [w * 0.75, h * 0.62], [w * 0.75, i]])} {...p} />;
    case "chevron":
      return <polygon points={pts([[i, i], [w * 0.75, i], [w - i, h / 2], [w * 0.75, h - i], [i, h - i], [w * 0.25, h / 2]])} {...p} />;
    case "parallelogram":
      return <polygon points={pts([[w * 0.25, i], [w - i, i], [w * 0.75, h - i], [i, h - i]])} {...p} />;
    case "trapezoid":
      return <polygon points={pts([[w * 0.25, i], [w * 0.75, i], [w - i, h - i], [i, h - i]])} {...p} />;
    case "heart":
      return <path d={`M ${w / 2} ${h * 0.3} C ${w * 0.5} ${h * 0.05}, ${i} ${h * 0.05}, ${i} ${h * 0.35} C ${i} ${h * 0.62}, ${w * 0.3} ${h * 0.78}, ${w / 2} ${h - i} C ${w * 0.7} ${h * 0.78}, ${w - i} ${h * 0.62}, ${w - i} ${h * 0.35} C ${w - i} ${h * 0.05}, ${w * 0.5} ${h * 0.05}, ${w / 2} ${h * 0.3} Z`} {...p} />;
    case "line":
      return <line x1={0} y1={0} x2={w} y2={h} stroke={stroke} strokeWidth={Math.max(1, sw)} strokeLinecap="round" />;
  }
}

export function Box({ el, theme, children, empty }: { el: BoxEl; theme: Deck["theme"]; children?: ReactNode; empty?: boolean }) {
  const flip = el.flipH || el.flipV ? `scale(${el.flipH ? -1 : 1}, ${el.flipV ? -1 : 1})` : undefined;
  const text = children ?? (el.text && !empty ? <div className="fo-slide-text" dangerouslySetInnerHTML={{ __html: textHtml(el.text) }} /> : null);
  return (
    <>
      {el.shape !== "none" && (
        <svg width={Math.max(1, el.w)} height={Math.max(1, el.h)} className="absolute inset-0 overflow-visible" style={{ transform: flip }} aria-hidden="true">
          {shapeSvg(el.shape, Math.max(1, el.w), Math.max(1, el.h), el.fill ?? "none", el.stroke ?? "none", el.stroke ? el.strokeW : 0)}
        </svg>
      )}
      {el.shape !== "line" && (text || el.hint) && (
        <div
          className="absolute inset-0 flex flex-col"
          style={{
            padding: `${el.pad[1]}px ${el.pad[2]}px ${el.pad[3]}px ${el.pad[0]}px`,
            justifyContent: el.valign === "middle" ? "center" : el.valign === "bottom" ? "flex-end" : "flex-start",
            color: el.color ?? theme.text,
            fontSize: `${el.size ?? 18}pt`,
            fontFamily: el.font ?? theme.body,
            opacity: el.fillAlpha !== undefined && !el.fill ? el.fillAlpha : undefined,
          }}
        >
          {text}
        </div>
      )}
    </>
  );
}

function Table({ el }: { el: TableEl }) {
  return (
    <table className="h-full w-full table-fixed border-collapse" style={{ fontSize: `${el.size}pt`, fontFamily: el.font }}>
      <colgroup>
        {el.cols.map((w, i) => (
          <col key={i} style={{ width: w }} />
        ))}
      </colgroup>
      <tbody>
        {el.rows.map((r, ri) => (
          <tr key={ri} style={{ height: r.h }}>
            {r.cells.map((c, ci) =>
              c.merged ? null : (
                <td
                  key={ci}
                  colSpan={c.colspan}
                  rowSpan={c.rowspan}
                  className="whitespace-pre-wrap px-2 py-1 align-middle"
                  style={{ border: `1px solid ${el.border}`, background: c.fill, color: c.color, fontWeight: c.bold ? 700 : undefined, textAlign: c.align }}
                >
                  {c.text}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** One element, positioned and rotated, without editing chrome. */
export function ElementView({ el, theme, textOverride, showHints }: { el: El; theme: Deck["theme"]; textOverride?: ReactNode; showHints?: boolean }) {
  const style: CSSProperties = { left: el.x, top: el.y, width: Math.max(1, el.w), height: Math.max(1, el.h), transform: el.rot ? `rotate(${el.rot}deg)` : undefined };
  if (el.type === "image") {
    const flip = el.flipH || el.flipV ? `scale(${el.flipH ? -1 : 1}, ${el.flipV ? -1 : 1})` : undefined;
    return (
      <div className="absolute" style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={el.src} alt="" draggable={false} className="h-full w-full select-none" style={{ transform: flip }} />
      </div>
    );
  }
  if (el.type === "table")
    return (
      <div className="absolute" style={style}>
        <Table el={el} />
      </div>
    );
  if (el.type === "unsupported")
    return (
      <div className="absolute flex items-center justify-center border border-dashed border-slate-400 bg-slate-100/80 text-center text-[16px] text-slate-500" style={style}>
        {el.label}
      </div>
    );
  const empty = !plainText(el.text).trim();
  return (
    <div className="absolute" style={style}>
      <Box el={el} theme={theme} empty={empty && !textOverride}>
        {textOverride ??
          (empty ? (
            showHints && el.hint ? (
              // The hint sits where typed text would: same alignment as the first paragraph.
              <div className="fo-slide-text opacity-45" style={{ textAlign: (el.text?.content?.[0]?.attrs?.textAlign as CSSProperties["textAlign"]) ?? undefined }}>
                {el.hint}
              </div>
            ) : null
          ) : undefined)}
      </Box>
    </div>
  );
}

/** A whole slide at its real size (1280×720 etc.); scale it with CSS. */
export const SlideView = memo(function SlideView({ slide, deck, showHints = false }: { slide: Slide; deck: Deck; showHints?: boolean }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: deck.width,
        height: deck.height,
        background: slide.background.image ? `center / cover no-repeat url("${slide.background.image}")` : (slide.background.color ?? deck.theme.bg),
      }}
    >
      {slide.elements.map((el) => (
        <ElementView key={el.id} el={el} theme={deck.theme} showHints={showHints} />
      ))}
    </div>
  );
});

/** A slide scaled to `width` pixels. */
export function Thumb({ slide, deck, width }: { slide: Slide; deck: Deck; width: number }) {
  const s = width / deck.width;
  return (
    <div className="relative overflow-hidden" style={{ width, height: deck.height * s }}>
      <div style={{ transform: `scale(${s})`, transformOrigin: "0 0", position: "absolute", left: 0, top: 0 }}>
        <SlideView slide={slide} deck={deck} />
      </div>
    </div>
  );
}
