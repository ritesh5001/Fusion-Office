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
  fgSubtle: "#6c7385",
  accent: "#cdf564",
  onAccent: "#0c0f06",
  brand300: "#b6adff",
  brand400: "#9d91fb",
  brand500: "#8b7cf6",
  brand600: "#7462e8",
  ink: "#14152b",
  paper: "#f5f4f0",
  paperMuted: "#5d5f78",
  paperLine: "#e3e1ec",
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
