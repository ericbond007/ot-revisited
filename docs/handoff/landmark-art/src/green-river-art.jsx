/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// GreenRiverArt — major crossing west of South Pass, near Lombard Ferry
// ============================================================================
// Deep, swift green-tinged water. Cottonwood-fringed banks, red-rock bluffs.
// Pioneers crossed via Mountain Man-run ferries (Lombard, Names Hill).
// Often delayed days in queue. Composition: ferry on broad green river,
// red bluffs in the distance, queue of wagons on near bank.
// ============================================================================

function GreenRiverArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const greenWater = "#6a8478";
  const greenWaterDark = "#3a5448";
  const redRock = "#a06848";
  const redRockSh = "#6a3e2a";

  return (
    <g>
      {/* red bluffs in distance */}
      <g>
        <path d="M 0 70 L 40 56 L 90 64 L 150 50 L 220 60 L 290 52 L 360 62 L 420 56 L 480 64 L 480 96 L 0 96 Z"
              fill={redRock} stroke={ink} strokeWidth="0.55" opacity="0.85" />
        <path d="M 0 96 Q 80 92 160 96 Q 240 92 320 96 Q 400 92 480 96 L 480 104 L 0 104 Z"
              fill={redRockSh} opacity="0.65" />
        {/* strata */}
        <g stroke={redRockSh} strokeWidth="0.4" fill="none" opacity="0.55">
          <path d="M 0 78 Q 240 74 480 80" />
          <path d="M 0 86 Q 240 82 480 88" />
        </g>
      </g>

      {/* far cottonwoods */}
      <g>
        {[40, 90, 180, 260, 360, 430].map((x, i) => (
          <g key={i}>
            <ellipse cx={x} cy={108 + (i % 2) * 2} rx="9" ry="6" fill={LMK.sageDark} stroke={ink} strokeWidth="0.4" />
            <rect x={x - 1} y={114 + (i % 2) * 2} width="2" height="6" fill="#4a3220" stroke={ink} strokeWidth="0.3" />
          </g>
        ))}
      </g>

      {/* GREEN river — broad, deep */}
      <g>
        <rect x="0" y="118" width={LMK_VIEW_W} height="38" fill={greenWater} opacity="0.85" />
        {/* depth shadow */}
        <path d="M 0 134 Q 240 138 480 134 L 480 152 L 0 152 Z" fill={greenWaterDark} opacity="0.5" />
        {/* flow lines */}
        <g stroke={LMK.white} strokeWidth="0.4" opacity="0.5">
          <line x1="20" y1="124" x2="80" y2="123" />
          <line x1="120" y1="128" x2="200" y2="127" />
          <line x1="240" y1="124" x2="320" y2="125" />
          <line x1="360" y1="128" x2="440" y2="127" />
          <line x1="40" y1="138" x2="120" y2="139" />
          <line x1="200" y1="142" x2="280" y2="141" />
          <line x1="340" y1="146" x2="420" y2="145" />
        </g>
      </g>

      {/* FERRY — flat-bottom barge with wagon, ropes */}
      <g transform="translate(240 130)">
        {/* shadow on water */}
        <ellipse cx="0" cy="14" rx="36" ry="2" fill={greenWaterDark} opacity="0.5" />
        {/* barge */}
        <path d="M -32 0 L -28 -3 L 28 -3 L 32 0 L 28 3 L -28 3 Z"
              fill="#5a3a1a" stroke={ink} strokeWidth="0.6" />
        <g stroke="#3a2410" strokeWidth="0.4" opacity="0.7">
          <line x1="-28" y1="-1" x2="28" y2="-1" />
          <line x1="-28" y1="1" x2="28" y2="1" />
        </g>
        {/* wagon on barge */}
        <g transform="translate(0 -10)">
          <rect x="-10" y="-3" width="20" height="3" fill={LMK.earth} stroke={ink} strokeWidth="0.5" />
          <path d="M -10 -3 Q 0 -12 10 -3 Z" fill={LMK.white} stroke={ink} strokeWidth="0.5" />
        </g>
        {/* ferry post + rope */}
        <line x1="-18" y1="-3" x2="-18" y2="-12" stroke={ink} strokeWidth="0.6" />
        <line x1="18" y1="-3" x2="18" y2="-12" stroke={ink} strokeWidth="0.6" />
        {/* sweep oars */}
        <line x1="-32" y1="0" x2="-44" y2="6" stroke={ink} strokeWidth="0.5" />
        <line x1="32" y1="0" x2="44" y2="6" stroke={ink} strokeWidth="0.5" />
      </g>

      {/* queue of wagons on near bank */}
      <g>
        <BankWagon x={86} y={158} ink={ink} />
        <BankWagon x={134} y={158} ink={ink} />
        <BankWagon x={178} y={158} ink={ink} opacity={0.95} />
        {/* people */}
        <g transform="translate(110 158)">
          <ellipse cx="0" cy="-4" rx="0.8" ry="0.9" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.25" />
          <path d="M -0.9 -3 L 0.9 -3 L 1.1 0 L -1.1 0 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.25" />
        </g>
      </g>

      {/* near bank */}
      <path d="M 0 156 Q 240 154 480 156 L 480 162 L 0 162 Z" fill={LMK.parchmentSh} opacity="0.7" />
      <rect x="0" y="162" width={LMK_VIEW_W} height={LMK_VIEW_H - 162} fill={LMK.parchment} opacity="0.55" />
      <path d="M 0 174 Q 120 172 240 176 Q 360 172 480 176" stroke={LMK.earth} strokeWidth="0.9" fill="none" opacity="0.4" />

      <text x="240" y="194" textAnchor="middle"
            fontFamily="IM Fell English, Georgia, serif" fontSize="8"
            fill={inkSoft} fontStyle="italic" opacity="0.85">
        Green River — Lombard Ferry, &ldquo;a queue of three days&rdquo;
      </text>
    </g>
  );
}

function BankWagon({ x, y, ink, opacity = 1 }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <rect x="-9" y="-5" width="18" height="3" fill={LMK.earth} stroke={ink} strokeWidth="0.4" />
      <path d="M -9 -5 Q 0 -13 9 -5 Z" fill={LMK.white} stroke={ink} strokeWidth="0.45" />
      <circle cx="-5" cy="0" r="2.2" fill="none" stroke={ink} strokeWidth="0.4" />
      <circle cx="5" cy="0" r="2.2" fill="none" stroke={ink} strokeWidth="0.4" />
    </g>
  );
}

Object.assign(window, { GreenRiverArt });
