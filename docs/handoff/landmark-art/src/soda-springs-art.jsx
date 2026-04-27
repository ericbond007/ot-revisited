/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// SodaSpringsArt — mile ~1180, the geothermal novelty stop on the Bear River.
// ============================================================================
// Pioneers' first encounter with naturally carbonated water — bubbling
// springs in the Bear River valley. Rust-orange travertine cones built up
// around the most active vents. Steamboat Spring HISSED periodically like
// a teakettle (the famous one). Emigrants filled bottles, drank the fizz,
// cooked with it. Sulphur smell. A welcome strange-and-wonderful break.
//
// Distinguishing visual marks:
//   • Rust-stained travertine MINERAL CONES (the springs build their own mounds)
//   • Bubbles / steam wisps rising from vents
//   • Bear River curving through — gentler than the Snake, willow-lined
//   • Pioneers crouched at the springs filling bottles, kettles
//   • Pine-clad hills on the horizon
//   • A few wagons stopped, oxen drinking from the river (NOT the fizz)
// ============================================================================

function SodaSpringsArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const traverRust = "#a8543a";
  const traverDark = "#6e3422";
  const traverLight = "#cd8060";
  const pineDark = "#3a4a2a";

  return (
    <g>
      {/* ── Distant pine-clad hills ─────────────────────────────────── */}
      <path
        d="M 0 76 Q 50 64 100 70 Q 150 58 200 66 Q 250 60 300 68 Q 360 56 420 66 Q 460 60 480 64 L 480 96 L 0 96 Z"
        fill={pineDark} opacity="0.5" stroke={ink} strokeWidth="0.4"
      />
      {/* tree texture suggested with little tick marks */}
      <g opacity="0.45" stroke={ink} strokeWidth="0.3">
        {Array.from({ length: 60 }).map((_, i) => {
          const x = 8 + (i * 8) % 470;
          const y = 70 + (i % 4) * 4;
          return <line key={i} x1={x} y1={y} x2={x} y2={y - 2.5} />;
        })}
      </g>
      <path
        d="M 0 96 Q 80 92 160 96 Q 240 92 320 96 Q 400 92 480 96 L 480 104 L 0 104 Z"
        fill={LMK.sageDark} opacity="0.45"
      />

      {/* ── BEAR RIVER — ribbon curving through mid-ground ──────────── */}
      <g>
        <path
          d="M 0 118 Q 80 116 140 122 Q 200 128 270 124 Q 340 120 400 124 Q 440 126 480 122"
          stroke={LMK.water} strokeWidth="6" fill="none" opacity="0.85"
        />
        <path
          d="M 0 118 Q 80 116 140 122 Q 200 128 270 124 Q 340 120 400 124 Q 440 126 480 122"
          stroke="#5a7280" strokeWidth="0.5" fill="none" opacity="0.7"
        />
        {/* highlights */}
        <path d="M 60 116 q 8 -1 16 0 m 80 7 q 8 -0.5 16 0 m 100 -3 q 8 -1 16 0"
          stroke={LMK.paperWarm} strokeWidth="0.5" fill="none" opacity="0.6" />
        {/* willows along banks */}
        {[34, 110, 200, 296, 376, 444].map((cx, i) => (
          <ellipse key={i} cx={cx} cy={i % 2 ? 116 : 124} rx="5" ry="2.5"
            fill={LMK.sageDark} stroke={ink} strokeWidth="0.3" />
        ))}
      </g>

      {/* ── HERO: cluster of mineral cones / soda springs ──────────── */}
      {/* On a rocky shoulder by the river — three cones of different size */}
      <g>
        {/* Steamboat Spring — the big hissing one, foreground center */}
        <g>
          {/* travertine mound base */}
          <path
            d="M 200 148 Q 210 130 222 116 Q 230 106 240 104 Q 250 106 258 116 Q 270 130 280 148 Z"
            fill={traverLight} stroke={ink} strokeWidth="0.7"
          />
          {/* shadow */}
          <path
            d="M 240 104 Q 250 106 258 116 Q 270 130 280 148 L 240 148 Z"
            fill={traverRust} opacity="0.55"
          />
          {/* rust banding / mineral terracing */}
          <g opacity="0.65" stroke={traverDark} strokeWidth="0.4" fill="none">
            <path d="M 206 140 Q 240 134 274 140" />
            <path d="M 210 132 Q 240 128 270 132" />
            <path d="M 216 124 Q 240 120 264 124" />
            <path d="M 222 116 Q 240 113 258 116" />
            <path d="M 228 110 Q 240 108 252 110" />
          </g>
          {/* rust speckle */}
          <g opacity="0.5" fill={traverDark}>
            {Array.from({length: 18}).map((_, i) => {
              const x = 208 + (i * 11) % 64;
              const y = 110 + ((i * 7) % 36);
              return <circle key={i} cx={x} cy={y} r={0.4} />;
            })}
          </g>
          {/* the vent — small dark hole at the top */}
          <ellipse cx="240" cy="104" rx="3" ry="1.2" fill={ink} opacity="0.85" />
          {/* steam plume rising — wispy */}
          <g opacity="0.7" stroke={LMK.paperWarm} fill="none" strokeWidth="1.2" strokeLinecap="round">
            <path d="M 238 102 q -3 -8 1 -16 q 4 -6 -1 -14 q -3 -8 2 -14" />
            <path d="M 242 102 q 3 -6 -1 -12 q -2 -4 3 -10 q 2 -6 -2 -14" />
          </g>
          {/* white steam soft cloud */}
          <ellipse cx="238" cy="78" rx="6" ry="3" fill={LMK.paperWarm} opacity="0.45" />
          <ellipse cx="244" cy="68" rx="5" ry="2.5" fill={LMK.paperWarm} opacity="0.4" />
          <ellipse cx="240" cy="58" rx="4" ry="2" fill={LMK.paperWarm} opacity="0.35" />
        </g>

        {/* Smaller cone — left of Steamboat */}
        <g>
          <path
            d="M 130 148 Q 138 138 145 130 Q 152 124 158 124 Q 164 124 170 130 Q 178 138 186 148 Z"
            fill={traverLight} stroke={ink} strokeWidth="0.6"
          />
          <path
            d="M 158 124 Q 164 124 170 130 Q 178 138 186 148 L 158 148 Z"
            fill={traverRust} opacity="0.5"
          />
          <g opacity="0.6" stroke={traverDark} strokeWidth="0.35" fill="none">
            <path d="M 134 142 Q 158 138 182 142" />
            <path d="M 138 134 Q 158 132 178 134" />
            <path d="M 145 128 Q 158 126 170 128" />
          </g>
          <ellipse cx="158" cy="124" rx="2" ry="0.9" fill={ink} opacity="0.85" />
          {/* tiny bubbles popping */}
          <g opacity="0.7" fill={LMK.paperWarm}>
            <circle cx="156" cy="121" r="0.6" />
            <circle cx="160" cy="118" r="0.5" />
            <circle cx="158" cy="115" r="0.4" />
            <circle cx="162" cy="112" r="0.4" />
          </g>
          <path d="M 158 122 q -1.5 -4 0.5 -8 q 1 -3 -0.5 -6"
            stroke={LMK.paperWarm} strokeWidth="0.6" fill="none" opacity="0.55" />
        </g>

        {/* Smallest cone — right of Steamboat */}
        <g>
          <path
            d="M 308 148 Q 314 140 320 134 Q 325 130 330 130 Q 335 130 340 134 Q 346 140 352 148 Z"
            fill={traverLight} stroke={ink} strokeWidth="0.5"
          />
          <path
            d="M 330 130 Q 335 130 340 134 Q 346 140 352 148 L 330 148 Z"
            fill={traverRust} opacity="0.5"
          />
          <g opacity="0.6" stroke={traverDark} strokeWidth="0.3" fill="none">
            <path d="M 312 142 Q 330 140 348 142" />
            <path d="M 316 136 Q 330 134 344 136" />
          </g>
          <ellipse cx="330" cy="130" rx="1.6" ry="0.8" fill={ink} opacity="0.85" />
          <g opacity="0.7" fill={LMK.paperWarm}>
            <circle cx="329" cy="127" r="0.5" />
            <circle cx="332" cy="124" r="0.4" />
            <circle cx="330" cy="121" r="0.4" />
          </g>
        </g>
      </g>

      {/* ── Pioneers at the springs — filling bottles ────────────── */}
      <g>
        {/* Two figures crouching at smaller cone */}
        <g transform="translate(150, 150)">
          {/* crouching */}
          <ellipse cx="0" cy="-1" rx="1" ry="1.2" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.25" />
          <ellipse cx="0" cy="-2" rx="1.6" ry="0.3" fill={ink} />
          <path d="M -1.2 0 L 1.2 0 L 1.5 4 L -1.5 4 Z" fill={LMK.earth} stroke={ink} strokeWidth="0.25" />
          {/* hand reaching down with bottle */}
          <line x1="1.2" y1="2" x2="3" y2="3.5" stroke={ink} strokeWidth="0.4" />
          <rect x="2.8" y="3" width="1.2" height="2" fill={LMK.tan} stroke={ink} strokeWidth="0.2" />
        </g>
        <g transform="translate(166, 152)">
          <ellipse cx="0" cy="-1" rx="1" ry="1.2" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.25" />
          <ellipse cx="0" cy="-2" rx="1.5" ry="0.3" fill={LMK.earthDark} />
          <path d="M -1.2 0 L 1.2 0 L 1.4 4 L -1.4 4 Z" fill={LMK.rust} stroke={ink} strokeWidth="0.25" />
          <line x1="-1.2" y1="2" x2="-3" y2="3.5" stroke={ink} strokeWidth="0.4" />
          <rect x="-4" y="3" width="1.2" height="2" fill={LMK.tan} stroke={ink} strokeWidth="0.2" />
        </g>
        {/* Standing figure pointing up at Steamboat's plume */}
        <g transform="translate(196, 152)">
          <ellipse cx="0" cy="-3" rx="0.9" ry="1.1" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.25" />
          <ellipse cx="0" cy="-4" rx="1.5" ry="0.3" fill={ink} />
          <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.25" />
          <line x1="-0.6" y1="2" x2="-0.6" y2="6" stroke={ink} strokeWidth="0.4" />
          <line x1="0.6" y1="2" x2="0.6" y2="6" stroke={ink} strokeWidth="0.4" />
          {/* arm pointing up */}
          <line x1="1" y1="-1.5" x2="3" y2="-4" stroke={ink} strokeWidth="0.5" strokeLinecap="round" />
        </g>
        {/* Two figures at Steamboat */}
        <g transform="translate(220, 154)">
          <ellipse cx="0" cy="-3" rx="0.9" ry="1.1" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.25" />
          <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.earth} stroke={ink} strokeWidth="0.25" />
          <line x1="-0.6" y1="2" x2="-0.6" y2="6" stroke={ink} strokeWidth="0.4" />
          <line x1="0.6" y1="2" x2="0.6" y2="6" stroke={ink} strokeWidth="0.4" />
        </g>
        <g transform="translate(264, 156)">
          <ellipse cx="0" cy="-3" rx="0.9" ry="1.1" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.25" />
          <ellipse cx="0" cy="-4" rx="1.5" ry="0.3" fill={LMK.earthDark} />
          <path d="M -1.2 -2 L 1.2 -2 L 1 2 L -1 2 Z" fill={LMK.rust} stroke={ink} strokeWidth="0.25" />
          <line x1="-0.6" y1="2" x2="-0.6" y2="6" stroke={ink} strokeWidth="0.4" />
          <line x1="0.6" y1="2" x2="0.6" y2="6" stroke={ink} strokeWidth="0.4" />
        </g>
      </g>

      {/* ── Foreground sage flat ──────────────────────────────────── */}
      <rect x="0" y="148" width={LMK_VIEW_W} height="52" fill={LMK.parchment} opacity="0.55" />
      <path d="M 0 168 Q 100 166 200 170 Q 300 168 400 170 Q 450 169 480 170"
        stroke={LMK.earth} strokeWidth="1" fill="none" opacity="0.45" />
      <g opacity="0.6">
        {[14, 60, 100, 360, 400, 440, 460].map((x, i) => {
          const y = 174 + (i % 3) * 6;
          return (
            <g key={i} transform={`translate(${x}, ${y})`}>
              <ellipse cx="0" cy="0" rx="2.6" ry="1.2" fill={LMK.sage} stroke={ink} strokeWidth="0.25" />
              <ellipse cx="-1" cy="-0.7" rx="1.4" ry="0.7" fill={LMK.sageLight} stroke={ink} strokeWidth="0.2" />
            </g>
          );
        })}
      </g>

      {/* Wagons stopped — left foreground */}
      <g>
        <SmallWagonSS x={36} y={172} />
        <SmallWagonSS x={80} y={170} />
        {/* Oxen drinking from the river — unyoked */}
        <g transform="translate(54, 130)">
          <ellipse cx="0" cy="0" rx="3" ry="1.6" fill={LMK.earthLight} stroke={ink} strokeWidth="0.3" />
          <ellipse cx="2.6" cy="1.4" rx="1.4" ry="1" fill={LMK.earthLight} stroke={ink} strokeWidth="0.3" />
          <line x1="-2" y1="1.5" x2="-2" y2="3.5" stroke={ink} strokeWidth="0.4" />
          <line x1="1" y1="1.5" x2="1" y2="3.5" stroke={ink} strokeWidth="0.4" />
        </g>
        <g transform="translate(74, 132)">
          <ellipse cx="0" cy="0" rx="3" ry="1.6" fill={LMK.earth} stroke={ink} strokeWidth="0.3" />
          <ellipse cx="2.6" cy="1.4" rx="1.4" ry="1" fill={LMK.earth} stroke={ink} strokeWidth="0.3" />
          <line x1="-2" y1="1.5" x2="-2" y2="3.5" stroke={ink} strokeWidth="0.4" />
          <line x1="1" y1="1.5" x2="1" y2="3.5" stroke={ink} strokeWidth="0.4" />
        </g>
      </g>

      {/* ── Caption ──────────────────────────────────────────────────── */}
      <text x="240" y="194" textAnchor="middle"
        fontFamily="IM Fell English, Georgia, serif" fontSize="8"
        fill={inkSoft} fontStyle="italic" opacity="0.85">
        Soda Springs &amp; Steamboat Spring
      </text>
    </g>
  );
}

function SmallWagonSS({ x, y }) {
  const ink = LMK.ink;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="0" y="0" width="14" height="5" fill={LMK.earth} stroke={ink} strokeWidth="0.35" />
      <path d="M 0 0 Q 7 -8 14 0 Z" fill={LMK.white} stroke={ink} strokeWidth="0.45" />
      <circle cx="3" cy="6" r="1.8" fill="none" stroke={ink} strokeWidth="0.35" />
      <circle cx="11" cy="6" r="1.8" fill="none" stroke={ink} strokeWidth="0.35" />
    </g>
  );
}

Object.assign(window, { SodaSpringsArt });
