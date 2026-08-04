// Category chips get a colored dot from the habitat palette — the color
// sticks with the tag name (hashed), so "romantasy" is always the same color.
const DOTS = [
  "bg-chart-physical",
  "bg-chart-ebook",
  "bg-chart-audiobook",
  "bg-berry",
  "bg-foliage",
];

export function tagDot(tag: string): string {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return DOTS[h % DOTS.length];
}
