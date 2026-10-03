"use client";

import { useEffect, useRef, useState } from "react";
import { FilePlus2, Upload } from "lucide-react";
import { takeFiles } from "@/lib/tools/handoff";
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
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;

  // Files dropped on the homepage and handed to this tool arrive here.
  useEffect(() => {
    const files = takeFiles();
    if (files?.length) onFilesRef.current(multiple ? files : files.slice(0, 1));
  }, [multiple]);

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
        "relative flex rounded-2xl border border-dashed transition-colors",
        compact ? "flex-row items-center justify-between gap-3 px-4 py-3" : "flex-col items-center justify-center px-6 py-14 text-center md:py-20",
        over
          ? "border-accent/70 bg-accent/[0.06]"
          : compact
            ? "border-line-strong bg-surface hover:border-[#3d4453]"
            : "border-line-strong bg-surface bg-[radial-gradient(60%_80%_at_50%_0%,rgb(139_124_246/0.08),transparent)]",
      )}
    >
      {compact ? (
        <>
          <span className="flex min-w-0 items-center gap-2.5 text-[13px] text-fg-muted">
            <FilePlus2 className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
            <span className="truncate">{over ? "Drop to add" : `Drop more ${what} here`}</span>
          </span>
          <button type="button" onClick={pick} className="btn btn-secondary btn-sm shrink-0">
            {label}
          </button>
        </>
      ) : (
        <>
          <span
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl ring-1 transition-colors",
              over ? "bg-accent text-on-accent ring-accent" : "bg-raised text-fg ring-line-strong",
            )}
          >
            <Upload className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="mt-5 font-display text-[19px] font-semibold tracking-[-0.01em] text-fg">{over ? "Release to add" : `Drop your ${what} here`}</p>
          <p className="mt-1.5 text-[13.5px] text-fg-muted">or choose from your device</p>
          <button type="button" onClick={pick} className="btn btn-primary btn-lg mt-6 min-w-[180px]">
            {label}
          </button>
          {list && <p className="mt-5 text-[12px] text-fg-subtle">{list}</p>}
        </>
      )}
    </div>
  );
}
