/* global React, LI, HybridBadge */

// ============================================================================
// RIVER FORD ICONS — 8 stop badges
// ============================================================================
// Every river crossing is a Ford modal. Differentiate by:
//   - depth (caulked-and-float vs. shallow ford)
//   - geography (multiple channels at Three Island, granite gates at Devil's,
//     deep+fast at Green, etc.)
//   - whether it's a known ferry crossing (Kansas, ferryPrice 3 — visible boat)
// All cool tone (water-dominant). Each ford has the same visual grammar:
//   sky band → far bank → river surface → wagon/ferry/figure → ripples.
// Identity comes from the stage of crossing depicted + the riverbed cues.
// ============================================================================

// Helper: river surface with three subtle wave lines
function RiverSurface({ y = 13, h = 9, opacity = 0.7 }) {
  return (
    <g>
      <rect x="1" y={y} width="22" height={h} fill={LI.water} opacity={opacity} />
      <rect x="1" y={y - 0.5} width="22" height="0.7" fill={LI.earth} opacity="0.7" />
      <path d={`M 2 ${y + 2} Q 6 ${y + 1} 10 ${y + 2} T 18 ${y + 2} T 22 ${y + 2}`}
            stroke={LI.ink} strokeWidth="0.3" fill="none" opacity="0.55" />
      <path d={`M 2 ${y + 5} Q 6 ${y + 4} 10 ${y + 5} T 18 ${y + 5} T 22 ${y + 5}`}
            stroke={LI.ink} strokeWidth="0.3" fill="none" opacity="0.5" />
      <path d={`M 2 ${y + 7.5} Q 6 ${y + 6.5} 10 ${y + 7.5} T 18 ${y + 7.5} T 22 ${y + 7.5}`}
            stroke={LI.ink} strokeWidth="0.25" fill="none" opacity="0.45" />
    </g>
  );
}

// Helper: a tiny caulked wagon (canvas top + dark hull). Used in floating fords.
function FloatingWagon({ x = 8, y = 9, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M 0 4 Q 4 -0.5 8 4 Z" fill={LI.white} stroke={LI.ink} strokeWidth="0.5" />
      <rect x="0" y="4" width="8" height="2" fill={LI.ink} stroke={LI.ink} strokeWidth="0.3" />
      <path d="M -1 6.2 Q 4 6.7 9 6.2" stroke={LI.water} strokeWidth="0.5" fill="none" />
    </g>
  );
}

// Helper: shallow-ford wagon (sits high in water, wheels visible)
function ShallowFordWagon({ x = 8, y = 8 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M 0 4 Q 4 0 8 4 Z" fill={LI.white} stroke={LI.ink} strokeWidth="0.4" />
      <rect x="0" y="4" width="8" height="2" fill={LI.earth} stroke={LI.ink} strokeWidth="0.3" />
      <rect x="0" y="4" width="8" height="2" fill={LI.ink} opacity="0.18" />
      <circle cx="1.5" cy="6.5" r="0.7" fill="none" stroke={LI.ink} strokeWidth="0.35" />
      <circle cx="6.5" cy="6.5" r="0.7" fill="none" stroke={LI.ink} strokeWidth="0.35" />
    </g>
  );
}

// ── KANSAS RIVER — historic ferry crossing ────────────────────────────────
// Ferry boat with rope guide-line; emigrants paid $3 here (cheapest + safest).
function Lmk_KansasRiver() {
  return (
    <HybridBadge tone="cool" id="kansas">
      <RiverSurface y={11} h={11} />
      {/* far bank trees */}
      <ellipse cx="3" cy="9" rx="2" ry="2.5" fill={LI.sageDark} opacity="0.55" />
      <ellipse cx="20" cy="9" rx="2.5" ry="2.5" fill={LI.sageDark} opacity="0.55" />
      {/* ferry rope across */}
      <line x1="2" y1="11" x2="22" y2="11" stroke={LI.ink} strokeWidth="0.4" opacity="0.7" />
      {/* flat ferry — wide low platform */}
      <g transform="translate(7 12.5)">
        <path d="M 0 3 L 1 1 L 9 1 L 10 3 Z" fill={LI.earth} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
        <rect x="0" y="3" width="10" height="0.6" fill={LI.ink} opacity="0.4" />
        {/* small wagon riding the ferry */}
        <path d="M 3 1 Q 5 -1.5 7 1 Z" fill={LI.white} stroke={LI.ink} strokeWidth="0.4" />
        <rect x="3" y="1" width="4" height="0.6" fill={LI.ink} opacity="0.6" />
        {/* tiny figure poling */}
        <line x1="9" y1="1" x2="10.5" y2="-1.5" stroke={LI.ink} strokeWidth="0.35" />
        <circle cx="9.3" cy="0.3" r="0.4" fill={LI.ink} />
      </g>
    </HybridBadge>
  );
}

// ── BIG BLUE — ford, caulked & float (ferryPrice 2, depth 2.5, current 1) ──
function Lmk_BigBlueRiver() {
  return (
    <HybridBadge tone="cool" id="bigblue">
      <RiverSurface y={13} h={9} />
      <FloatingWagon x={8} y={9} />
    </HybridBadge>
  );
}

// ── NORTH PLATTE EAST — ford (depth 2.5, current 2) ───────────────────────
// Wide and shallow but braided. Sandbar visible.
function Lmk_NorthPlatteEast() {
  return (
    <HybridBadge tone="cool" id="np_e">
      <RiverSurface y={11} h={11} />
      {/* sandbar mid-stream */}
      <ellipse cx="14" cy="17" rx="5" ry="0.8" fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.3" />
      <ellipse cx="6"  cy="14" rx="3" ry="0.6" fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.3" />
      {/* shallow-ford wagon */}
      <ShallowFordWagon x={8} y={9.5} />
    </HybridBadge>
  );
}

// ── NORTH PLATTE WEST — deeper (4ft, 3mph) — caulked & float, faster ──────
function Lmk_NorthPlatteWest() {
  return (
    <HybridBadge tone="cool" id="np_w">
      <RiverSurface y={11} h={11} />
      {/* current chevrons — faster water */}
      <path d="M 4 16 L 6 17 L 4 18" stroke={LI.ink} strokeWidth="0.4" fill="none" opacity="0.55" />
      <path d="M 17 19 L 19 20 L 17 21" stroke={LI.ink} strokeWidth="0.4" fill="none" opacity="0.5" />
      <path d="M 10 20 L 12 21 L 10 22" stroke={LI.ink} strokeWidth="0.4" fill="none" opacity="0.5" />
      <FloatingWagon x={8} y={9} />
      {/* lead ox swimming alongside */}
      <ellipse cx="5" cy="13" rx="1.6" ry="0.7" fill={LI.brick} stroke={LI.ink} strokeWidth="0.3" />
      <circle cx="3.6" cy="12.7" r="0.6" fill={LI.brick} stroke={LI.ink} strokeWidth="0.3" />
    </HybridBadge>
  );
}

// ── SWEETWATER — small ford (depth 2, current 1) — narrow, calm, granite ──
function Lmk_SweetwaterFord() {
  return (
    <HybridBadge tone="cool" id="sweet">
      {/* granite outcrops on both banks (Sweetwater country has them) */}
      <path d="M 0 14 L 3 12 L 5 14 L 5 19 L 0 19 Z" fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.4" />
      <path d="M 19 13 L 21 11 L 24 14 L 24 19 L 19 19 Z" fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.4" />
      {/* shadow side of east outcrop */}
      <path d="M 21 11 L 24 14 L 24 19 L 21 19 Z" fill={LI.ink} opacity="0.22" />
      {/* shallow water in middle */}
      <rect x="5" y="14" width="14" height="5" fill={LI.water} opacity="0.7" />
      <rect x="5" y="13.5" width="14" height="0.5" fill={LI.earth} opacity="0.6" />
      <path d="M 6 16.5 Q 9 16 12 16.5 T 18 16.5" stroke={LI.ink} strokeWidth="0.3" fill="none" opacity="0.5" />
      <path d="M 6 18 Q 9 17.5 12 18 T 18 18" stroke={LI.ink} strokeWidth="0.3" fill="none" opacity="0.45" />
      {/* shallow wagon */}
      <ShallowFordWagon x={8} y={10.5} />
    </HybridBadge>
  );
}

// ── GREEN RIVER — deep + fast (4.5ft, 4mph), expensive ferry $8 ───────────
function Lmk_GreenRiver() {
  return (
    <HybridBadge tone="cool" id="green">
      <RiverSurface y={9} h={13} opacity={0.78} />
      {/* a stronger green-ish overlay */}
      <rect x="1" y="9" width="22" height="13" fill={LI.sage} opacity="0.18" />
      {/* current chevrons — stronger */}
      <path d="M 3 13 L 5 14 L 3 15" stroke={LI.ink} strokeWidth="0.5" fill="none" opacity="0.6" />
      <path d="M 19 16 L 21 17 L 19 18" stroke={LI.ink} strokeWidth="0.5" fill="none" opacity="0.6" />
      <path d="M 8 18 L 10 19 L 8 20" stroke={LI.ink} strokeWidth="0.5" fill="none" opacity="0.6" />
      <path d="M 13 20 L 15 21 L 13 22" stroke={LI.ink} strokeWidth="0.5" fill="none" opacity="0.55" />
      {/* mountain man's flat ferry — Green had Mormon Ferry */}
      <g transform="translate(7 9)">
        <path d="M 0 3 L 1 1 L 9 1 L 10 3 Z" fill={LI.earth} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
        <rect x="0" y="3" width="10" height="0.6" fill={LI.ink} opacity="0.4" />
        <path d="M 3 1 Q 5 -1.5 7 1 Z" fill={LI.white} stroke={LI.ink} strokeWidth="0.4" />
      </g>
      {/* guide rope */}
      <line x1="2" y1="9" x2="22" y2="9" stroke={LI.ink} strokeWidth="0.35" opacity="0.6" />
    </HybridBadge>
  );
}

// ── BEAR RIVER — moderate ford (3ft, 2mph) — winding river, willows ───────
function Lmk_BearRiver() {
  return (
    <HybridBadge tone="cool" id="bear">
      <RiverSurface y={12} h={10} />
      {/* willows on banks */}
      <ellipse cx="2.5" cy="10" rx="2" ry="3" fill={LI.sage} opacity="0.6" />
      <ellipse cx="21"  cy="10" rx="2" ry="3" fill={LI.sage} opacity="0.6" />
      {/* hint of trunks */}
      <line x1="2.5" y1="9" x2="2.5" y2="13" stroke={LI.ink} strokeWidth="0.3" opacity="0.6" />
      <line x1="21"  y1="9" x2="21"  y2="13" stroke={LI.ink} strokeWidth="0.3" opacity="0.6" />
      <FloatingWagon x={8} y={9.5} />
    </HybridBadge>
  );
}

// ── THREE ISLAND CROSSING — Snake River, three islands, decision point ────
function Lmk_ThreeIsland() {
  return (
    <HybridBadge tone="cool" id="three_isl">
      <RiverSurface y={10} h={12} opacity={0.75} />
      {/* THREE islands — the defining feature */}
      <ellipse cx="6"  cy="14" rx="2.5" ry="1"   fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.4" />
      <ellipse cx="6"  cy="13.5" rx="1.6" ry="0.4" fill={LI.sage} opacity="0.7" />
      <ellipse cx="12" cy="17"  rx="3" ry="1.1" fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.4" />
      <ellipse cx="12" cy="16.5" rx="2"  ry="0.4" fill={LI.sage} opacity="0.7" />
      <ellipse cx="18" cy="14"  rx="2.5" ry="1"   fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.4" />
      <ellipse cx="18" cy="13.5" rx="1.6" ry="0.4" fill={LI.sage} opacity="0.7" />
      {/* current chevrons in channels */}
      <path d="M 9 19 L 10 19.7 L 9 20.4" stroke={LI.ink} strokeWidth="0.35" fill="none" opacity="0.5" />
      <path d="M 15 19 L 16 19.7 L 15 20.4" stroke={LI.ink} strokeWidth="0.35" fill="none" opacity="0.5" />
      {/* tiny shallow wagon picking its way */}
      <ShallowFordWagon x={8.5} y={7.5} />
    </HybridBadge>
  );
}

Object.assign(window, {
  Lmk_KansasRiver, Lmk_BigBlueRiver, Lmk_NorthPlatteEast, Lmk_NorthPlatteWest,
  Lmk_SweetwaterFord, Lmk_GreenRiver, Lmk_BearRiver, Lmk_ThreeIsland,
  RiverSurface, FloatingWagon, ShallowFordWagon,
});
