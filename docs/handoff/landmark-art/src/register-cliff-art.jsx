/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// RegisterCliffArt — mile ~657, soft sandstone face dense with carved names
// ============================================================================
// 100-ft sheer face of soft Brule sandstone above the North Platte.
// Pioneers carved/painted names — thousands still legible. Just past Fort
// Laramie. Composition: full-bleed cliff face dense with names of varying
// scale, a couple emigrants currently carving, the river at the foot.
// ============================================================================

function RegisterCliffArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const stone = "#dcc18c";
  const stoneSh = "#9a7e50";
  const stoneShDeep = "#6a522e";

  const names = [
    { x: 30, y: 32, t: "JAS · BAKER · 1849", s: 4.4 },
    { x: 90, y: 26, t: "Whitman · 1843", s: 3.8 },
    { x: 160, y: 36, t: "M·HASTINGS·48", s: 3.6 },
    { x: 240, y: 28, t: "T · J · CLARK", s: 4.6 },
    { x: 330, y: 32, t: "WM · KNIGHT", s: 4.0 },
    { x: 410, y: 30, t: "1850 · A·F·M", s: 3.8 },

    { x: 24, y: 52, t: "S · McCune", s: 3.4 },
    { x: 78, y: 56, t: "JOHN BARGER", s: 3.6 },
    { x: 154, y: 54, t: "E · KIMBERLY", s: 3.2 },
    { x: 222, y: 58, t: "R·H·1849", s: 4.2 },
    { x: 290, y: 52, t: "Lathrop", s: 3.4 },
    { x: 360, y: 56, t: "Mary · Jane", s: 3.4 },
    { x: 432, y: 54, t: "C·BOWMAN", s: 3.6 },

    { x: 20, y: 76, t: "Hodges · 1850", s: 3.5 },
    { x: 92, y: 74, t: "G · WORTH", s: 3.4 },
    { x: 178, y: 78, t: "1847", s: 5.0 },
    { x: 250, y: 76, t: "GEO · BLAKE", s: 3.4 },
    { x: 320, y: 80, t: "Reed · '46", s: 3.6 },
    { x: 396, y: 76, t: "PALMER · 49", s: 3.6 },

    { x: 30, y: 96, t: "T·NEWLAND", s: 3.4 },
    { x: 110, y: 100, t: "Sarah Coon", s: 3.2 },
    { x: 200, y: 96, t: "ALEX · TAIT", s: 3.6 },
    { x: 280, y: 100, t: "1849", s: 4.4 },
    { x: 360, y: 98, t: "S·H·MEEK", s: 3.4 },
    { x: 432, y: 100, t: "BRYANT", s: 3.5 },

    { x: 50, y: 116, t: "I·BROWN", s: 3.0 },
    { x: 130, y: 120, t: "Jno Hicks", s: 3.0 },
    { x: 218, y: 118, t: "1851", s: 3.6 },
    { x: 300, y: 120, t: "C · CHAMBERS", s: 3.0 },
    { x: 386, y: 118, t: "M · LEEK", s: 3.0 },
  ];

  return (
    <g>
      {/* sky strip at top */}
      <rect x="0" y="0" width={LMK_VIEW_W} height="14" fill={LMK.parchment} opacity="0.5" />

      {/* CLIFF FACE — full-bleed */}
      <g>
        <rect x="0" y="14" width={LMK_VIEW_W} height="142" fill={stone} stroke={ink} strokeWidth="0.7" />
        {/* top edge — eroded brow */}
        <path d="M 0 14 Q 60 10 120 16 Q 200 8 280 14 Q 360 8 440 16 Q 480 10 480 14"
              fill="none" stroke={ink} strokeWidth="0.7" />
        {/* horizontal bedding */}
        <g stroke={stoneSh} strokeWidth="0.45" fill="none" opacity="0.55">
          <path d="M 0 42 Q 240 38 480 44" />
          <path d="M 0 66 Q 240 62 480 68" />
          <path d="M 0 90 Q 240 86 480 92" />
          <path d="M 0 110 Q 240 106 480 112" />
          <path d="M 0 130 Q 240 126 480 132" />
        </g>
        {/* vertical fissures */}
        <g stroke={stoneShDeep} strokeWidth="0.5" fill="none" opacity="0.6">
          <path d="M 60 14 q 2 30 -1 70 q -2 30 1 60" />
          <path d="M 200 14 q 2 30 -1 70 q -2 30 1 60" />
          <path d="M 350 14 q 2 30 -1 70 q -2 30 1 60" />
          <path d="M 440 14 q 2 30 -1 70 q -2 30 1 60" />
        </g>
        {/* shadow gradient on right */}
        <rect x="380" y="14" width="100" height="142" fill={stoneSh} opacity="0.25" />
        {/* light gradient on left */}
        <rect x="0" y="14" width="80" height="142" fill="#f0d8a8" opacity="0.35" />
      </g>

      {/* CARVED NAMES — many, varying scale and orientation */}
      <g fontFamily="IM Fell English, Georgia, serif" fill={stoneShDeep} fontStyle="italic">
        {names.map((n, i) => (
          <text key={i} x={n.x} y={n.y} fontSize={n.s}
                opacity={0.78 - (i % 3) * 0.08}
                transform={i % 5 === 0 ? `rotate(-2 ${n.x} ${n.y})` : i % 7 === 0 ? `rotate(3 ${n.x} ${n.y})` : ""}>
            {n.t}
          </text>
        ))}
      </g>
      {/* additional faint scratches suggesting more names */}
      <g stroke={stoneShDeep} strokeWidth="0.3" opacity="0.4" fill="none">
        {Array.from({ length: 24 }).map((_, i) => {
          const x = 4 + (i * 19) % 470;
          const y = 22 + ((i * 11) % 110);
          return <line key={i} x1={x} y1={y} x2={x + 14 + (i % 3) * 4} y2={y + ((i % 2) ? -1 : 1)} />;
        })}
      </g>

      {/* small carving figure mid-cliff (suggested by scale) */}
      <g transform="translate(150 134)">
        {/* figure on rock at base, reaching up to carve */}
        <ellipse cx="0" cy="0" rx="3" ry="0.6" fill={stoneShDeep} opacity="0.55" />
        <path d="M -1 -1 L 1 -1 L 1.4 -5 L -1.4 -5 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="0" cy="-6" rx="0.8" ry="0.9" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.25" />
        {/* arm raised w/ knife */}
        <line x1="0.6" y1="-5" x2="2.5" y2="-9" stroke={ink} strokeWidth="0.35" />
        <line x1="2.5" y1="-9" x2="3.5" y2="-10" stroke={ink} strokeWidth="0.4" />
      </g>

      {/* ground & river at base */}
      <g>
        <rect x="0" y="156" width={LMK_VIEW_W} height="6" fill={stoneSh} stroke={ink} strokeWidth="0.4" />
        <rect x="0" y="162" width={LMK_VIEW_W} height="14" fill={LMK.water} opacity="0.7" />
        <g stroke={LMK.white} strokeWidth="0.35" opacity="0.55">
          <line x1="20" y1="166" x2="80" y2="165" />
          <line x1="120" y1="168" x2="190" y2="167" />
          <line x1="260" y1="166" x2="320" y2="167" />
          <line x1="380" y1="170" x2="440" y2="169" />
        </g>
        {/* near bank */}
        <rect x="0" y="176" width={LMK_VIEW_W} height={LMK_VIEW_H - 176} fill={LMK.parchment} opacity="0.55" />

        {/* couple wagons on the bank */}
        <g transform="translate(380 184)">
          <rect x="-9" y="-5" width="18" height="3" fill={LMK.earth} stroke={ink} strokeWidth="0.4" />
          <path d="M -9 -5 Q 0 -13 9 -5 Z" fill={LMK.white} stroke={ink} strokeWidth="0.45" />
          <circle cx="-5" cy="0" r="2.2" fill="none" stroke={ink} strokeWidth="0.4" />
          <circle cx="5" cy="0" r="2.2" fill="none" stroke={ink} strokeWidth="0.4" />
        </g>
      </g>

      <text x="240" y="194" textAnchor="middle"
            fontFamily="IM Fell English, Georgia, serif" fontSize="8"
            fill={inkSoft} fontStyle="italic" opacity="0.85">
        Register Cliff — &ldquo;every traveler signs the great book&rdquo;
      </text>
    </g>
  );
}

Object.assign(window, { RegisterCliffArt });
