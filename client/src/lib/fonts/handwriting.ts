import { Caveat, Homemade_Apple, Indie_Flower } from "next/font/google";

// Self-hosted by Next at build time (no request to Google from the browser).
const caveat = Caveat({ subsets: ["latin"], weight: ["400", "600"], display: "swap" });
const homemade = Homemade_Apple({ subsets: ["latin"], weight: "400", display: "swap" });
const indie = Indie_Flower({ subsets: ["latin"], weight: "400", display: "swap" });

export type HandStyle = "neat" | "cursive" | "casual";

/** CSS font-family for each handwriting style, plus a size factor (fonts differ in size). */
export const HAND_FONTS: Record<HandStyle, { family: string; scale: number; label: string }> = {
  neat: { family: caveat.style.fontFamily, scale: 1.25, label: "Neat" },
  cursive: { family: homemade.style.fontFamily, scale: 0.82, label: "Cursive" },
  casual: { family: indie.style.fontFamily, scale: 1, label: "Casual" },
};
