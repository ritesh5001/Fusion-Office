import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { PickedFile } from "./files";

/**
 * App-wide session: the files staged on the home screen (from the drop card or
 * the + button in the tab bar) and whether the "add a file" sheet is open.
 */
type Ctx = {
  staged: PickedFile[] | null;
  stage: (files: PickedFile[]) => void;
  clear: () => void;
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
};
const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [staged, setStaged] = useState<PickedFile[] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const stage = useCallback((files: PickedFile[]) => files.length && setStaged(files), []);
  const clear = useCallback(() => setStaged(null), []);
  return (
    <SessionContext.Provider value={{ staged, stage, clear, sheetOpen, openSheet: () => setSheetOpen(true), closeSheet: () => setSheetOpen(false) }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
}
