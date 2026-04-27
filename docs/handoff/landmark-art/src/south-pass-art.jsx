/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// SouthPassArt — mile ~915, the Continental Divide.
// ============================================================================
// THE most-anticipated and most-anticlimactic place on the trail. South
// Pass is a broad 20-mile-wide grass saddle between the Wind River Range
// (north, with snow even in July) and the Antelope Hills (south).
// Pioneers expected mountain drama — instead they got a gentle slope that
// many crossed without realizing they'd hit the divide. From here, water
// flows to the Pacific.
//
// The visual story: VAST EMPTINESS + DISTANT SNOW PEAKS. The drama is
// PSYCHOLOGICAL — the wagons are crossing a continent's spine but the
// landscape barely changes. Pacific Springs visible just past the crest.
//
// Distinguishing visual marks:
//   • LOW FLAT FOREGROUND — gentle saddle, almost imperceptible rise
//   • Distant snow-capped Wind River Range to the north (right side)
//   • Antelope Hills to the south (left, lower, no snow)
//   • Trail running across the entire comp horizontally
//   • Long wagon train strung out across the saddle
//   • Pacific Springs — a small spring/marsh on the far side
//   • Sometimes: an emigrant marker, cairn, or simply "PACIFIC SPRINGS"
//     painted on a rock or post (period-accurate)
//   • The SKY dominates — this is the visual story of openness
// ============================================================================

function SouthPassArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const peakLight = "#c8d4dc";
  const peakSnow = "#e8eef0";
  const peakShadow = "#7a8898";
  const hillsTan = "#9a8068";

  return (
    <g>
      {/* ── DISTANT WIND RIVER RANGE — far horizon, RIGHT side ────── */}
      {/* These are ~13,000 ft peaks, snow even in July. Reads as a
          CULTURAL note: pioneers expected to cross THESE, but the trail
          dodges them through South Pass. The peaks should be present
          but DISTANT — atmospheric perspective. */}
      <g>
        {/* base haze layer */}
        <path
          d="M 240 80 Q 280 76 320 78 Q 360 74 400 78 Q 440 72 480 78 L 480 96 L 240 96 Z"
          fill={peakLight} opacity="0.55"
        />
        {/* peaks silhouette — jagged, with snow */}
        <path
          d="M 240 80
             L 252 70 L 260 76 L 272 60 L 280 70 L 290 56 L 300 70
             L 312 50 L 322 64 L 334 48 L 344 62 L 358 44 L 368 58
             L 380 42 L 392 56 L 406 40 L 418 56 L 430 46 L 444 60
             L 456 48 L 468 60 L 480 50 L 480 96 L 240 96 Z"
          fill={peakLight} stroke={ink} strokeWidth="0.5" opacity="0.85"
        />
        {/* snow on the upper third */}
        <path
          d="M 252 70 L 260 76 M 272 60 L 280 70 L 290 56 L 300 70
             M 312 50 L 322 64 L 334 48 L 344 62 L 358 44 L 368 58
             L 380 42 L 392 56 L 406 40 L 418 56 L 430 46 L 444 60
             L 456 48 L 468 60"
          stroke={peakSnow} strokeWidth="2.5" fill="none"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.95"
        />
        {/* shadow side of peaks (left-facing) */}
        <g opacity="0.45" fill={peakShadow}>
          <path d="M 290 56 L 300 70 L 296 80 L 290 76 Z" />
          <path d="M 322 64 L 334 48 L 338 60 L 326 72 Z" />
          <path d="M 358 44 L 368 58 L 364 70 L 354 60 Z" />
          <path d="M 392 56 L 406 40 L 410 52 L 396 66 Z" />
          <path d="M 418 56 L 430 46 L 434 58 L 422 68 Z" />
        </g>
        {/* very distant hint of more peaks behind */}
        <path
          d="M 240 80 Q 300 74 360 76 Q 420 70 480 76 L 480 84 L 240 84 Z"
          fill={peakSnow} opacity="0.25"
        />
      </g>

      {/* ── ANTELOPE HILLS — far horizon, LEFT side ─────────────── */}
      {/* Lower, browner, no snow. They flank the south side of the pass. */}
      <g>
        <path
          d="M 0 92 Q 30 86 60 90 Q 90 84 120 88 Q 150 84 180 88 Q 210 86 240 90 L 240 100 L 0 100 Z"
          fill={hillsTan} opacity="0.6" stroke={ink} strokeWidth="0.4"
        />
        <path
          d="M 0 96 Q 60 92 120 96 Q 180 92 240 96 L 240 102 L 0 102 Z"
          fill={hillsTan} opacity="0.45"
        />
      </g>

      {/* ── MID-DISTANT SAGE PLAIN — the saddle proper ────────── */}
      <rect x="0" y="100" width={LMK_VIEW_W} height="22" fill={LMK.sage} opacity="0.4" />

      {/* ── PACIFIC SPRINGS — small marshy spot just past the crest ── */}
      {/* Position: just left of center, mid-distance. Tiny pond + reeds. */}
      <g transform="translate(150, 122)">
        <ellipse cx="0" cy="0" rx="14" ry="2.5" fill={LMK.water} stroke={ink} strokeWidth="0.4" opacity="0.85" />
        <ellipse cx="-3" cy="-0.5" rx="3" ry="0.5" fill={peakSnow} opacity="0.5" />
        <ellipse cx="6" cy="0.3" rx="2" ry="0.4" fill={peakSnow} opacity="0.5" />
        {/* reeds and willows around */}
        {[-15, -10, 10, 15].map((rx, i) => (
          <g key={i} transform={`translate(${rx}, 0)`}>
            <line x1="0" y1="0" x2="0" y2="-3" stroke="#5a6a3a" strokeWidth="0.3" />
            <line x1="-1" y1="-1" x2="-1" y2="-3" stroke="#5a6a3a" strokeWidth="0.3" />
            <line x1="1" y1="-1" x2="1" y2="-3" stroke="#5a6a3a" strokeWidth="0.3" />
          </g>
        ))}
        <ellipse cx="-18" cy="-1" rx="3" ry="2" fill={LMK.sageDark} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="18" cy="-1" rx="3" ry="2" fill={LMK.sageDark} stroke={ink} strokeWidth="0.3" />
      </g>

      {/* ── PACIFIC SPRINGS marker post (period accurate) ──────── */}
      <g transform="translate(132, 122)">
        <line x1="0" y1="0" x2="0" y2="-8" stroke={LMK.wood} strokeWidth="1.4" strokeLinecap="round" />
        <rect x="-10" y="-12" width="20" height="6" fill={LMK.wood} stroke={ink} strokeWidth="0.4" />
        <text x="0" y="-7.5" textAnchor="middle"
          fontFamily="IM Fell English, Georgia, serif" fontSize="3.2"
          fill={LMK.parchment} opacity="0.95">
          PACIFIC
        </text>
      </g>

      {/* ── FOREGROUND — vast empty sage plain ─────────────────── */}
      <rect x="0" y="122" width={LMK_VIEW_W} height="78" fill={LMK.parchment} opacity="0.55" />

      {/* the trail crosses the WHOLE comp — long, gentle, almost flat */}
      <g>
        <path
          d="M 0 158 Q 100 156 200 156 Q 300 154 400 152 Q 450 151 480 150"
          stroke={LMK.earth} strokeWidth="1.4" fill="none" opacity="0.6"
        />
        <path
          d="M 0 164 Q 100 162 200 162 Q 300 160 400 158 Q 450 157 480 156"
          stroke={LMK.earth} strokeWidth="1" fill="none" opacity="0.5"
        />
        {/* very faint third ruts — a whole wagon-road-wide trail */}
        <path
          d="M 0 152 Q 100 150 200 150 Q 300 148 400 146"
          stroke={LMK.earth} strokeWidth="0.7" fill="none" opacity="0.35"
        />
      </g>

      {/* sage clumps — sparse, characteristic of high desert */}
      <g opacity="0.6">
        {[
          [12, 134], [40, 142], [70, 138], [102, 146], [180, 138],
          [220, 144], [260, 140], [294, 146], [328, 138], [360, 144],
          [400, 138], [440, 144], [466, 140],
          [20, 174], [60, 182], [110, 178], [200, 188], [260, 184],
          [320, 188], [380, 184], [440, 188],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x}, ${y})`}>
            <ellipse cx="0" cy="0" rx="2.6" ry="1.2" fill={LMK.sage} stroke={ink} strokeWidth="0.25" />
            <ellipse cx="-1" cy="-0.7" rx="1.4" ry="0.7" fill={LMK.sageLight} stroke={ink} strokeWidth="0.2" />
          </g>
        ))}
      </g>

      {/* ── LONG WAGON TRAIN — strung out across the saddle ───────── */}
      {/* The point: the train is stretched out over miles, the saddle so
          gradual that the head and tail of the train barely look different. */}
      <g>
        {/* far west — wagons already past the divide, descending toward Pacific */}
        <SmallWagonSP x={420} y={148} scale={0.55} opacity={0.85} />
        <SmallWagonSP x={388} y={150} scale={0.6} opacity={0.88} />
        <SmallWagonSP x={356} y={152} scale={0.65} opacity={0.92} />
        {/* mid */}
        <SmallWagonSP x={310} y={154} scale={0.72} />
        <SmallWagonSP x={266} y={156} scale={0.78} />
        <SmallWagonSP x={220} y={158} scale={0.85} />
        {/* near */}
        <SmallWagonSP x={170} y={162} scale={0.95} />
        <SmallWagonSP x={108} y={166} scale={1.05} />
        <SmallWagonSP x={42} y={170} scale={1.15} />

        {/* outrider near front of train — pointing toward Pacific Springs */}
        <g transform="translate(74, 168)">
          <ellipse cx="0" cy="2" rx="3.5" ry="1.4" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
          <ellipse cx="3" cy="0.5" rx="1.2" ry="1" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
          <line x1="-2" y1="3" x2="-2" y2="5.5" stroke={ink} strokeWidth="0.4" />
          <line x1="2" y1="3" x2="2" y2="5.5" stroke={ink} strokeWidth="0.4" />
          <ellipse cx="0" cy="-2" rx="0.9" ry="1" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.25" />
          <ellipse cx="0" cy="-3" rx="1.4" ry="0.3" fill={ink} />
          <path d="M -0.9 -1.3 L 0.9 -1.3 L 0.7 1.8 L -0.7 1.8 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.25" />
          {/* arm pointing forward */}
          <line x1="0.5" y1="-0.5" x2="3" y2="-1" stroke={ink} strokeWidth="0.5" strokeLinecap="round" />
        </g>
      </g>

      {/* ── A few birds high overhead, riding the divide updrafts ─── */}
      <g opacity="0.5" stroke={ink} strokeWidth="0.4" fill="none">
        <path d="M 80 30 q 2 -1.5 4 0 q 2 -1.5 4 0" />
        <path d="M 100 22 q 2 -1.2 3 0 q 2 -1.2 3 0" />
        <path d="M 200 28 q 2 -1.5 4 0 q 2 -1.5 4 0" />
        <path d="M 380 24 q 2 -1.2 3 0 q 2 -1.2 3 0" />
      </g>

      {/* ── Caption ──────────────────────────────────────────────────── */}
      <text x="240" y="194" textAnchor="middle"
        fontFamily="IM Fell English, Georgia, serif" fontSize="8"
        fill={inkSoft} fontStyle="italic" opacity="0.85">
        South Pass — the Continental Divide
      </text>
    </g>
  );
}

function SmallWagonSP({ x, y, scale = 1, opacity = 1 }) {
  const ink = LMK.ink;
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} opacity={opacity}>
      {/* small ox team */}
      <g transform="translate(-9, 0)">
        <ellipse cx="0" cy="2" rx="2.4" ry="1.3" fill={LMK.earthLight} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="2" cy="1.4" rx="1" ry="0.8" fill={LMK.earthLight} stroke={ink} strokeWidth="0.3" />
      </g>
      <g transform="translate(-16, 0)">
        <ellipse cx="0" cy="2" rx="2.4" ry="1.3" fill={LMK.earth} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="2" cy="1.4" rx="1" ry="0.8" fill={LMK.earth} stroke={ink} strokeWidth="0.3" />
      </g>
      <rect x="0" y="0" width="12" height="4" fill={LMK.earth} stroke={ink} strokeWidth="0.3" />
      <path d="M 0 0 Q 6 -7 12 0 Z" fill={LMK.white} stroke={ink} strokeWidth="0.4" />
      <circle cx="2.5" cy="5" r="1.6" fill="none" stroke={ink} strokeWidth="0.3" />
      <circle cx="9.5" cy="5" r="1.6" fill="none" stroke={ink} strokeWidth="0.3" />
    </g>
  );
}

Object.assign(window, { SouthPassArt });
