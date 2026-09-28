"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { editorEvents } from "@/lib/editor/events";

interface Toast {
  id: number;
  message: string;
  kind: "info" | "error" | "success";
}

let seq = 0;

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(
    () =>
      editorEvents.on("toast", ({ message, kind = "info" }) => {
        const id = ++seq;
        setToasts((t) => [...t.slice(-3), { id, message, kind }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 6000 : 3200);
      }),
    [],
  );
  return (
    <div className="pointer-events-none fixed bottom-12 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className="animate-toast flex max-w-md items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-[13px] text-white shadow-lg"
        >
          {t.kind === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          ) : t.kind === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <Info className="h-4 w-4 shrink-0 text-slate-400" />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}
