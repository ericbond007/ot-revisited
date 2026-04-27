/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// FortBoiseArt — mile ~1390, HBC adobe post at Snake/Boise river confluence
// ============================================================================
// Historical (1838 rebuild, Francois Payette era):
//   • Parallelogram 100 ft per side, originally pole stockade 15 ft high,
//     later replaced with sun-dried adobe brick walls (~12.5 ft high, 1.5 ft
//     thick — 400 ft of adobe wall total).
//   • Blockhouses at corners, main entrance opening on the Snake River.
//   • Inside: small one-story buildings around the four sides — quarters,
//     storehouses, trade room.
//   • Around it: 2 acres tilled garden, 27 cattle, 17 horses (1846 inventory).
//   • Staff: French-Canadian factor + mostly Hawaiian (Owyhee) employees.
//   • A welcome OASIS at the Snake ford after 300 thirsty miles from Fort Hall.
//
// Composition (480×200): adobe walls flanked by tall corner blockhouses,
// HBC flag, the Snake River below, sage-and-rabbitbrush flats, distant
// Owyhee Mountains. Garden plot to one side, ferry/ford on the other.
// ============================================================================

function FortBoiseArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const adobe = "#c9a878";
  const adobeSh = "#8a6a3c";
  const adobeHi = "#dec094";
  const beam = "#6a4828";
  const beamSh = "#3a2410";

  return (
    <g>
      {/* ── distant Owyhee Mountains ──────────────────────────────── */}
      <path
        d="M 0 78 L 36 64 L 80 56 L 130 48 L 180 54 L 230 46 L 290 52 L 348 44 L 410 50 L 460 56 L 480 60 L 480 96 L 0 96 Z"
        fill="#8a92a0" opacity="0.7"
      />
      <path
        d="M 0 96 Q 80 90 160 94 Q 240 88 320 94 Q 400 90 480 96 L 480 110 L 0 110 Z"
        fill="#7a8290" opacity="0.55"
      />

      {/* ── Snake River — broad, flat, in the foreground midground ── */}
      <g>
        <path
          d="M 0 142 Q 80 140 160 144 Q 240 140 320 144 Q 400 140 480 144 L 480 160 L 0 160 Z"
          fill={LMK.water} opacity="0.7"
        />
        {/* shimmer */}
        <g stroke={LMK.white} strokeWidth="0.4" opacity="0.55">
          <line x1="20" y1="148" x2="60" y2="147" />
          <line x1="120" y1="151" x2="170" y2="150" />
          <line x1="240" y1="148" x2="290" y2="149" />
          <line x1="360" y1="151" x2="420" y2="150" />
        </g>
        {/* far bank line */}
        <path d="M 0 142 Q 240 138 480 142" stroke="#5a6a78" strokeWidth="0.5" fill="none" />
      </g>

      {/* ── HERO: the adobe fort — viewed slightly ¾ from the Snake side ── */}
      <g>
        {/* base shadow on river bank */}
        <path d="M 110 140 Q 240 136 370 140 L 370 144 L 110 144 Z" fill={LMK.parchmentSh} opacity="0.6" />

        {/* main long adobe wall, with corner blockhouses */}
        {/* left blockhouse */}
        <g>
          <rect x="120" y="92" width="20" height="48" fill={adobe} stroke={ink} strokeWidth="0.7" />
          <rect x="120" y="92" width="20" height="6" fill={beam} stroke={ink} strokeWidth="0.5" />
          {/* gun loops */}
          <rect x="125" y="106" width="2" height="3" fill={LMK.earthDark} />
          <rect x="133" y="106" width="2" height="3" fill={LMK.earthDark} />
          {/* shadow side */}
          <rect x="135" y="98" width="5" height="42" fill={adobeSh} opacity="0.5" />
          {/* hipped wood roof */}
          <path d="M 118 92 L 130 80 L 142 92 Z" fill={beam} stroke={ink} strokeWidth="0.55" />
          <path d="M 130 80 L 130 76 M 130 76 L 132 78 M 130 76 L 128 78" stroke={ink} strokeWidth="0.4" />
        </g>

        {/* long curtain wall */}
        <rect x="140" y="106" width="180" height="34" fill={adobe} stroke={ink} strokeWidth="0.7" />
        {/* adobe brick courses */}
        <g stroke={adobeSh} strokeWidth="0.3" opacity="0.55" fill="none">
          <path d="M 142 112 Q 232 110 320 112" />
          <path d="M 142 118 Q 232 116 320 118" />
          <path d="M 142 124 Q 232 122 320 124" />
          <path d="M 142 130 Q 232 128 320 130" />
          <path d="M 142 136 Q 232 134 320 136" />
        </g>
        {/* cap of timber along top */}
        <rect x="140" y="106" width="180" height="3" fill={beam} stroke={ink} strokeWidth="0.4" />
        {/* main gate — opening toward the river */}
        <rect x="220" y="120" width="14" height="20" fill={beamSh} stroke={ink} strokeWidth="0.55" />
        <line x1="227" y1="121" x2="227" y2="139" stroke={ink} strokeWidth="0.3" />
        {/* lintel */}
        <rect x="218" y="118" width="18" height="2.5" fill={beam} stroke={ink} strokeWidth="0.4" />

        {/* right blockhouse */}
        <g>
          <rect x="320" y="92" width="20" height="48" fill={adobe} stroke={ink} strokeWidth="0.7" />
          <rect x="320" y="92" width="20" height="6" fill={beam} stroke={ink} strokeWidth="0.5" />
          {/* shadow side fully */}
          <rect x="334" y="98" width="6" height="42" fill={adobeSh} opacity="0.55" />
          <rect x="325" y="106" width="2" height="3" fill={LMK.earthDark} />
          <rect x="333" y="106" width="2" height="3" fill={LMK.earthDark} />
          <path d="M 318 92 L 330 80 L 342 92 Z" fill={beam} stroke={ink} strokeWidth="0.55" />
          {/* HBC flag — red ensign with HBC arms (suggested) */}
          <line x1="330" y1="80" x2="330" y2="60" stroke={ink} strokeWidth="0.6" />
          <rect x="330" y="60" width="14" height="9" fill={LMK.redFlag} stroke={ink} strokeWidth="0.4" />
          <rect x="330" y="60" width="5" height="4" fill="#1a3060" stroke={ink} strokeWidth="0.3" />
          <line x1="330" y1="62" x2="335" y2="62" stroke={LMK.white} strokeWidth="0.3" />
          <line x1="332.5" y1="60" x2="332.5" y2="64" stroke={LMK.white} strokeWidth="0.3" />
          {/* tiny H.B.C. text */}
          <text x="338" y="66" fontSize="2.6" fontFamily="Georgia, serif"
                fill={LMK.white} textAnchor="middle">H·B·C</text>
        </g>

        {/* roofs of inner buildings peeking above wall */}
        <g>
          <path d="M 156 106 L 156 100 L 174 100 L 174 106 Z" fill={beam} stroke={ink} strokeWidth="0.45" />
          <path d="M 156 100 L 165 96 L 174 100 Z" fill={beamSh} stroke={ink} strokeWidth="0.4" />
          <path d="M 184 106 L 184 102 L 200 102 L 200 106 Z" fill={beam} stroke={ink} strokeWidth="0.45" />
          <path d="M 184 102 L 192 98 L 200 102 Z" fill={beamSh} stroke={ink} strokeWidth="0.4" />
          <path d="M 250 106 L 250 100 L 270 100 L 270 106 Z" fill={beam} stroke={ink} strokeWidth="0.45" />
          <path d="M 250 100 L 260 96 L 270 100 Z" fill={beamSh} stroke={ink} strokeWidth="0.4" />
          <path d="M 280 106 L 280 102 L 298 102 L 298 106 Z" fill={beam} stroke={ink} strokeWidth="0.45" />
          <path d="M 280 102 L 289 98 L 298 102 Z" fill={beamSh} stroke={ink} strokeWidth="0.4" />
          {/* smoke from one chimney */}
          <rect x="188" y="94" width="2.4" height="4" fill={beamSh} stroke={ink} strokeWidth="0.3" />
          <path d="M 189 94 q -2 -3 0 -5 q 2 -3 0 -6" stroke={inkSoft} strokeWidth="0.45" fill="none" opacity="0.6" />
        </g>

        {/* adobe highlight on sun side */}
        <rect x="140" y="106" width="6" height="34" fill={adobeHi} opacity="0.45" />
      </g>

      {/* ── 2-acre tilled garden, left of fort ───────────────────── */}
      <g>
        <rect x="20" y="118" width="86" height="22" fill={LMK.sageLight} opacity="0.6" stroke={ink} strokeWidth="0.4" />
        {/* furrows */}
        <g stroke={LMK.sageDark} strokeWidth="0.4" opacity="0.7">
          <line x1="22" y1="122" x2="104" y2="122" />
          <line x1="22" y1="126" x2="104" y2="126" />
          <line x1="22" y1="130" x2="104" y2="130" />
          <line x1="22" y1="134" x2="104" y2="134" />
          <line x1="22" y1="138" x2="104" y2="138" />
        </g>
        {/* picket fence along front */}
        {[20, 28, 36, 44, 52, 60, 68, 76, 84, 92, 100, 106].map(px => (
          <line key={px} x1={px} y1="118" x2={px} y2="115" stroke={beam} strokeWidth="0.5" />
        ))}
      </g>

      {/* ── livestock — cattle grazing right of fort ───────────────── */}
      <g>
        <Cow x={360} y={138} ink={ink} color="#8a5a30" />
        <Cow x={385} y={140} ink={ink} color="#3a2818" />
        <Cow x={412} y={138} ink={ink} color="#a8865a" />
        <Cow x={440} y={140} ink={ink} color="#5a3a1a" />
      </g>

      {/* ── ferry / ford ─ wagons crossing the Snake at right ───── */}
      <g>
        {/* a wagon mid-river — water up to bed */}
        <g transform="translate(70 152)">
          <ellipse cx="0" cy="0" rx="18" ry="2" fill={LMK.water} opacity="0.55" />
          <path d="M -10 -6 Q 0 -14 10 -6 Z" fill={LMK.white} stroke={ink} strokeWidth="0.45" />
          <rect x="-10" y="-6" width="20" height="3" fill={LMK.earth} stroke={ink} strokeWidth="0.4" />
          {/* oxen wading ahead */}
          <g transform="translate(-22, -2)">
            <ellipse cx="0" cy="0" rx="3.5" ry="1.6" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
            <ellipse cx="3" cy="-0.5" rx="1.4" ry="1.2" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
          </g>
          <g transform="translate(-32, -1)" opacity="0.85">
            <ellipse cx="0" cy="0" rx="3" ry="1.4" fill={LMK.earthLight} stroke={ink} strokeWidth="0.3" />
            <ellipse cx="2.8" cy="-0.5" rx="1.2" ry="1.1" fill={LMK.earthLight} stroke={ink} strokeWidth="0.3" />
          </g>
        </g>
      </g>

      {/* ── sage flat foreground ────────────────────────────────── */}
      <rect x="0" y="160" width={LMK_VIEW_W} height={LMK_VIEW_H - 160} fill={LMK.parchment} opacity="0.55" />
      <path d="M 0 174 Q 120 172 240 176 Q 360 172 480 176" stroke={LMK.earth} strokeWidth="0.9" fill="none" opacity="0.4" />
      <g opacity="0.6">
        {[14, 50, 110, 200, 280, 360, 440].map((x, i) => (
          <g key={i} transform={`translate(${x},${178 + (i % 2) * 4})`}>
            <ellipse cx="0" cy="0" rx="4" ry="1.6" fill={LMK.sage} stroke={ink} strokeWidth="0.3" />
            <ellipse cx="-1.5" cy="-1" rx="2" ry="1" fill={LMK.sageLight} stroke={ink} strokeWidth="0.25" />
          </g>
        ))}
      </g>

      {/* ── caption ────────────────────────────────────────────── */}
      <text x="240" y="194" textAnchor="middle"
            fontFamily="IM Fell English, Georgia, serif" fontSize="8"
            fill={inkSoft} fontStyle="italic" opacity="0.85">
        Fort Boise — &ldquo;an oasis at the Snake river ford&rdquo;
      </text>
    </g>
  );
}

function Cow({ x, y, ink, color }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="-3" rx="5" ry="2.4" fill={color} stroke={ink} strokeWidth="0.4" />
      <ellipse cx="4" cy="-4" rx="1.6" ry="1.3" fill={color} stroke={ink} strokeWidth="0.35" />
      <line x1="-3" y1="-1" x2="-3" y2="2" stroke={ink} strokeWidth="0.55" />
      <line x1="-1" y1="-1" x2="-1" y2="2" stroke={ink} strokeWidth="0.55" />
      <line x1="1" y1="-1" x2="1" y2="2" stroke={ink} strokeWidth="0.55" />
      <line x1="3" y1="-1" x2="3" y2="2" stroke={ink} strokeWidth="0.55" />
      <path d="M -5 -3 q -1.5 0.5 -2 2.5" stroke={ink} strokeWidth="0.5" fill="none" />
      {/* horns */}
      <path d="M 4.5 -5 q 1 -1.5 2.5 -1" stroke={ink} strokeWidth="0.4" fill="none" />
      <path d="M 3.5 -5 q -0.5 -1.5 -2 -1" stroke={ink} strokeWidth="0.4" fill="none" />
    </g>
  );
}

Object.assign(window, { FortBoiseArt });
