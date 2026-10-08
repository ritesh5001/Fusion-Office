import { IText } from "fabric";

/**
 * Touch support for the editor on phones and tablets: one finger works the
 * active tool (or scrolls, with Select), two fingers pinch-zoom and pan.
 */

/** A finger, not a mouse or a pen with hover. */
export const coarsePointer = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

// ─── Two-finger gestures ───────────────────────────────────────────────
// A second finger turns a stroke or drag into a pinch. Whatever the first
// finger started (a pen stroke, a shape, moving an object) is dropped, so a
// pinch never leaves a stray mark on the page.

let pinching = false;
let lastPinchEnd = 0;
const startListeners = new Set<() => void>();

export const pinch = {
  start() {
    pinching = true;
    startListeners.forEach((fn) => fn());
  },
  /** Runs `fn` whenever a pinch starts. Returns the unsubscribe. */
  onStart(fn: () => void) {
    startListeners.add(fn);
    return () => void startListeners.delete(fn);
  },
  end() {
    pinching = false;
    lastPinchEnd = performance.now();
  },
  get active() {
    return pinching;
  },
  /** Did a pinch happen since `t` (a `performance.now()` time), or is one happening? */
  since(t: number) {
    return pinching || lastPinchEnd >= t;
  },
};

// ─── On-screen keyboard ────────────────────────────────────────────────
// iOS only opens the keyboard when an input is focused during a tap. Text
// boxes start editing a moment later (after the page updates), so the tap
// focuses this invisible input first; moving focus from it to the text box
// keeps the keyboard up.

let proxy: HTMLInputElement | null = null;

export function primeKeyboard() {
  if (!coarsePointer()) return;
  if (!proxy) {
    proxy = document.createElement("input");
    proxy.setAttribute("aria-hidden", "true");
    proxy.tabIndex = -1;
    // 16px: smaller text makes iOS zoom the page in when it gets focus.
    proxy.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;border:0;padding:0;pointer-events:none;";
    document.body.appendChild(proxy);
  }
  proxy.focus({ preventScroll: true });
  // If nothing took the focus over (say, the tap didn't start a text box), close the keyboard again.
  setTimeout(() => {
    if (document.activeElement === proxy) proxy?.blur();
  }, 1200);
}

// Fabric types into a hidden 1px-font textarea; iOS zooms the whole page in
// when an input with text under 16px gets focus. Give it 16px.
const initHiddenTextarea = IText.prototype.initHiddenTextarea;
IText.prototype.initHiddenTextarea = function (this: IText) {
  initHiddenTextarea.call(this);
  if (this.hiddenTextarea) this.hiddenTextarea.style.fontSize = "16px";
};
