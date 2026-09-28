/**
 * Helpers for reading Office Open XML packages (.docx, .xlsx, .pptx): a ZIP
 * of XML parts linked by relationship files. The XML parser is passed in, so
 * the same code runs in the browser (DOMParser) and in Node tests (xmldom).
 */
import { unzipSync, strFromU8 } from "fflate";

export type XmlParser = (text: string) => Document;

export const browserXml: XmlParser = (text) => new DOMParser().parseFromString(text, "application/xml");

export class Package {
  readonly files: Record<string, Uint8Array>;
  constructor(
    bytes: Uint8Array,
    private readonly parse: XmlParser,
  ) {
    try {
      this.files = unzipSync(bytes);
    } catch {
      throw new Error("This file is damaged or isn't an Office document.");
    }
  }

  has(path: string) {
    return path in this.files;
  }

  text(path: string): string | null {
    const f = this.files[path];
    return f ? strFromU8(f) : null;
  }

  xml(path: string): Element | null {
    const t = this.text(path);
    return t ? this.parse(t).documentElement : null;
  }

  /** Relationships of a part: id → absolute target path (or URL for external links). */
  rels(partPath: string): Map<string, { target: string; type: string; external: boolean }> {
    const dir = partPath.slice(0, partPath.lastIndexOf("/") + 1);
    const relPath = `${dir}_rels/${partPath.slice(dir.length)}.rels`;
    const out = new Map<string, { target: string; type: string; external: boolean }>();
    const root = this.xml(relPath);
    if (!root) return out;
    for (const r of kids(root, "Relationship")) {
      const external = r.getAttribute("TargetMode") === "External";
      const target = r.getAttribute("Target") ?? "";
      out.set(r.getAttribute("Id") ?? "", { target: external ? target : resolvePath(dir, target), type: r.getAttribute("Type") ?? "", external });
    }
    return out;
  }
}

/** "ppt/slides/" + "../media/image1.png" → "ppt/media/image1.png" */
export function resolvePath(dir: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = (dir + target).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p !== "." && p !== "") out.push(p);
  }
  return out.join("/");
}

const local = (n: Node) => (n as Element).localName ?? n.nodeName.replace(/^.*:/, "");

/** Direct child elements, optionally with a given local name. */
export function kids(el: Element | null | undefined, name?: string): Element[] {
  if (!el) return [];
  const out: Element[] = [];
  for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && (!name || local(n) === name)) out.push(n as Element);
  return out;
}

export const kid = (el: Element | null | undefined, name: string): Element | null => kids(el, name)[0] ?? null;

/** Follow a path of child names: path(el, "spPr", "xfrm", "off"). */
export function path(el: Element | null | undefined, ...names: string[]): Element | null {
  let cur: Element | null | undefined = el;
  for (const n of names) cur = kid(cur, n);
  return cur ?? null;
}

/** All descendants with a local name, in document order. */
export function descendants(el: Element | null | undefined, name: string): Element[] {
  const out: Element[] = [];
  const walk = (e: Element) => {
    for (const c of kids(e)) {
      if (local(c) === name) out.push(c);
      walk(c);
    }
  };
  if (el) walk(el);
  return out;
}

/** Attribute by local name, ignoring its prefix (w:val, r:embed, val…). */
export function attr(el: Element | null | undefined, name: string): string | null {
  if (!el) return null;
  const direct = el.getAttribute(name);
  if (direct !== null && direct !== "") return direct;
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i];
    if ((a.localName ?? a.name.replace(/^.*:/, "")) === name) return a.value;
  }
  return null;
}

export const num = (v: string | null | undefined, fallback = 0) => {
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** On/off properties: <w:b/>, <w:b w:val="0"/>, <w:b w:val="false"/>. */
export function flag(el: Element | null): boolean | undefined {
  if (!el) return undefined;
  const v = attr(el, "val");
  return v === null || !["0", "false", "off", "none"].includes(v);
}

export const textOf = (el: Element | null | undefined) => el?.textContent ?? "";

export const EMU_PER_INCH = 914400;
export const PX_PER_INCH = 96;
export const emuToPx = (emu: number) => (emu / EMU_PER_INCH) * PX_PER_INCH;
export const pxToInch = (px: number) => px / PX_PER_INCH;

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  svg: "image/svg+xml",
  tif: "image/tiff",
  tiff: "image/tiff",
  emf: "image/x-emf",
  wmf: "image/x-wmf",
};
export const mimeOf = (p: string) => MIME[p.split(".").pop()!.toLowerCase()] ?? "application/octet-stream";
/** Formats a browser can show. EMF/WMF (old Windows vector images) aren't among them. */
export const isWebImage = (mime: string) => /^image\/(png|jpeg|gif|bmp|webp|svg\+xml)$/.test(mime);

export function toDataUrl(bytes: Uint8Array, mime: string): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(bin)}`;
}

export function fromDataUrl(url: string): { bytes: Uint8Array; mime: string } | null {
  const m = url.match(/^data:([^;,]+)(;base64)?,(.*)$/s);
  if (!m) return null;
  if (!m[2]) return { bytes: new TextEncoder().encode(decodeURIComponent(m[3])), mime: m[1] };
  const bin = atob(m[3]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime: m[1] };
}

/** "#1a2B3c" / "1A2B3C" / "FF1A2B3C" → "1A2B3C" (Office wants 6 hex digits, no #). */
export function hex6(color: string | null | undefined): string | undefined {
  if (!color) return undefined;
  const c = color.replace(/^#/, "").trim();
  if (/^[0-9a-f]{8}$/i.test(c)) return c.slice(2).toUpperCase();
  if (/^[0-9a-f]{6}$/i.test(c)) return c.toUpperCase();
  if (/^[0-9a-f]{3}$/i.test(c)) return c.replace(/./g, (x) => x + x).toUpperCase();
  const rgb = c.match(/^rgba?\((\d+)\D+(\d+)\D+(\d+)/i);
  if (rgb) return rgb.slice(1, 4).map((v) => Number(v).toString(16).padStart(2, "0")).join("").toUpperCase();
  return NAMED[c.toLowerCase()];
}

const NAMED: Record<string, string> = {
  black: "000000", white: "FFFFFF", red: "FF0000", green: "008000", blue: "0000FF", yellow: "FFFF00",
  gray: "808080", grey: "808080", orange: "FFA500", purple: "800080",
};

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
