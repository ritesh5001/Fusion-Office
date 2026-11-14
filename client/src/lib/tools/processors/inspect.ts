/**
 * PDF inspection and clean-up with pdf-lib (they run in the browser and in
 * tests): what's inside a PDF (structure, risky content) as JSON, sanitizing
 * (scripts, actions, links, metadata, attachments removed for real), and
 * overlaying one PDF on another (letterheads, stationery).
 */
import {
  PDFArray,
  PDFBool,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFObject,
  PDFRawStream,
  PDFRef,
  PDFStream,
  PDFString,
} from "pdf-lib";
import { loadPdf, pageView, save } from "./common";

const nameOf = (o: unknown) => (o instanceof PDFName ? o.decodeText() : undefined);
const textOf = (o: unknown) => (o instanceof PDFString || o instanceof PDFHexString ? o.decodeText() : undefined);
const num = (o: unknown) => (o instanceof PDFNumber ? o.asNumber() : undefined);

/** Every object reachable from a starting object (following references), visited once. */
function walk(doc: PDFDocument, start: PDFObject | undefined, visit: (obj: PDFObject, parentKey: string | null, parent: PDFDict | null) => void) {
  const seen = new Set<PDFObject>();
  const stack: [PDFObject, string | null, PDFDict | null][] = start ? [[start, null, null]] : [];
  while (stack.length) {
    const [raw, key, parent] = stack.pop()!;
    const obj = raw instanceof PDFRef ? doc.context.lookup(raw) : raw;
    if (!obj || seen.has(obj)) continue;
    seen.add(obj);
    visit(obj, key, parent);
    const dict = obj instanceof PDFStream ? obj.dict : obj instanceof PDFDict ? obj : null;
    if (dict) for (const [k, v] of dict.entries()) if (k.decodeText() !== "Parent" && k.decodeText() !== "P") stack.push([v, k.decodeText(), dict]);
    if (obj instanceof PDFArray) for (const v of obj.asArray()) stack.push([v, key, parent]);
  }
}

// ─── Risky content ────────────────────────────────────────────────

export interface RiskReport {
  /** Places with JavaScript (document open, form fields, links, page events). */
  javascript: string[];
  /** Actions that open other files or programs, or send form data somewhere. */
  launch: number;
  submitForm: number;
  importData: number;
  remoteGoTo: number;
  /** Web links. */
  uri: number;
  openAction: string | null;
  embeddedFiles: number;
  /** Rich-media / 3D / Flash content. */
  richMedia: number;
}

const ACTION_KEYS = new Set(["A", "OpenAction", "Next"]);

export function findRisks(doc: PDFDocument): RiskReport {
  const r: RiskReport = { javascript: [], launch: 0, submitForm: 0, importData: 0, remoteGoTo: 0, uri: 0, openAction: null, embeddedFiles: 0, richMedia: 0 };
  const where = (key: string | null, parent: PDFDict | null) => {
    const sub = nameOf(parent?.lookup(PDFName.of("Subtype")));
    const field = textOf(parent?.lookup(PDFName.of("T")));
    if (key === "OpenAction") return "when the document opens";
    if (key === "JavaScript") return "document-level script";
    if (field) return `form field “${field}”`;
    if (sub) return `${sub} annotation`;
    return key && !ACTION_KEYS.has(key) ? `${key} event` : "an action";
  };
  const open = doc.catalog.lookup(PDFName.of("OpenAction"));
  if (open instanceof PDFDict) r.openAction = nameOf(open.lookup(PDFName.of("S"))) ?? "action";
  else if (open instanceof PDFArray) r.openAction = "go to a page";
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    const dict = obj instanceof PDFDict ? obj : obj instanceof PDFStream ? obj.dict : null;
    if (!dict) continue;
    const type = nameOf(dict.lookup(PDFName.of("Type")));
    const sub = nameOf(dict.lookup(PDFName.of("Subtype")));
    if (type === "EmbeddedFile") r.embeddedFiles++;
    if (sub === "RichMedia" || sub === "3D" || sub === "Screen" || sub === "Movie") r.richMedia++;
  }
  walk(doc, doc.catalog, (obj, key, parent) => {
    const dict = obj instanceof PDFDict ? obj : null;
    if (!dict) return;
    const s = nameOf(dict.lookup(PDFName.of("S")));
    if (s === "JavaScript" || (dict.get(PDFName.of("JS")) && !s)) r.javascript.push(where(key, parent));
    else if (s === "Launch") r.launch++;
    else if (s === "SubmitForm") r.submitForm++;
    else if (s === "ImportData") r.importData++;
    else if (s === "GoToR" || s === "GoToE") r.remoteGoTo++;
    else if (s === "URI") r.uri++;
  });
  const names = doc.catalog.lookup(PDFName.of("Names"));
  if (names instanceof PDFDict && names.lookup(PDFName.of("JavaScript"))) r.javascript.push("document-level script");
  r.javascript = [...new Set(r.javascript)];
  return r;
}

// ─── PDF → JSON ───────────────────────────────────────────────────

export interface PdfStructure {
  pdfVersion: string;
  pages: { number: number; width: number; height: number; rotation: number; annotations: Record<string, number> }[];
  metadata: Record<string, string>;
  encrypted: boolean;
  form: { name: string; type: string; value: string | boolean | string[] | null }[];
  fonts: { name: string; type: string; embedded: boolean }[];
  attachments: string[];
  risks: RiskReport;
}

export async function pdfStructure(bytes: Uint8Array): Promise<PdfStructure> {
  const encrypted = (await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false })).isEncrypted;
  const doc = await loadPdf(bytes);
  const header = new TextDecoder("latin1").decode(bytes.subarray(0, 1024)).match(/%PDF-(\d\.\d)/)?.[1] ?? "";
  const metadata: Record<string, string> = {};
  const put = (k: string, v: string | undefined) => v && (metadata[k] = v);
  put("title", doc.getTitle());
  put("author", doc.getAuthor());
  put("subject", doc.getSubject());
  put("keywords", doc.getKeywords());
  put("creator", doc.getCreator());
  put("producer", doc.getProducer());
  put("created", doc.getCreationDate()?.toISOString());
  put("modified", doc.getModificationDate()?.toISOString());
  const pages = doc.getPages().map((p, i) => {
    const v = pageView(p);
    const annotations: Record<string, number> = {};
    const annots = p.node.Annots();
    for (let k = 0; annots && k < annots.size(); k++) {
      const a = doc.context.lookup(annots.get(k));
      const sub = a instanceof PDFDict ? nameOf(a.lookup(PDFName.of("Subtype"))) ?? "Unknown" : "Unknown";
      annotations[sub] = (annotations[sub] ?? 0) + 1;
    }
    return { number: i + 1, width: Math.round(v.width * 100) / 100, height: Math.round(v.height * 100) / 100, rotation: v.rotation, annotations };
  });
  const form: PdfStructure["form"] = [];
  try {
    for (const f of doc.getForm().getFields()) {
      const type = f.constructor.name.replace(/^PDF/, "");
      const anyF = f as unknown as Record<string, () => unknown>;
      let value: PdfStructure["form"][number]["value"] = null;
      try {
        if (typeof anyF.getText === "function") value = (anyF.getText.call(f) as string | undefined) ?? "";
        else if (typeof anyF.isChecked === "function") value = anyF.isChecked.call(f) as boolean;
        else if (typeof anyF.getSelected === "function") value = anyF.getSelected.call(f) as string | string[];
      } catch {
        /* unreadable value */
      }
      form.push({ name: f.getName(), type, value });
    }
  } catch {
    /* no usable form */
  }
  const fonts = new Map<string, { name: string; type: string; embedded: boolean }>();
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict) || nameOf(obj.lookup(PDFName.of("Type"))) !== "Font") continue;
    const sub = nameOf(obj.lookup(PDFName.of("Subtype"))) ?? "";
    if (sub === "Type0" || sub === "Type3") {
      const n = nameOf(obj.lookup(PDFName.of("BaseFont"))) ?? sub;
      if (!fonts.has(n)) fonts.set(n, { name: n.replace(/^[A-Z]{6}\+/, ""), type: sub, embedded: sub === "Type3" || hasDescendantFile(doc, obj) });
      continue;
    }
    const n = nameOf(obj.lookup(PDFName.of("BaseFont"))) ?? "unnamed";
    const desc = obj.lookup(PDFName.of("FontDescriptor"));
    const embedded = desc instanceof PDFDict && ["FontFile", "FontFile2", "FontFile3"].some((k) => desc.get(PDFName.of(k)));
    if (!fonts.has(n)) fonts.set(n, { name: n.replace(/^[A-Z]{6}\+/, ""), type: sub, embedded });
  }
  const { listAttachments } = await import("./pageOps");
  const attachments = (await listAttachments(bytes).catch(() => [])).map((a) => a.name);
  return { pdfVersion: header, pages, metadata, encrypted, form, fonts: [...fonts.values()], attachments, risks: findRisks(doc) };
}

function hasDescendantFile(doc: PDFDocument, font: PDFDict) {
  const d = font.lookup(PDFName.of("DescendantFonts"));
  const first = d instanceof PDFArray ? doc.context.lookup(d.get(0)) : undefined;
  const desc = first instanceof PDFDict ? first.lookup(PDFName.of("FontDescriptor")) : undefined;
  return desc instanceof PDFDict && ["FontFile", "FontFile2", "FontFile3"].some((k) => desc.get(PDFName.of(k)));
}

// ─── Sanitize ─────────────────────────────────────────────────────

export interface SanitizeOptions {
  /** JavaScript and actions that launch programs, submit or import data. */
  scripts: boolean;
  links: boolean;
  metadata: boolean;
  attachments: boolean;
  /** Comments, highlights and other annotations (form fields and links handled separately). */
  annotations: boolean;
}

export interface SanitizeReport {
  scripts: number;
  actions: number;
  links: number;
  metadata: boolean;
  attachments: number;
  annotations: number;
  /** Objects no longer used by the document, deleted from the file. */
  removedObjects: number;
}

const DANGEROUS = new Set(["JavaScript", "Launch", "SubmitForm", "ImportData", "GoToR", "GoToE", "Rendition", "Sound", "Movie", "RichMediaExecute", "SetOCGState", "Hide", "ResetForm"]);

/** Delete every indirect object the document no longer reaches, so removed content isn't left in the file. */
export function collectGarbage(doc: PDFDocument): number {
  const keep = new Set<string>();
  const stack: PDFObject[] = [doc.context.trailerInfo.Root, doc.context.trailerInfo.Info].filter(Boolean) as PDFObject[];
  while (stack.length) {
    const o = stack.pop()!;
    if (o instanceof PDFRef) {
      if (keep.has(o.tag)) continue;
      keep.add(o.tag);
      const target = doc.context.lookup(o);
      if (target) stack.push(target);
      continue;
    }
    const dict = o instanceof PDFStream ? o.dict : o instanceof PDFDict ? o : null;
    if (dict) for (const [, v] of dict.entries()) stack.push(v);
    if (o instanceof PDFArray) for (const v of o.asArray()) stack.push(v);
  }
  let removed = 0;
  for (const [ref] of doc.context.enumerateIndirectObjects()) {
    if (!keep.has(ref.tag)) {
      doc.context.delete(ref);
      removed++;
    }
  }
  return removed;
}

export async function sanitizePdf(bytes: Uint8Array, o: SanitizeOptions): Promise<{ bytes: Uint8Array; report: SanitizeReport }> {
  const doc = await loadPdf(bytes);
  const ctx = doc.context;
  const report: SanitizeReport = { scripts: 0, actions: 0, links: 0, metadata: false, attachments: 0, annotations: 0, removedObjects: 0 };
  const cat = doc.catalog;

  if (o.scripts) {
    const open = cat.lookup(PDFName.of("OpenAction"));
    if (open instanceof PDFDict && DANGEROUS.has(nameOf(open.lookup(PDFName.of("S"))) ?? "")) {
      cat.delete(PDFName.of("OpenAction"));
      report.scripts++;
    }
    if (cat.get(PDFName.of("AA"))) (cat.delete(PDFName.of("AA")), report.actions++);
    const names = cat.lookup(PDFName.of("Names"));
    if (names instanceof PDFDict && names.get(PDFName.of("JavaScript"))) (names.delete(PDFName.of("JavaScript")), report.scripts++);
    // Actions on fields, annotations, pages and outline items.
    walk(doc, cat, (obj) => {
      const dict = obj instanceof PDFDict ? obj : null;
      if (!dict) return;
      if (dict.get(PDFName.of("AA"))) {
        dict.delete(PDFName.of("AA"));
        report.actions++;
      }
      for (const key of ["A", "Next"]) {
        const act = dict.lookup(PDFName.of(key));
        const s = act instanceof PDFDict ? nameOf(act.lookup(PDFName.of("S"))) : undefined;
        if (s && DANGEROUS.has(s)) {
          dict.delete(PDFName.of(key));
          if (s === "JavaScript") report.scripts++;
          else report.actions++;
        }
      }
    });
    // XFA forms carry their own scripts.
    const acro = cat.lookup(PDFName.of("AcroForm"));
    if (acro instanceof PDFDict && acro.get(PDFName.of("XFA"))) (acro.delete(PDFName.of("XFA")), report.scripts++);
  }

  if (o.attachments) {
    const names = cat.lookup(PDFName.of("Names"));
    if (names instanceof PDFDict && names.get(PDFName.of("EmbeddedFiles"))) {
      const { listAttachments } = await import("./pageOps");
      report.attachments += (await listAttachments(bytes).catch(() => [])).filter((a) => a).length || 1;
      names.delete(PDFName.of("EmbeddedFiles"));
    }
    cat.delete(PDFName.of("AF"));
  }

  for (const page of doc.getPages()) {
    const annots = page.node.Annots();
    if (o.scripts && page.node.get(PDFName.of("AA"))) (page.node.delete(PDFName.of("AA")), report.actions++);
    if (!annots) continue;
    const keep: PDFRef[] = [];
    for (let k = 0; k < annots.size(); k++) {
      const ref = annots.get(k);
      const a = ctx.lookup(ref);
      const sub = a instanceof PDFDict ? nameOf(a.lookup(PDFName.of("Subtype"))) : undefined;
      let drop = false;
      if (sub === "Link" && o.links) (drop = true), report.links++;
      else if (sub === "FileAttachment" && o.attachments) (drop = true), report.attachments++;
      else if (sub && sub !== "Link" && sub !== "Widget" && sub !== "FileAttachment" && sub !== "Popup" && o.annotations) (drop = true), report.annotations++;
      else if (sub === "Popup" && o.annotations) drop = true;
      else if (sub && ["RichMedia", "Screen", "Movie", "Sound", "3D"].includes(sub) && o.scripts) (drop = true), report.actions++;
      if (!drop && ref instanceof PDFRef) keep.push(ref);
    }
    if (keep.length) page.node.set(PDFName.of("Annots"), ctx.obj(keep));
    else page.node.delete(PDFName.of("Annots"));
  }
  // Link actions outside annotations (outline items, URIs): links option removes web addresses everywhere.
  if (o.links) {
    walk(doc, cat, (obj) => {
      if (!(obj instanceof PDFDict)) return;
      const act = obj.lookup(PDFName.of("A"));
      if (act instanceof PDFDict && nameOf(act.lookup(PDFName.of("S"))) === "URI") {
        obj.delete(PDFName.of("A"));
        report.links++;
      }
    });
  }

  if (o.metadata) {
    const infoRef = ctx.trailerInfo.Info;
    const info = infoRef ? ctx.lookup(infoRef) : undefined;
    if (info instanceof PDFDict && info.keys().length) {
      for (const k of info.keys()) info.delete(k);
      report.metadata = true;
    }
    if (cat.get(PDFName.of("Metadata"))) (cat.delete(PDFName.of("Metadata")), (report.metadata = true));
    cat.delete(PDFName.of("PieceInfo"));
    for (const page of doc.getPages()) {
      page.node.delete(PDFName.of("PieceInfo"));
      page.node.delete(PDFName.of("Metadata"));
    }
  }

  report.removedObjects = collectGarbage(doc);
  // Keep pdf-lib from writing its own Producer / dates back in when metadata is being removed.
  const out = o.metadata ? await doc.save({ useObjectStreams: true, updateFieldAppearances: false }) : await save(doc);
  return { bytes: out, report };
}

// ─── Overlay (letterhead) ─────────────────────────────────────────

export interface OverlayOptions {
  /** Draw the overlay on top of each page, or underneath it as a background. */
  mode: "over" | "under";
  /** Which overlay page goes on which page. */
  match: "first" | "same" | "cycle";
  /** Pages of the main PDF that get it. */
  pages: "all" | "first" | "notFirst" | "odd" | "even";
  /** Stretch to the page, or keep proportions. */
  fit: "stretch" | "contain";
}

export async function overlayPdf(base: Uint8Array, overlay: Uint8Array, o: OverlayOptions): Promise<{ bytes: Uint8Array; pages: number }> {
  const doc = await loadPdf(base);
  const src = await loadPdf(overlay);
  const embedded = await doc.embedPages(src.getPages());
  const ctx = doc.context;
  let done = 0;
  doc.getPages().forEach((page, i) => {
    const want = o.pages === "all" || (o.pages === "first" && i === 0) || (o.pages === "notFirst" && i > 0) || (o.pages === "odd" && i % 2 === 0) || (o.pages === "even" && i % 2 === 1);
    if (!want) return;
    const emb = o.match === "first" ? embedded[0] : o.match === "same" ? embedded[Math.min(i, embedded.length - 1)] : embedded[i % embedded.length];
    const v = pageView(page);
    let sx = v.width / emb.width;
    let sy = v.height / emb.height;
    let tx = 0;
    let ty = 0;
    if (o.fit === "contain") {
      sx = sy = Math.min(sx, sy);
      tx = (v.width - emb.width * sx) / 2;
      ty = (v.height - emb.height * sy) / 2;
    }
    const name = page.node.newXObject("FoOverlay", emb.ref);
    const f = (n: number) => (Math.round(n * 1e5) / 1e5).toString();
    const ops = `q ${v.matrix.map(f).join(" ")} cm ${f(sx)} 0 0 ${f(sy)} ${f(tx)} ${f(ty)} cm /${name.decodeText()} Do Q`;
    const stream = ctx.register(ctx.flateStream(ops));
    if (o.mode === "under") {
      const contents = page.node.get(PDFName.of("Contents"));
      const existing = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
      page.node.set(PDFName.of("Contents"), ctx.obj([stream, ...existing]));
    } else {
      // Isolate the page's own drawing so its graphics state can't move the overlay.
      const start = ctx.register(ctx.flateStream("q"));
      const end = ctx.register(ctx.flateStream("Q"));
      page.node.wrapContentStreams(start, end);
      page.node.addContentStream(stream);
    }
    done++;
  });
  return { bytes: await save(doc), pages: done };
}

/** Pull these in for the type checker only (they describe shapes used above). */
export type { PDFBool, PDFRawStream };
