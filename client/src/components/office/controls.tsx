"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../ui/primitives";

/** Compact toolbar button with tooltip and pressed state. */
export function TB({ label, shortcut, active, disabled, onClick, children, className }: { label: string; shortcut?: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      disabled={disabled}
      // Keep the editor's selection while clicking toolbar buttons.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1 rounded-md px-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-35",
        active && "bg-brand-50 text-brand-700 hover:bg-brand-100",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Sep() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-slate-200" aria-hidden="true" />;
}

/** Native select styled for the toolbar. */
export function TSelect<T extends string>({ label, value, options, onChange, width = 120 }: { label: string; value: T; options: { value: T; label: string; style?: React.CSSProperties }[]; onChange: (v: T) => void; width?: number }) {
  return (
    <select
      aria-label={label}
      title={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="h-8 shrink-0 cursor-pointer rounded-md border border-transparent bg-transparent px-1.5 text-[13px] text-slate-700 outline-none hover:border-slate-200 focus:border-brand-500"
      style={{ width }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={o.style}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

const PALETTE = [
  "#000000", "#434343", "#666666", "#999999", "#cccccc", "#ffffff",
  "#c00000", "#e03131", "#f08c00", "#fcc419", "#2f9e44", "#12b886",
  "#1971c2", "#2f54eb", "#6741d9", "#c2255c", "#7c4a1e", "#0b7285",
  "#ffe3e3", "#fff3bf", "#d3f9d8", "#d0ebff", "#e5dbff", "#f1f3f5",
];

/** Colour button with a swatch palette, a custom picker and an optional reset. */
export function ColorPick({ label, icon, value, onChange, resetLabel }: { label: string; icon: ReactNode; value: string | null; onChange: (c: string | null) => void; resetLabel?: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 items-center gap-0.5 rounded-md px-1.5 text-slate-600 hover:bg-slate-100"
      >
        <span className="flex flex-col items-center">
          {icon}
          <span className="-mt-0.5 h-1 w-4 rounded-sm ring-1 ring-black/10" style={{ background: value ?? "transparent" }} />
        </span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[196px] rounded-lg border border-slate-200 bg-white p-2 shadow-lg" onMouseDown={(e) => e.preventDefault()}>
          {resetLabel && (
            <button type="button" onClick={() => (onChange(null), setOpen(false))} className="mb-1.5 w-full rounded-md px-2 py-1 text-left text-[12px] text-slate-600 hover:bg-slate-50">
              {resetLabel}
            </button>
          )}
          <div className="grid grid-cols-6 gap-1">
            {PALETTE.map((c) => (
              <button key={c} type="button" aria-label={c} onClick={() => (onChange(c), setOpen(false))} className={cn("h-6 w-6 rounded ring-1 ring-black/10 hover:scale-110", value?.toLowerCase() === c && "ring-2 ring-brand-600")} style={{ background: c }} />
            ))}
          </div>
          <label className="mt-2 flex cursor-pointer items-center justify-between rounded-md px-1 py-1 text-[12px] text-slate-600 hover:bg-slate-50">
            Custom colour…
            <input type="color" value={value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="h-6 w-8" />
          </label>
        </div>
      )}
    </div>
  );
}
