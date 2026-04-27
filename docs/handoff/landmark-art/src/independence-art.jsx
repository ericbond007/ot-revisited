/* global React, LMK, LMK_VIEW_W, LMK_VIEW_H */

// ============================================================================
// IndependenceArt — mile 0, the trail head.
// ============================================================================
// Independence, MO, "Queen City of the Trails" in the early 1840s. The
// archetypal jumping-off scene: brick courthouse on the square, blacksmith
// sheds with smoke, mercantile storefronts, wagons being outfitted, oxen
// being shod, a busy bustling frontier town humming with departure energy.
//
// Distinguishing visual marks:
//   • Brick (warm red) courthouse with cupola at the center — the literal
//     starting point. Two-story, columned porch, simple gable.
//   • A row of frame mercantile storefronts flanking the square
//   • Blacksmith shed with chimney smoke (open-front shed, anvil visible)
//   • Wagons in the foreground being assembled / loaded
//   • Oxen being shod, men working, packed barrels
//   • Gentle Missouri bluffs on the horizon (low, wooded)
//   • Mid-spring season — leafy, generous trees
// ============================================================================

function IndependenceArt() {
  const ink = LMK.ink;
  const inkSoft = LMK.inkSoft;

  return (
    <g>
      {/* ── Distant wooded bluffs (Missouri, low rolling) ─────────────── */}
      <path
        d="M 0 132 Q 40 120 90 124 Q 140 116 200 122 Q 260 114 320 120 Q 380 116 440 122 Q 470 118 480 122 L 480 138 L 0 138 Z"
        fill={LMK.sage} opacity="0.55"
      />
      <path
        d="M 0 138 Q 60 128 130 134 Q 200 126 280 132 Q 360 126 440 134 Q 470 130 480 134 L 480 142 L 0 142 Z"
        fill={LMK.sageDark} opacity="0.5"
      />
      {/* tiny tree-suggestions on the horizon */}
      {Array.from({ length: 24 }).map((_, i) => {
        const x = 8 + i * 20;
        const h = 3 + ((i * 7) % 4);
        return (
          <ellipse key={i} cx={x} cy={130 - h * 0.4} rx="3.5" ry={h * 0.7}
            fill={LMK.sageDark} opacity="0.45" />
        );
      })}

      {/* ── Distant town silhouette (low rooflines) ──────────────────── */}
      <g opacity="0.6">
        <rect x="20" y="124" width="14" height="10" fill={LMK.earthLight} stroke={ink} strokeWidth="0.3" />
        <path d="M 19 124 L 27 119 L 35 124 Z" fill={LMK.earth} stroke={ink} strokeWidth="0.3" />
        <rect x="50" y="126" width="20" height="8" fill={LMK.earthLight} stroke={ink} strokeWidth="0.3" />
        <path d="M 49 126 L 60 121 L 71 126 Z" fill={LMK.earth} stroke={ink} strokeWidth="0.3" />
        <rect x="380" y="125" width="22" height="9" fill={LMK.earthLight} stroke={ink} strokeWidth="0.3" />
        <path d="M 379 125 L 391 119 L 403 125 Z" fill={LMK.earth} stroke={ink} strokeWidth="0.3" />
        <rect x="425" y="127" width="16" height="7" fill={LMK.earthLight} stroke={ink} strokeWidth="0.3" />
        <path d="M 424 127 L 433 122 L 442 127 Z" fill={LMK.earth} stroke={ink} strokeWidth="0.3" />
      </g>

      {/* ── Brick courthouse (HERO — center, slight upstage) ─────────── */}
      <g transform="translate(195, 0)">
        {/* Building body — brick warm red */}
        <rect x="0" y="86" width="90" height="48" fill={LMK.brick} stroke={ink} strokeWidth="0.7" />
        {/* second story brick courses (tone variation) */}
        <rect x="0" y="86" width="90" height="3" fill="#9a5a30" opacity="0.5" />
        <rect x="0" y="103" width="90" height="3" fill="#9a5a30" opacity="0.4" />
        {/* gable peak */}
        <path d="M -2 86 L 45 70 L 92 86 Z" fill={LMK.brick} stroke={ink} strokeWidth="0.7" />
        <path d="M -2 86 L 45 70 L 92 86 Z" fill="none" stroke={ink} strokeWidth="0.7" />

        {/* Cupola on top of the gable */}
        <rect x="40" y="60" width="10" height="10" fill={LMK.earthLight} stroke={ink} strokeWidth="0.5" />
        <path d="M 39 60 L 45 54 L 51 60 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.5" />
        <line x1="45" y1="54" x2="45" y2="49" stroke={ink} strokeWidth="0.6" />
        <circle cx="45" cy="49" r="0.8" fill={ink} />
        {/* cupola opening */}
        <rect x="42" y="63" width="6" height="4" fill={ink} opacity="0.6" />

        {/* Columned porch on front */}
        <rect x="14" y="116" width="62" height="18" fill={LMK.paperWarm} opacity="0.5" stroke={ink} strokeWidth="0.5" />
        {/* porch roof line */}
        <line x1="14" y1="116" x2="76" y2="116" stroke={ink} strokeWidth="0.7" />
        {/* columns */}
        {[20, 32, 44, 56, 68].map((cx, i) => (
          <rect key={i} x={cx - 1} y="118" width="2" height="16" fill={LMK.white} stroke={ink} strokeWidth="0.3" />
        ))}
        {/* central door (dark) */}
        <rect x="40" y="124" width="10" height="10" fill={LMK.earthDark} stroke={ink} strokeWidth="0.4" />
        {/* steps */}
        <rect x="36" y="132" width="18" height="2" fill={LMK.earthLight} stroke={ink} strokeWidth="0.3" />

        {/* Window grid — second story */}
        {[10, 26, 64, 80].map((wx, i) => (
          <g key={i}>
            <rect x={wx} y="92" width="6" height="8" fill={LMK.skyHi} stroke={ink} strokeWidth="0.4" />
            <line x1={wx + 3} y1="92" x2={wx + 3} y2="100" stroke={ink} strokeWidth="0.3" />
            <line x1={wx} y1="96" x2={wx + 6} y2="96" stroke={ink} strokeWidth="0.3" />
          </g>
        ))}
        {/* windows — first story between columns */}
        {[18, 60].map((wx, i) => (
          <g key={i}>
            <rect x={wx} y="108" width="6" height="6" fill={LMK.skyHi} stroke={ink} strokeWidth="0.4" />
            <line x1={wx + 3} y1="108" x2={wx + 3} y2="114" stroke={ink} strokeWidth="0.3" />
          </g>
        ))}
      </g>

      {/* ── Mercantile / storefront row (left of courthouse) ─────────── */}
      <g>
        {/* shop 1 — frame storefront */}
        <rect x="60" y="100" width="42" height="34" fill={LMK.earthLight} stroke={ink} strokeWidth="0.6" />
        {/* clapboard horizontal lines */}
        {[105, 110, 115, 120, 125, 130].map((y, i) => (
          <line key={i} x1="60" y1={y} x2="102" y2={y} stroke={ink} strokeWidth="0.25" opacity="0.5" />
        ))}
        {/* false-front parapet */}
        <rect x="58" y="96" width="46" height="6" fill={LMK.earthLight} stroke={ink} strokeWidth="0.6" />
        {/* sign */}
        <rect x="63" y="98" width="36" height="3" fill={LMK.earthDark} />
        {/* doors + window */}
        <rect x="68" y="118" width="6" height="16" fill={LMK.earthDark} stroke={ink} strokeWidth="0.4" />
        <rect x="80" y="112" width="16" height="10" fill={LMK.skyHi} stroke={ink} strokeWidth="0.4" />
        <line x1="88" y1="112" x2="88" y2="122" stroke={ink} strokeWidth="0.3" />
        {/* awning */}
        <path d="M 60 112 L 102 112 L 100 116 L 62 116 Z" fill={LMK.earthDark} opacity="0.6" />
      </g>

      {/* ── Blacksmith shed (right of courthouse) ────────────────────── */}
      <g>
        {/* open-front shed — dark interior */}
        <rect x="306" y="104" width="44" height="30" fill={LMK.earthDark} stroke={ink} strokeWidth="0.6" />
        {/* roof — pitched */}
        <path d="M 304 104 L 328 92 L 352 104 Z" fill={LMK.earth} stroke={ink} strokeWidth="0.6" />
        {/* chimney */}
        <rect x="338" y="86" width="5" height="12" fill={LMK.earthDark} stroke={ink} strokeWidth="0.4" />
        {/* dense smoke from forge */}
        <path d="M 340.5 86 q -3 -6 2 -10 q 5 -3 1 -9 q -2 -5 4 -10 q 4 -4 0 -10"
          stroke={ink} strokeWidth="0.7" fill="none" opacity="0.55" />
        <path d="M 340.5 86 q -2 -5 3 -8 q 4 -3 0 -7"
          stroke={inkSoft} strokeWidth="0.6" fill="none" opacity="0.45" />
        {/* anvil (dark blob) inside */}
        <rect x="320" y="124" width="6" height="3" fill={ink} />
        <rect x="321" y="121" width="4" height="3" fill={ink} />
        {/* glow inside shed */}
        <rect x="306" y="104" width="44" height="30" fill="#c84a18" opacity="0.18" />
        {/* smith silhouette */}
        <ellipse cx="334" cy="120" rx="2.2" ry="3.5" fill={ink} />
        <rect x="332" y="123" width="4" height="9" fill={ink} />
      </g>

      {/* ── Cottonwoods / leafy trees scattered through town ─────────── */}
      <g>
        <Tree x="20" y="124" h={22} />
        <Tree x="42" y="124" h={18} />
        <Tree x="160" y="118" h={24} />
        <Tree x="298" y="120" h={20} />
        <Tree x="370" y="122" h={22} />
        <Tree x="408" y="122" h={20} />
        <Tree x="446" y="126" h={16} />
        <Tree x="468" y="128" h={14} />
      </g>

      {/* ── Ground (square / plaza) ───────────────────────────────────── */}
      <rect x="0" y="134" width={LMK_VIEW_W} height="66" fill={LMK.parchment} opacity="0.7" />
      {/* slight muddy track variation */}
      <path d="M 0 148 Q 120 144 240 150 Q 360 146 480 152" stroke={LMK.earth} strokeWidth="1.5" fill="none" opacity="0.35" />
      <path d="M 0 158 Q 120 156 240 160 Q 360 156 480 162" stroke={LMK.earth} strokeWidth="1" fill="none" opacity="0.3" />

      {/* ── Foreground action — wagons being outfitted ─────────────── */}
      <g>
        {/* parked wagon, left foreground (canvas top, full body) */}
        <g transform="translate(80, 0)">
          {/* wagon bed */}
          <rect x="0" y="156" width="32" height="10" fill={LMK.earth} stroke={ink} strokeWidth="0.5" />
          {/* canvas bonnet */}
          <path d="M 0 156 Q 16 138 32 156 Z" fill={LMK.white} stroke={ink} strokeWidth="0.6" />
          <path d="M 0 156 Q 16 142 32 156" fill="none" stroke={inkSoft} strokeWidth="0.4" />
          {/* wheels */}
          <circle cx="6" cy="170" r="5" fill="none" stroke={ink} strokeWidth="0.6" />
          <circle cx="6" cy="170" r="1.5" fill={ink} />
          <circle cx="26" cy="170" r="5" fill="none" stroke={ink} strokeWidth="0.6" />
          <circle cx="26" cy="170" r="1.5" fill={ink} />
          {/* spokes */}
          {[0, 60, 120, 180, 240, 300].map((a, i) => (
            <g key={i}>
              <line x1="6" y1="170"
                x2={6 + 5 * Math.cos(a * Math.PI / 180)}
                y2={170 + 5 * Math.sin(a * Math.PI / 180)}
                stroke={ink} strokeWidth="0.4" />
              <line x1="26" y1="170"
                x2={26 + 5 * Math.cos(a * Math.PI / 180)}
                y2={170 + 5 * Math.sin(a * Math.PI / 180)}
                stroke={ink} strokeWidth="0.4" />
            </g>
          ))}
        </g>

        {/* second wagon — being loaded (right foreground) */}
        <g transform="translate(240, 0)">
          <rect x="0" y="160" width="30" height="10" fill={LMK.earth} stroke={ink} strokeWidth="0.5" />
          <path d="M 0 160 Q 15 144 30 160 Z" fill={LMK.white} stroke={ink} strokeWidth="0.6" />
          <circle cx="5" cy="173" r="4.5" fill="none" stroke={ink} strokeWidth="0.6" />
          <circle cx="5" cy="173" r="1.2" fill={ink} />
          <circle cx="25" cy="173" r="4.5" fill="none" stroke={ink} strokeWidth="0.6" />
          <circle cx="25" cy="173" r="1.2" fill={ink} />
        </g>

        {/* Stack of barrels & crates being loaded */}
        <g transform="translate(280, 165)">
          <rect x="0" y="0" width="6" height="8" fill={LMK.earth} stroke={ink} strokeWidth="0.4" />
          <line x1="0" y1="2.5" x2="6" y2="2.5" stroke={ink} strokeWidth="0.3" />
          <line x1="0" y1="5.5" x2="6" y2="5.5" stroke={ink} strokeWidth="0.3" />
          <rect x="7" y="2" width="6" height="6" fill={LMK.earthLight} stroke={ink} strokeWidth="0.4" />
          <rect x="3" y="-6" width="5" height="6" fill={LMK.earthDark} stroke={ink} strokeWidth="0.4" />
        </g>

        {/* Yoked oxen pair, foreground left */}
        <g transform="translate(140, 0)">
          {/* ox 1 */}
          <ellipse cx="6" cy="166" rx="7" ry="4.5" fill={LMK.earth} stroke={ink} strokeWidth="0.5" />
          <ellipse cx="13" cy="164" rx="3" ry="3" fill={LMK.earth} stroke={ink} strokeWidth="0.5" />
          {/* horns */}
          <path d="M 14 162 q 1.5 -1.5 3 -0.5" stroke={ink} strokeWidth="0.5" fill="none" />
          <path d="M 12 162 q -1 -1 -2 0" stroke={ink} strokeWidth="0.5" fill="none" />
          {/* legs */}
          <line x1="2" y1="170" x2="2" y2="174" stroke={ink} strokeWidth="0.6" />
          <line x1="9" y1="170" x2="9" y2="174" stroke={ink} strokeWidth="0.6" />
          {/* ox 2 */}
          <ellipse cx="6" cy="174" rx="7" ry="4.5" fill={LMK.earthLight} stroke={ink} strokeWidth="0.5" />
          <ellipse cx="13" cy="172" rx="3" ry="3" fill={LMK.earthLight} stroke={ink} strokeWidth="0.5" />
          <line x1="2" y1="178" x2="2" y2="182" stroke={ink} strokeWidth="0.6" />
          <line x1="9" y1="178" x2="9" y2="182" stroke={ink} strokeWidth="0.6" />
        </g>

        {/* People — small ink figures */}
        <Person x={120} y={170} />
        <Person x={172} y={172} hatColor={ink} />
        <Person x={216} y={168} />
        <Person x={278} y={170} hatColor={ink} />
        <Person x={344} y={172} />
        <Person x={368} y={170} hatColor={ink} />
      </g>

      {/* ── Caption ──────────────────────────────────────────────────── */}
      <text x="240" y="194" textAnchor="middle"
        fontFamily="IM Fell English, Georgia, serif" fontSize="8"
        fill={inkSoft} fontStyle="italic" opacity="0.85">
        Independence — Queen City of the Trails
      </text>
    </g>
  );
}

// Small leafy tree helper — cottonwood / mid-spring
function Tree({ x, y, h = 20 }) {
  const ink = LMK.ink;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <line x1="0" y1="0" x2="0" y2={-h * 0.4} stroke={LMK.earthDark} strokeWidth="1.2" />
      <ellipse cx="-3" cy={-h * 0.55} rx={h * 0.35} ry={h * 0.45}
        fill={LMK.sage} stroke={ink} strokeWidth="0.4" />
      <ellipse cx="3" cy={-h * 0.65} rx={h * 0.32} ry={h * 0.42}
        fill={LMK.sageLight} stroke={ink} strokeWidth="0.4" />
      <ellipse cx="0" cy={-h * 0.45} rx={h * 0.3} ry={h * 0.4}
        fill={LMK.sageDark} stroke={ink} strokeWidth="0.4" opacity="0.7" />
    </g>
  );
}

// Small person — head + body, dark ink figure
function Person({ x, y, hatColor = "#2a1a08" }) {
  const ink = LMK.ink;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <ellipse cx="0" cy="-3" rx="1.2" ry="1.4" fill={LMK.paperWarm} stroke={ink} strokeWidth="0.3" />
      {/* hat brim */}
      <ellipse cx="0" cy="-4" rx="1.8" ry="0.4" fill={hatColor} />
      <ellipse cx="0" cy="-4.4" rx="1.0" ry="0.6" fill={hatColor} />
      {/* body */}
      <path d="M -1.5 -2 L 1.5 -2 L 1.2 4 L -1.2 4 Z" fill={LMK.earthDark} stroke={ink} strokeWidth="0.3" />
      {/* legs */}
      <line x1="-0.7" y1="4" x2="-0.7" y2="7" stroke={ink} strokeWidth="0.5" />
      <line x1="0.7" y1="4" x2="0.7" y2="7" stroke={ink} strokeWidth="0.5" />
    </g>
  );
}

Object.assign(window, { IndependenceArt });
