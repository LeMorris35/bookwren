// Renders the app icon and splash screens from the wren-on-book mark.
// Run: node scripts/make-app-assets.mjs
// Then: npx @capacitor/assets generate --ios
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const CREAM = "#f6efe0";
const RUSSET = "#9c5a33";
const RAVEN_BG = "#12101c";
const VIOLET = "#a78bfa";

/** The wren-on-book mark, in a 64×64 viewBox — same shapes as the app logo. */
function wrenMark(color) {
  return `
    <g fill="${color}">
      <g transform="translate(9 1) scale(0.78)">
        <polygon points="3,25.5 16,22.5 16,28"/>
        <circle cx="21.5" cy="25" r="9.5"/>
        <ellipse cx="34" cy="38" rx="15.5" ry="13"/>
        <rect x="45" y="13" width="6.5" height="27" rx="3.2"
          transform="rotate(30 48 38)"/>
      </g>
      <rect x="30" y="39" width="2.4" height="11" rx="1.2"/>
      <rect x="38" y="40" width="2.4" height="10" rx="1.2"/>
      <path d="M4 50 C 12 45.5 24 45.5 32 49 C 40 45.5 52 45.5 60 50 L 60 57
        C 52 53.5 40 53.5 32 56.5 C 24 53.5 12 53.5 4 57 Z"/>
    </g>`;
}

/**
 * App icon: 1024×1024, no transparency, no rounded corners (iOS masks it
 * itself). The bird sits inside the safe area so the mask never clips it.
 */
function iconSvg() {
  const scale = 12.5; // 64 → 800px of art, centred in 1024
  const offset = (1024 - 64 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <rect width="1024" height="1024" fill="${CREAM}"/>
    <g transform="translate(${offset} ${offset + 18}) scale(${scale})">
      ${wrenMark(RUSSET)}
    </g>
  </svg>`;
}

/** Splash: a big square canvas iOS crops to any device size. */
function splashSvg(bg, fg) {
  const size = 2732;
  const scale = 14;
  const offset = (size - 64 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${bg}"/>
    <g transform="translate(${offset} ${offset}) scale(${scale})">
      ${wrenMark(fg)}
    </g>
  </svg>`;
}

mkdirSync(new URL("../assets", import.meta.url), { recursive: true });
const out = (name) => new URL(`../assets/${name}`, import.meta.url).pathname.replace(/^\//, "");

const jobs = [
  ["icon.png", iconSvg()],
  ["icon-foreground.png", iconSvg()],
  ["splash.png", splashSvg(CREAM, RUSSET)],
  ["splash-dark.png", splashSvg(RAVEN_BG, VIOLET)],
];

for (const [name, svg] of jobs) {
  await sharp(Buffer.from(svg)).png().toFile(out(name));
  console.log("wrote assets/" + name);
}
console.log("\nNext: npx @capacitor/assets generate --ios");
