"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "../ui/primitives";

export function Dropzone({
  accept,
  multiple,
  onFiles,
  label,
  compact,
}: {
  accept: string;
  multiple: boolean;
  onFiles: (files: File[]) => void;
  label: string;
  compact?: boolean;
}) {
  const [over, setOver] = useState(false);
  const pick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.onchange = () => onFiles(Array.from(input.files ?? []));
    input.click();
  };
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
      }}
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white text-center transition-colors",
        compact ? "px-4 py-6" : "px-6 py-16",
        over ? "border-brand-500 bg-brand-50/60" : "border-rule-strong/70",
      )}
    >
      {!compact && (
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <UploadCloud className="h-7 w-7" aria-hidden="true" />
        </span>
      )}
      <button
        type="button"
        onClick={pick}
        className={cn(
          "btn inline-flex items-center gap-2 rounded-full bg-brand-600 font-medium text-white shadow-sm transition-colors hover:bg-brand-700",
          compact ? "h-9 px-4 text-[13px]" : "mt-5 h-12 px-7 text-[15px]",
        )}
      >
        {label}
      </button>
      {!compact && <p className="mt-3 text-[13px] text-ink-soft">or drop {multiple ? "files" : "a file"} here</p>}
    </div>
  );
}
