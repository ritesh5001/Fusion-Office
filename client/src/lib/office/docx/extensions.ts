/**
 * TipTap extensions for the Word editor (and for rendering slide text). Only
 * nodes and marks listed here can exist in a document, so anything pasted or
 * imported is reduced to this safe, known set.
 */
import { Extension, mergeAttributes, Node, type Extensions } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { BackgroundColor, Color, FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { Image } from "@tiptap/extension-image";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { CharacterCount, Placeholder } from "@tiptap/extensions";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: { setPageBreak: () => ReturnType };
    search: { setSearchTerm: (term: string, caseSensitive?: boolean, current?: number) => ReturnType };
  }
}

/** A hard page break (Word's Ctrl+Enter). */
export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: "div[data-page-break]" }, { tag: "hr[data-page-break]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-page-break": "", class: "fo-page-break" })],
  addCommands() {
    return { setPageBreak: () => ({ commands }) => commands.insertContent({ type: this.name }) };
  },
  addKeyboardShortcuts() {
    return { "Mod-Enter": () => this.editor.commands.setPageBreak() };
  },
});

const withBackground = <T extends typeof TableCell | typeof TableHeader>(ext: T) =>
  ext.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        backgroundColor: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.backgroundColor || el.getAttribute("data-background") || null,
          renderHTML: (a: { backgroundColor?: string | null }) => (a.backgroundColor ? { style: `background-color:${a.backgroundColor}` } : {}),
        },
      };
    },
  });

// ── Find: highlight every match ──

type SearchState = { term: string; caseSensitive: boolean; current: number; deco: DecorationSet };
export const searchKey = new PluginKey<SearchState>("fo-search");

/** Every match of `term` in the document, as editor positions. */
export function findMatches(doc: PMNode, term: string, caseSensitive = false): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  if (!term) return out;
  const needle = caseSensitive ? term : term.toLowerCase();
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // Each inline leaf (image, line break) counts as one character, like one position.
    const text = node.textBetween(0, node.content.size, undefined, "￼");
    const hay = caseSensitive ? text : text.toLowerCase();
    for (let i = hay.indexOf(needle); i >= 0; i = hay.indexOf(needle, i + needle.length)) out.push({ from: pos + 1 + i, to: pos + 1 + i + needle.length });
    return false;
  });
  return out;
}

export const Search = Extension.create({
  name: "search",
  addCommands() {
    return {
      setSearchTerm:
        (term, caseSensitive = false, current = 0) =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(searchKey, { term, caseSensitive, current }));
          return true;
        },
    };
  },
  addProseMirrorPlugins() {
    const build = (doc: PMNode, term: string, cs: boolean, current: number) =>
      DecorationSet.create(
        doc,
        findMatches(doc, term, cs).map((m, i) => Decoration.inline(m.from, m.to, { class: i === current ? "fo-search-hit fo-search-current" : "fo-search-hit" })),
      );
    return [
      new Plugin({
        key: searchKey,
        state: {
          init: (): SearchState => ({ term: "", caseSensitive: false, current: 0, deco: DecorationSet.empty }),
          apply(tr, prev): SearchState {
            const meta = tr.getMeta(searchKey) as Omit<SearchState, "deco"> | undefined;
            if (meta) return { ...meta, deco: build(tr.doc, meta.term, meta.caseSensitive, meta.current) };
            if (tr.docChanged && prev.term) return { ...prev, deco: build(tr.doc, prev.term, prev.caseSensitive, prev.current) };
            return prev;
          },
        },
        props: { decorations: (state) => searchKey.getState(state)?.deco },
      }),
    ];
  },
});

/** The document schema. `placeholder` only matters for the live editor. */
export function wordExtensions(placeholder = "Start typing…"): Extensions {
  return [
    StarterKit.configure({
      link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"], HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" } },
      undoRedo: { depth: 300 },
      heading: { levels: [1, 2, 3, 4, 5, 6] },
    }),
    TextStyle,
    Color,
    FontFamily,
    FontSize,
    BackgroundColor,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Subscript,
    Superscript,
    Image.configure({ inline: true, allowBase64: true, resize: { enabled: true, directions: ["top-left", "top-right", "bottom-left", "bottom-right"], alwaysPreserveAspectRatio: true, minWidth: 24, minHeight: 24 } }),
    Table.configure({ resizable: true }),
    TableRow,
    withBackground(TableHeader),
    withBackground(TableCell),
    PageBreak,
    CharacterCount,
    Placeholder.configure({ placeholder }),
    Search,
  ];
}
