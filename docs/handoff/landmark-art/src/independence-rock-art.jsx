/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// IndependenceRockArt — mile ~815, the "Register of the Desert."
// ============================================================================
// A massive granite dome rising abruptly from the flat Sweetwater plain —
// 1900 ft long, ~130 ft tall, the shape of a whale's back or a great
// turtle. Pioneers aimed to arrive here by July 4 (Independence Day, hence
// the name). They climbed the rounded summit and inscribed their names in
// axle grease, tar, paint, or chiseled stone. THOUSANDS of names.
//
// Distinguishing visual marks:
//   • Long, low, ROUNDED dome — totally unlike spire/butte landmarks.
//     Very horizontal silhouette. Twice as wide as it is tall.
//   • Smooth weathered granite — pinkish-grey, NOT layered like Platte rocks
//   • Sweetwater River curving along the base
//   • Tiny figures climbing the rock; carved/painted names visible
//   • A wagon train circled or camped at the base — pioneers stopped here
//   • Often a 4th of July encampment with celebration vibe (per journals)
// ============================================================================

function IndependenceRockArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  // Granite — pinkish-grey, smoother than the Platte sandstones
  const graniteLight = "#bda898";
  const graniteMid = "#8e7868";
  const graniteDark = "#54443a";

  return (
    <g>
      {/* ── Far horizon — Granite Range hint ───────────────────────── */}
      <path
        d="M 0 90 Q 50 84 100 88 Q 160 80 220 86 Q 290 78 360 84 Q 420 80 480 84 L 480 100 L 0 100 Z"
        fill={LMK.sage} opacity="0.4"
      />
      <path
        d="M 0 100 Q 80 96 160 100 Q 240 96 320 100 Q 400 96 480 100 L 480 110 L 0 110 Z"
        fill={LMK.sageDark} opacity="0.4"
      />

      {/* ── HERO: the rock — long, low, whale-back dome ────────────── */}
      {/* Spans roughly x=70 to x=420 — fills the comp horizontally.
          Peaks at y=70, base at y=145. Wider than tall ratio ~3:1. */}
      <g>
        {/* Main dome silhouette — smooth, rounded, asymmetric */}
        <path
          d="M 70 145
             Q 80 130 100 118
             Q 130 102 170 88
             Q 220 76 270 72
             Q 320 76 360 88
             Q 390 100 410 118
             Q 425 130 432 145 Z"
          fill={graniteLight} stroke={ink} strokeWidth="0.9"
        />

        {/* Top-lit highlight along the upper curve */}
        <path
          d="M 100 118 Q 130 106 170 94 Q 220 84 270 80 Q 320 84 360 94"
          stroke={LMK.paperWarm} strokeWidth="3" fill="none" opacity="0.4"
          strokeLinecap="round"
        />

        {/* Shadow side (right) — granite gets darker toward base on shaded side */}
        <path
          d="M 270 72
             Q 320 76 360 88
             Q 390 100 410 118
             Q 425 130 432 145
             L 270 145 Z"
          fill={graniteMid} opacity="0.4"
        />

        {/* Subtle weathering "exfoliation" curves — characteristic of granite domes */}
        <g opacity="0.55" fill="none" stroke={graniteMid} strokeWidth="0.5">
          <path d="M 100 130 Q 200 108 320 112 Q 390 118 420 132" />
          <path d="M 130 138 Q 220 124 320 128 Q 380 134 410 142" />
          <path d="M 90 124 Q 180 100 280 96 Q 360 102 420 124" />
          <path d="M 160 92 Q 240 84 320 90" />
        </g>

        {/* Cracks and joints — short, dark, scattered */}
        <g opacity="0.45" stroke={graniteDark} fill="none">
          <path d="M 200 90 L 204 102" strokeWidth="0.5" />
          <path d="M 240 82 L 245 96" strokeWidth="0.5" />
          <path d="M 280 80 L 286 94" strokeWidth="0.5" />
          <path d="M 320 88 L 322 100" strokeWidth="0.4" />
          <path d="M 160 100 L 164 116" strokeWidth="0.4" />
          <path d="M 360 100 L 366 114" strokeWidth="0.4" />
        </g>

        {/* Speckled granite texture — tiny dots */}
        <g opacity="0.4" fill={graniteDark}>
          {Array.from({ length: 60 }).map((_, i) => {
            const x = 90 + (i * 47) % 320 + (i % 7) * 3;
            const y = 84 + ((i * 31) % 56);
            const r = 0.3 + (i % 3) * 0.15;
            return <circle key={i} cx={x} cy={y} r={r} />;
          })}
        </g>

        {/* Carved names — faint script along the rock's lower face */}
        {/* Don't try to render legible text at 8px; suggest with marks */}
        <g opacity="0.6" stroke={graniteDark} strokeWidth="0.4" fill="none">
          {/* clusters of name-mark scribbles */}
          <path d="M 130 132 q 2 -2 4 0 q 2 -2 4 0 q 2 -2 4 0" />
          <path d="M 152 138 q 2 -1 3 0 q 2 -1 3 0 q 2 -1 3 0" />
          <path d="M 180 130 q 1.5 -2 3 0 q 1.5 -2 3 0 q 1.5 -2 3 0 q 1.5 -2 3 0" />
          <path d="M 208 134 q 2 -1.5 4 0 q 2 -1.5 4 0" />
          <path d="M 234 130 q 1.5 -1.8 3 0 q 1.5 -1.8 3 0 q 1.5 -1.8 3 0" />
          <path d="M 262 128 q 2 -1.5 4 0 q 2 -1.5 4 0 q 2 -1.5 4 0" />
          <path d="M 296 132 q 1.5 -2 3 0 q 1.5 -2 3 0 q 1.5 -2 3 0" />
          <path d="M 326 136 q 2 -1.5 4 0 q 2 -1.5 4 0" />
          <path d="M 356 134 q 2 -1.5 4 0 q 2 -1.5 4 0" />
          {/* a couple of faint date scratches */}
          <path d="M 200 124 l 2 0 l 0 -3 m 1 0 l 2 0 l 0 3" strokeWidth="0.3" />
          <path d="M 270 118 l 2 0 l 0 -3 m 1 3 l 0 -3 l 2 0 l 0 3" strokeWidth="0.3" />
        </g>

        {/* Tiny pioneer figures climbing the dome */}
        <g>
          {/* climber 1 — near top */}
          <g transform="translate(244, 80)">
            <circle cx="0" cy="0" r="0.7" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.2" />
            <path d="M -0.5 0.5 L 0.5 0.5 L 0.4 2 L -0.4 2 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.2" />
          </g>
          {/* climbers ascending */}
          <g transform="translate(218, 96)">
            <circle cx="0" cy="0" r="0.7" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.2" />
            <path d="M -0.5 0.5 L 0.5 0.5 L 0.4 2 L -0.4 2 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.2" />
          </g>
          <g transform="translate(296, 100)">
            <circle cx="0" cy="0" r="0.7" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.2" />
            <path d="M -0.5 0.5 L 0.5 0.5 L 0.4 2 L -0.4 2 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.2" />
          </g>
          <g transform="translate(180, 116)">
            <circle cx="0" cy="0" r="0.7" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.2" />
            <path d="M -0.5 0.5 L 0.5 0.5 L 0.4 2 L -0.4 2 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.2" />
          </g>
          <g transform="translate(340, 110)">
            <circle cx="0" cy="0" r="0.7" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.2" />
            <path d="M -0.5 0.5 L 0.5 0.5 L 0.4 2 L -0.4 2 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.2" />
          </g>
        </g>
      </g>

      {/* ── Sweetwater River — curving along the base ────────────── */}
      <g>
        <path
          d="M 0 154 Q 60 152 120 156 Q 200 162 280 158 Q 360 154 420 158 Q 450 160 480 158"
          stroke={LMK.water} strokeWidth="3" fill="none" opacity="0.85"
        />
        <path
          d="M 0 154 Q 60 152 120 156 Q 200 162 280 158 Q 360 154 420 158 Q 450 160 480 158"
          stroke="#5a7280" strokeWidth="0.5" fill="none" opacity="0.7"
        />
        {/* highlights on water */}
        <path d="M 80 153 q 8 -1 16 0 m 80 7 q 8 -0.5 16 0 m 100 -3 q 8 -1 16 0"
          stroke={LMK.paperWarm} strokeWidth="0.4" fill="none" opacity="0.6" />
        {/* willow clumps along banks */}
        <ellipse cx="40" cy="151" rx="6" ry="3" fill={LMK.sageDark} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="160" cy="158" rx="5" ry="3" fill={LMK.sageDark} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="380" cy="155" rx="5" ry="3" fill={LMK.sageDark} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="450" cy="156" rx="5" ry="3" fill={LMK.sageDark} stroke={ink} strokeWidth="0.3" />
      </g>

      {/* ── Birds overhead ──────────────────────────────────────────── */}
      <g opacity="0.5" stroke={ink} strokeWidth="0.4" fill="none">
        <path d="M 80 32 q 2 -1.5 4 0 q 2 -1.5 4 0" />
        <path d="M 100 24 q 2 -1.2 3 0 q 2 -1.2 3 0" />
        <path d="M 380 28 q 2 -1.5 4 0 q 2 -1.5 4 0" />
      </g>

      {/* ── Foreground — sage flat with celebration encampment ───── */}
      <rect x="0" y="160" width={LMK_VIEW_W} height="40" fill={LMK.parchment} opacity="0.55" />
      <g opacity="0.6">
        {[16, 56, 104, 156, 220, 280, 340, 400, 446].map((x, i) => {
          const y = 174 + (i % 3) * 6;
          return (
            <g key={i} transform={`translate(${x}, ${y})`}>
              <ellipse cx="0" cy="0" rx="3" ry="1.4" fill={LMK.sage} stroke={ink} strokeWidth="0.3" />
              <ellipse cx="-1.2" cy="-0.8" rx="1.6" ry="0.9" fill={LMK.sageLight} stroke={ink} strokeWidth="0.25" />
            </g>
          );
        })}
      </g>

      {/* ── Wagon encampment — circled, July 4th vibe ──────────── */}
      <g>
        {/* loose semicircle of wagons */}
        <SmallWagonIR x={108} y={170} angle={10} />
        <SmallWagonIR x={150} y={172} angle={-5} />
        <SmallWagonIR x={196} y={174} angle={0} />
        <SmallWagonIR x={244} y={174} angle={5} />
        <SmallWagonIR x={294} y={172} angle={-8} />
        <SmallWagonIR x={342} y={170} angle={12} />

        {/* central bonfire — patriotic celebration */}
        <g transform="translate(225, 188)">
          <ellipse cx="0" cy="2" rx="5" ry="1.2" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
          <path d="M -3 2 L -1.5 -2 L 0 -4 L 1.5 -2 L 3 2 Z"
            fill={LMK.rust} stroke={ink} strokeWidth="0.3" />
          <path d="M -1.5 -2 L 0 -5 L 1.5 -2" fill={LMK.tan} opacity="0.85" />
          {/* smoke */}
          <path d="M 0 -5 q -2 -3 1 -7 q 2 -2 0 -6 q -1 -2 1 -5"
            stroke={ink} strokeWidth="0.4" fill="none" opacity="0.55" />
        </g>

        {/* people gathered around */}
        <SmallPersonIR x={196} y={188} hat />
        <SmallPersonIR x={210} y={190} />
        <SmallPersonIR x={244} y={190} />
        <SmallPersonIR x={258} y={188} hat />
        {/* a fiddler */}
        <g transform="translate(176, 188)">
          <circle cx="0" cy="-3" r="0.9" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.2" />
          <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.25" />
          <line x1="-0.6" y1="2" x2="-0.6" y2="5" stroke={ink} strokeWidth="0.4" />
          <line x1="0.6" y1="2" x2="0.6" y2="5" stroke={ink} strokeWidth="0.4" />
          {/* fiddle */}
          <ellipse cx="2.5" cy="-2" rx="1.6" ry="0.7" fill={LMK.tan} stroke={ink} strokeWidth="0.25" />
          <line x1="3" y1="-2.5" x2="5" y2="-3.8" stroke={ink} strokeWidth="0.3" />
        </g>
      </g>

      {/* ── Caption ──────────────────────────────────────────────────── */}
      <text x="240" y="194" textAnchor="middle"
        fontFamily="IM Fell English, Georgia, serif" fontSize="8"
        fill={inkSoft} fontStyle="italic" opacity="0.85">
        Independence Rock — &ldquo;the Register of the Desert&rdquo;
      </text>
    </g>
  );
}

function SmallWagonIR({ x, y, angle = 0 }) {
  const ink = LMK.ink;
  return (
    <g transform={`translate(${x}, ${y}) rotate(${angle})`}>
      <rect x="0" y="0" width="14" height="5" fill={LMK.earth} stroke={ink} strokeWidth="0.35" />
      <path d="M 0 0 Q 7 -8 14 0 Z" fill={LMK.white} stroke={ink} strokeWidth="0.45" />
      <circle cx="3" cy="6" r="1.8" fill="none" stroke={ink} strokeWidth="0.35" />
      <circle cx="11" cy="6" r="1.8" fill="none" stroke={ink} strokeWidth="0.35" />
      <circle cx="3" cy="6" r="0.5" fill={ink} />
      <circle cx="11" cy="6" r="0.5" fill={ink} />
    </g>
  );
}

function SmallPersonIR({ x, y, hat = false }) {
  const ink = LMK.ink;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="-3" r="0.9" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.2" />
      {hat && <ellipse cx="0" cy="-4" rx="1.5" ry="0.3" fill={ink} />}
      <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.25" />
      <line x1="-0.6" y1="2" x2="-0.6" y2="5" stroke={ink} strokeWidth="0.4" />
      <line x1="0.6" y1="2" x2="0.6" y2="5" stroke={ink} strokeWidth="0.4" />
    </g>
  );
}

Object.assign(window, { IndependenceRockArt });
