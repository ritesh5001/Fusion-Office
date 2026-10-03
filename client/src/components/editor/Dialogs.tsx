"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Eraser, Loader2, Trash2, Upload } from "lucide-react";
import { useEditor } from "@/lib/editor/store";
import { downloadDocument, parseRanges, placeImage, splitDocument } from "@/lib/editor/actions";
import { readImageFile, trimCanvas } from "@/lib/editor/images";
import { toast } from "@/lib/editor/events";
import { pickFiles } from "./filePicker";
import { Button, Modal, cn } from "../ui/primitives";
import { MOD } from "./TopBar";

export function Dialogs() {
  const dialog = useEditor((s) => s.dialog);
  const close = () => useEditor.getState().setDialog(null);
  return (
    <>
      <SignatureDialog open={dialog === "signature"} onClose={close} />
      <ExportDialog open={dialog === "export"} onClose={close} />
      <SplitDialog open={dialog === "split"} onClose={close} />
      <ShortcutsDialog open={dialog === "shortcuts"} onClose={close} />
      <ConfirmDeletePages dialog={dialog} onClose={close} />
    </>
  );
}

// ─── Signature ──────────────────────────────────────────────────────

const SIG_KEY = "fusion-office.signatures";
const loadSaved = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SIG_KEY) ?? "[]");
  } catch {
    return [];
  }
};
const persistSaved = (list: string[]) => {
  try {
    localStorage.setItem(SIG_KEY, JSON.stringify(list.slice(0, 6)));
  } catch {
    /* storage full or disabled */
  }
};

type SigTab = "draw" | "type" | "upload";

function SignatureDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<SigTab>("draw");
  const [saved, setSaved] = useState<string[]>([]);
  const [remember, setRemember] = useState(true);
  const [color, setColor] = useState("#0f172a");
  const [typed, setTyped] = useState("");
  const [typedFont, setTypedFont] = useState(0);
  const [upload, setUpload] = useState<string | null>(null);
  const padRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    if (open) setSaved(loadSaved());
  }, [open]);

  const place = (src: string, w: number, h: number) => {
    placeImage(src, w, h, { isSignature: true });
    onClose();
  };

  const placeDataUrl = (src: string) => {
    const img = new Image();
    img.onload = () => place(src, img.naturalWidth / 2, img.naturalHeight / 2);
    img.src = src;
  };

  const create = async () => {
    let canvas: HTMLCanvasElement | null = null;
    if (tab === "draw") canvas = padRef.current?.export() ?? null;
    if (tab === "type" && typed.trim()) canvas = await renderTyped(typed.trim(), SIG_FONTS[typedFont].css(), color);
    if (tab === "upload" && upload) return placeDataUrl(upload);
    if (!canvas) return toast(tab === "draw" ? "Draw your signature first" : "Type your name first", "error");
    const src = canvas.toDataURL("image/png");
    if (remember) persistSaved([src, ...loadSaved().filter((s) => s !== src)]);
    place(src, canvas.width / 2, canvas.height / 2);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add signature"
      width={560}
      footer={
        <>
          <label className="mr-auto flex items-center gap-2 text-[12px] text-fg-muted">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-brand-500" />
            Remember on this device
          </label>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={create}>
            Place signature
          </Button>
        </>
      }
    >
      {saved.length > 0 && (
        <div className="mb-4">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Saved</div>
          <div className="flex flex-wrap gap-2">
            {saved.map((src) => (
              <div key={src} className="group relative">
                <button
                  type="button"
                  onClick={() => placeDataUrl(src)}
                  className="flex h-14 w-32 items-center justify-center paper rounded-lg border border-line p-1.5 hover:border-brand-500"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="Saved signature" className="max-h-full max-w-full object-contain" />
                </button>
                <button
                  type="button"
                  aria-label="Remove saved signature"
                  onClick={() => {
                    const next = saved.filter((s) => s !== src);
                    persistSaved(next);
                    setSaved(next);
                  }}
                  className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-sunken text-fg-muted shadow ring-1 ring-line-strong hover:text-red-300 group-hover:flex"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3 flex gap-1 rounded-lg bg-sunken p-0.5 ring-1 ring-line">
        {(["draw", "type", "upload"] as SigTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn("flex-1 rounded-md py-1.5 text-[13px] capitalize", tab === t ? "bg-raised font-medium text-fg shadow-sm ring-1 ring-line-strong" : "text-fg-muted hover:text-fg")}
          >
            {t}
          </button>
        ))}
      </div>

      {tab !== "upload" && (
        <div className="mb-2 flex items-center gap-2">
          {["#0f172a", "#1d4ed8", "#b91c1c"].map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Ink ${c}`}
              onClick={() => setColor(c)}
              className={cn("h-5 w-5 rounded-full ring-offset-1 ring-offset-overlay", color === c ? "ring-2 ring-brand-500" : "ring-1 ring-white/15")}
              style={{ background: c }}
            />
          ))}
        </div>
      )}

      {tab === "draw" && <SignaturePad ref={padRef} color={color} />}

      {tab === "type" && (
        <div className="space-y-2">
          <input
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type your name"
            className="h-10 w-full rounded-md border border-line-strong px-3 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 bg-sunken text-fg"
          />
          <div className="grid grid-cols-2 gap-2">
            {SIG_FONTS.map((f, i) => (
              <button
                key={f.name}
                type="button"
                onClick={() => setTypedFont(i)}
                className={cn("paper h-20 truncate rounded-lg border px-3 text-3xl", typedFont === i ? "border-brand-500 ring-2 ring-brand-500/40" : "border-line hover:border-line-strong")}
                style={{ fontFamily: f.css(), color }}
              >
                {typed || "Your Name"}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "upload" && (
        <UploadSignature value={upload} onChange={setUpload} />
      )}
    </Modal>
  );
}

const SIG_FONTS = [
  {
    name: "Script",
    css: () => (typeof window === "undefined" ? "cursive" : getComputedStyle(document.documentElement).getPropertyValue("--font-signature-face").trim() || "cursive"),
  },
  { name: "Brush", css: () => '"Brush Script MT", "Segoe Script", "Snell Roundhand", cursive' },
];

async function renderTyped(text: string, family: string, color: string) {
  const size = 96;
  const font = `600 ${size}px ${family}`;
  try {
    await document.fonts.load(font, text);
  } catch {
    /* fall back to whatever is available */
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  canvas.width = Math.ceil(ctx.measureText(text).width + size);
  canvas.height = Math.ceil(size * 1.8);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, size / 2, canvas.height / 2);
  return trimCanvas(canvas, 10);
}

interface SignaturePadHandle {
  export: () => HTMLCanvasElement | null;
}


const SignaturePad = forwardRef<SignaturePadHandle, { color: string }>(function SignaturePad({ color }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [empty, setEmpty] = useState(true);
  const last = useRef<{ x: number; y: number } | null>(null);
  const mid = useRef<{ x: number; y: number } | null>(null);
  const ratio = 2;

  useImperativeHandle(ref, () => ({
    export: () => (empty || !canvasRef.current ? null : trimCanvas(canvasRef.current, 12)),
  }));

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) * ratio, y: (e.clientY - r.top) * ratio };
  };

  const clear = () => {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
  };

  return (
    <div>
      <div className="paper relative rounded-lg border border-dashed border-line-strong">
        <canvas
          ref={canvasRef}
          width={512 * ratio}
          height={180 * ratio}
          className="block h-[180px] w-full cursor-crosshair touch-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            last.current = pos(e);
            mid.current = last.current;
          }}
          onPointerMove={(e) => {
            if (!last.current) return;
            const p = pos(e);
            const ctx = canvasRef.current!.getContext("2d")!;
            const m = { x: (last.current.x + p.x) / 2, y: (last.current.y + p.y) / 2 };
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.6 * ratio * (e.pressure && e.pointerType === "pen" ? 0.5 + e.pressure : 1);
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(mid.current!.x, mid.current!.y);
            ctx.quadraticCurveTo(last.current.x, last.current.y, m.x, m.y);
            ctx.stroke();
            last.current = p;
            mid.current = m;
            if (empty) setEmpty(false);
          }}
          onPointerUp={() => {
            last.current = null;
          }}
        />
        {empty && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-[#8a93a3]">Draw your signature here</div>}
        <div className="pointer-events-none absolute bottom-10 left-8 right-8 border-b border-[#d0d5dd]" />
      </div>
      <div className="mt-2 flex justify-end">
        <Button size="sm" variant="ghost" onClick={clear} disabled={empty}>
          <Eraser className="h-3.5 w-3.5" /> Clear
        </Button>
      </div>
    </div>
  );
});

function UploadSignature({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [removeBg, setRemoveBg] = useState(true);
  const [raw, setRaw] = useState<string | null>(null);

  useEffect(() => {
    if (!raw) return;
    let alive = true;
    (async () => {
      const img = new Image();
      img.src = raw;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      if (removeBg) {
        // Make near-white pixels transparent so scanned signatures sit on the page cleanly.
        const data = ctx.getImageData(0, 0, c.width, c.height);
        const d = data.data;
        for (let i = 0; i < d.length; i += 4) {
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (lum > 215) d[i + 3] = 0;
          else if (lum > 170) d[i + 3] = Math.round(d[i + 3] * ((215 - lum) / 45));
        }
        ctx.putImageData(data, 0, 0);
      }
      if (alive) onChange(trimCanvas(c, 6).toDataURL("image/png"));
    })();
    return () => {
      alive = false;
    };
  }, [raw, removeBg, onChange]);

  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          const [f] = await pickFiles("image/png,image/jpeg,image/webp");
          if (!f) return;
          try {
            setRaw((await readImageFile(f)).src);
          } catch (e) {
            toast((e as Error).message, "error");
          }
        }}
        className="flex h-[180px] w-full items-center justify-center rounded-lg border border-dashed border-line-strong bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px] hover:border-brand-500"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Uploaded signature" className="max-h-[160px] max-w-[90%] object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-[13px] text-[#5b6170]">
            <Upload className="h-5 w-5" /> Choose a signature image
          </span>
        )}
      </button>
      <label className="mt-2 flex items-center gap-2 text-[12px] text-fg-muted">
        <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} className="accent-brand-500" />
        Remove white background
      </label>
    </div>
  );
}

// ─── Export ─────────────────────────────────────────────────────────

function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [flatten, setFlatten] = useState(false);
  const [comments, setComments] = useState(true);
  const [busy, setBusy] = useState(false);
  const hasRedactions = useEditor((s) => s.doc?.pages.some((p) => p.objects.some((o) => o.type === "redact")) ?? false);

  const go = async () => {
    setBusy(true);
    try {
      await downloadDocument({ flatten, includeComments: comments });
      toast("PDF exported", "success");
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export PDF"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={go} disabled={busy}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Download PDF
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Option
          checked={flatten}
          onChange={setFlatten}
          title="Flatten"
          text="Merge form fields and comments into the page so they can't be edited. Good for final copies."
        />
        <Option checked={comments} onChange={setComments} title="Include comments" text="Keep sticky notes. They open in Acrobat, Preview, Chrome and other readers." />
        {hasRedactions && (
          <p className="rounded-md bg-amber-500/10 px-3 py-2 text-[12px] leading-relaxed text-amber-200">
            Pages with redactions are rasterized on export so the redacted content is permanently removed. Their text won&apos;t be selectable afterwards.
          </p>
        )}
      </div>
    </Modal>
  );
}

function Option({ checked, onChange, title, text }: { checked: boolean; onChange: (v: boolean) => void; title: string; text: string }) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-lg border border-line p-3 hover:bg-raised">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 accent-brand-500" />
      <span>
        <span className="block text-[13px] font-medium text-fg">{title}</span>
        <span className="block text-[12px] leading-relaxed text-fg-muted">{text}</span>
      </span>
    </label>
  );
}

// ─── Split ──────────────────────────────────────────────────────────

function SplitDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pageCount = useEditor((s) => s.doc?.pages.length ?? 0);
  const [mode, setMode] = useState<"every" | "ranges">("every");
  const [every, setEvery] = useState(1);
  const [ranges, setRanges] = useState("");
  const [busy, setBusy] = useState(false);

  let groups: number[][] = [];
  let error = "";
  try {
    if (mode === "every") {
      const n = Math.max(1, Math.floor(every) || 1);
      for (let i = 0; i < pageCount; i += n) groups.push(Array.from({ length: Math.min(n, pageCount - i) }, (_, k) => i + k));
    } else if (ranges.trim()) {
      groups = parseRanges(ranges, pageCount);
    }
  } catch (e) {
    error = (e as Error).message;
  }

  const go = async () => {
    setBusy(true);
    try {
      await splitDocument(groups);
      toast(`Created ${groups.length} file${groups.length === 1 ? "" : "s"}`, "success");
      onClose();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Split document"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={go} disabled={busy || !!error || groups.length === 0}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Split into {groups.length || "…"} file{groups.length === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-[13px]">
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === "every"} onChange={() => setMode("every")} className="accent-brand-500" />
          Every
          <input
            type="number"
            min={1}
            max={pageCount}
            value={every}
            onChange={(e) => setEvery(Number(e.target.value))}
            onFocus={() => setMode("every")}
            className="h-8 w-16 rounded-md border border-line-strong px-2 tabular-nums outline-none focus:border-brand-500 bg-sunken text-fg"
          />
          page(s)
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === "ranges"} onChange={() => setMode("ranges")} className="accent-brand-500" />
          Custom ranges
        </label>
        <input
          value={ranges}
          onChange={(e) => setRanges(e.target.value)}
          onFocus={() => setMode("ranges")}
          placeholder={`e.g. 1-3, 4-${Math.max(4, pageCount)}`}
          className="h-9 w-full rounded-md border border-line-strong px-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 bg-sunken text-fg"
        />
        {error && <p className="text-[12px] text-red-300">{error}</p>}
        <p className="text-[12px] text-fg-muted">Each part downloads as a separate PDF with your edits applied. Your browser may ask to allow multiple downloads.</p>
      </div>
    </Modal>
  );
}

// ─── Shortcuts ──────────────────────────────────────────────────────

function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const rows: [string, string][] = [
    [`${MOD}Z`, "Undo"],
    [`${MOD}⇧Z / ${MOD}Y`, "Redo"],
    [`${MOD}S`, "Download PDF"],
    [`${MOD}P`, "Print"],
    [`${MOD}F`, "Find"],
    [`${MOD}C / X / V`, "Copy / cut / paste"],
    [`${MOD}D`, "Duplicate"],
    [`${MOD}A`, "Select all on page"],
    ["Delete", "Delete selection"],
    ["Arrows", "Nudge 1pt (Shift: 10pt)"],
    ["Esc", "Deselect / back to Select"],
    [`${MOD}+ / ${MOD}− / ${MOD}0`, "Zoom in / out / 100%"],
    ["V G T I S", "Select · Edit text · Add text · Image · Signature"],
    ["R O L A", "Rectangle · Ellipse · Line · Arrow"],
    ["P M E", "Pen · Marker · Eraser"],
    ["H U K C", "Highlight · Underline · Strike · Comment"],
    ["X W", "Redact · Whiteout"],
  ];
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" footer={<Button onClick={onClose}>Close</Button>}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt>
              <kbd className="rounded border border-line bg-sunken px-1.5 py-0.5 font-sans text-[12px] text-fg">{k}</kbd>
            </dt>
            <dd className="text-fg-muted">{v}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}

// ─── Confirm delete pages ───────────────────────────────────────────

function ConfirmDeletePages({ dialog, onClose }: { dialog: ReturnType<typeof useEditor.getState>["dialog"]; onClose: () => void }) {
  const ids = dialog && typeof dialog === "object" && dialog.type === "confirm-delete-pages" ? dialog.ids : null;
  const n = ids?.length ?? 0;
  return (
    <Modal
      open={!!ids}
      onClose={onClose}
      title={n > 1 ? `Delete ${n} pages?` : "Delete page?"}
      width={400}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            autoFocus
            onClick={() => {
              if (ids) useEditor.getState().deletePages(ids);
              onClose();
            }}
          >
            Delete
          </Button>
        </>
      }
    >
      <p className="text-[13px] text-fg-muted">You can undo this with {MOD}Z.</p>
    </Modal>
  );
}
