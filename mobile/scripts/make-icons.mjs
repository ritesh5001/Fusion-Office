// Generates the app icon, Android adaptive layers, splash and favicon from the
// Fusion Office logo (the same mark as client/src/app/icon.svg).
// Run from the repo root: node mobile/scripts/make-icons.mjs
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../package.json"));
const sharp = require("sharp");
const out = (f) => path.join(here, "../assets", f);

/** The logo's shapes in its own 32×32 space (content spans x 4–28, y 3–28). */
const LOGO = `
  <rect x="4" y="7" width="16" height="21" rx="4" fill="#8b7cf6"/>
  <rect x="11" y="3" width="17" height="22" rx="4" fill="#cdf564"/>
  <path d="M15.5 10h8M15.5 14h8M15.5 18h5" stroke="#0c0f06" stroke-width="2" stroke-linecap="round"/>`;

/** Places the logo centred, `size` px wide, on a `canvas` px square. */
const placed = (canvas, size, body = LOGO) => {
  const s = size / 24; // content is 24 units wide
  const x = (canvas - 24 * s) / 2 - 4 * s;
  const y = (canvas - 25 * s) / 2 - 3 * s;
  return `<g transform="translate(${x} ${y}) scale(${s})">${body}</g>`;
};

const background = (n) => `
  <defs>
    <radialGradient id="glow" cx="50%" cy="42%" r="62%">
      <stop offset="0" stop-color="#3b2f8f"/>
      <stop offset="0.55" stop-color="#151638"/>
      <stop offset="1" stop-color="#0a0c11"/>
    </radialGradient>
    <radialGradient id="lime" cx="78%" cy="88%" r="45%">
      <stop offset="0" stop-color="#cdf564" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#cdf564" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${n}" height="${n}" fill="url(#glow)"/>
  <rect width="${n}" height="${n}" fill="url(#lime)"/>`;

const svg = (n, inner) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 ${n} ${n}">${inner}</svg>`);

/** One-colour version for Android themed icons: white shapes, lines cut out, a gap between the sheets. */
const MONO = `
  <defs>
    <mask id="back"><rect x="0" y="0" width="32" height="32" fill="#fff"/><rect x="10" y="2" width="19" height="24" rx="5" fill="#000"/></mask>
    <mask id="front"><rect x="0" y="0" width="32" height="32" fill="#fff"/><path d="M15.5 10h8M15.5 14h8M15.5 18h5" stroke="#000" stroke-width="2" stroke-linecap="round"/></mask>
  </defs>
  <rect x="4" y="7" width="16" height="21" rx="4" fill="#fff" mask="url(#back)"/>
  <rect x="11" y="3" width="17" height="22" rx="4" fill="#fff" mask="url(#front)"/>`;

const jobs = [
  // iOS / store icon: no transparency, the OS rounds the corners.
  ["icon.png", svg(1024, background(1024) + placed(1024, 600))],
  // Android adaptive icon: 108dp layers; keep the mark inside the 66dp safe zone.
  ["android-icon-background.png", svg(1024, background(1024))],
  ["android-icon-foreground.png", svg(1024, placed(1024, 470))],
  ["android-icon-monochrome.png", svg(1024, placed(1024, 470, MONO))],
  // Splash: the mark on transparent; app.json sets the navy background.
  ["splash-icon.png", svg(1024, placed(1024, 860))],
  ["favicon.png", svg(48, placed(48, 40))],
];

for (const [file, buf] of jobs) {
  const size = file === "favicon.png" ? 48 : 1024;
  const img = sharp(buf, { density: 300 }).resize(size, size).png();
  await (file === "icon.png" ? img.flatten({ background: "#0a0c11" }) : img).toFile(out(file));
  console.log("wrote", file);
}
