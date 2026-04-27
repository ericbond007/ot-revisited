/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// NorthPlatteEastArt — first crossing of the North Platte (near Fort Laramie)
// ============================================================================
// A wide, shallow, BRAIDED river — sandy bottom, low banks, willows.
// Dangerous in spring with snowmelt; manageable late summer.
// Composition: low horizon, wagons fording at multiple braided channels.
// ============================================================================

function NorthPlatteEastArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const water = LMK.water;
  const sand = "#cfb88a";

  return (
    <g>
      {/* distant bluffs */}
      <path d="M 0 86 Q 80 82 160 86 Q 240 80 320 86 Q 400 82 480 86 L 480 96 L 0 96 Z"
            fill="#a8a89a" opacity="0.55" stroke={ink} strokeWidth="0.4" />
      <path d="M 0 96 Q 120 92 240 96 Q 360 92 480 96 L 480 102 L 0 102 Z"
            fill={LMK.sageDark} opacity="0.55" />

      {/* willows along far bank */}
      <g>
        {[40, 80, 130, 200, 260, 340, 410, 460].map((x, i) => (
          <ellipse key={i} cx={x} cy={104 + (i % 2) * 2} rx="6" ry="3"
                   fill={LMK.sageDark} stroke={ink} strokeWidth="0.3" opacity="0.85" />
        ))}
      </g>

      {/* BRAIDED river — multiple channels separated by sandbars */}
      <g>
        {/* channel 1 (back) */}
        <path d="M 0 110 Q 240 108 480 112 L 480 120 Q 240 118 0 122 Z" fill={water} opacity="0.7" />
        {/* sandbar */}
        <path d="M 80 120 Q 200 122 320 120 Q 380 121 440 120 L 440 124 Q 200 126 60 124 Z"
              fill={sand} stroke={ink} strokeWidth="0.4" opacity="0.85" />
        {/* channel 2 (mid) */}
        <path d="M 0 124 Q 240 126 480 126 L 480 134 Q 240 134 0 134 Z" fill={water} opacity="0.7" />
        {/* sandbar */}
        <path d="M 30 134 Q 160 136 290 134 Q 360 135 420 134 L 420 138 Q 200 140 30 138 Z"
              fill={sand} stroke={ink} strokeWidth="0.4" opacity="0.85" />
        {/* channel 3 (front) */}
        <path d="M 0 138 Q 240 140 480 138 L 480 152 Q 240 154 0 152 Z" fill={water} opacity="0.78" />

        {/* shimmer */}
        <g stroke={LMK.white} strokeWidth="0.4" opacity="0.55">
          <line x1="20" y1="115" x2="60" y2="114" />
          <line x1="120" y1="113" x2="170" y2="114" />
          <line x1="240" y1="115" x2="290" y2="114" />
          <line x1="380" y1="116" x2="440" y2="115" />
          <line x1="40" y1="129" x2="100" y2="128" />
          <line x1="200" y1="130" x2="260" y2="130" />
          <line x1="340" y1="129" x2="400" y2="129" />
          <line x1="60" y1="144" x2="130" y2="143" />
          <line x1="240" y1="144" x2="320" y2="144" />
          <line x1="380" y1="145" x2="440" y2="144" />
        </g>
      </g>

      {/* ── wagon train fording — diagonal across all 3 channels ───── */}
      <g>
        <FordingWagon x={140} y={120} ink={ink} />
        <FordingWagon x={210} y={132} ink={ink} />
        <FordingWagon x={290} y={144} ink={ink} opacity={0.95} />
        <FordingWagon x={360} y={150} ink={ink} opacity={0.85} />
        {/* outrider */}
        <g transform="translate(80 122)">
          <ellipse cx="0" cy="0" rx="0" ry="0" />
          <ellipse cx="0" cy="-2" rx="3.5" ry="1.4" fill={LMK.water} opacity="0.5" />
          <ellipse cx="0" cy="-3" rx="3.5" ry="1.6" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
          <ellipse cx="3" cy="-4.5" rx="1.4" ry="1.2" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
          <ellipse cx="0" cy="-7" rx="0.9" ry="1" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.25" />
          <path d="M -1 -6 L 1 -6 L 0.8 -3 L -0.8 -3 Z" fill={LMK.earth} stroke={ink} strokeWidth="0.25" />
        </g>
      </g>

      {/* near bank — sandy strip foreground */}
      <path d="M 0 152 Q 240 154 480 152 L 480 164 L 0 164 Z" fill={sand} stroke={ink} strokeWidth="0.5" />
      <rect x="0" y="164" width={LMK_VIEW_W} height="36" fill={LMK.parchment} opacity="0.55" />
      {/* trail rut */}
      <path d="M 0 172 Q 120 170 240 174 Q 360 172 480 176" stroke={LMK.earth} strokeWidth="0.9" fill="none" opacity="0.45" />
      {/* sage clumps */}
      <g opacity="0.6">
        {[20, 70, 150, 240, 360, 440].map((x, i) => (
          <g key={i} transform={`translate(${x},${178 + (i % 2) * 4})`}>
            <ellipse cx="0" cy="0" rx="3.5" ry="1.5" fill={LMK.sage} stroke={ink} strokeWidth="0.3" />
          </g>
        ))}
      </g>

      <text x="240" y="194" textAnchor="middle"
            fontFamily="IM Fell English, Georgia, serif" fontSize="8"
            fill={inkSoft} fontStyle="italic" opacity="0.85">
        North Platte — first crossing, &ldquo;a mile wide and an inch deep&rdquo;
      </text>
    </g>
  );
}

function FordingWagon({ x, y, ink, opacity = 1 }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      {/* water shadow under wagon */}
      <ellipse cx="0" cy="3" rx="14" ry="1.4" fill={LMK.water} opacity="0.7" />
      {/* oxen pair */}
      <g transform="translate(-18 -2)">
        <ellipse cx="0" cy="0" rx="3" ry="1.4" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="2.6" cy="-0.5" rx="1.2" ry="1.1" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
      </g>
      <g transform="translate(-26 -1)" opacity="0.85">
        <ellipse cx="0" cy="0" rx="2.6" ry="1.3" fill={LMK.earthLight} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="2.4" cy="-0.5" rx="1.1" ry="1" fill={LMK.earthLight} stroke={ink} strokeWidth="0.3" />
      </g>
      {/* wagon */}
      <rect x="-10" y="-6" width="20" height="3" fill={LMK.earth} stroke={ink} strokeWidth="0.4" />
      <path d="M -10 -6 Q 0 -14 10 -6 Z" fill={LMK.white} stroke={ink} strokeWidth="0.45" />
      <circle cx="-6" cy="0" r="2.4" fill="none" stroke={ink} strokeWidth="0.4" />
      <circle cx="6" cy="0" r="2.4" fill="none" stroke={ink} strokeWidth="0.4" />
    </g>
  );
}

Object.assign(window, { NorthPlatteEastArt });
