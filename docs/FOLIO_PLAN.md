# Folio: a face for Fusion Office

Inspired by the idea behind [AIMO](https://aimo.nrmk.dev/) ("a face that shows what your agent is doing"), adapted to a **light** UI and to a tool site. Nothing is copied from AIMO: the character, shapes and code are our own.

## Goal

Give Fusion Office a personality people remember, without slowing anyone down. The tool grid stays the heart of the site; Folio sits where a status matters and turns that status into a face.

## Principles

1. **Every expression means something.** Folio's mood is the state of the page (waiting, working, done, problem). No decoration-only motion.
2. **Light and calm.** Light backgrounds, soft blue washes, one character per screen, generous space.
3. **Fast.** Plain SVG and CSS. No 3D, no video, no animation library. The component is a few kilobytes.
4. **Accessible.** Decorative Folios are hidden from screen readers; ones that carry meaning have a label ("Folio, happy"). The clickable one is a real button. `prefers-reduced-motion` turns every animation off.
5. **Honest.** What Folio says matches what happens (for example "Converting on our server" for server tools, not "on your device").

## The character

A glassy document with a folded corner and a face. Colour follows mood, so the state reads even from the corner of an eye.

| Mood | Face | Colour | Motion | Used for |
|---|---|---|---|---|
| idle | two oval eyes, blinking | brand blue | slow breathing, eyes follow the pointer | waiting for input |
| curious | bigger eyes, small "o" mouth | sky blue | little hop, head tilt | search focused, file dragged over the drop area |
| working | eyes scanning left–right, wavy mouth | indigo | quick bob, ring of light orbiting | reading files, processing, typing in search |
| happy | ^ ^ eyes, smile, blush | green | two jumps, squash and stretch | result ready, search found tools |
| wink | one eye closed | green | jump | clicking Folio (a hello) |
| oops | > < eyes, "o" mouth | red | one shake | errors |
| sleepy | flat eyes, floating z's | lavender | slow breathing | 404 page |
| confused | one big and one small eye, "?" | amber | tilted | search with no results |

Implementation: `client/src/components/mascot/Mascot.tsx` (component) and the "Folio" block in `client/src/app/globals.css` (mood colours, keyframes). Mood colours are registered CSS properties (`@property`) so they fade from one mood to the next.

```tsx
<Mascot mood="working" size={96} follow interactive label="Folio" />
```

## Where Folio lives

### Phase 1: character and tool pages (done)
- [x] Mascot component with 8 moods, blink, pointer-following eyes, click-to-wink, reduced motion.
- [x] Drop area: idle, curious while a file is dragged over ("Ooh, let go to add it!").
- [x] Reading files: working ("Reading your files…").
- [x] Processing: working, with a message that matches where the tool runs (device, server, AI).
- [x] Errors: oops beside the message.
- [x] Result: happy, "All done!", click for a wink.

### Phase 2: homepage (done)
- [x] Hero: Folio replaces the static artwork, file-type tiles float around it, a speech bubble says what it's thinking.
- [x] Folio reacts to the search: curious when focused, working while typing, happy with the match count ("Press Enter to open Merge PDF"), confused when nothing matches.
- [x] Phones: a smaller Folio above the headline, same reactions.
- [x] "How it works" scroll story (like AIMO's states section, in light colours): Folio stays pinned on the left and changes mood as each step scrolls past: pick a tool → drop your file → it works → download → if something's wrong it says so. On phones each step shows its own small Folio.
- [x] Empty search results: confused Folio.

### Phase 3: small moments (done)
- [x] 404 page: sleepy Folio, "This page is taking a nap".
- [x] Footer link to "How it works".

### Phase 4: next (proposed)
- [ ] **Office editors and PDF editor:** a small Folio in the header save indicator (working while saving, happy when saved, oops if saving fails).
- [ ] **Custom tools** (image editor, watermark remover, organize, crop…): hook their own progress and results into Folio the same way as the standard tools.
- [ ] **Download moment:** a wink when the download starts.
- [ ] **"Make it yours" playground** (AIMO's playground idea): pick Folio's mood and colour, copy a sticker/PNG. Fun, shareable, optional.
- [ ] **Sound off by default**, optional tiny "pop" on done (only if users ask for it).

## Quality checklist (run after every change)
- Desktop 1440, laptop 1024, tablet 768, phone 390: no horizontal scroll, Folio never overlaps text.
- Every mood reachable in the UI: idle, curious, working, happy, wink, oops, sleepy, confused.
- Reduced motion (System Settings → Accessibility → Reduce motion): no animation, moods still change.
- Keyboard: Tab reaches the clickable Folio; Enter/Space make it wink.
- Screen reader: speech bubble is announced politely; decorative Folios are silent.
- No console errors; `npx tsc --noEmit`, `npm test` and `npm run build` pass.
