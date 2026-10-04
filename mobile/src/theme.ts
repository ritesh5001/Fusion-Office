/**
 * Design tokens, matching the website (client/src/app/globals.css): a dark
 * workspace, one lime accent for the primary action, violet for selection.
 */
export const C = {
  app: "#0a0c11",
  navy: "#0e1027",
  sunken: "#0d1016",
  surface: "#12151c",
  raised: "#191d26",
  overlay: "#1d212b",
  line: "#232834",
  lineStrong: "#323846",
  fg: "#eef0f5",
  fgMuted: "#a1a8b8",
  fgSubtle: "#7d8497", // 4.5:1+ on every dark surface
  accent: "#cdf564",
  onAccent: "#0c0f06",
  brand300: "#b6adff",
  brand400: "#9d91fb",
  brand500: "#8b7cf6",
  brand600: "#7462e8",
  brand100: "#e7e3ff",
  brand200: "#d2ccff",
  navyGlow: "#111331",

  // The light "paper" surfaces (drop card, results) and their text.
  ink: "#14152b",
  inkDeep: "#151738", // primary buttons and the selected pill on paper
  paper: "#f5f4f0",
  paperSunken: "#ebe9f2",
  paperText: "#2b2d48",
  paperText2: "#4a4c66",
  paperMuted: "#5d5f78",
  paperSubtle: "#6b6d86",
  paperIcon: "#8a8ca3",
  paperDash: "#c4c2d4",
  paperBorder: "#e0dee9",
  paperLine: "#e3e1ec",
  linkOnPaper: "#5c4dcc", // 5.6:1 on paper

  // Privacy strip states (on ink).
  stripOff: "#1a1c36",
  stripIdle: "#1f2142",
  stripLit: "#2a2c4d",
  stripActive: "#2d2868",
  stripLocked: "#29331d",

  tileGlyph: "#0d0f14", // dark glyph on coloured tiles
  successInk: "#3f7d12",
  successIcon: "#4c8a12",
  dangerInk: "#8a1f1f",
  dangerSoft: "#fdecec",
  heart: "#ff5a6e",
  switchThumb: "#f4f4f5",
  danger: "#ff6b6b",
  amber: "#f5b84a",
} as const;

export const F = {
  display: "PlusJakartaSans_800ExtraBold",
  displayBold: "PlusJakartaSans_700Bold",
  body: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

/** Motion timings from the web motion system (ms). */
export const M = {
  press: 160,
  tab: 250,
  reveal: 420,
  drop: 650,
  ambient: 5000,
} as const;

/** The purple → lime gradient used on borders and headline accents. */
export const GLOW = ["#9d91fb", "#cfc8ff", "#cdf564"] as const;
