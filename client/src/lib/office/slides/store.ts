"use client";

import { create } from "zustand";
import { layoutSlide, uid, type Deck, type El, type LayoutId, type Slide } from "./model";

interface Snapshot {
  deck: Deck;
  current: number;
}

interface SlidesStore {
  deck: Deck;
  current: number;
  selected: string[];
  editing: string | null;
  past: Snapshot[];
  future: Snapshot[];
  /** Deck at the start of a drag, so the whole drag is one undo step. */
  gesture: Deck | null;
  clipboard: El[];

  load: (deck: Deck) => void;
  /** Change the deck as one undo step (or silently during a gesture). */
  change: (fn: (deck: Deck) => Deck) => void;
  beginGesture: () => void;
  endGesture: () => void;
  undo: () => void;
  redo: () => void;

  go: (i: number) => void;
  select: (ids: string[]) => void;
  setEditing: (id: string | null) => void;

  updateEls: (ids: string[], fn: (el: El) => El) => void;
  addEls: (els: El[]) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  copy: (cut?: boolean) => void;
  paste: () => void;
  arrange: (to: "front" | "back" | "forward" | "backward") => void;

  addSlide: (layout: LayoutId, after?: number) => void;
  duplicateSlide: (i: number) => void;
  deleteSlide: (i: number) => void;
  moveSlide: (from: number, to: number) => void;
  updateSlide: (i: number, fn: (s: Slide) => Slide) => void;
}

const mapSlide = (deck: Deck, i: number, fn: (s: Slide) => Slide): Deck => ({ ...deck, slides: deck.slides.map((s, j) => (j === i ? fn(s) : s)) });

export const useSlides = create<SlidesStore>((set, get) => ({
  deck: { width: 1280, height: 720, theme: { id: "", name: "", heading: "", body: "", bg: "#fff", text: "#000", accent: "#2f54eb", muted: "#666" }, slides: [] },
  current: 0,
  selected: [],
  editing: null,
  past: [],
  future: [],
  gesture: null,
  clipboard: [],

  load: (deck) => set({ deck, current: 0, selected: [], editing: null, past: [], future: [], gesture: null }),

  change: (fn) => {
    const { deck, current, past, gesture } = get();
    const next = fn(deck);
    if (next === deck) return;
    if (gesture) set({ deck: next });
    else set({ deck: next, past: [...past.slice(-99), { deck, current }], future: [] });
  },

  beginGesture: () => set({ gesture: get().deck }),
  endGesture: () => {
    const { gesture, deck, current, past } = get();
    if (gesture && gesture !== deck) set({ gesture: null, past: [...past.slice(-99), { deck: gesture, current }], future: [] });
    else set({ gesture: null });
  },

  undo: () => {
    const { past, future, deck, current } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    set({ deck: prev.deck, current: Math.min(prev.current, prev.deck.slides.length - 1), past: past.slice(0, -1), future: [{ deck, current }, ...future], selected: [], editing: null });
  },
  redo: () => {
    const { past, future, deck, current } = get();
    const next = future[0];
    if (!next) return;
    set({ deck: next.deck, current: Math.min(next.current, next.deck.slides.length - 1), past: [...past, { deck, current }], future: future.slice(1), selected: [], editing: null });
  },

  go: (i) => {
    const n = get().deck.slides.length;
    set({ current: Math.max(0, Math.min(n - 1, i)), selected: [], editing: null });
  },
  select: (ids) => set({ selected: ids, editing: get().editing && ids.includes(get().editing!) ? get().editing : null }),
  setEditing: (id) => set({ editing: id, selected: id ? [id] : get().selected }),

  updateEls: (ids, fn) => {
    const { current } = get();
    const set_ = new Set(ids);
    get().change((d) => mapSlide(d, current, (s) => ({ ...s, elements: s.elements.map((e) => (set_.has(e.id) ? fn(e) : e)) })));
  },

  addEls: (els) => {
    const { current } = get();
    get().change((d) => mapSlide(d, current, (s) => ({ ...s, elements: [...s.elements, ...els] })));
    set({ selected: els.map((e) => e.id) });
  },

  removeSelected: () => {
    const { current, selected } = get();
    if (!selected.length) return;
    const ids = new Set(selected);
    get().change((d) => mapSlide(d, current, (s) => ({ ...s, elements: s.elements.filter((e) => !ids.has(e.id)) })));
    set({ selected: [], editing: null });
  },

  duplicateSelected: () => {
    const { deck, current, selected } = get();
    const copies = deck.slides[current].elements.filter((e) => selected.includes(e.id)).map((e) => ({ ...structuredClone(e), id: uid(), x: e.x + 20, y: e.y + 20, locked: undefined }));
    if (copies.length) get().addEls(copies);
  },

  copy: (cut) => {
    const { deck, current, selected } = get();
    const els = deck.slides[current].elements.filter((e) => selected.includes(e.id));
    if (!els.length) return;
    set({ clipboard: structuredClone(els) });
    if (cut) get().removeSelected();
  },

  paste: () => {
    const { clipboard, deck, current } = get();
    if (!clipboard.length) return;
    const existing = new Set(deck.slides[current].elements.map((e) => `${Math.round(e.x)},${Math.round(e.y)}`));
    // Paste in place on another slide; offset when it would land on the original.
    const offset = clipboard.some((e) => existing.has(`${Math.round(e.x)},${Math.round(e.y)}`)) ? 20 : 0;
    const els = clipboard.map((e) => ({ ...structuredClone(e), id: uid(), x: e.x + offset, y: e.y + offset, locked: undefined }));
    get().addEls(els);
    set({ clipboard: clipboard.map((e) => ({ ...e, x: e.x + offset, y: e.y + offset })) });
  },

  arrange: (to) => {
    const { current, selected } = get();
    const ids = new Set(selected);
    get().change((d) =>
      mapSlide(d, current, (s) => {
        const els = [...s.elements];
        if (to === "front") return { ...s, elements: [...els.filter((e) => !ids.has(e.id)), ...els.filter((e) => ids.has(e.id))] };
        if (to === "back") return { ...s, elements: [...els.filter((e) => ids.has(e.id)), ...els.filter((e) => !ids.has(e.id))] };
        const order = to === "forward" ? [...els.keys()].reverse() : [...els.keys()];
        for (const i of order) {
          const j = to === "forward" ? i + 1 : i - 1;
          if (ids.has(els[i].id) && j >= 0 && j < els.length && !ids.has(els[j].id)) [els[i], els[j]] = [els[j], els[i]];
        }
        return { ...s, elements: els };
      }),
    );
  },

  addSlide: (layout, after) => {
    const { deck, current } = get();
    const at = (after ?? current) + 1;
    const slide = layoutSlide(deck, layout);
    // New slides keep the current slide's background.
    const bg = deck.slides[Math.min(current, deck.slides.length - 1)]?.background;
    if (bg) slide.background = { ...bg };
    get().change((d) => ({ ...d, slides: [...d.slides.slice(0, at), slide, ...d.slides.slice(at)] }));
    set({ current: at, selected: [], editing: null });
  },

  duplicateSlide: (i) => {
    get().change((d) => {
      const copy: Slide = { ...structuredClone(d.slides[i]), id: uid("s") };
      copy.elements = copy.elements.map((e) => ({ ...e, id: uid() }));
      return { ...d, slides: [...d.slides.slice(0, i + 1), copy, ...d.slides.slice(i + 1)] };
    });
    set({ current: i + 1, selected: [] });
  },

  deleteSlide: (i) => {
    const { deck } = get();
    if (deck.slides.length <= 1) return;
    get().change((d) => ({ ...d, slides: d.slides.filter((_, j) => j !== i) }));
    set({ current: Math.max(0, Math.min(i, get().deck.slides.length - 1)), selected: [], editing: null });
  },

  moveSlide: (from, to) => {
    if (from === to) return;
    get().change((d) => {
      const slides = [...d.slides];
      const [s] = slides.splice(from, 1);
      slides.splice(to, 0, s);
      return { ...d, slides };
    });
    set({ current: to });
  },

  updateSlide: (i, fn) => get().change((d) => mapSlide(d, i, fn)),
}));
