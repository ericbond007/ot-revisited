/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// ScottsBluffArt — mile ~590, the dramatic gateway through Mitchell Pass.
// ============================================================================
// "Towering 800 feet above the river" — the largest, most imposing landmark
// on this stretch. Wagon trains threaded through Mitchell Pass, a narrow
// gap between the bluff and Eagle Rock to its west. The DRAMA here is
// SCALE — the wagons look like toys against the cliff face.
//
// Distinguishing visual marks:
//   • Massive bluff wall — far taller than Courthouse or Chimney Rock
//   • Multiple "fingers" / sub-promontories visible on the bluff face
//   • Mitchell Pass — a NARROW V-shaped gap cut through the formation
//   • Wagons threading through the pass, single-file, dwarfed
//   • Stratified layers (clay/sandstone) but more rugged + less "blocky"
//     than Courthouse Rock — irregular cliff edges
//   • Pine + juniper dotting upper slopes (real distinction — the bluff
//     is high enough to support some conifers, unlike the lower formations)
//   • Ribbons of erosion gullies running down the face
// ============================================================================

function ScottsBluffArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const stoneLight = "#cdb088";
  const stoneMid = "#a07852";
  const stoneDark = "#5a3d22";
  const pineDark = "#3a4a2a";

  return (
    <g>
      {/* ── Far horizon (mostly hidden behind the bluff mass) ───────── */}
      <path
        d="M 0 90 Q 60 86 130 90 Q 200 88 280 92 Q 360 88 440 92 Q 470 90 480 92 L 480 100 L 0 100 Z"
        fill={LMK.sage} opacity="0.4"
      />

      {/* ──────────────────────────────────────────────────────────────
          HERO MASS — Scotts Bluff fills most of the comp horizontally.
          Two main peaks on either side of Mitchell Pass:
            • LEFT mass: Scotts Bluff proper (taller, more rugged) — peaks ~y28
            • PASS in middle: V-shaped gap between them — y92 deep
            • RIGHT mass: South Bluff / Eagle Rock — peaks ~y36
          Wagons thread through the pass at y118–125.
         ────────────────────────────────────────────────────────────── */}

      {/* ── LEFT MASS — Scotts Bluff itself ────────────────────────── */}
      <g>
        {/* main silhouette — irregular, rugged outline */}
        <path
          d="M 0 130 L 0 70 L 18 56 L 38 44 L 56 30 L 78 28 L 96 36 L 112 50 L 128 64 L 142 78 L 156 92 L 170 108 L 178 130 Z"
          fill={stoneLight} stroke={ink} strokeWidth="0.8"
        />
        {/* darker shadow side (right-facing slope into the pass) */}
        <path
          d="M 96 36 L 112 50 L 128 64 L 142 78 L 156 92 L 170 108 L 178 130 L 130 130 L 130 80 L 110 60 Z"
          fill={stoneMid} opacity="0.55"
        />
        {/* horizontal stratification — irregular, scribbled */}
        <g opacity="0.65">
          <path d="M 8 80 Q 80 76 156 90" stroke={stoneMid} strokeWidth="0.5" fill="none" />
          <path d="M 4 96 Q 80 90 168 104" stroke={stoneMid} strokeWidth="0.5" fill="none" />
          <path d="M 0 110 Q 80 106 174 118" stroke={stoneMid} strokeWidth="0.6" fill="none" />
          <path d="M 0 122 Q 80 120 178 128" stroke={stoneDark} strokeWidth="0.6" fill="none" opacity="0.6" />
          {/* upper layer */}
          <path d="M 28 60 Q 60 56 100 50" stroke={stoneMid} strokeWidth="0.5" fill="none" />
          <path d="M 38 50 Q 60 46 88 42" stroke={stoneMid} strokeWidth="0.4" fill="none" />
        </g>
        {/* erosion gullies — vertical ribbons down the face */}
        <g opacity="0.55">
          <path d="M 38 44 Q 36 80 28 130" stroke={stoneDark} strokeWidth="0.5" fill="none" />
          <path d="M 56 30 Q 60 80 64 130" stroke={stoneDark} strokeWidth="0.5" fill="none" />
          <path d="M 78 28 Q 80 80 92 130" stroke={stoneDark} strokeWidth="0.6" fill="none" />
          <path d="M 112 50 Q 122 88 128 130" stroke={stoneDark} strokeWidth="0.5" fill="none" />
          <path d="M 142 78 Q 152 100 158 130" stroke={stoneDark} strokeWidth="0.4" fill="none" />
        </g>
        {/* pines / juniper on upper slopes — small dark cones scattered */}
        <g>
          {[
            [40, 56], [52, 50], [62, 42], [72, 38], [86, 38],
            [98, 44], [110, 56], [122, 68], [50, 64], [70, 56],
            [44, 78], [60, 72], [84, 70], [104, 72], [120, 84],
          ].map(([px, py], i) => (
            <g key={i} transform={`translate(${px}, ${py})`}>
              <path d={`M -1.4 1 L 0 -2 L 1.4 1 Z`} fill={pineDark} stroke={ink} strokeWidth="0.2" />
            </g>
          ))}
        </g>
      </g>

      {/* ── MITCHELL PASS — V-shaped notch between the masses ──────── */}
      {/* The actual pass floor at y125; the V opens upward to about y92. */}
      <g>
        {/* pass floor — slightly lower than the surrounding ground */}
        <path
          d="M 178 130 L 200 124 L 230 122 L 260 122 L 290 124 L 312 130 Z"
          fill={LMK.parchment} stroke={ink} strokeWidth="0.5" opacity="0.85"
        />
        {/* shadow at the deepest point of the pass — atmospheric blue */}
        <path
          d="M 178 130 L 200 124 L 215 100 L 200 92 L 178 110 Z"
          fill={stoneDark} opacity="0.35"
        />
        <path
          d="M 312 130 L 290 124 L 275 100 L 290 92 L 312 110 Z"
          fill={stoneDark} opacity="0.35"
        />
        {/* trail ruts coming through */}
        <path d="M 0 130 Q 100 130 178 130 L 200 124 L 230 122 L 260 122 L 290 124 L 312 130 Q 400 130 480 130"
          stroke={LMK.earth} strokeWidth="1" fill="none" opacity="0.5" />
      </g>

      {/* ── RIGHT MASS — South Bluff / Eagle Rock ──────────────────── */}
      <g>
        <path
          d="M 312 130 L 322 110 L 336 92 L 354 76 L 374 64 L 396 50 L 418 42 L 438 36 L 458 38 L 478 46 L 480 60 L 480 130 Z"
          fill={stoneLight} stroke={ink} strokeWidth="0.8"
        />
        {/* shadow side (left-facing slope into pass) */}
        <path
          d="M 312 130 L 322 110 L 336 92 L 354 76 L 374 64 L 374 130 Z"
          fill={stoneMid} opacity="0.55"
        />
        {/* layering */}
        <g opacity="0.65">
          <path d="M 318 96 Q 400 88 480 84" stroke={stoneMid} strokeWidth="0.5" fill="none" />
          <path d="M 314 110 Q 400 102 480 98" stroke={stoneMid} strokeWidth="0.5" fill="none" />
          <path d="M 312 122 Q 400 116 480 114" stroke={stoneDark} strokeWidth="0.5" fill="none" opacity="0.7" />
          <path d="M 350 80 Q 410 72 470 64" stroke={stoneMid} strokeWidth="0.4" fill="none" />
        </g>
        {/* gullies */}
        <g opacity="0.55">
          <path d="M 336 92 Q 332 110 326 130" stroke={stoneDark} strokeWidth="0.4" fill="none" />
          <path d="M 374 64 Q 380 100 388 130" stroke={stoneDark} strokeWidth="0.5" fill="none" />
          <path d="M 418 42 Q 422 90 432 130" stroke={stoneDark} strokeWidth="0.5" fill="none" />
          <path d="M 458 38 Q 466 90 472 130" stroke={stoneDark} strokeWidth="0.4" fill="none" />
        </g>
        {/* pines on upper slopes */}
        <g>
          {[
            [340, 90], [358, 78], [378, 66], [398, 54], [418, 50],
            [436, 44], [456, 46], [472, 54], [350, 86], [368, 76],
            [388, 64], [408, 56], [428, 58], [448, 56], [466, 64],
          ].map(([px, py], i) => (
            <g key={i} transform={`translate(${px}, ${py})`}>
              <path d={`M -1.4 1 L 0 -2 L 1.4 1 Z`} fill={pineDark} stroke={ink} strokeWidth="0.2" />
            </g>
          ))}
        </g>
      </g>

      {/* ── A few birds high overhead, riding the cliff updrafts ────── */}
      <g opacity="0.55" stroke={ink} strokeWidth="0.4" fill="none">
        <path d="M 200 22 q 2 -1.5 4 0 q 2 -1.5 4 0" />
        <path d="M 220 28 q 2 -1.2 3 0 q 2 -1.2 3 0" />
        <path d="M 240 18 q 2 -1.5 4 0 q 2 -1.5 4 0" />
        <path d="M 280 24 q 2 -1.2 3 0 q 2 -1.2 3 0" />
      </g>

      {/* ── Foreground — flat plain leading INTO the pass ───────────── */}
      <rect x="0" y="130" width={LMK_VIEW_W} height="70" fill={LMK.parchment} opacity="0.55" />
      <path d="M 0 144 Q 80 142 160 146 Q 240 144 320 146 Q 400 144 480 148"
        stroke={LMK.earth} strokeWidth="0.7" fill="none" opacity="0.4" />
      {/* sage clumps */}
      <g opacity="0.6">
        {[20, 64, 100, 360, 400, 444].map((x, i) => {
          const y = 156 + (i % 3) * 6;
          return (
            <g key={i} transform={`translate(${x}, ${y})`}>
              <ellipse cx="0" cy="0" rx="3" ry="1.4" fill={LMK.sage} stroke={ink} strokeWidth="0.3" />
              <ellipse cx="-1.2" cy="-0.8" rx="1.6" ry="0.9" fill={LMK.sageLight} stroke={ink} strokeWidth="0.25" />
            </g>
          );
        })}
      </g>

      {/* ── WAGON TRAIN — single file, threading through the pass ──── */}
      {/* The visual punch: tiny wagons against a 200-pixel cliff. SCALE. */}
      <g>
        {/* leading wagon — already in pass */}
        <SmallWagonSB x={232} y={120} ox={2} scale={0.6} opacity={0.85} />
        {/* second wagon — entering pass */}
        <SmallWagonSB x={252} y={122} ox={2} scale={0.65} opacity={0.9} />
        {/* third wagon — at pass entrance */}
        <SmallWagonSB x={272} y={124} ox={2} scale={0.7} opacity={0.95} />
        {/* wagons in foreground approaching */}
        <SmallWagonSB x={210} y={144} ox={2} scale={0.85} />
        <SmallWagonSB x={166} y={150} ox={2} scale={1} />
        <SmallWagonSB x={108} y={158} ox={3} scale={1.05} />
        <SmallWagonSB x={44} y={166} ox={3} scale={1.15} />

        {/* outriders alongside */}
        <g transform="translate(140, 168)">
          <ellipse cx="0" cy="2" rx="3.5" ry="1.4" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
          <ellipse cx="3" cy="0.5" rx="1.2" ry="1" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
          <line x1="-2" y1="3" x2="-2" y2="5.5" stroke={ink} strokeWidth="0.4" />
          <line x1="2" y1="3" x2="2" y2="5.5" stroke={ink} strokeWidth="0.4" />
          <ellipse cx="0" cy="-2" rx="0.8" ry="0.9" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.25" />
          <ellipse cx="0" cy="-3" rx="1.3" ry="0.3" fill={ink} />
          <path d="M -0.9 -1.3 L 0.9 -1.3 L 0.7 1.8 L -0.7 1.8 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.25" />
        </g>
      </g>

      {/* ── Caption ──────────────────────────────────────────────────── */}
      <text x="240" y="194" textAnchor="middle"
        fontFamily="IM Fell English, Georgia, serif" fontSize="8"
        fill={inkSoft} fontStyle="italic" opacity="0.85">
        Scotts Bluff — Mitchell Pass
      </text>
    </g>
  );
}

// Small wagon — variable scale to reinforce depth
function SmallWagonSB({ x, y, ox = 2, scale = 1, opacity = 1 }) {
  const ink = LMK.ink;
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} opacity={opacity}>
      {Array.from({ length: ox }).map((_, i) => (
        <g key={i} transform={`translate(${-(i + 1) * 7 - 4}, 0)`}>
          <ellipse cx="0" cy="2" rx="2.6" ry="1.4" fill={i % 2 ? LMK.earth : LMK.earthLight} stroke={ink} strokeWidth="0.3" />
          <ellipse cx="2.2" cy="1.5" rx="1.1" ry="0.9" fill={i % 2 ? LMK.earth : LMK.earthLight} stroke={ink} strokeWidth="0.3" />
          <line x1="-1.5" y1="3" x2="-1.5" y2="4.5" stroke={ink} strokeWidth="0.3" />
          <line x1="1" y1="3" x2="1" y2="4.5" stroke={ink} strokeWidth="0.3" />
        </g>
      ))}
      <rect x="0" y="0" width="12" height="4" fill={LMK.earth} stroke={ink} strokeWidth="0.3" />
      <path d="M 0 0 Q 6 -7 12 0 Z" fill={LMK.white} stroke={ink} strokeWidth="0.4" />
      <circle cx="2.5" cy="5" r="1.6" fill="none" stroke={ink} strokeWidth="0.3" />
      <circle cx="9.5" cy="5" r="1.6" fill="none" stroke={ink} strokeWidth="0.3" />
    </g>
  );
}

Object.assign(window, { ScottsBluffArt });
