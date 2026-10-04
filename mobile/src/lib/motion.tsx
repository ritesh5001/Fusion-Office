import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Reduce motion: the in-app switch (Settings) wins; without a choice we follow
 * the system setting. Components read it and skip loops, floating and
 * flourishes, while state changes stay clear.
 */
const KEY = "fo-motion";
type Ctx = { reduced: boolean; setReduced: (v: boolean) => void };
const MotionContext = createContext<Ctx>({ reduced: false, setReduced: () => {} });

export function MotionProvider({ children }: { children: ReactNode }) {
  const [system, setSystem] = useState(false);
  const [choice, setChoice] = useState<boolean | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSystem);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setSystem);
    AsyncStorage.getItem(KEY).then((v) => v && setChoice(v === "reduced"));
    return () => sub.remove();
  }, []);

  const setReduced = (v: boolean) => {
    setChoice(v);
    AsyncStorage.setItem(KEY, v ? "reduced" : "full");
  };

  return <MotionContext.Provider value={{ reduced: choice ?? system, setReduced }}>{children}</MotionContext.Provider>;
}

export const useMotion = () => useContext(MotionContext);
export const useReduced = () => useContext(MotionContext).reduced;
