/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// SweetwaterFordArt — sweet, gentle stream that snakes toward South Pass
// ============================================================================
// Easy crossing. Pioneers loved it after the alkali Platte — clear & cold.
// Granite outcrops nearby (it threads past Independence Rock & Devil's Gate).
// Composition: meandering creek through sage flat, granite knob, kids
// splashing, oxen drinking.
// ============================================================================

function SweetwaterFordArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const granite = "#a09480";
  const graniteSh = "#5a4e3a";

  return (
    <g>
      {/* far gentle hills */}
      <path d="M 0 80 Q 80 74 160 78 Q 240 72 320 78 Q 400 72 480 78 L 480 96 L 0 96 Z"
            fill={LMK.sage} opacity="0.5" />

      {/* granite outcrop on left */}
      <g>
        <path d="M 30 110 Q 28 90 52 78 Q 80 70 100 80 Q 110 95 96 110 Z"
              fill={granite} stroke={ink} strokeWidth="0.7" />
        <path d="M 50 80 Q 80 76 100 84 L 96 96 Q 70 92 48 100 Z"
              fill={graniteSh} opacity="0.55" />
        {/* fissures */}
        <g stroke={graniteSh} strokeWidth="0.4" fill="none" opacity="0.6">
          <path d="M 50 88 q 6 4 10 12" />
          <path d="M 70 80 q 4 8 6 22" />
          <path d="M 88 84 q 0 8 -2 22" />
        </g>
      </g>

      {/* meandering creek — clear & shallow */}
      <g>
        <path d="M 100 110 Q 160 116 220 112 Q 300 108 360 116 Q 420 122 480 118 L 480 130 Q 420 134 360 128 Q 300 120 220 124 Q 160 128 100 122 Z"
              fill={LMK.water} opacity="0.7" stroke="#5a7280" strokeWidth="0.4" />
        {/* glints */}
        <g stroke={LMK.white} strokeWidth="0.4" opacity="0.6">
          <line x1="120" y1="116" x2="160" y2="115" />
          <line x1="200" y1="115" x2="240" y2="116" />
          <line x1="300" y1="115" x2="340" y2="118" />
          <line x1="400" y1="124" x2="440" y2="125" />
        </g>
        {/* pebbles in shallows */}
        <g fill={graniteSh} opacity="0.55" stroke={ink} strokeWidth="0.2">
          <ellipse cx="180" cy="124" rx="1.2" ry="0.6" />
          <ellipse cx="200" cy="126" rx="1" ry="0.5" />
          <ellipse cx="280" cy="124" rx="1.4" ry="0.6" />
          <ellipse cx="350" cy="128" rx="1" ry="0.5" />
        </g>
      </g>

      {/* oxen drinking at edge */}
      <g transform="translate(200 132)">
        <Ox2 ink={ink} color="#5a3a1a" />
      </g>
      <g transform="translate(228 134)">
        <Ox2 ink={ink} color="#3a2818" />
      </g>

      {/* kids splashing in shallows */}
      <g transform="translate(310 124)">
        <ellipse cx="0" cy="0" rx="1.6" ry="0.6" fill={LMK.water} opacity="0.7" />
        <ellipse cx="0" cy="-3" rx="0.7" ry="0.8" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.25" />
        <path d="M -0.8 -2 L 0.8 -2 L 1 1 L -1 1 Z" fill={LMK.rust} stroke={ink} strokeWidth="0.25" />
      </g>
      <g transform="translate(322 122)">
        <ellipse cx="0" cy="0" rx="1.6" ry="0.6" fill={LMK.water} opacity="0.7" />
        <ellipse cx="0" cy="-3" rx="0.7" ry="0.8" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.25" />
        <path d="M -0.8 -2 L 0.8 -2 L 1 1 L -1 1 Z" fill="#3a5a78" stroke={ink} strokeWidth="0.25" />
      </g>

      {/* a wagon parked on the bank */}
      <g transform="translate(400 142)">
        <rect x="-9" y="-5" width="18" height="3" fill={LMK.earth} stroke={ink} strokeWidth="0.4" />
        <path d="M -9 -5 Q 0 -13 9 -5 Z" fill={LMK.white} stroke={ink} strokeWidth="0.45" />
        <circle cx="-5" cy="0" r="2.2" fill="none" stroke={ink} strokeWidth="0.4" />
        <circle cx="5" cy="0" r="2.2" fill="none" stroke={ink} strokeWidth="0.4" />
      </g>

      {/* foreground sage flat */}
      <rect x="0" y="146" width={LMK_VIEW_W} height={LMK_VIEW_H - 146} fill={LMK.parchment} opacity="0.55" />
      <path d="M 0 162 Q 120 160 240 164 Q 360 162 480 166" stroke={LMK.earth} strokeWidth="0.9" fill="none" opacity="0.4" />
      <g opacity="0.6">
        {[16, 56, 116, 270, 350, 440].map((x, i) => (
          <g key={i} transform={`translate(${x},${172 + (i % 2) * 4})`}>
            <ellipse cx="0" cy="0" rx="3.5" ry="1.5" fill={LMK.sage} stroke={ink} strokeWidth="0.3" />
          </g>
        ))}
      </g>

      <text x="240" y="194" textAnchor="middle"
            fontFamily="IM Fell English, Georgia, serif" fontSize="8"
            fill={inkSoft} fontStyle="italic" opacity="0.85">
        Sweetwater — &ldquo;clear and cold as snow-melt&rdquo;
      </text>
    </g>
  );
}

function Ox2({ ink, color }) {
  return (
    <g>
      <ellipse cx="0" cy="-3" rx="4.5" ry="2.2" fill={color} stroke={ink} strokeWidth="0.4" />
      <ellipse cx="3.6" cy="-4" rx="1.4" ry="1.2" fill={color} stroke={ink} strokeWidth="0.35" />
      <line x1="-2.6" y1="-1" x2="-2.6" y2="2" stroke={ink} strokeWidth="0.5" />
      <line x1="-1" y1="-1" x2="-1" y2="2" stroke={ink} strokeWidth="0.5" />
      <line x1="1" y1="-1" x2="1" y2="2" stroke={ink} strokeWidth="0.5" />
      <line x1="2.8" y1="-1" x2="2.8" y2="2" stroke={ink} strokeWidth="0.5" />
      <path d="M 4 -5 q 0.8 -1.4 2 -1" stroke={ink} strokeWidth="0.4" fill="none" />
      <path d="M 3 -5 q -0.5 -1.4 -1.6 -1" stroke={ink} strokeWidth="0.4" fill="none" />
    </g>
  );
}

Object.assign(window, { SweetwaterFordArt });
