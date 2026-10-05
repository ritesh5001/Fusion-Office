import type { FileKind } from "@/lib/tools/handoff";
import { cn } from "@/lib/cn";

/** Line-art icon for each kind; switching kinds cross-fades and turns them like a morph. */
export function KindOutline({ kind, active }: { kind: FileKind; active: boolean }) {
  return (
    <svg
      viewBox="0 0 60 68"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("absolute inset-0 h-full w-full transition-[opacity,transform] duration-[250ms] ease-[cubic-bezier(.3,.7,.2,1)]", active ? "rotate-0 scale-100 opacity-100" : "-rotate-6 scale-75 opacity-0")}
      aria-hidden="true"
    >
      {kind === "image" ? (
        <>
          <rect x="4" y="10" width="52" height="46" rx="8" />
          <circle cx="40" cy="25" r="5" />
          <path d="M8 50 22 34l10 11 6-6 14 13" />
        </>
      ) : (
        <>
          <path d="M10 3h26l18 18v38a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V9a6 6 0 0 1 6-6z" />
          <path d="M36 3v12a6 6 0 0 0 6 6h12" />
          {kind === "pdf" ? (
            <text x="27" y="49" textAnchor="middle" stroke="none" fill="currentColor" fontSize="13" fontWeight="800" fontFamily="ui-sans-serif, system-ui, sans-serif">
              PDF
            </text>
          ) : (
            <>
              <path d="M14 32h22M14 40h28M14 48h18" strokeWidth="2.2" />
            </>
          )}
        </>
      )}
    </svg>
  );
}
