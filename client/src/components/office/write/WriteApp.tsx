"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { generateJSON, type JSONContent } from "@tiptap/core";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Baseline, Bold, ChevronDown, ChevronUp, Download, FileText, Highlighter, ImagePlus, Indent, Italic,
  Link2, List, ListOrdered, Loader2, Minus, Outdent, Printer, Quote, Redo2, RemoveFormatting, Search, SeparatorHorizontal, Strikethrough, Subscript,
  Superscript, Table2, Trash2, Underline, Undo2, X,
} from "lucide-react";
import { wordExtensions, findMatches } from "@/lib/office/docx/extensions";
import { readDocx } from "@/lib/office/docx/read";
import { writeDocx } from "@/lib/office/docx/write";
import { WORD_TEMPLATES } from "@/lib/office/docx/templates";
import { A4, DEFAULT_META, LETTER, type DocMeta, type PageSetup, type WordDoc } from "@/lib/office/docx/model";
import { browserXml, escapeHtml } from "@/lib/office/ooxml";
import { loadDraft, newDraftId, type DraftInfo } from "@/lib/office/drafts";
import { convertOnServer, extOf } from "@/lib/office/convert";
import { imageFileToDataUrl, rasterizeDataUrl } from "@/lib/office/images";
import { downloadFile } from "@/lib/tools/files";
import { toast } from "@/lib/editor/events";
import { pickFiles } from "../../editor/filePicker";
import { Toaster } from "../../editor/Toaster";
import { Button, Modal, Select, cn } from "../../ui/primitives";
import { OfficeHeader, StartScreen, readOfficeFile, useAutosave, type AppIdentity } from "../OfficeShell";
import { ColorPick, Sep, TB, TSelect } from "../controls";

const APP: AppIdentity = { kind: "doc", name: "Fusion Write", icon: FileText, tint: "bg-[#80a6ff] text-[#0d0f14]" };
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const ACCEPT = ".docx,.doc,.odt,.rtf,.txt,.md,.html,.htm";
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl+";

const FONTS = ["Calibri", "Arial", "Helvetica", "Times New Roman", "Georgia", "Cambria", "Garamond", "Verdana", "Tahoma", "Trebuchet MS", "Courier New", "Aptos", "Segoe UI", "Roboto", "Noto Sans"];
const SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 60, 72];
const PT_TO_PX = 96 / 72;

interface Session {
  id: string;
  name: string;
  doc: WordDoc;
  warnings: string[];
}

export default function WriteApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = (name: string, doc: WordDoc, warnings: string[] = [], id = newDraftId()) => setSession({ id, name, doc, warnings });

  const open = async (file: File) => {
    setError(null);
    const ext = extOf(file.name);
    setBusy(["doc", "odt", "rtf"].includes(ext) ? "Converting on the server…" : "Opening…");
    try {
      if (["docx", "doc", "odt", "rtf"].includes(ext)) {
        const f = await readOfficeFile(file, "docx");
        const { doc, warnings } = readDocx(f.bytes, browserXml);
        start(f.name, doc, warnings);
      } else if (ext === "html" || ext === "htm") {
        const content = generateJSON(await file.text(), wordExtensions()) as JSONContent;
        start(file.name.replace(/\.[^.]+$/, ""), { meta: DEFAULT_META, content });
      } else if (ext === "txt" || ext === "md") {
        const paras = (await file.text()).replace(/\r\n?/g, "\n").split(/\n/);
        start(file.name.replace(/\.[^.]+$/, ""), { meta: DEFAULT_META, content: { type: "doc", content: paras.map((l) => (l ? { type: "paragraph", content: [{ type: "text", text: l }] } : { type: "paragraph" })) } });
      } else throw new Error("Open a Word document (.docx, .doc, .odt, .rtf) or a text file.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const openDraft = async (d: DraftInfo) => {
    const draft = await loadDraft<WordDoc>(d.id);
    if (draft) start(draft.name, draft.data, [], draft.id);
  };

  if (!session) {
    return (
      <StartScreen
        app={APP}
        title="Word documents"
        subtitle="Open a .docx to edit it, or start a new document."
        accept={ACCEPT}
        onFile={open}
        busy={busy}
        error={error}
        onDraft={openDraft}
        templates={WORD_TEMPLATES.map((tpl) => ({ label: tpl.label, hint: tpl.hint, preview: <DocPreview id={tpl.id} />, onSelect: () => start(tpl.id === "blank" ? "Untitled document" : tpl.label, tpl.build()) }))}
      />
    );
  }
  return (
    <WriteEditor
      key={session.id}
      session={session}
      onExit={() => setSession(null)}
      onOpen={async () => {
        const [f] = await pickFiles(ACCEPT);
        if (f) {
          setSession(null);
          await open(f);
        }
      }}
    />
  );
}

function DocPreview({ id }: { id: string }) {
  const line = (w: string, extra = "") => <span className={cn("block h-1 rounded-full bg-line-strong", extra)} style={{ width: w }} />;
  return (
    <span className="paper mx-auto my-3 flex w-[58%] flex-col gap-1.5 p-3 shadow-sm">
      {id === "blank" ? null : id === "letter" ? (
        <>
          {line("40%", "bg-slate-500")}
          {line("55%")}
          <span className="h-2" />
          {line("90%")}
          {line("85%")}
          {line("70%")}
        </>
      ) : (
        <>
          {line("65%", "h-1.5 bg-slate-600")}
          {line("35%")}
          {line("90%")}
          {line("80%")}
          <span className="grid grid-cols-3 gap-0.5">{Array.from({ length: 6 }, (_, i) => <span key={i} className="h-1.5 bg-line" />)}</span>
        </>
      )}
    </span>
  );
}

// ─── Editor ─────────────────────────────────────────────────────────

function WriteEditor({ session, onExit, onOpen }: { session: Session; onExit: () => void; onOpen: () => void }) {
  const [meta, setMeta] = useState<DocMeta>(session.doc.meta);
  const [name, setName] = useState(session.name);
  const [zoom, setZoom] = useState(1);
  const [snapshot, setSnapshot] = useState<WordDoc>(session.doc);
  const [warnings, setWarnings] = useState(session.warnings);
  const [find, setFind] = useState<null | { replace: boolean }>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const extensions = useMemo(() => wordExtensions(), []);
  const metaRef = useRef(meta);
  metaRef.current = meta;

  const editor = useEditor({
    extensions,
    content: session.doc.content,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "fo-doc-body", spellcheck: "true" },
      handlePaste: (_view, event) => insertImageFiles(event.clipboardData?.files),
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files?.length || ![...files].some((f) => f.type.startsWith("image/"))) return false;
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        return insertImageFiles(files, pos);
      },
    },
    onUpdate: ({ editor }) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setSnapshot({ meta: metaRef.current, content: editor.getJSON() }), 500);
    },
  });

  // Page setup changes are saved too.
  useEffect(() => {
    if (editor) setSnapshot({ meta, content: editor.getJSON() });
  }, [meta, editor]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const status = useAutosave("doc", session.id, name, snapshot);
  const contentWidthPx = (meta.page.width - meta.page.margin.left - meta.page.margin.right) * PT_TO_PX;

  function insertImageFiles(files: FileList | null | undefined, pos?: number): boolean {
    const images = [...(files ?? [])].filter((f) => f.type.startsWith("image/"));
    if (!images.length || !editor) return false;
    (async () => {
      for (const f of images) {
        try {
          const img = await imageFileToDataUrl(f);
          const width = Math.min(img.width, Math.round(contentWidthPx));
          const node = { type: "image", attrs: { src: img.src, width, height: Math.round((img.height * width) / img.width) } };
          if (pos !== undefined) editor.chain().insertContentAt(pos, node).run();
          else editor.chain().focus().insertContent(node).run();
        } catch (e) {
          toast((e as Error).message, "error");
        }
      }
    })();
    return true;
  }

  const current = (): WordDoc => ({ meta, content: editor!.getJSON() });

  const exportDocx = async () => writeDocx(current(), rasterizeDataUrl);

  const download = async (kind: "docx" | "pdf" | "html" | "txt") => {
    if (!editor) return;
    setBusy(kind === "pdf" ? "Creating PDF…" : "Preparing…");
    try {
      if (kind === "docx") downloadFile({ name: `${name}.docx`, bytes: await exportDocx(), type: DOCX_MIME });
      else if (kind === "pdf") {
        try {
          const pdf = await convertOnServer(`${name}.docx`, await exportDocx(), "pdf");
          downloadFile({ name: `${name}.pdf`, bytes: pdf, type: "application/pdf" });
        } catch (e) {
          toast(`${(e as Error).message} You can use File → Print and choose "Save as PDF" instead.`, "error");
        }
      } else if (kind === "html") {
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(name)}</title><style>body{font-family:${meta.font},sans-serif;font-size:${meta.fontSize}pt;max-width:${Math.round(contentWidthPx)}px;margin:40px auto;line-height:1.4}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:4px 8px}img{max-width:100%}</style></head><body>${editor.getHTML()}</body></html>`;
        downloadFile({ name: `${name}.html`, bytes: new TextEncoder().encode(html), type: "text/html" });
      } else downloadFile({ name: `${name}.txt`, bytes: new TextEncoder().encode(editor.getText({ blockSeparator: "\n\n" })), type: "text/plain" });
      if (kind !== "pdf") toast(`Downloaded ${name}.${kind}`, "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };

  const print = () => {
    const style = document.createElement("style");
    style.textContent = `@page { size: ${meta.page.width}pt ${meta.page.height}pt; margin: ${meta.page.margin.top}pt ${meta.page.margin.right}pt ${meta.page.margin.bottom}pt ${meta.page.margin.left}pt; }`;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => style.remove(), 1000);
  };

  const addImage = async () => {
    const files = await pickFiles("image/*", true);
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    insertImageFiles(dt.files);
  };

  // Shortcuts the browser would otherwise take.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "s") (e.preventDefault(), download("docx"));
      else if (k === "f") (e.preventDefault(), setFind({ replace: false }));
      else if (k === "h") (e.preventDefault(), setFind({ replace: true }));
      else if (k === "p") (e.preventDefault(), print());
      else if (k === "k") (e.preventDefault(), setLinkOpen(true));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!editor) return <div className="flex h-dvh items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-fg-subtle" /></div>;
  const c = () => editor.chain().focus();

  const menus = [
    {
      label: "File",
      items: [
        { label: "New document", onSelect: onExit },
        { label: "Open…", shortcut: `${MOD}O`, onSelect: onOpen },
        "divider" as const,
        { label: "Download as Word (.docx)", shortcut: `${MOD}S`, onSelect: () => download("docx") },
        { label: "Download as PDF", onSelect: () => download("pdf") },
        { label: "Download as web page (.html)", onSelect: () => download("html") },
        { label: "Download as plain text (.txt)", onSelect: () => download("txt") },
        "divider" as const,
        { label: "Page setup…", onSelect: () => setSetupOpen(true) },
        { label: "Print", shortcut: `${MOD}P`, onSelect: print },
        "divider" as const,
        { label: "Close", onSelect: onExit },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Undo", shortcut: `${MOD}Z`, onSelect: () => c().undo().run() },
        { label: "Redo", shortcut: isMac ? "⇧⌘Z" : "Ctrl+Y", onSelect: () => c().redo().run() },
        "divider" as const,
        { label: "Select all", shortcut: `${MOD}A`, onSelect: () => c().selectAll().run() },
        { label: "Find", shortcut: `${MOD}F`, onSelect: () => setFind({ replace: false }) },
        { label: "Find and replace", shortcut: `${MOD}H`, onSelect: () => setFind({ replace: true }) },
      ],
    },
    {
      label: "Insert",
      items: [
        { label: "Image…", onSelect: addImage },
        { label: "Table", onSelect: () => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
        { label: "Link…", shortcut: `${MOD}K`, onSelect: () => setLinkOpen(true) },
        "divider" as const,
        { label: "Page break", shortcut: `${MOD}Enter`, onSelect: () => c().setPageBreak().run() },
        { label: "Horizontal line", onSelect: () => c().setHorizontalRule().run() },
        { label: "Today's date", onSelect: () => c().insertContent(new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })).run() },
      ],
    },
    {
      label: "Format",
      items: [
        { label: "Bold", shortcut: `${MOD}B`, onSelect: () => c().toggleBold().run() },
        { label: "Italic", shortcut: `${MOD}I`, onSelect: () => c().toggleItalic().run() },
        { label: "Underline", shortcut: `${MOD}U`, onSelect: () => c().toggleUnderline().run() },
        { label: "Strikethrough", onSelect: () => c().toggleStrike().run() },
        { label: "Superscript", onSelect: () => c().toggleSuperscript().run() },
        { label: "Subscript", onSelect: () => c().toggleSubscript().run() },
        "divider" as const,
        { label: "Clear formatting", onSelect: () => c().unsetAllMarks().clearNodes().run() },
        { label: "Page setup…", onSelect: () => setSetupOpen(true) },
      ],
    },
  ];

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <div className="print:hidden">
        <OfficeHeader
          app={APP}
          docName={name}
          onRename={setName}
          status={status}
          menus={menus}
          actions={
            <>
              <TB label="Find and replace" shortcut={`${MOD}F`} onClick={() => setFind({ replace: true })}>
                <Search className="h-4 w-4" />
              </TB>
              <TB label="Print" shortcut={`${MOD}P`} onClick={print}>
                <Printer className="h-4 w-4" />
              </TB>
              <Button variant="primary" size="sm" className="ml-1.5" onClick={() => download("docx")} disabled={!!busy} title={`Download .docx (${MOD}S)`}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {busy ?? "Download"}
              </Button>
            </>
          }
        />
        <Toolbar editor={editor} meta={meta} onLink={() => setLinkOpen(true)} onImage={addImage} />
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto print:overflow-visible">
        {warnings.length > 0 && (
          <div className="mx-auto mt-4 flex max-w-[760px] items-start gap-3 rounded-lg bg-amber-500/10 px-4 py-2.5 text-[13px] text-amber-200 ring-1 ring-amber-500/30 print:hidden">
            <ul className="flex-1 list-disc pl-4">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <button type="button" aria-label="Dismiss" onClick={() => setWarnings([])} className="rounded p-0.5 hover:bg-amber-500/20">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {find && <FindPanel editor={editor} replace={find.replace} onClose={() => (editor.commands.setSearchTerm(""), setFind(null))} />}
        <div className="flex justify-center px-4 py-8 print:p-0">
          <div
            className="paper fo-doc fo-print-root shadow-[0_0_0_1px_rgb(255_255_255/0.04),0_16px_48px_-16px_rgb(0_0_0/0.8)] print:shadow-none"
            style={{
              zoom,
              width: meta.page.width * PT_TO_PX,
              minHeight: meta.page.height * PT_TO_PX,
              padding: `${meta.page.margin.top * PT_TO_PX}px ${meta.page.margin.right * PT_TO_PX}px ${meta.page.margin.bottom * PT_TO_PX}px ${meta.page.margin.left * PT_TO_PX}px`,
              fontFamily: `"${meta.font}", Calibri, Carlito, "Segoe UI", Arial, sans-serif`,
              fontSize: `${meta.fontSize}pt`,
            }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <StatusBar editor={editor} meta={meta} zoom={zoom} setZoom={setZoom} />
      <LinkDialog editor={editor} open={linkOpen} onClose={() => setLinkOpen(false)} />
      <PageSetupDialog open={setupOpen} meta={meta} onClose={() => setSetupOpen(false)} onChange={setMeta} />
      <Toaster />
    </div>
  );
}

// ─── Toolbar ────────────────────────────────────────────────────────

function Toolbar({ editor, meta, onLink, onImage }: { editor: Editor; meta: DocMeta; onLink: () => void; onImage: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const ts = e.getAttributes("textStyle");
      const block = [1, 2, 3, 4].find((l) => e.isActive("heading", { level: l }));
      return {
        block: block ? `h${block}` : e.isActive("blockquote") ? "quote" : e.isActive("codeBlock") ? "code" : "p",
        font: (ts.fontFamily as string | undefined)?.replace(/["']/g, "").split(",")[0] ?? "",
        size: (ts.fontSize as string | undefined)?.replace(/pt$/, "") ?? "",
        color: (ts.color as string | undefined) ?? null,
        highlight: (e.getAttributes("highlight").color as string | undefined) ?? null,
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        underline: e.isActive("underline"),
        strike: e.isActive("strike"),
        sup: e.isActive("superscript"),
        sub: e.isActive("subscript"),
        align: (["center", "right", "justify"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left",
        bullet: e.isActive("bulletList"),
        ordered: e.isActive("orderedList"),
        inList: e.isActive("listItem"),
        link: e.isActive("link"),
        table: e.isActive("table"),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      };
    },
  });
  const c = () => editor.chain().focus();
  const fonts = s.font && !FONTS.includes(s.font) ? [s.font, ...FONTS] : FONTS;
  const sizes = s.size && !SIZES.includes(Number(s.size)) ? [Number(s.size), ...SIZES].sort((a, b) => a - b) : SIZES;

  return (
    <div className="border-b border-line bg-surface">
      <div className="thin-scroll flex items-center gap-0.5 overflow-x-auto px-2 py-1">
        <TB label="Undo" shortcut={`${MOD}Z`} disabled={!s.canUndo} onClick={() => c().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </TB>
        <TB label="Redo" shortcut={isMac ? "⇧⌘Z" : "Ctrl+Y"} disabled={!s.canRedo} onClick={() => c().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </TB>
        <Sep />
        <TSelect
          label="Text style"
          value={s.block}
          width={124}
          onChange={(v) => {
            const ch = c();
            if (v === "p") ch.setParagraph().run();
            else if (v === "quote") ch.setParagraph().toggleBlockquote().run();
            else if (v === "code") ch.toggleCodeBlock().run();
            else ch.setHeading({ level: Number(v[1]) as 1 | 2 | 3 | 4 }).run();
          }}
          options={[
            { value: "p", label: "Normal text" },
            { value: "h1", label: "Heading 1" },
            { value: "h2", label: "Heading 2" },
            { value: "h3", label: "Heading 3" },
            { value: "h4", label: "Heading 4" },
            { value: "quote", label: "Quote" },
            { value: "code", label: "Code" },
          ]}
        />
        <TSelect
          label="Font"
          value={s.font}
          width={136}
          onChange={(v) => (v ? c().setFontFamily(v).run() : c().unsetFontFamily().run())}
          options={[{ value: "", label: `${meta.font} (default)` }, ...fonts.filter((f) => f !== meta.font).map((f) => ({ value: f, label: f, style: { fontFamily: f } }))]}
        />
        <TSelect
          label="Font size"
          value={s.size}
          width={64}
          onChange={(v) => (v ? c().setFontSize(`${v}pt`).run() : c().unsetFontSize().run())}
          options={[{ value: "", label: String(meta.fontSize) }, ...sizes.filter((z) => z !== meta.fontSize).map((z) => ({ value: String(z), label: String(z) }))]}
        />
        <Sep />
        <TB label="Bold" shortcut={`${MOD}B`} active={s.bold} onClick={() => c().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </TB>
        <TB label="Italic" shortcut={`${MOD}I`} active={s.italic} onClick={() => c().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </TB>
        <TB label="Underline" shortcut={`${MOD}U`} active={s.underline} onClick={() => c().toggleUnderline().run()}>
          <Underline className="h-4 w-4" />
        </TB>
        <TB label="Strikethrough" active={s.strike} onClick={() => c().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </TB>
        <TB label="Superscript" active={s.sup} onClick={() => c().toggleSuperscript().run()}>
          <Superscript className="h-4 w-4" />
        </TB>
        <TB label="Subscript" active={s.sub} onClick={() => c().toggleSubscript().run()}>
          <Subscript className="h-4 w-4" />
        </TB>
        <ColorPick label="Text colour" icon={<Baseline className="h-4 w-4" />} value={s.color ?? "#000000"} resetLabel="Automatic" onChange={(v) => (v ? c().setColor(v).run() : c().unsetColor().run())} />
        <ColorPick label="Highlight" icon={<Highlighter className="h-4 w-4" />} value={s.highlight ?? "#ffe066"} resetLabel="No highlight" onChange={(v) => (v ? c().setHighlight({ color: v }).run() : c().unsetHighlight().run())} />
        <Sep />
        {(
          [
            ["left", AlignLeft, `${MOD}⇧L`],
            ["center", AlignCenter, `${MOD}⇧E`],
            ["right", AlignRight, `${MOD}⇧R`],
            ["justify", AlignJustify, `${MOD}⇧J`],
          ] as const
        ).map(([a, Icon, key]) => (
          <TB key={a} label={`Align ${a}`} shortcut={key} active={s.align === a} onClick={() => c().setTextAlign(a).run()}>
            <Icon className="h-4 w-4" />
          </TB>
        ))}
        <Sep />
        <TB label="Bulleted list" active={s.bullet} onClick={() => c().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </TB>
        <TB label="Numbered list" active={s.ordered} onClick={() => c().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </TB>
        <TB label="Decrease indent" disabled={!s.inList} onClick={() => c().liftListItem("listItem").run()}>
          <Outdent className="h-4 w-4" />
        </TB>
        <TB label="Increase indent" disabled={!s.inList} onClick={() => c().sinkListItem("listItem").run()}>
          <Indent className="h-4 w-4" />
        </TB>
        <Sep />
        <TB label="Link" shortcut={`${MOD}K`} active={s.link} onClick={onLink}>
          <Link2 className="h-4 w-4" />
        </TB>
        <TB label="Image" onClick={onImage}>
          <ImagePlus className="h-4 w-4" />
        </TB>
        <TB label="Table" active={s.table} onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <Table2 className="h-4 w-4" />
        </TB>
        <TB label="Quote" active={s.block === "quote"} onClick={() => c().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </TB>
        <TB label="Page break" shortcut={`${MOD}Enter`} onClick={() => c().setPageBreak().run()}>
          <SeparatorHorizontal className="h-4 w-4" />
        </TB>
        <TB label="Horizontal line" onClick={() => c().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </TB>
        <Sep />
        <TB label="Clear formatting" onClick={() => c().unsetAllMarks().clearNodes().run()}>
          <RemoveFormatting className="h-4 w-4" />
        </TB>
      </div>
      {s.table && (
        <div className="thin-scroll flex items-center gap-0.5 overflow-x-auto border-t border-line bg-sunken px-2 py-1 text-[12px]">
          <span className="mr-1 font-medium text-fg-muted">Table</span>
          {(
            [
              ["Row above", () => c().addRowBefore().run()],
              ["Row below", () => c().addRowAfter().run()],
              ["Column left", () => c().addColumnBefore().run()],
              ["Column right", () => c().addColumnAfter().run()],
              ["Delete row", () => c().deleteRow().run()],
              ["Delete column", () => c().deleteColumn().run()],
              ["Merge cells", () => c().mergeCells().run()],
              ["Split cell", () => c().splitCell().run()],
              ["Header row", () => c().toggleHeaderRow().run()],
            ] as const
          ).map(([label, fn]) => (
            <TB key={label} label={label} onClick={fn} className="px-2 text-[12px]">
              {label}
            </TB>
          ))}
          <ColorPick label="Cell colour" icon={<span className="text-[12px]">Fill</span>} value={(editor.getAttributes("tableCell").backgroundColor as string) ?? null} resetLabel="No fill" onChange={(v) => c().setCellAttribute("backgroundColor", v).run()} />
          <TB label="Delete table" onClick={() => c().deleteTable().run()} className="text-red-300">
            <Trash2 className="h-4 w-4" />
          </TB>
        </div>
      )}
    </div>
  );
}

// ─── Find and replace ───────────────────────────────────────────────

function FindPanel({ editor, replace, onClose }: { editor: Editor; replace: boolean; onClose: () => void }) {
  const [term, setTerm] = useState("");
  const [by, setBy] = useState("");
  const [cs, setCs] = useState(false);
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const version = useEditorState({ editor, selector: ({ editor: e }) => e.state.doc });
  const matches = useMemo(() => findMatches(version, term, cs), [version, term, cs]);
  const i = matches.length ? Math.min(index, matches.length - 1) : 0;

  useEffect(() => input.current?.focus(), []);
  useEffect(() => {
    editor.commands.setSearchTerm(term, cs, i);
    const m = matches[i];
    if (m) {
      // Scroll the match into view without taking focus from this panel.
      const dom = editor.view.domAtPos(m.from);
      const el = (dom.node.nodeType === 1 ? dom.node : dom.node.parentElement) as HTMLElement | null;
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [editor, term, cs, i, matches]);

  const go = (d: 1 | -1) => matches.length && setIndex((i + d + matches.length) % matches.length);
  const replaceOne = () => {
    const m = matches[i];
    if (!m) return;
    editor.view.dispatch(editor.state.tr.insertText(by, m.from, m.to));
  };
  const replaceAll = () => {
    if (!matches.length) return;
    let tr = editor.state.tr;
    for (const m of [...matches].reverse()) tr = tr.insertText(by, m.from, m.to);
    editor.view.dispatch(tr);
    toast(`Replaced ${matches.length} ${matches.length === 1 ? "match" : "matches"}`, "success");
  };

  return (
    <div className="sticky top-3 z-30 float-right mr-4 mt-3 w-[340px] rounded-xl bg-surface p-3 shadow-lg ring-1 ring-line print:hidden" role="search">
      <div className="flex items-center gap-1.5">
        <input
          ref={input}
          value={term}
          onChange={(e) => (setTerm(e.target.value), setIndex(0))}
          onKeyDown={(e) => {
            if (e.key === "Enter") go(e.shiftKey ? -1 : 1);
            if (e.key === "Escape") onClose();
          }}
          placeholder="Find in document"
          aria-label="Find"
          className="h-8 min-w-0 flex-1 rounded-md border border-line-strong px-2 text-[13px] outline-none focus:border-brand-500 bg-sunken text-fg"
        />
        <span className="w-14 text-center text-[12px] tabular-nums text-fg-muted">{term ? `${matches.length ? i + 1 : 0}/${matches.length}` : ""}</span>
        <TB label="Previous" onClick={() => go(-1)}>
          <ChevronUp className="h-4 w-4" />
        </TB>
        <TB label="Next" onClick={() => go(1)}>
          <ChevronDown className="h-4 w-4" />
        </TB>
        <TB label="Close" onClick={onClose}>
          <X className="h-4 w-4" />
        </TB>
      </div>
      {replace && (
        <div className="mt-2 flex items-center gap-1.5">
          <input value={by} onChange={(e) => setBy(e.target.value)} placeholder="Replace with" aria-label="Replace with" className="h-8 min-w-0 flex-1 rounded-md border border-line-strong px-2 text-[13px] outline-none focus:border-brand-500 bg-sunken text-fg" />
          <Button size="sm" onClick={replaceOne} disabled={!matches.length}>
            Replace
          </Button>
          <Button size="sm" onClick={replaceAll} disabled={!matches.length}>
            All
          </Button>
        </div>
      )}
      <label className="mt-2 flex items-center gap-2 text-[12px] text-fg-muted">
        <input type="checkbox" checked={cs} onChange={(e) => setCs(e.target.checked)} className="accent-brand-500" /> Match case
      </label>
    </div>
  );
}

// ─── Dialogs ────────────────────────────────────────────────────────

function LinkDialog({ editor, open, onClose }: { editor: Editor; open: boolean; onClose: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (open) setUrl((editor.getAttributes("link").href as string) ?? "");
  }, [open, editor]);
  const apply = () => {
    const raw = url.trim();
    if (!raw) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else {
      const href = /^(https?:|mailto:)/i.test(raw) ? raw : raw.includes("@") && !raw.includes("/") ? `mailto:${raw}` : `https://${raw}`;
      const { empty } = editor.state.selection;
      if (empty && !editor.isActive("link")) editor.chain().focus().insertContent({ type: "text", text: raw, marks: [{ type: "link", attrs: { href } }] }).run();
      else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Link"
      width={420}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={apply}>
            {url.trim() ? "Apply" : "Remove link"}
          </Button>
        </>
      }
    >
      <input
        autoFocus
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && apply()}
        placeholder="https://example.com"
        aria-label="Link address"
        className="h-9 w-full rounded-md border border-line-strong px-2.5 text-[14px] outline-none focus:border-brand-500 bg-sunken text-fg"
      />
    </Modal>
  );
}

const PAGE_SIZES: Record<string, { label: string; size: [number, number] }> = {
  a4: { label: "A4 (21 × 29.7 cm)", size: [A4.width, A4.height] },
  letter: { label: "Letter (8.5 × 11 in)", size: [LETTER.width, LETTER.height] },
  legal: { label: "Legal (8.5 × 14 in)", size: [612, 1008] },
  a5: { label: "A5 (14.8 × 21 cm)", size: [419.5, 595.3] },
};
const MARGINS: Record<string, { label: string; m: PageSetup["margin"] }> = {
  normal: { label: "Normal (2.54 cm)", m: { top: 72, right: 72, bottom: 72, left: 72 } },
  narrow: { label: "Narrow (1.27 cm)", m: { top: 36, right: 36, bottom: 36, left: 36 } },
  moderate: { label: "Moderate", m: { top: 72, right: 54, bottom: 72, left: 54 } },
  wide: { label: "Wide", m: { top: 72, right: 144, bottom: 72, left: 144 } },
};

function PageSetupDialog({ open, meta, onClose, onChange }: { open: boolean; meta: DocMeta; onClose: () => void; onChange: (m: DocMeta) => void }) {
  const landscape = meta.page.width > meta.page.height;
  const [w, h] = landscape ? [meta.page.height, meta.page.width] : [meta.page.width, meta.page.height];
  const sizeKey = Object.entries(PAGE_SIZES).find(([, v]) => Math.abs(v.size[0] - w) < 2 && Math.abs(v.size[1] - h) < 2)?.[0] ?? "custom";
  const marginKey = Object.entries(MARGINS).find(([, v]) => JSON.stringify(v.m) === JSON.stringify(meta.page.margin))?.[0] ?? "custom";
  const setPage = (size: [number, number], land: boolean, margin = meta.page.margin) =>
    onChange({ ...meta, page: { width: land ? size[1] : size[0], height: land ? size[0] : size[1], margin } });
  return (
    <Modal open={open} onClose={onClose} title="Page setup" width={420} footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      <div className="grid gap-3 text-[13px]">
        <label className="grid gap-1">
          <span className="text-fg-muted">Paper size</span>
          <Select
            value={sizeKey}
            onChange={(k) => PAGE_SIZES[k] && setPage(PAGE_SIZES[k].size, landscape)}
            options={[...Object.entries(PAGE_SIZES).map(([k, v]) => ({ value: k, label: v.label })), ...(sizeKey === "custom" ? [{ value: "custom", label: `Custom (${Math.round(w)} × ${Math.round(h)} pt)` }] : [])]}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-fg-muted">Orientation</span>
          <Select value={landscape ? "landscape" : "portrait"} onChange={(o) => setPage([w, h], o === "landscape")} options={[{ value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }]} />
        </label>
        <label className="grid gap-1">
          <span className="text-fg-muted">Margins</span>
          <Select
            value={marginKey}
            onChange={(k) => MARGINS[k] && setPage([w, h], landscape, MARGINS[k].m)}
            options={[...Object.entries(MARGINS).map(([k, v]) => ({ value: k, label: v.label })), ...(marginKey === "custom" ? [{ value: "custom", label: "From the document" }] : [])]}
          />
        </label>
        <div className="grid grid-cols-[1fr_90px] gap-2">
          <label className="grid gap-1">
            <span className="text-fg-muted">Body font</span>
            <Select value={meta.font} onChange={(font) => onChange({ ...meta, font })} options={[...new Set([meta.font, ...FONTS])].map((f) => ({ value: f, label: f }))} />
          </label>
          <label className="grid gap-1">
            <span className="text-fg-muted">Size</span>
            <Select value={String(meta.fontSize)} onChange={(v) => onChange({ ...meta, fontSize: Number(v) })} options={[...new Set([meta.fontSize, ...SIZES.slice(0, 10)])].map((z) => ({ value: String(z), label: `${z} pt` }))} />
          </label>
        </div>
      </div>
    </Modal>
  );
}

// ─── Status bar ─────────────────────────────────────────────────────

function StatusBar({ editor, meta, zoom, setZoom }: { editor: Editor; meta: DocMeta; zoom: number; setZoom: (z: number) => void }) {
  const counts = useEditorState({
    editor,
    selector: ({ editor: e }) => ({ words: e.storage.characterCount.words() as number, chars: e.storage.characterCount.characters() as number, doc: e.state.doc }),
  });
  const [pages, setPages] = useState(1);
  useEffect(() => {
    const el = editor.view.dom as HTMLElement;
    const perPage = (meta.page.height - meta.page.margin.top - meta.page.margin.bottom) * PT_TO_PX;
    let breaks = 0;
    counts.doc.descendants((n) => {
      if (n.type.name === "pageBreak") breaks++;
    });
    setPages(Math.max(1 + breaks, Math.ceil(el.scrollHeight / perPage)));
  }, [counts.doc, editor, meta]);
  return (
    <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-line bg-surface px-3 text-[12px] text-fg-muted print:hidden">
      <span>About {pages} page{pages === 1 ? "" : "s"}</span>
      <span>
        {counts.words.toLocaleString()} word{counts.words === 1 ? "" : "s"}
      </span>
      <span className="hidden sm:inline">{counts.chars.toLocaleString()} characters</span>
      <label className="ml-auto flex items-center gap-2">
        Zoom
        <input type="range" min={50} max={200} step={10} value={Math.round(zoom * 100)} onChange={(e) => setZoom(Number(e.target.value) / 100)} className="w-28 accent-brand-500" aria-label="Zoom" />
        <span className="w-9 tabular-nums">{Math.round(zoom * 100)}%</span>
      </label>
    </footer>
  );
}
