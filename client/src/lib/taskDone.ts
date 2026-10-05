/**
 * "A task just finished" signal (a conversion completed or a result was
 * downloaded). The feedback prompt listens for it; tools only fire it.
 */
export const TASK_DONE = "fo-task-done";

export function taskDone() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(TASK_DONE));
}
