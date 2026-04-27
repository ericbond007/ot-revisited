/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// ChimneyRockArt — mile ~550, the most-mentioned landmark on the trail.
// ============================================================================
// "95-97% of westward emigrants who kept journals mentioned Chimney Rock."
// A solitary spire rising ~325 ft above the North Platte valley — a tall,
// narrow column atop a broader cone-shaped pedestal. White/tan sandstone-and-
// clay, visible from 30 miles away. The spire is FRAGILE-looking: pioneers
// in 1849 wrote "looks as if it would not stand a week."
//
// Distinguishing visual marks:
//   • The spire: narrow, slightly tapered, ~120 ft of a 325 ft total.
//   • Conical pedestal: broad sloping mound — eroded clay, banded layers.
//   • Solitary on flat plain — no nearby formations. Sky is HUGE around it.
//   • Distant North Platte ribbon at the foot.
//   • A wagon train on the trail in the foreground — small, scale reference.
//   • Sage / shortgrass plains; nearly treeless.
// ============================================================================

function ChimneyRockArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;
  const stoneLight = "#d4c098";
  const stoneMid = "#b89a72";
  const stoneDark = "#7a5e38";

  return (
    <g>
      {/* ── Big sky — let the spire feel small on a vast plain ──────── */}
      {/* (No sky paint here — the LandmarkArtFrame parchment shows through.
         Sky is implied by the empty top half of the composition.) */}

      {/* ── Distant low ridges (suggest the bluff line of the valley) ── */}
      <path
        d="M 0 100 Q 60 96 130 100 Q 200 95 280 100 Q 360 95 440 100 Q 470 98 480 100 L 480 108 L 0 108 Z"
        fill={LMK.sage} opacity="0.4"
      />
      <path
        d="M 0 108 Q 80 104 160 108 Q 240 104 320 108 Q 400 104 480 108 L 480 116 L 0 116 Z"
        fill={LMK.sageDark} opacity="0.45"
      />

      {/* ── HERO: the spire ─────────────────────────────────────────── */}
      {/* Centered. Tip at y≈30, base of spire at y≈92, base of cone at y≈158. */}
      <g>
        {/* Conical pedestal — broad sloping mound, banded eroded clay */}
        <path
          d="M 168 158 Q 184 130 220 100 L 230 92 L 250 92 L 260 100 Q 296 130 312 158 Z"
          fill={stoneLight} stroke={ink} strokeWidth="0.8"
        />
        {/* erosion bands on the pedestal — horizontal striations */}
        <g opacity="0.7">
          <path d="M 178 150 Q 240 144 302 150" stroke={stoneMid} strokeWidth="0.8" fill="none" />
          <path d="M 184 142 Q 240 137 296 142" stroke={stoneMid} strokeWidth="0.7" fill="none" />
          <path d="M 192 132 Q 240 128 288 132" stroke={stoneMid} strokeWidth="0.6" fill="none" />
          <path d="M 200 122 Q 240 118 280 122" stroke={stoneMid} strokeWidth="0.5" fill="none" />
          <path d="M 210 110 Q 240 107 270 110" stroke={stoneMid} strokeWidth="0.5" fill="none" />
          {/* darker shadow band where pedestal meets ground */}
          <path d="M 168 158 Q 240 154 312 158" stroke={stoneDark} strokeWidth="1" fill="none" opacity="0.5" />
        </g>

        {/* Vertical erosion gulleys radiating down the cone */}
        <g opacity="0.55">
          <path d="M 222 102 L 192 158" stroke={stoneDark} strokeWidth="0.5" fill="none" />
          <path d="M 230 98 L 218 158" stroke={stoneDark} strokeWidth="0.4" fill="none" />
          <path d="M 250 98 L 262 158" stroke={stoneDark} strokeWidth="0.4" fill="none" />
          <path d="M 258 102 L 288 158" stroke={stoneDark} strokeWidth="0.5" fill="none" />
        </g>

        {/* Shadow side of the pedestal (right) */}
        <path
          d="M 240 92 L 250 92 L 260 100 Q 296 130 312 158 L 240 158 Z"
          fill={stoneMid} opacity="0.55"
        />

        {/* The SPIRE — narrow tapered column rising above */}
        {/* Slightly asymmetric for character. Lit on left, shadowed on right. */}
        <path
          d="M 234 92 L 230 70 L 228 50 L 230 32 L 234 30 L 240 30 L 244 32 L 246 50 L 248 70 L 250 92 Z"
          fill={stoneLight} stroke={ink} strokeWidth="0.7"
        />
        {/* shadow side of spire */}
        <path
          d="M 240 30 L 244 32 L 246 50 L 248 70 L 250 92 L 240 92 Z"
          fill={stoneMid} opacity="0.6"
        />
        {/* a couple cracks / fracture lines on the spire */}
        <path d="M 236 38 L 237 78" stroke={stoneDark} strokeWidth="0.3" opacity="0.5" />
        <path d="M 242 50 L 243 90" stroke={stoneDark} strokeWidth="0.3" opacity="0.4" />
        {/* hint of the harder sandstone CAP at the very top — slightly darker */}
        <path d="M 234 30 L 240 28 L 246 30 L 244 33 L 236 33 Z" fill={stoneDark} opacity="0.6" />

        {/* Subtle glow / haze halo around the spire — atmospheric perspective */}
        <ellipse cx="240" cy="60" rx="22" ry="42" fill={LMK.paperWarm} opacity="0.18" />
      </g>

      {/* ── A few birds far overhead ────────────────────────────────── */}
      <g opacity="0.55" stroke={ink} strokeWidth="0.4" fill="none">
        <path d="M 80 38 q 2 -1.5 4 0 q 2 -1.5 4 0" />
        <path d="M 100 30 q 2 -1.2 3 0 q 2 -1.2 3 0" />
        <path d="M 360 44 q 2 -1.5 4 0 q 2 -1.5 4 0" />
        <path d="M 388 38 q 2 -1 3 0 q 2 -1 3 0" />
      </g>

      {/* ── North Platte ribbon — distant, in the valley behind ─────── */}
      <g opacity="0.7">
        <path d="M 40 116 Q 200 118 360 116 Q 420 115 480 116" stroke={LMK.water} strokeWidth="2" fill="none" />
        <path d="M 40 117 Q 200 119 360 117 Q 420 116 480 117" stroke="#5a7280" strokeWidth="0.4" fill="none" />
        {/* a few willow clumps along the river */}
        <ellipse cx="80" cy="113" rx="4" ry="3" fill={LMK.sageDark} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="160" cy="114" rx="5" ry="3" fill={LMK.sageDark} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="340" cy="113" rx="4" ry="3" fill={LMK.sageDark} stroke={ink} strokeWidth="0.3" />
        <ellipse cx="420" cy="114" rx="5" ry="3" fill={LMK.sageDark} stroke={ink} strokeWidth="0.3" />
      </g>

      {/* ── Plains foreground — sage and shortgrass, mostly empty ───── */}
      <rect x="0" y="158" width={LMK_VIEW_W} height="42" fill={LMK.parchment} opacity="0.55" />
      {/* trail rut line cutting across the foreground */}
      <path d="M 0 174 Q 120 172 240 176 Q 360 172 480 176" stroke={LMK.earth} strokeWidth="1" fill="none" opacity="0.4" />
      <path d="M 0 180 Q 120 178 240 182 Q 360 178 480 182" stroke={LMK.earth} strokeWidth="0.7" fill="none" opacity="0.35" />
      {/* sage clumps */}
      <g opacity="0.6">
        {[20, 64, 108, 152, 200, 296, 348, 396, 444].map((x, i) => {
          const y = 168 + (i % 3) * 6;
          return (
            <g key={i} transform={`translate(${x}, ${y})`}>
              <ellipse cx="0" cy="0" rx="3.5" ry="1.5" fill={LMK.sage} stroke={ink} strokeWidth="0.3" />
              <ellipse cx="-1.5" cy="-1" rx="1.8" ry="1" fill={LMK.sageLight} stroke={ink} strokeWidth="0.25" />
            </g>
          );
        })}
      </g>

      {/* ── Wagon train passing — small, gives scale to the spire ─── */}
      <g>
        <SmallWagon x={88} y={172} ox={2} />
        <SmallWagon x={148} y={174} ox={2} opacity={0.95} />
        <SmallWagon x={208} y={176} ox={2} opacity={0.9} />
        {/* outrider on horseback */}
        <g transform="translate(60, 174)">
          {/* horse */}
          <ellipse cx="0" cy="2" rx="4" ry="1.6" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
          <ellipse cx="3.5" cy="0.5" rx="1.4" ry="1.2" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
          <line x1="-2.5" y1="3" x2="-2.5" y2="6" stroke={ink} strokeWidth="0.4" />
          <line x1="2.5" y1="3" x2="2.5" y2="6" stroke={ink} strokeWidth="0.4" />
          {/* rider */}
          <ellipse cx="0" cy="-2" rx="0.9" ry="1" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.25" />
          <ellipse cx="0" cy="-3" rx="1.4" ry="0.3" fill={ink} />
          <path d="M -1 -1.5 L 1 -1.5 L 0.8 2 L -0.8 2 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.25" />
        </g>
      </g>

      {/* ── Caption ──────────────────────────────────────────────────── */}
      <text x="240" y="194" textAnchor="middle"
        fontFamily="IM Fell English, Georgia, serif" fontSize="8"
        fill={inkSoft} fontStyle="italic" opacity="0.85">
        Chimney Rock — &ldquo;a grand and splendid object&rdquo;
      </text>
    </g>
  );
}

// Small wagon helper — distant prairie schooner
function SmallWagon({ x, y, ox = 2, opacity = 1 }) {
  const ink = LMK.ink;
  return (
    <g transform={`translate(${x}, ${y})`} opacity={opacity}>
      {/* ox team — pairs ahead of wagon */}
      {Array.from({ length: ox }).map((_, i) => (
        <g key={i} transform={`translate(${-(i + 1) * 7 - 4}, 0)`}>
          <ellipse cx="0" cy="2" rx="2.6" ry="1.4" fill={i % 2 ? LMK.earth : LMK.earthLight} stroke={ink} strokeWidth="0.3" />
          <ellipse cx="2.2" cy="1.5" rx="1.1" ry="0.9" fill={i % 2 ? LMK.earth : LMK.earthLight} stroke={ink} strokeWidth="0.3" />
          <line x1="-1.5" y1="3" x2="-1.5" y2="4.5" stroke={ink} strokeWidth="0.3" />
          <line x1="1" y1="3" x2="1" y2="4.5" stroke={ink} strokeWidth="0.3" />
        </g>
      ))}
      {/* wagon */}
      <rect x="0" y="0" width="12" height="4" fill={LMK.earth} stroke={ink} strokeWidth="0.3" />
      <path d="M 0 0 Q 6 -7 12 0 Z" fill={LMK.white} stroke={ink} strokeWidth="0.4" />
      <circle cx="2.5" cy="5" r="1.6" fill="none" stroke={ink} strokeWidth="0.3" />
      <circle cx="9.5" cy="5" r="1.6" fill="none" stroke={ink} strokeWidth="0.3" />
    </g>
  );
}

Object.assign(window, { ChimneyRockArt });
