"use client";

import { useEffect, useRef, useState } from "react";
import { FilePlus2, ShieldCheck } from "lucide-react";
import { takeFiles } from "@/lib/tools/handoff";
import { cn } from "../ui/primitives";
import { pickerAccept } from "@/lib/tools/pickerAccept";
import { KindOutline } from "./KindOutline";

/** Plain-words name for an accept list ("PDF files", "images"). */
function describe(accept: string, multiple: boolean) {
  if (accept.includes("pdf")) return multiple ? "PDF files" : "PDF file";
  if (accept.includes(".doc")) return multiple ? "Word documents" : "Word document";
  if (accept.includes(".xls")) return multiple ? "spreadsheets" : "spreadsheet";
  if (accept.includes(".ppt")) return multiple ? "presentations" : "presentation";
  if (accept.includes("image")) return multiple ? "images" : "image";
  return multiple ? "files" : "file";
}

/** Which outline icon fits the accepted files. */
const kindFor = (accept: string) => (accept.includes("pdf") ? "pdf" : accept.includes("image") && !accept.includes(".doc") ? "image" : "document");

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
  const [hot, setHot] = useState(false);
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
    input.accept = pickerAccept(accept);
    input.multiple = multiple;
    input.onchange = () => onFiles(Array.from(input.files ?? []));
    input.click();
  };
  const what = describe(accept, multiple);
  const list = formats(accept);
  const drag = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length) onFiles(multiple ? files : files.slice(0, 1));
    },
  };

  if (compact)
    return (
      <div
        {...drag}
        className={cn(
          "relative flex flex-row items-center justify-between gap-3 rounded-2xl border border-dashed px-4 py-3 transition-colors",
          over ? "border-accent/70 bg-accent/[0.06]" : "border-line-strong bg-surface hover:border-[#3d4453]",
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5 text-[13px] text-fg-muted">
          <FilePlus2 className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
          <span className="truncate">{over ? "Drop to add" : `Drop more ${what} here`}</span>
        </span>
        <button type="button" onClick={pick} className="btn btn-secondary btn-sm shrink-0">
          {label}
        </button>
      </div>
    );

  // Full size: the homepage's neon card, so every tool starts the same way.
  const kind = kindFor(accept);
  const title = over ? "Release to add privately" : hot ? "Choose a file to begin" : `Drop your ${what} here`;
  return (
    <div {...drag} onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)} className="relative mx-auto w-full max-w-[640px] py-3">
      <div aria-hidden="true" className={cn("pointer-events-none absolute -inset-1 rounded-[44px] bg-[linear-gradient(100deg,#8b7cf6,#a99cff_45%,#cdf564)] blur-3xl transition-opacity duration-[250ms]", over ? "opacity-90" : hot ? "opacity-75" : "opacity-55")} />
      <div className="relative rounded-[30px] bg-[linear-gradient(100deg,#9d91fb,#cfc8ff_48%,#cdf564)] p-[3px] shadow-[-10px_0_30px_rgb(139_124_246/0.6),10px_0_30px_rgb(205_245_100/0.45),0_0_60px_rgb(139_124_246/0.25)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[30px]">
          <div className="fo-sweep absolute left-1/2 top-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 bg-[conic-gradient(from_0deg,transparent_0_68%,rgb(255_255_255/0.95)_80%,transparent_90%)]" />
        </div>
        <div className="relative rounded-[28px] bg-[#f5f4f0] p-3 text-[#14152b]">
          <div onClick={pick} className={cn("relative flex cursor-pointer flex-col items-center px-5 pb-8 pt-10 text-center sm:pt-12", hot && "is-hot", over && "is-over")}>
            {/* Dashed inner border: marches on hover, faster while dragging. */}
            <svg aria-hidden="true" className="pointer-events-none absolute inset-[1px] h-[calc(100%-2px)] w-[calc(100%-2px)] overflow-visible">
              <rect width="100%" height="100%" rx="20" fill="none" strokeWidth="1.5" strokeDasharray="7 7" className={cn("fo-dash-march transition-[stroke] duration-[250ms]", over ? "stroke-brand-500" : hot ? "stroke-[#9d97c9]" : "stroke-[#c4c2d4]")} />
            </svg>

            <button type="button" onClick={(e) => (e.stopPropagation(), pick())} className="group relative flex flex-col items-center rounded-2xl px-4 py-1" aria-label={label}>
              <span className="fo-float-sm relative block h-[68px] w-[60px]">
                <span className={cn("absolute inset-0 transition-transform duration-[400ms] ease-[cubic-bezier(.34,1.56,.64,1)]", (hot || over) && "scale-[1.08]")}>
                  <KindOutline kind={kind} active />
                  <span className={cn("absolute -bottom-1 -right-2 flex h-6 w-6 items-center justify-center rounded-full text-[17px] font-bold leading-none text-white ring-[2.5px] ring-[#f5f4f0] transition-colors duration-[250ms]", over ? "bg-brand-600" : "bg-[#14152b]")}>
                    +
                  </span>
                </span>
              </span>
              <span key={title} className="fo-fade mt-5 font-display text-[clamp(1.3rem,2.1vw,1.7rem)] font-bold leading-tight tracking-[-0.025em]">
                {title}
              </span>
              <span className="mt-1 text-[14px] text-[#5d5f78]">or click to choose {multiple ? "files" : "a file"}</span>
            </button>

            <button
              type="button"
              onClick={(e) => (e.stopPropagation(), pick())}
              className="fo-press relative mt-6 inline-flex h-12 items-center rounded-full bg-[#151738] px-7 text-[15px] font-semibold text-white shadow-[0_10px_24px_-12px_rgb(21_23_56/0.8)] transition-shadow hover:shadow-[0_12px_28px_-10px_rgb(92_77_204/0.7)]"
            >
              {label}
            </button>

            <p className="relative mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12.5px] text-[#5d5f78]">
              {list && <span className="font-medium text-[#2b2d48]">{list}</span>}
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[#3f7d12]" aria-hidden="true" /> Stays private
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
