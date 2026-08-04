// BookWren's art, drawn by hand as SVG — no icon library produces a
// Carolina Wren. The mark is two shapes: a plump teardrop and a tail
// cocked at ~35°, which is the whole bird at favicon size.
//
// Plumage colors are hardcoded (a wren is russet in any light); habitat
// pieces (twig, leaves, berries) use CSS vars so the hedgerow goes
// moonlit in Raven mode.

/** The logo: wren perched on an open book, in currentColor. */
export function WrenMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <g fill="currentColor">
        {/* the wren, scaled to sit above the book */}
        <g transform="translate(9 1) scale(0.78)">
          <polygon points="3,25.5 16,22.5 16,28" />
          <circle cx="21.5" cy="25" r="9.5" />
          <ellipse cx="34" cy="38" rx="15.5" ry="13" />
          <rect
            x="45"
            y="13"
            width="6.5"
            height="27"
            rx="3.2"
            transform="rotate(30 48 38)"
          />
        </g>
        {/* legs */}
        <rect x="30" y="39" width="2.4" height="11" rx="1.2" />
        <rect x="38" y="40" width="2.4" height="10" rx="1.2" />
        {/* the open book it stands on */}
        <path d="M4 50 C 12 45.5 24 45.5 32 49 C 40 45.5 52 45.5 60 50 L 60 57 C 52 53.5 40 53.5 32 56.5 C 24 53.5 12 53.5 4 57 Z" />
      </g>
    </svg>
  );
}

/** Raven perched on the open book — the logo swaps to this in Raven mode. */
export function RavenBookMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <g fill="currentColor">
        <g transform="translate(7 4) scale(0.76)">
          <polygon points="2,24 17,19.5 17,27.5" />
          <circle cx="24" cy="23" r="8.5" />
          <polygon points="20,29 24,36 28,29.5" />
          <ellipse cx="37" cy="36" rx="14.5" ry="11" />
          <polygon points="46,33 63,44 47,45" />
        </g>
        <rect x="30" y="39" width="2.4" height="11" rx="1.2" />
        <rect x="38" y="40" width="2.4" height="10" rx="1.2" />
        <path d="M4 50 C 12 45.5 24 45.5 32 49 C 40 45.5 52 45.5 60 50 L 60 57 C 52 53.5 40 53.5 32 56.5 C 24 53.5 12 53.5 4 57 Z" />
      </g>
    </svg>
  );
}

/** The raven silhouette — heavier bill, wedge tail. Theme toggle + easter eggs. */
export function RavenMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <g fill="currentColor">
        <polygon points="2,24 17,19.5 17,27.5" />
        <circle cx="24" cy="23" r="8.5" />
        {/* shaggy throat hackles */}
        <polygon points="20,29 24,36 28,29.5" />
        <ellipse cx="37" cy="36" rx="14.5" ry="11" />
        {/* wedge tail */}
        <polygon points="46,33 63,44 47,45" />
      </g>
    </svg>
  );
}

/** Full illustrated wren on a twig — hero and empty states. */
export function WrenOnTwig({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 110" className={className} aria-hidden>
      {/* twig */}
      <path
        d="M6 92 Q 50 84 134 88"
        fill="none"
        stroke="var(--bark)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M104 87 Q 116 80 126 78"
        fill="none"
        stroke="var(--bark)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* leaves */}
      <g fill="var(--foliage)">
        <path d="M14 90 Q 20 78 32 82 Q 24 92 14 90 Z" />
        <path d="M118 80 Q 126 70 136 74 Q 130 84 118 80 Z" />
      </g>
      <path d="M24 94 Q 32 100 42 96 Q 34 88 24 94 Z" fill="var(--foliage-deep)" />
      {/* berries */}
      <g fill="var(--berry)">
        <circle cx="112" cy="84" r="3" />
        <circle cx="117" cy="88" r="2.6" />
        <circle cx="108" cy="89" r="2.2" />
      </g>
      {/* legs */}
      <g stroke="var(--bark)" strokeWidth="2" strokeLinecap="round">
        <line x1="60" y1="79" x2="58" y2="89" />
        <line x1="70" y1="80" x2="71" y2="89" />
      </g>
      {/* tail — cocked, with barring */}
      <g transform="rotate(35 90 60)">
        <rect x="86" y="26" width="9" height="36" rx="4.2" fill="#8F5230" />
        <g stroke="#5C3A21" strokeWidth="1.4" opacity="0.65">
          <line x1="86.5" y1="34" x2="94.5" y2="33" />
          <line x1="86.5" y1="41" x2="94.5" y2="40" />
          <line x1="86.5" y1="48" x2="94.5" y2="47" />
        </g>
      </g>
      {/* body */}
      <ellipse cx="66" cy="62" rx="24" ry="19" fill="#9C5A33" />
      {/* buff belly */}
      <ellipse cx="59" cy="70" rx="17" ry="11" fill="#D9A566" />
      {/* wing with barring */}
      <g transform="rotate(-14 74 58)">
        <ellipse cx="74" cy="58" rx="13.5" ry="9" fill="#B0703C" />
        <g stroke="#5C3A21" strokeWidth="1.5" opacity="0.6">
          <line x1="67" y1="55" x2="82" y2="53" />
          <line x1="67" y1="59" x2="83" y2="57.5" />
          <line x1="68" y1="63" x2="82" y2="62" />
        </g>
      </g>
      {/* head */}
      <circle cx="40" cy="40" r="13.5" fill="#9C5A33" />
      {/* the eyebrow stripe — the audience will notice if it's missing */}
      <path
        d="M28 36 Q 38 28.5 50 33"
        fill="none"
        stroke="#F6EFE0"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* eye */}
      <circle cx="37" cy="38.5" r="2" fill="#2E2119" />
      {/* thin, slightly downcurved bill */}
      <path
        d="M13 42 Q 21 40 27.5 41.5 L 27.5 44.5 Q 20 45.5 13 43.5 Z"
        fill="#5C3A21"
      />
    </svg>
  );
}

/**
 * Full illustrated raven on the same twig — the hero art after dark.
 * Only ever rendered in Raven mode, so the moon is always up.
 */
export function RavenOnTwig({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 110" className={className} aria-hidden>
      {/* moon — crescent carved with a background-colored bite */}
      <circle cx="119" cy="18" r="9" fill="#d8d2ec" opacity="0.9" />
      <circle cx="123" cy="14" r="8" fill="var(--background)" />
      {/* stars */}
      <g fill="#a78bfa">
        <circle cx="16" cy="14" r="1.6" />
        <circle cx="38" cy="8" r="1.1" />
        <circle cx="98" cy="10" r="1.3" />
        <circle cx="132" cy="38" r="1.2" />
      </g>
      {/* twig */}
      <path
        d="M6 92 Q 50 84 134 88"
        fill="none"
        stroke="var(--bark)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M104 87 Q 116 80 126 78"
        fill="none"
        stroke="var(--bark)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* moonlit leaves */}
      <g fill="var(--foliage)">
        <path d="M14 90 Q 20 78 32 82 Q 24 92 14 90 Z" />
        <path d="M118 80 Q 126 70 136 74 Q 130 84 118 80 Z" />
      </g>
      <path d="M24 94 Q 32 100 42 96 Q 34 88 24 94 Z" fill="var(--foliage-deep)" />
      {/* glowing berries */}
      <g fill="var(--berry)">
        <circle cx="112" cy="84" r="3" />
        <circle cx="117" cy="88" r="2.6" />
        <circle cx="108" cy="89" r="2.2" />
      </g>
      {/* legs */}
      <g stroke="var(--bark)" strokeWidth="2" strokeLinecap="round">
        <line x1="58" y1="76" x2="56" y2="89" />
        <line x1="70" y1="77" x2="71" y2="89" />
      </g>
      {/* wedge tail, angled down off the branch */}
      <polygon points="84,56 122,58 88,72" fill="#211e30" />
      {/* body */}
      <ellipse cx="63" cy="59" rx="26" ry="17" fill="#211e30" />
      {/* iridescent sheen along the back */}
      <path
        d="M40 51 Q 63 39 87 52"
        fill="none"
        stroke="#5a4c7a"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M48 47 Q 63 42 78 48"
        fill="none"
        stroke="#a78bfa"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.45"
      />
      {/* head with shaggy throat hackles */}
      <circle cx="35" cy="39" r="12" fill="#211e30" />
      <polygon points="29,48 35,60 42,49" fill="#211e30" />
      {/* heavy bill */}
      <path d="M11 38 L 29 34.5 L 29 44 L 13 42.5 Z" fill="#17151f" />
      {/* moonlit eye */}
      <circle cx="32" cy="37" r="2" fill="#e8e4f4" />
    </svg>
  );
}

/** Speckled-egg rating pip. A clutch of these replaces stars. */
export function EggPip({
  filled,
  className,
}: {
  filled: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 24 28" className={className} aria-hidden>
      {/* egg: narrower at the top */}
      <path
        d="M12 2 C 6.5 2 3 9.5 3 16 C 3 22 7 26 12 26 C 17 26 21 22 21 16 C 21 9.5 17.5 2 12 2 Z"
        fill={filled ? "var(--egg-shell)" : "transparent"}
        stroke={filled ? "var(--accent)" : "var(--line)"}
        strokeWidth="1.8"
      />
      {filled && (
        <g fill="var(--egg-speckle)">
          <circle cx="9" cy="10" r="1.15" />
          <circle cx="15" cy="8.5" r="0.9" />
          <circle cx="12.5" cy="14" r="1.05" />
          <circle cx="8" cy="17.5" r="0.9" />
          <circle cx="15.5" cy="18.5" r="1.2" />
          <circle cx="11" cy="21.5" r="0.85" />
        </g>
      )}
    </svg>
  );
}

/** Decorative hedgerow strip — leaves and berries along a branch. */
export function HedgerowBand({ className }: { className?: string }) {
  const leaf = "M0 0 Q 7 -9 16 0 Q 7 7 0 0 Z";
  return (
    <svg
      viewBox="0 0 1200 56"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      {/* the branch */}
      <path
        d="M-10 36 Q 150 26 300 34 T 600 32 T 900 36 T 1210 30"
        fill="none"
        stroke="var(--bark)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* leaves — alternating above/below, varied angles */}
      <g fill="var(--foliage)">
        <path d={leaf} transform="translate(60 30) rotate(-28)" />
        <path d={leaf} transform="translate(150 34) rotate(150)" />
        <path d={leaf} transform="translate(255 28) rotate(-18)" />
        <path d={leaf} transform="translate(420 30) rotate(160)" />
        <path d={leaf} transform="translate(535 28) rotate(-30)" />
        <path d={leaf} transform="translate(700 30) rotate(148)" />
        <path d={leaf} transform="translate(815 32) rotate(-22)" />
        <path d={leaf} transform="translate(985 32) rotate(155)" />
        <path d={leaf} transform="translate(1105 26) rotate(-25)" />
      </g>
      <g fill="var(--foliage-deep)">
        <path d={leaf} transform="translate(105 38) rotate(200)" />
        <path d={leaf} transform="translate(345 36) rotate(24)" />
        <path d={leaf} transform="translate(620 38) rotate(205)" />
        <path d={leaf} transform="translate(890 40) rotate(20)" />
        <path d={leaf} transform="translate(1160 36) rotate(210)" />
      </g>
      {/* berry clusters */}
      <g fill="var(--berry)">
        <circle cx="200" cy="30" r="4" />
        <circle cx="208" cy="35" r="3.2" />
        <circle cx="480" cy="34" r="4" />
        <circle cx="487" cy="28" r="3" />
        <circle cx="760" cy="32" r="4" />
        <circle cx="768" cy="37" r="3.2" />
        <circle cx="1040" cy="32" r="4" />
        <circle cx="1047" cy="27" r="3" />
      </g>
    </svg>
  );
}
