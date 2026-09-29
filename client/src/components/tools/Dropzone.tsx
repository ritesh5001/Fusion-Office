"use client";

import { useState } from "react";
import { Mascot } from "../mascot/Mascot";
import { cn } from "../ui/primitives";

/** Plain-words name for an accept list ("PDF files", "images"). */
function describe(accept: string, multiple: boolean) {
  if (accept.includes("pdf")) return multiple ? "PDF files" : "PDF file";
  if (accept.includes(".doc")) return multiple ? "Word documents" : "Word document";
  if (accept.includes(".xls")) return multiple ? "spreadsheets" : "spreadsheet";
  if (accept.includes(".ppt")) return multiple ? "presentations" : "presentation";
  if (accept.includes("image")) return multiple ? "images" : "image";
  return multiple ? "files" : "file";
}

/** Formats listed in the hint: extensions from the accept list, e.g. ".xls, .xlsx, .csv". */
function formats(accept: string) {
  const exts = accept
    .split(",")
    .map((a) => a.trim())
    .filter((a) => a.startsWith("."))
    .map((a) => a.slice(1).toUpperCase());
  if (accept.startsWith("image/*")) return "JPG, PNG, WEBP, HEIC and more";
  if (!exts.length && accept.includes("image/")) return "JPG, PNG or WEBP";
  return exts.join(", ");
}

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
  const what = describe(accept, multiple);
  const list = formats(accept);
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
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition-colors",
        compact ? "bg-white px-4 py-6" : "px-6 py-14 md:py-16",
        over ? "border-brand-500 bg-brand-50" : compact ? "border-rule-strong/70" : "border-brand-200 bg-brand-50/40",
      )}
    >
      {!compact && (
        <>
          <Mascot mood={over ? "curious" : "idle"} size={92} follow />
          <p className="mt-4 text-[17px] font-semibold text-ink">{over ? "Ooh, let go to add it!" : `Drop your ${what} here`}</p>
          <p className="mt-1 text-[13px] text-ink-soft">or</p>
        </>
      )}
      <button
        type="button"
        onClick={pick}
        className={cn(
          "btn inline-flex items-center gap-2 rounded-xl bg-brand-600 font-semibold text-white shadow-[0_10px_24px_-10px_rgb(47_84_235/0.8)] transition-colors hover:bg-brand-700",
          compact ? "h-9 px-4 text-[13px]" : "mt-3 h-12 px-8 text-[15px]",
        )}
      >
        {label}
      </button>
      {!compact && list && <p className="mt-4 text-[12px] text-ink-soft">{list}</p>}
    </div>
  );
}
