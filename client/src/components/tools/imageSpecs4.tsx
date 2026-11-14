"use client";

/** Image tools of the fourth wave: image to text (OCR), watermark, collage, batch rename and a QR code maker. */
import { formatBytes, stem, type ToolFile } from "@/lib/tools/files";
import { FORMAT_INFO, outputName, type Format } from "@/lib/image/encode";
import type { LoadedFile, ToolSpec } from "./ToolRunner";
import { ColorField, NumberField, PositionPicker, Segmented, Select, Slider, TextArea, TextInput, Toggle } from "./controls";
import { FORMAT_OPTIONS, eachImage } from "./imageSpecs";
import { OCR_LANGUAGES } from "@/lib/tools/ocrLanguages";
import type { Position } from "@/lib/tools/processors/stamp";
import { qrPayload, type QrFields } from "@/lib/tools/qr";

const canvasLib = () => import("@/lib/image/canvas");
const Note = ({ children }: { children: React.ReactNode }) => <p className="text-[12px] leading-relaxed text-fg-muted">{children}</p>;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ─── Image → text ───────────────────────────────────────────────────

const imageToText: ToolSpec<{ language: string }> = {
  action: "Extract text",
  defaults: { language: "eng" },
  Options: ({ options: o, set }) => (
    <>
      <Segmented label="Language of the text" value={o.language} onChange={(language) => set({ language })} options={OCR_LANGUAGES} />
      <Note>Reads the text in photos, screenshots and scans so you can copy and edit it. Recognised on your device; the first run downloads the engine (15–20 MB).</Note>
    </>
  ),
  run: async (files, o, progress) => {
    const { decodeImage, render, EMPTY_EDIT } = await canvasLib();
    const canvases: HTMLCanvasElement[] = [];
    for (const f of files) {
      const img = await decodeImage(f);
      try {
        // OCR reads best around 2000–3000 px on the long side.
        canvases.push(render(img, EMPTY_EDIT, { maxSide: 3200 }));
      } finally {
        img.close();
      }
    }
    const { imagesToText } = await import("@/lib/tools/processors/ocr");
    const results = await imagesToText(canvases, o.language, (m, f) => progress(m, f));
    const text = results.map((r, i) => (files.length > 1 ? `--- ${files[i].name} ---\n${r.text}` : r.text)).join("\n\n");
    if (!text.trim() || results.every((r) => !r.text.trim())) throw new Error("No text was found. Try a sharper photo, or pick the right language.");
    const low = results.filter((r) => r.confidence < 60).length;
    const name = files.length === 1 ? `${stem(files[0].name)}.txt` : "image-text.txt";
    return {
      files: [{ name, bytes: new TextEncoder().encode(text), type: "text/plain" }],
      text: { content: text, filename: name },
      summary: `${plural(text.split(/\s+/).filter(Boolean).length, "word")} found.${low ? ` ${low === files.length ? "The" : `${low} of the`} image${low === 1 ? " was" : "s were"} hard to read, so check the result.` : ""}`,
    };
  },
};

// ─── Watermark images ───────────────────────────────────────────────

type WmOpts = { text: string; logo: boolean; size: number; color: string; opacity: number; rotation: number; position: Position; tile: boolean; format: "keep" | Format };
const watermarkImage: ToolSpec<WmOpts> = {
  action: "Add watermark",
  defaults: { text: "© Your name", logo: false, size: 6, color: "#ffffff", opacity: 55, rotation: -30, position: "bottom-right", tile: false, format: "keep" },
  Options: ({ options: o, set, files }) => (
    <>
      <Toggle label="Use the last image as a logo" hint="Add your logo (a PNG with a transparent background works best) as the last file." checked={o.logo} onChange={(logo) => set({ logo })} />
      {!o.logo && <TextInput label="Watermark text" value={o.text} onChange={(text) => set({ text })} />}
      {!o.logo && <ColorField label="Colour" value={o.color} onChange={(color) => set({ color })} />}
      <Slider label="Size" value={o.size} min={2} max={30} onChange={(size) => set({ size })} format={(v) => `${v}% of the image`} />
      <Slider label="Opacity" value={o.opacity} min={10} max={100} onChange={(opacity) => set({ opacity })} format={(v) => `${v}%`} />
      <Toggle label="Repeat across the image" hint="Harder to crop out." checked={o.tile} onChange={(tile) => set({ tile })} />
      {o.tile ? <Slider label="Angle" value={o.rotation} min={-60} max={60} onChange={(rotation) => set({ rotation })} format={(v) => `${v}°`} /> : <PositionPicker value={o.position} onChange={(position) => set({ position })} />}
      <Segmented label="Save as" value={o.format} onChange={(format) => set({ format })} options={FORMAT_OPTIONS()} />
      {o.logo && files.length < 2 && <Note>Add at least one photo and then your logo.</Note>}
    </>
  ),
  validate: (files, o) => (o.logo ? (files.length < 2 ? "Add your photos, then the logo as the last file." : null) : o.text.trim() ? null : "Type the watermark text."),
  run: async (files, o, progress) => {
    const { decodeImage, render, exportCanvas, formatFor, EMPTY_EDIT } = { ...(await canvasLib()), formatFor: (await import("@/lib/image/encode")).formatFor };
    const photos = o.logo ? files.slice(0, -1) : files;
    let logo: HTMLCanvasElement | null = null;
    if (o.logo) {
      const img = await decodeImage(files[files.length - 1]);
      logo = render(img, EMPTY_EDIT, { maxSide: 2000 });
      img.close();
    }
    return eachImage(photos, progress, async (img, f) => {
      const canvas = render(img, EMPTY_EDIT);
      const c = canvas.getContext("2d")!;
      const W = canvas.width;
      const H = canvas.height;
      c.globalAlpha = o.opacity / 100;
      let unit = Math.max(W, H) * (o.size / 100);
      let w: number;
      let h: number;
      const draw = (cx: number, cy: number, angle: number) => {
        c.save();
        c.translate(cx, cy);
        c.rotate((angle * Math.PI) / 180);
        if (logo) c.drawImage(logo, -w / 2, -h / 2, w, h);
        else {
          c.fillStyle = o.color;
          c.strokeStyle = o.color.toLowerCase() === "#ffffff" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)";
          c.lineWidth = Math.max(1, unit * 0.04);
          c.strokeText(o.text, -w / 2, h * 0.35);
          c.fillText(o.text, -w / 2, h * 0.35);
        }
        c.restore();
      };
      if (logo) {
        w = unit * 2;
        h = (w * logo.height) / logo.width;
      } else {
        c.font = `700 ${unit}px system-ui, "Helvetica Neue", Arial, sans-serif`;
        w = c.measureText(o.text).width;
        // Never wider than the photo (a long text at a big size would run off the edge).
        if (!o.tile && w > W * 0.9) {
          unit *= (W * 0.9) / w;
          c.font = `700 ${unit}px system-ui, "Helvetica Neue", Arial, sans-serif`;
          w = c.measureText(o.text).width;
        }
        h = unit;
      }
      if (o.tile) {
        const stepX = w * 1.6 + unit;
        const stepY = h * 3 + unit;
        for (let y = -H; y < H * 2; y += stepY) for (let x = -W; x < W * 2; x += stepX) draw(x + ((y / stepY) % 2) * (stepX / 2), y, o.rotation);
      } else {
        const m = Math.max(W, H) * 0.03;
        const [v, hz] = o.position === "center" ? ["middle", "center"] : o.position.split("-");
        const cx = hz === "left" ? m + w / 2 : hz === "right" ? W - m - w / 2 : W / 2;
        const cy = v === "top" ? m + h / 2 : v === "bottom" ? H - m - h / 2 : H / 2;
        draw(cx, cy, 0);
      }
      c.globalAlpha = 1;
      const format: Format = o.format === "keep" ? formatFor(f.type) : o.format;
      return exportCanvas(canvas, outputName(f.name, format, "watermarked"), { format, quality: 0.92 });
    });
  },
};

// ─── Collage ────────────────────────────────────────────────────────

type CollageOpts = { layout: "auto" | "row" | "column"; canvas: "square" | "portrait" | "landscape" | "a4"; gap: number; radius: number; background: string; format: Format };
const SIZES = { square: [2400, 2400], portrait: [2160, 2700], landscape: [3000, 2000], a4: [2480, 3508] } as const;

/** Rows of cells for `n` pictures: as square a grid as the canvas allows. */
export function collageGrid(n: number, W: number, H: number, layout: CollageOpts["layout"]): number[] {
  if (layout === "row") return [n];
  if (layout === "column") return Array(n).fill(1);
  let best: number[] = [n];
  let score = Infinity;
  for (let rows = 1; rows <= n; rows++) {
    const per = Math.ceil(n / rows);
    const cellRatio = W / per / (H / rows);
    const s = Math.abs(Math.log(cellRatio)) + (per * rows - n) * 0.3;
    if (s < score) {
      score = s;
      best = Array.from({ length: rows }, (_, r) => Math.min(per, n - r * per)).filter((c) => c > 0);
    }
  }
  return best;
}

const collage: ToolSpec<CollageOpts> = {
  action: "Make collage",
  defaults: { layout: "auto", canvas: "square", gap: 2, radius: 0, background: "#ffffff", format: "jpeg" },
  minFiles: 2,
  reorderable: true,
  Options: ({ options: o, set, files }) => (
    <>
      <Segmented label="Shape" value={o.canvas} onChange={(canvas) => set({ canvas })} options={[{ value: "square", label: "Square" }, { value: "portrait", label: "Portrait 4:5" }, { value: "landscape", label: "Landscape 3:2" }, { value: "a4", label: "A4 print" }]} />
      <Segmented label="Arrange" value={o.layout} onChange={(layout) => set({ layout })} options={[{ value: "auto", label: "Grid" }, { value: "row", label: "Side by side" }, { value: "column", label: "Stacked" }]} />
      <Slider label="Gap" value={o.gap} min={0} max={8} onChange={(gap) => set({ gap })} format={(v) => (v ? `${v}%` : "None")} />
      <Slider label="Rounded corners" value={o.radius} min={0} max={10} onChange={(radius) => set({ radius })} format={(v) => (v ? `${v}%` : "Square")} />
      <ColorField label="Background" value={o.background} onChange={(background) => set({ background })} />
      <Segmented label="Save as" value={o.format} onChange={(format) => set({ format })} options={[{ value: "jpeg", label: "JPG" }, { value: "png", label: "PNG" }]} />
      <Note>{files.length} photo{files.length === 1 ? "" : "s"}, in the order shown. Each photo is cropped to fill its cell.</Note>
    </>
  ),
  validate: (files) => (files.length > 30 ? "Use at most 30 photos." : null),
  run: async (files, o, progress) => {
    const { decodeImage, newCanvas, resize, render, exportCanvas, EMPTY_EDIT } = await canvasLib();
    const [W, H] = SIZES[o.canvas];
    const out = newCanvas(W, H);
    const c = out.getContext("2d")!;
    c.fillStyle = o.background;
    c.fillRect(0, 0, W, H);
    const rows = collageGrid(files.length, W, H, o.layout);
    const gap = (Math.min(W, H) * o.gap) / 100;
    const rowH = (H - gap * (rows.length + 1)) / rows.length;
    let k = 0;
    for (const [r, count] of rows.entries()) {
      const cellW = (W - gap * (count + 1)) / count;
      for (let i = 0; i < count; i++, k++) {
        progress(`Placing photo ${k + 1} of ${files.length}…`, k / files.length);
        const img = await decodeImage(files[k]);
        try {
          const cell = resize(render(img, EMPTY_EDIT, { maxSide: Math.max(cellW, rowH) * 1.5 }), { width: Math.round(cellW), height: Math.round(rowH) }, "fill");
          const x = gap + i * (cellW + gap);
          const y = gap + r * (rowH + gap);
          c.save();
          c.beginPath();
          c.roundRect(x, y, cellW, rowH, (Math.min(cellW, rowH) * o.radius) / 100);
          c.clip();
          c.drawImage(cell, x, y, cellW, rowH);
          c.restore();
        } finally {
          img.close();
        }
      }
    }
    const file = await exportCanvas(out, `collage.${FORMAT_INFO[o.format].ext}`, { format: o.format, quality: 0.9, background: o.background, dpi: o.canvas === "a4" ? 300 : null });
    return { files: [file], summary: `${files.length} photos · ${W} × ${H} px · ${formatBytes(file.bytes.length)}.` };
  },
};

// ─── Batch rename ───────────────────────────────────────────────────

type RenameOpts = { pattern: string; start: number; digits: number; find: string; replace: string; caseMode: "keep" | "lower" | "upper" | "title"; spaces: "keep" | "dash" | "underscore" };

/** New names for a list of files. Tokens: {name} {n} {date} {ext}. Duplicates get (2), (3)… */
export function renameAll(names: string[], o: RenameOpts, today = new Date()): string[] {
  const date = today.toISOString().slice(0, 10);
  const used = new Set<string>();
  return names.map((full, i) => {
    const dot = full.lastIndexOf(".");
    const base = dot > 0 ? full.slice(0, dot) : full;
    const ext = dot > 0 ? full.slice(dot + 1) : "";
    let name = (o.pattern.trim() || "{name}").replaceAll("{name}", base).replaceAll("{n}", String(o.start + i).padStart(Math.max(1, o.digits), "0")).replaceAll("{date}", date).replaceAll("{ext}", ext);
    if (o.find) name = name.split(o.find).join(o.replace);
    if (o.caseMode === "lower") name = name.toLowerCase();
    else if (o.caseMode === "upper") name = name.toUpperCase();
    else if (o.caseMode === "title") name = name.toLowerCase().replace(/(^|[\s_-])(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase());
    if (o.spaces === "dash") name = name.replace(/\s+/g, "-");
    else if (o.spaces === "underscore") name = name.replace(/\s+/g, "_");
    name = name.replace(/[\\/:*?"<>|]+/g, "-").trim() || `file-${i + 1}`;
    let finalName = ext ? `${name}.${ext}` : name;
    for (let k = 2; used.has(finalName.toLowerCase()); k++) finalName = ext ? `${name} (${k}).${ext}` : `${name} (${k})`;
    used.add(finalName.toLowerCase());
    return finalName;
  });
}

const batchRename: ToolSpec<RenameOpts> = {
  action: "Rename files",
  defaults: { pattern: "{name}", start: 1, digits: 2, find: "", replace: "", caseMode: "keep", spaces: "keep" },
  reorderable: true,
  Options: ({ options: o, set, files }) => {
    const preview = renameAll(files.slice(0, 4).map((f) => f.name), o);
    return (
      <>
        <TextInput label="New name" hint="{name} original name · {n} number · {date} today · {ext} extension" value={o.pattern} onChange={(pattern) => set({ pattern })} placeholder="Trip {n}" />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Start at" value={o.start} min={0} onChange={(start) => set({ start })} />
          <NumberField label="Digits" value={o.digits} min={1} max={6} onChange={(digits) => set({ digits })} />
          <TextInput label="Find" value={o.find} onChange={(find) => set({ find })} />
          <TextInput label="Replace with" value={o.replace} onChange={(replace) => set({ replace })} />
        </div>
        <Select label="Letters" value={o.caseMode} onChange={(caseMode) => set({ caseMode })} options={[{ value: "keep", label: "Keep as they are" }, { value: "lower", label: "lowercase" }, { value: "upper", label: "UPPERCASE" }, { value: "title", label: "Title Case" }]} />
        <Select label="Spaces" value={o.spaces} onChange={(spaces) => set({ spaces })} options={[{ value: "keep", label: "Keep" }, { value: "dash", label: "Replace with -" }, { value: "underscore", label: "Replace with _" }]} />
        {preview.length > 0 && (
          <ul className="space-y-1 rounded-lg bg-sunken px-3 py-2 font-mono text-[12px]">
            {preview.map((n, i) => (
              <li key={i} className="truncate">
                <span className="text-fg-subtle">{files[i].name}</span> → <span className="text-fg">{n}</span>
              </li>
            ))}
            {files.length > 4 && <li className="text-fg-subtle">…and {files.length - 4} more</li>}
          </ul>
        )}
        <Note>Any kind of file. Numbers follow the order shown; use the arrows to change it. Files are renamed on your device and downloaded as a ZIP.</Note>
      </>
    );
  },
  run: async (files: LoadedFile[], o) => {
    const names = renameAll(files.map((f) => f.name), o);
    const out: ToolFile[] = files.map((f, i) => ({ name: names[i], bytes: f.bytes, type: f.type }));
    return { files: out, summary: `${plural(files.length, "file")} renamed.` };
  },
};

// ─── QR code generator ──────────────────────────────────────────────

type QrOpts = QrFields & { size: number; dark: string; light: string; level: "L" | "M" | "Q" | "H" };

const qrGenerator: ToolSpec<QrOpts> = {
  action: "Make QR code",
  noFiles: true,
  defaults: {
    kind: "url", url: "", text: "", upiId: "", upiName: "", upiAmount: "", upiNote: "", ssid: "", wifiPassword: "", security: "WPA",
    name: "", org: "", phone: "", email: "", website: "", subject: "", size: 1024, dark: "#000000", light: "#ffffff", level: "M",
  },
  Options: ({ options: o, set }) => (
    <>
      <Select
        label="QR code for"
        value={o.kind}
        onChange={(kind) => set({ kind })}
        options={[
          { value: "url", label: "Website link" },
          { value: "upi", label: "UPI payment" },
          { value: "wifi", label: "Wi-Fi network" },
          { value: "contact", label: "Contact card" },
          { value: "text", label: "Plain text" },
          { value: "phone", label: "Phone number" },
          { value: "email", label: "Email" },
        ]}
      />
      {o.kind === "url" && <TextInput label="Link" value={o.url} onChange={(url) => set({ url })} placeholder="https://example.com" />}
      {o.kind === "text" && <TextArea label="Text" value={o.text} onChange={(text) => set({ text })} rows={4} />}
      {o.kind === "upi" && (
        <>
          <TextInput label="UPI ID" value={o.upiId} onChange={(upiId) => set({ upiId })} placeholder="name@okbank" />
          <TextInput label="Name shown to the payer" value={o.upiName} onChange={(upiName) => set({ upiName })} />
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Amount (optional)" value={o.upiAmount} onChange={(upiAmount) => set({ upiAmount: upiAmount.replace(/[^\d.]/g, "") })} placeholder="₹" />
            <TextInput label="Note (optional)" value={o.upiNote} onChange={(upiNote) => set({ upiNote })} />
          </div>
          <Note>Works with any UPI app (GPay, PhonePe, Paytm, BHIM). Scan it yourself once before printing.</Note>
        </>
      )}
      {o.kind === "wifi" && (
        <>
          <TextInput label="Network name (SSID)" value={o.ssid} onChange={(ssid) => set({ ssid })} />
          <Segmented label="Security" value={o.security} onChange={(security) => set({ security })} options={[{ value: "WPA", label: "WPA / WPA2 / WPA3" }, { value: "WEP", label: "WEP" }, { value: "nopass", label: "Open" }]} />
          {o.security !== "nopass" && <TextInput label="Password" value={o.wifiPassword} onChange={(wifiPassword) => set({ wifiPassword })} />}
        </>
      )}
      {o.kind === "contact" && (
        <>
          <TextInput label="Name" value={o.name} onChange={(name) => set({ name })} />
          <TextInput label="Company (optional)" value={o.org} onChange={(org) => set({ org })} />
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Phone" value={o.phone} onChange={(phone) => set({ phone })} />
            <TextInput label="Email" value={o.email} onChange={(email) => set({ email })} />
          </div>
          <TextInput label="Website (optional)" value={o.website} onChange={(website) => set({ website })} />
        </>
      )}
      {o.kind === "phone" && <TextInput label="Phone number" value={o.phone} onChange={(phone) => set({ phone })} placeholder="+91 98765 43210" />}
      {o.kind === "email" && (
        <>
          <TextInput label="Email address" value={o.email} onChange={(email) => set({ email })} />
          <TextInput label="Subject (optional)" value={o.subject} onChange={(subject) => set({ subject })} />
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Code colour" value={o.dark} onChange={(dark) => set({ dark })} />
        <ColorField label="Background" value={o.light} onChange={(light) => set({ light })} />
      </div>
      <Segmented label="Size (PNG)" value={o.size} onChange={(size) => set({ size })} options={[{ value: 512, label: "512 px" }, { value: 1024, label: "1024 px" }, { value: 2048, label: "2048 px" }]} />
      <Segmented label="Error correction" value={o.level} onChange={(level) => set({ level })} options={[{ value: "L", label: "Low" }, { value: "M", label: "Medium" }, { value: "Q", label: "High" }, { value: "H", label: "Highest", hint: "If a logo will cover part" }]} />
      <Note>Made on your device; the code never expires and nothing tracks scans. You get a PNG and a sharp SVG for print.</Note>
    </>
  ),
  validate: (_f, o) => (qrPayload(o).trim() ? null : "Fill in what the QR code should hold."),
  run: async (_f, o) => {
    const { qrMatrix } = await import("@/lib/tools/processors/pageOps");
    const payload = qrPayload(o);
    const cells = qrMatrix(payload, o.level);
    const n = cells.length;
    const quiet = 4;
    const total = n + quiet * 2;
    // SVG: one path, crisp at any size.
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (cells[r][c]) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${o.light}"/><path d="${d}" fill="${o.dark}"/></svg>`;
    const { newCanvas, encodeCanvas } = await canvasLib();
    const scale = Math.max(1, Math.floor(o.size / total));
    const canvas = newCanvas(total * scale, total * scale);
    const c = canvas.getContext("2d")!;
    c.fillStyle = o.light;
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = o.dark;
    for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (cells[r][col]) c.fillRect((col + quiet) * scale, (r + quiet) * scale, scale, scale);
    const slug = { url: "link", text: "text", upi: "upi-payment", wifi: "wifi", contact: "contact", phone: "phone", email: "email" }[o.kind];
    return {
      files: [
        { name: `qr-${slug}.png`, bytes: await encodeCanvas(canvas, "png"), type: "image/png" },
        { name: `qr-${slug}.svg`, bytes: new TextEncoder().encode(svg), type: "image/svg+xml" },
      ],
      summary: `QR code (${n} × ${n} modules) for: ${payload.length > 90 ? `${payload.slice(0, 90)}…` : payload}`,
    };
  },
};

export const IMAGE_SPECS_4 = {
  "image-to-text": imageToText,
  "watermark-image": watermarkImage,
  "photo-collage": collage,
  "batch-rename": batchRename,
  "qr-code-generator": qrGenerator,
};
