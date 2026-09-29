"use client";

import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export { cn };

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  shortcut?: string;
  active?: boolean;
  size?: "sm" | "md";
};

/** Square icon button with an accessible label and hover tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, shortcut, active, size = "md", className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md text-slate-600 transition-colors",
        "hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
        "disabled:pointer-events-none disabled:opacity-35",
        size === "md" ? "h-8 w-8" : "h-7 w-7",
        active && "bg-brand-50 text-brand-700 hover:bg-brand-100 hover:text-brand-700",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-50",
        size === "md" ? "h-9 px-3.5 text-sm" : "h-8 px-2.5 text-[13px]",
        variant === "primary" && "bg-brand-600 text-white shadow-sm hover:bg-brand-700",
        variant === "secondary" && "border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50",
        variant === "ghost" && "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        variant === "danger" && "bg-red-600 text-white shadow-sm hover:bg-red-700",
        className,
      )}
      {...rest}
    />
  );
}

export function Divider({ vertical = true }: { vertical?: boolean }) {
  return vertical ? <div className="mx-1 h-5 w-px shrink-0 bg-slate-200" /> : <div className="my-1 h-px bg-slate-200" />;
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[13px] text-slate-800 tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

/**
 * Number input that commits on blur/Enter (not every keystroke), so typing
 * "120" doesn't create three history entries.
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  precision = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  precision?: number;
}) {
  const fmt = (v: number) => (Number.isFinite(v) ? v.toFixed(precision) : "");
  const [draft, setDraft] = useState(fmt(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, precision]);
  const commit = () => {
    let v = Number(draft);
    if (!Number.isFinite(v)) return setDraft(fmt(value));
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    setDraft(fmt(v));
    if (Math.abs(v - value) > 1e-9) onChange(v);
  };
  return (
    <div className="relative">
      <input
        className={cn(inputCls, suffix && "pr-7")}
        inputMode="decimal"
        value={draft}
        step={step}
        onFocus={(e) => {
          focused.current = true;
          e.currentTarget.select();
        }}
        onBlur={() => {
          focused.current = false;
          commit();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            const delta = (e.key === "ArrowUp" ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
            let v = (Number(draft) || 0) + delta;
            if (min !== undefined) v = Math.max(min, v);
            if (max !== undefined) v = Math.min(max, v);
            setDraft(fmt(v));
            onChange(v);
          }
        }}
      />
      {suffix && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">{suffix}</span>}
    </div>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className={cn(inputCls, "cursor-pointer pr-6", className)}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function ColorInput({
  value,
  onChange,
  allowTransparent,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  allowTransparent?: boolean;
  label: string;
}) {
  const transparent = value === "transparent";
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative h-7 w-7">
        <input
          type="color"
          aria-label={label}
          className="h-7 w-7"
          value={transparent ? "#ffffff" : value}
          onChange={(e) => onChange(e.target.value)}
        />
        {transparent && (
          <span className="pointer-events-none absolute inset-0 rounded-md border border-slate-300 bg-[linear-gradient(135deg,transparent_45%,#ef4444_45%,#ef4444_55%,transparent_55%)]" />
        )}
      </div>
      {allowTransparent && (
        <button
          type="button"
          className={cn(
            "h-7 rounded-md border px-1.5 text-[11px]",
            transparent ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500 hover:bg-slate-50",
          )}
          onClick={() => onChange(transparent ? "#ffffff" : "transparent")}
        >
          None
        </button>
      )}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    ref.current?.querySelector<HTMLElement>("[autofocus],input,button")?.focus();
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/5"
        style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        </div>
        <div className="thin-scroll overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** Minimal dropdown menu. */
export function Menu({
  label,
  items,
  align = "left",
}: {
  label: ReactNode;
  items: ({ label: string; onSelect: () => void; shortcut?: string; disabled?: boolean; icon?: ReactNode } | "divider")[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className={cn(
          "h-8 rounded-md px-2.5 text-[13px] text-slate-700 hover:bg-slate-100",
          open && "bg-slate-100 text-slate-900",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-40 mt-1 min-w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, i) =>
            item === "divider" ? (
              <div key={i} className="my-1 h-px bg-slate-100" />
            ) : (
              <button
                key={i}
                role="menuitem"
                type="button"
                disabled={item.disabled}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                <span className="flex w-4 justify-center text-slate-500">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.shortcut && <span className="text-[11px] text-slate-400">{item.shortcut}</span>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
