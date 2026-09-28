import type { Rect } from "./types";

type Events = {
  "scroll-to-page": { pageId: string; rect?: Rect; smooth?: boolean };
  toast: { message: string; kind?: "info" | "error" | "success" };
};

type Handler<K extends keyof Events> = (payload: Events[K]) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlers = new Map<keyof Events, Set<(payload: any) => void>>();

export const editorEvents = {
  on<K extends keyof Events>(event: K, fn: Handler<K>) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event)!.add(fn);
    return () => {
      handlers.get(event)?.delete(fn);
    };
  },
  emit<K extends keyof Events>(event: K, payload: Events[K]) {
    handlers.get(event)?.forEach((fn) => fn(payload));
  },
};

export const toast = (message: string, kind: Events["toast"]["kind"] = "info") =>
  editorEvents.emit("toast", { message, kind });
