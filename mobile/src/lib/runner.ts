import { useCallback, useRef, useState } from "react";
import * as haptics from "./haptics";
import { saveOutput, type PickedFile, type SavedFile } from "./files";
import { addRecent } from "./recents";
import type { NativeTool } from "./native";
import type { ToolDef } from "./tools";

export const STEPS = ["Reading file", "Optimizing locally", "Preparing result"] as const;

export type RunState =
  | { phase: "idle" }
  | { phase: "running"; verb: string; step: number; real?: number; started: number; device: boolean }
  | { phase: "done"; outputs: SavedFile[]; inputBytes: number; compress: boolean }
  | { phase: "error"; message: string };

/** The shortest a run lasts, so the processing motion can be followed (fast files wait a moment). */
const MIN_MS = 1400;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Runs a native tool on picked files, saves the results on the device and adds them to Recent. */
export function useRunner() {
  const [state, setState] = useState<RunState>({ phase: "idle" });
  const live = useRef(0);

  const run = useCallback(async (tool: NativeTool, def: ToolDef, files: PickedFile[], options: Record<string, string | number>) => {
    const id = ++live.current;
    const started = Date.now();
    const set = (s: RunState) => id === live.current && setState(s);
    set({ phase: "running", verb: tool.verb, step: 0, started, device: tool.runs === "device" });
    try {
      if (tool.minFiles && files.length < tool.minFiles) throw new Error(`Add at least ${tool.minFiles} files.`);
      await wait(250);
      set({ phase: "running", verb: tool.verb, step: 1, started, device: tool.runs === "device" });
      const outputs = await tool.run(files, options, (f) => set({ phase: "running", verb: tool.verb, step: 1, real: f, started, device: tool.runs === "device" }));
      if (!outputs.length) throw new Error("The tool didn't produce a file.");
      set({ phase: "running", verb: tool.verb, step: 2, started, device: tool.runs === "device" });
      const saved: SavedFile[] = [];
      for (const o of outputs) {
        const file = saveOutput(o.name, o.bytes, o.mimeType);
        saved.push(file);
        await addRecent(file, def.slug, def.name);
      }
      await wait(Math.max(300, MIN_MS - (Date.now() - started)));
      haptics.success();
      set({ phase: "done", outputs: saved, inputBytes: files.reduce((n, f) => n + f.size, 0), compress: def.slug.startsWith("compress") });
    } catch (e) {
      haptics.failure();
      set({ phase: "error", message: (e as Error).message || "Something went wrong." });
    }
  }, []);

  const reset = useCallback(() => {
    live.current++;
    setState({ phase: "idle" });
  }, []);

  return { state, run, reset };
}

/** Progress shown: the tool's own fraction when it reports one, otherwise an eased estimate that never claims to be done. */
export function progressOf(s: Extract<RunState, { phase: "running" }>, now: number) {
  const t = now - s.started;
  const pct = s.step === 0 ? Math.min(14, t / 40) : s.step === 1 ? 15 + 75 * Math.max(s.real ?? 0, 1 - Math.exp(-Math.max(0, t - 300) / 1400)) : 95;
  return Math.max(1, Math.min(98, Math.round(pct)));
}
