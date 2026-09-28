"use client";

import type { ReactNode } from "react";
import { cn } from "../ui/primitives";
import type { Position } from "@/lib/tools/processors/stamp";

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="block">
      <span className="text-[13px] font-medium text-ink">{children}</span>
      {hint && <span className="mt-0.5 block text-[12px] leading-snug text-ink-soft">{hint}</span>}
    </span>
  );
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium text-ink">{label}</legend>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 3)}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-lg px-2.5 py-2 text-left text-[13px] ring-1 transition-colors",
              value === o.value ? "bg-brand-50 font-medium text-brand-700 ring-brand-500" : "bg-white text-ink ring-rule hover:ring-rule-strong",
            )}
          >
            {o.label}
            {o.hint && <span className="mt-0.5 block text-[11px] font-normal leading-snug text-ink-soft">{o.hint}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
      <Label hint={hint}>{label}</Label>
    </label>
  );
}

export function TextInput({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <Label hint={hint}>{label}</Label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg bg-white px-3 text-[14px] ring-1 ring-rule outline-none focus:ring-2 focus:ring-brand-500"
      />
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-10 w-full rounded-lg bg-white px-3 pr-10 text-[14px] tabular-nums ring-1 ring-rule outline-none focus:ring-2 focus:ring-brand-500"
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-ink-soft">{suffix}</span>}
      </div>
    </label>
  );
}

export function Slider({ label, value, onChange, min, max, step = 1, format }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; format?: (v: number) => string }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between text-[13px] font-medium">
        {label}
        <span className="font-normal tabular-nums text-ink-soft">{format ? format(value) : value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-brand-600" />
    </label>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <Label>{label}</Label>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded" aria-label={label} />
    </label>
  );
}

/** "all" or a page range string. */
export function PagesField({ value, onChange, label = "Pages" }: { value: string; onChange: (v: string) => void; label?: string }) {
  return <TextInput label={label} hint='"all", or ranges like 1-3, 5' value={value} onChange={onChange} placeholder="all" />;
}

const GRID: Position[] = ["top-left", "top-center", "top-right", "middle-left", "center", "middle-right", "bottom-left", "bottom-center", "bottom-right"];

export function PositionPicker({ value, onChange, label = "Position" }: { value: Position; onChange: (v: Position) => void; label?: string }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] font-medium">{label}</legend>
      <div className="grid w-[132px] grid-cols-3 gap-1.5 rounded-lg bg-paper-deep p-1.5">
        {GRID.map((p) => (
          <button
            key={p}
            type="button"
            aria-label={p.replace("-", " ")}
            aria-pressed={value === p}
            onClick={() => onChange(p)}
            className={cn("h-8 rounded-md transition-colors", value === p ? "bg-brand-600" : "bg-white hover:bg-brand-50")}
          />
        ))}
      </div>
    </fieldset>
  );
}
