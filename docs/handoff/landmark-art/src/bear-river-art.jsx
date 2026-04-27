/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// BearRiverArt — meandering river through wide green valley near Soda Springs
// ============================================================================
// Lush MEADOW valley, the nicest grass on the trail. Aspens turning gold,
// distant peaks, soft-banked easy ford. Site of much-loved layovers.
// ============================================================================

function BearRiverArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const meadow = "#8aa05a";
  const meadowDark = "#5a7038";
  const aspen = "#d8b860";
  const aspenLight = "#f0d088";

  return (
    <g>
      {/* distant peaks */}
      <path d="M 0 56 L 50 36 L 90 50 L 140 30 L 200 50 L 260 38 L 320 52 L 380 36 L 440 50 L 480 44 L 480 84 L 0 84 Z"
            fill="#8a98a8" stroke={ink} strokeWidth="0.5" opacity="0.85" />
      <path d="M 0 84 Q 80 78 160 82 Q 240 76 320 82 Q 400 78 480 82 L 480 92 L 0 92 Z"
            fill="#5a6878" opacity="0.6" />

      {/* mid pines */}
      <g>
        {[40, 80, 130, 240, 320, 400, 450].map((x, i) => (
          <g key={i} transform={`translate(${x},${94 + (i % 3) * 2})`}>
            <path d="M 0 0 L -3 -10 L 3 -10 Z" fill={meadowDark} stroke={ink} strokeWidth="0.3" />
            <path d="M 0 -3 L -2.4 -8 L 2.4 -8 Z" fill={meadowDark} opacity="0.85" />
          </g>
        ))}
      </g>

      {/* GROVE OF ASPENS in gold */}
      <g>
        {[20, 30, 38, 48, 60, 75, 88, 102, 116, 132].map((x, i) => (
          <g key={i}>
            <ellipse cx={x} cy={108 + (i % 3) * 2} rx="5" ry="7" fill={aspen} opacity="0.85" stroke={ink} strokeWidth="0.3" />
            <ellipse cx={x - 1} cy={106 + (i % 3) * 2} rx="2" ry="3" fill={aspenLight} opacity="0.7" />
            <line x1={x} y1={114 + (i % 3) * 2} x2={x} y2={120 + (i % 3) * 2} stroke="#e8e0c8" strokeWidth="0.5" />
          </g>
        ))}
      </g>

      {/* MEADOW — broad green flat */}
      <g>
        <rect x="0" y="124" width={LMK_VIEW_W} height="38" fill={meadow} opacity="0.5" />
        {/* grass tufts */}
        <g stroke={meadowDark} strokeWidth="0.35" fill="none" opacity="0.6">
          {Array.from({ length: 50 }).map((_, i) => {
            const x = 4 + (i * 9.4) % 480;
            const y = 134 + ((i * 7) % 24);
            return <path key={i} d={`M ${x} ${y} q 0.5 -2 1 -3.5 m -0.5 3.5 q 1 -2 1.6 -3 m -1 3 q 0 -2 -0.8 -3.5`} />;
          })}
        </g>
      </g>

      {/* MEANDERING river — graceful S-curve */}
      <g>
        <path d="M 60 138 Q 140 130 200 142 Q 260 154 340 144 Q 400 138 480 148"
              stroke={LMK.water} strokeWidth="6" fill="none" opacity="0.75" strokeLinecap="round" />
        <path d="M 60 138 Q 140 130 200 142 Q 260 154 340 144 Q 400 138 480 148"
              stroke="#5a7280" strokeWidth="0.6" fill="none" opacity="0.7" />
        {/* shimmer along river */}
        <g stroke={LMK.white} strokeWidth="0.4" opacity="0.55">
          <path d="M 90 134 q 6 -1 12 0" fill="none" />
          <path d="M 220 144 q 6 -1 12 0" fill="none" />
          <path d="M 360 144 q 6 -1 12 0" fill="none" />
        </g>
      </g>

      {/* wagons resting in meadow */}
      <g>
        <RestingWagon x={150} y={158} ink={ink} />
        <RestingWagon x={196} y={160} ink={ink} />
        <RestingWagon x={244} y={162} ink={ink} />
        {/* campfire */}
        <g transform="translate(290 168)">
          <ellipse cx="0" cy="2" rx="3.5" ry="1" fill={LMK.earthDark} opacity="0.6" />
          <path d="M -1 0 q 0.5 -2 1 -3.5 q 0.5 -2 1 -3.5" stroke="#f6cc60" strokeWidth="0.5" fill="none" />
          <path d="M 0 0 q 0.5 -3 1.5 -5" stroke="#f4a832" strokeWidth="0.6" fill="none" />
          <line x1="-2" y1="2" x2="2" y2="2" stroke={ink} strokeWidth="0.4" />
        </g>
        {/* grazing oxen */}
        <g transform="translate(360 162)">
          <ellipse cx="0" cy="-3" rx="3.5" ry="1.7" fill="#5a3a1a" stroke={ink} strokeWidth="0.4" />
          <ellipse cx="3" cy="-4" rx="1.2" ry="1" fill="#5a3a1a" stroke={ink} strokeWidth="0.35" />
          <line x1="-2" y1="-1" x2="-2" y2="2" stroke={ink} strokeWidth="0.45" />
          <line x1="-0.5" y1="-1" x2="-0.5" y2="2" stroke={ink} strokeWidth="0.45" />
          <line x1="1" y1="-1" x2="1" y2="2" stroke={ink} strokeWidth="0.45" />
          <line x1="2.5" y1="-1" x2="2.5" y2="2" stroke={ink} strokeWidth="0.45" />
        </g>
        <g transform="translate(390 164)" opacity="0.85">
          <ellipse cx="0" cy="-3" rx="3" ry="1.5" fill="#3a2818" stroke={ink} strokeWidth="0.4" />
          <ellipse cx="2.7" cy="-4" rx="1.1" ry="1" fill="#3a2818" stroke={ink} strokeWidth="0.35" />
          <line x1="-1.5" y1="-1.5" x2="-1.5" y2="1.5" stroke={ink} strokeWidth="0.45" />
          <line x1="0" y1="-1.5" x2="0" y2="1.5" stroke={ink} strokeWidth="0.45" />
          <line x1="1.5" y1="-1.5" x2="1.5" y2="1.5" stroke={ink} strokeWidth="0.45" />
          <line x1="2.7" y1="-1.5" x2="2.7" y2="1.5" stroke={ink} strokeWidth="0.45" />
        </g>
      </g>

      {/* foreground meadow */}
      <rect x="0" y="170" width={LMK_VIEW_W} height={LMK_VIEW_H - 170} fill={meadow} opacity="0.4" />

      <text x="240" y="194" textAnchor="middle"
            fontFamily="IM Fell English, Georgia, serif" fontSize="8"
            fill={inkSoft} fontStyle="italic" opacity="0.85">
        Bear River — &ldquo;the finest grass on the trail&rdquo;
      </text>
    </g>
  );
}

function RestingWagon({ x, y, ink }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-9" y="-5" width="18" height="3" fill={LMK.earth} stroke={ink} strokeWidth="0.4" />
      <path d="M -9 -5 Q 0 -13 9 -5 Z" fill={LMK.white} stroke={ink} strokeWidth="0.45" />
      <circle cx="-5" cy="0" r="2.2" fill="none" stroke={ink} strokeWidth="0.4" />
      <circle cx="5" cy="0" r="2.2" fill="none" stroke={ink} strokeWidth="0.4" />
    </g>
  );
}

Object.assign(window, { BearRiverArt });
