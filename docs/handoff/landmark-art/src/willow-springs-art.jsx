/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// WillowSpringsArt — clear cold spring after a 24-mile dry stretch
// ============================================================================
// First good water past the alkali Sweetwater plains. Clusters of willow,
// a small pool, exhausted teams crowding to drink. Composition: low willows
// ringing a clear pool, multiple wagons & oxen converging from a long flat.
// ============================================================================

function WillowSpringsArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const willow = "#5a7048";
  const willowL = "#88a060";

  return (
    <g>
      <path d="M 0 70 Q 80 64 160 70 Q 240 62 320 70 Q 400 64 480 70 L 480 96 L 0 96 Z"
            fill="#9aa098" opacity="0.55" />
      <rect x="0" y="96" width={LMK_VIEW_W} height={LMK_VIEW_H - 96} fill={LMK.parchment} opacity="0.5" />

      {/* willow cluster */}
      <g>
        <ellipse cx="200" cy="124" rx="22" ry="14" fill={willow} stroke={ink} strokeWidth="0.5" />
        <ellipse cx="240" cy="118" rx="28" ry="18" fill={willow} stroke={ink} strokeWidth="0.5" />
        <ellipse cx="284" cy="124" rx="22" ry="14" fill={willow} stroke={ink} strokeWidth="0.5" />
        <ellipse cx="216" cy="116" rx="10" ry="6" fill={willowL} opacity="0.65" />
        <ellipse cx="252" cy="110" rx="12" ry="7" fill={willowL} opacity="0.65" />
        <ellipse cx="290" cy="118" rx="9" ry="5" fill={willowL} opacity="0.65" />
        {/* drooping branches */}
        <g stroke={willow} strokeWidth="0.5" fill="none" opacity="0.85">
          <path d="M 200 134 q -2 6 -3 12" />
          <path d="M 220 138 q 2 6 4 14" />
          <path d="M 250 138 q -1 6 0 14" />
          <path d="M 280 138 q 2 6 4 12" />
        </g>
      </g>

      {/* pool */}
      <g>
        <ellipse cx="244" cy="146" rx="50" ry="9" fill={LMK.water} opacity="0.7" stroke="#5a7280" strokeWidth="0.4" />
        <ellipse cx="244" cy="144" rx="38" ry="4.5" fill="#a8c4c8" opacity="0.6" />
        <g stroke={LMK.white} strokeWidth="0.4" opacity="0.55">
          <line x1="216" y1="146" x2="240" y2="145" />
          <line x1="252" y1="148" x2="278" y2="147" />
        </g>
      </g>

      {/* converging teams */}
      <g>
        <ConvWagon x={86} y={156} ink={ink} />
        <ConvWagon x={140} y={160} ink={ink} opacity={0.95} />
        <ConvWagon x={400} y={160} ink={ink} />
        <ConvWagon x={440} y={156} ink={ink} opacity={0.95} />
        {/* oxen drinking at edge */}
        <g transform="translate(184 152)">
          <ellipse cx="0" cy="-3" rx="3.8" ry="1.8" fill="#5a3a1a" stroke={ink} strokeWidth="0.4" />
          <ellipse cx="3.2" cy="-4" rx="1.2" ry="1" fill="#5a3a1a" stroke={ink} strokeWidth="0.35" />
          <line x1="-2" y1="-1" x2="-2" y2="2" stroke={ink} strokeWidth="0.5" />
          <line x1="0" y1="-1" x2="0" y2="2" stroke={ink} strokeWidth="0.5" />
          <line x1="2" y1="-1" x2="2" y2="2" stroke={ink} strokeWidth="0.5" />
        </g>
        <g transform="translate(310 152)">
          <ellipse cx="0" cy="-3" rx="3.8" ry="1.8" fill="#3a2818" stroke={ink} strokeWidth="0.4" />
          <ellipse cx="-3.2" cy="-4" rx="1.2" ry="1" fill="#3a2818" stroke={ink} strokeWidth="0.35" />
          <line x1="2" y1="-1" x2="2" y2="2" stroke={ink} strokeWidth="0.5" />
          <line x1="0" y1="-1" x2="0" y2="2" stroke={ink} strokeWidth="0.5" />
          <line x1="-2" y1="-1" x2="-2" y2="2" stroke={ink} strokeWidth="0.5" />
        </g>
      </g>

      <path d="M 0 174 Q 120 172 240 176 Q 360 172 480 176" stroke={LMK.earth} strokeWidth="0.9" fill="none" opacity="0.4" />
      <g opacity="0.55">
        {[20, 60, 350, 410, 460].map((x, i) => (
          <ellipse key={i} cx={x} cy={184 + (i % 2) * 4} rx="3.5" ry="1.5" fill={LMK.sage} stroke={ink} strokeWidth="0.3" />
        ))}
      </g>

      <text x="240" y="194" textAnchor="middle"
            fontFamily="IM Fell English, Georgia, serif" fontSize="8"
            fill={inkSoft} fontStyle="italic" opacity="0.85">
        Willow Springs — &ldquo;cold sweet water after twenty-four dry miles&rdquo;
      </text>
    </g>
  );
}

function ConvWagon({ x, y, ink, opacity = 1 }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <rect x="-9" y="-5" width="18" height="3" fill={LMK.earth} stroke={ink} strokeWidth="0.4" />
      <path d="M -9 -5 Q 0 -13 9 -5 Z" fill={LMK.white} stroke={ink} strokeWidth="0.45" />
      <circle cx="-5" cy="0" r="2.2" fill="none" stroke={ink} strokeWidth="0.4" />
      <circle cx="5" cy="0" r="2.2" fill="none" stroke={ink} strokeWidth="0.4" />
    </g>
  );
}

Object.assign(window, { WillowSpringsArt });
