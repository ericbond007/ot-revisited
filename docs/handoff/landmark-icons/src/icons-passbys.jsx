/* global React, LI */

// ============================================================================
// PASS-BY LANDMARK ICONS — 8 bare silhouettes (no badge)
// ============================================================================
// Pass-bys render directly on parchment with NO enclosing badge — they're map
// flavor, not interactable. Use the same watercolor logic but expose the
// silhouette on its own. Drawn at the same 24×24 viewBox as stops; the
// "BareIcon" wrapper provides the parchment context strip.
// ============================================================================

function BarePin({ children, size = 48 }) {
  return (
    <div style={{
      width: size, height: size,
      background: LI.parchment,
      borderRadius: 2,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg viewBox="0 0 24 24" width={size - 8} height={size - 8} style={{ display: 'block' }}>
        {children}
      </svg>
    </div>
  );
}

// ── COURTHOUSE & JAIL ROCKS — two squat sandstone blocks ──────────────────
function PB_CourthouseJail() {
  return (
    <g>
      {/* Courthouse — bigger, blockier */}
      <path d="M 2 18 L 2 9 L 4 9 L 4 7 L 9 7 L 9 9 L 11 9 L 11 18 Z"
            fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
      <path d="M 9 7 L 9 9 L 11 9 L 11 18 L 8 18 L 8 7 Z" fill={LI.ink} opacity="0.22" />
      {/* Jail — smaller, narrower */}
      <path d="M 14 18 L 14 12 L 16 12 L 16 10 L 19 10 L 19 12 L 21 12 L 21 18 Z"
            fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
      <path d="M 19 10 L 19 12 L 21 12 L 21 18 L 18 18 L 18 10 Z" fill={LI.ink} opacity="0.22" />
      {/* striations */}
      <line x1="3" y1="13" x2="10" y2="13" stroke={LI.ink} strokeWidth="0.2" opacity="0.4" />
      <line x1="3" y1="15" x2="10" y2="15" stroke={LI.ink} strokeWidth="0.2" opacity="0.35" />
      <line x1="14.5" y1="15" x2="20.5" y2="15" stroke={LI.ink} strokeWidth="0.2" opacity="0.35" />
    </g>
  );
}

// ── GUERNSEY RUTS — twin trail ruts cut deep into sandstone ───────────────
function PB_GuernseyRuts() {
  return (
    <g>
      {/* sandstone cross-section */}
      <path d="M 2 19 L 2 12 Q 6 11 12 11 Q 18 11 22 12 L 22 19 Z"
            fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
      {/* the twin ruts cut DOWN into the rock — V-shaped channels */}
      <path d="M 7 11 L 9 19 L 7 19 L 5 11 Z"
            fill={LI.ink} opacity="0.55" />
      <path d="M 17 11 L 15 19 L 17 19 L 19 11 Z"
            fill={LI.ink} opacity="0.55" />
      {/* shadow inside ruts */}
      <line x1="7" y1="13" x2="6" y2="19" stroke={LI.ink} strokeWidth="0.3" opacity="0.7" />
      <line x1="17" y1="13" x2="18" y2="19" stroke={LI.ink} strokeWidth="0.3" opacity="0.7" />
      {/* striations on the rock face */}
      <line x1="3" y1="14" x2="4.5" y2="14" stroke={LI.ink} strokeWidth="0.2" opacity="0.4" />
      <line x1="10" y1="14" x2="14" y2="14" stroke={LI.ink} strokeWidth="0.2" opacity="0.4" />
      <line x1="19.5" y1="14" x2="21" y2="14" stroke={LI.ink} strokeWidth="0.2" opacity="0.4" />
      <line x1="3" y1="16.5" x2="5" y2="16.5" stroke={LI.ink} strokeWidth="0.2" opacity="0.35" />
      <line x1="10" y1="16.5" x2="14" y2="16.5" stroke={LI.ink} strokeWidth="0.2" opacity="0.35" />
    </g>
  );
}

// ── WILLOW SPRINGS — spring pool with willow trees ────────────────────────
function PB_WillowSprings() {
  return (
    <g>
      {/* drooping willow on left */}
      <line x1="6" y1="18" x2="6" y2="8" stroke={LI.ink} strokeWidth="0.5" opacity="0.7" />
      <path d="M 6 8 Q 3 10 2 14" stroke={LI.sageDark} strokeWidth="0.5" fill="none" />
      <path d="M 6 9 Q 4 11 3 16" stroke={LI.sageDark} strokeWidth="0.5" fill="none" />
      <path d="M 6 8 Q 8 10 9 14" stroke={LI.sageDark} strokeWidth="0.5" fill="none" />
      <path d="M 6 9 Q 8 12 9 16" stroke={LI.sageDark} strokeWidth="0.5" fill="none" />
      {/* drooping willow on right */}
      <line x1="18" y1="18" x2="18" y2="9" stroke={LI.ink} strokeWidth="0.5" opacity="0.7" />
      <path d="M 18 9 Q 15 11 14 15" stroke={LI.sageDark} strokeWidth="0.5" fill="none" />
      <path d="M 18 10 Q 16 13 15 16" stroke={LI.sageDark} strokeWidth="0.5" fill="none" />
      <path d="M 18 9 Q 21 11 22 15" stroke={LI.sageDark} strokeWidth="0.5" fill="none" />
      <path d="M 18 10 Q 20 13 21 16" stroke={LI.sageDark} strokeWidth="0.5" fill="none" />
      {/* spring pool */}
      <ellipse cx="12" cy="18.5" rx="6" ry="1.2" fill={LI.water} stroke={LI.ink} strokeWidth="0.4" />
      <path d="M 8 18.3 Q 12 18 16 18.3" stroke={LI.white} strokeWidth="0.3" fill="none" opacity="0.5" />
    </g>
  );
}

// ── ICE SLOUGH — boggy meadow with ice layer below ────────────────────────
function PB_IceSlough() {
  return (
    <g>
      {/* meadow grass */}
      <rect x="2" y="14" width="20" height="2" fill={LI.sage} opacity="0.6" />
      {/* tufts of grass on top */}
      <line x1="3" y1="14" x2="3" y2="12" stroke={LI.sageDark} strokeWidth="0.4" />
      <line x1="5" y1="14" x2="5" y2="11" stroke={LI.sageDark} strokeWidth="0.4" />
      <line x1="7" y1="14" x2="7.5" y2="11.5" stroke={LI.sageDark} strokeWidth="0.4" />
      <line x1="9" y1="14" x2="9" y2="12" stroke={LI.sageDark} strokeWidth="0.4" />
      <line x1="11" y1="14" x2="11" y2="11" stroke={LI.sageDark} strokeWidth="0.4" />
      <line x1="13" y1="14" x2="13.5" y2="12" stroke={LI.sageDark} strokeWidth="0.4" />
      <line x1="15" y1="14" x2="15" y2="11.5" stroke={LI.sageDark} strokeWidth="0.4" />
      <line x1="17" y1="14" x2="17" y2="12" stroke={LI.sageDark} strokeWidth="0.4" />
      <line x1="19" y1="14" x2="19" y2="11" stroke={LI.sageDark} strokeWidth="0.4" />
      <line x1="21" y1="14" x2="21" y2="12" stroke={LI.sageDark} strokeWidth="0.4" />
      {/* peat soil layer */}
      <rect x="2" y="16" width="20" height="1.5" fill={LI.earth} opacity="0.7" />
      {/* ice layer below — the curiosity */}
      <rect x="2" y="17.5" width="20" height="2" fill={LI.water} opacity="0.85" stroke={LI.ink} strokeWidth="0.4" />
      {/* ice shimmer */}
      <line x1="4" y1="18.3" x2="6" y2="18.3" stroke={LI.white} strokeWidth="0.3" opacity="0.7" />
      <line x1="9" y1="18.6" x2="12" y2="18.6" stroke={LI.white} strokeWidth="0.3" opacity="0.7" />
      <line x1="15" y1="18.3" x2="18" y2="18.3" stroke={LI.white} strokeWidth="0.3" opacity="0.7" />
      {/* spade dug into the layer to expose ice */}
      <path d="M 12 5 L 12 14" stroke={LI.ink} strokeWidth="0.5" />
      <path d="M 11 5 L 13 5 L 13 6.5 L 11 6.5 Z" fill={LI.earth} stroke={LI.ink} strokeWidth="0.4" />
      <path d="M 11 14 L 13 14 L 12.7 17 L 11.3 17 Z" fill={LI.bone} stroke={LI.ink} strokeWidth="0.4" />
    </g>
  );
}

// ── PARTING OF THE WAYS — trail forks into two ────────────────────────────
function PB_PartingOfTheWays() {
  return (
    <g>
      {/* sage prairie */}
      <rect x="2" y="14" width="20" height="5" fill={LI.sage} opacity="0.4" />
      {/* trail comes from bottom and forks upward */}
      <path d="M 12 22 L 12 14"
            stroke={LI.ink} strokeWidth="1.2" fill="none" opacity="0.7" strokeDasharray="0.8 0.5" />
      {/* left branch — Sublette cutoff */}
      <path d="M 12 14 Q 8 11 3 8"
            stroke={LI.ink} strokeWidth="1.2" fill="none" opacity="0.7" strokeDasharray="0.8 0.5" />
      {/* right branch — Fort Bridger main */}
      <path d="M 12 14 Q 16 11 21 8"
            stroke={LI.ink} strokeWidth="1.2" fill="none" opacity="0.7" strokeDasharray="0.8 0.5" />
      {/* signpost at the fork */}
      <line x1="12" y1="14" x2="12" y2="6" stroke={LI.ink} strokeWidth="0.6" />
      <path d="M 12 7 L 6 7 L 4 8 L 6 9 L 12 9 Z" fill={LI.earth} stroke={LI.ink} strokeWidth="0.4" strokeLinejoin="round" />
      <path d="M 12 9.5 L 18 9.5 L 20 10.5 L 18 11.5 L 12 11.5 Z" fill={LI.earth} stroke={LI.ink} strokeWidth="0.4" strokeLinejoin="round" />
      {/* tiny direction marks on signs */}
      <line x1="6" y1="8" x2="9" y2="8" stroke={LI.bone} strokeWidth="0.3" />
      <line x1="14" y1="10.5" x2="17" y2="10.5" stroke={LI.bone} strokeWidth="0.3" />
    </g>
  );
}

// ── FAREWELL BEND — Snake river bending out of view ───────────────────────
function PB_FarewellBend() {
  return (
    <g>
      {/* river bending out of frame, dramatic curve */}
      <path d="M 2 6 Q 8 10 12 12 Q 18 14 22 22"
            stroke={LI.water} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M 2 6 Q 8 10 12 12 Q 18 14 22 22"
            stroke={LI.ink} strokeWidth="0.4" fill="none" strokeLinecap="round" opacity="0.7" />
      {/* ripple lines */}
      <path d="M 5 7.5 Q 9 10 13 13" stroke={LI.white} strokeWidth="0.3" fill="none" opacity="0.6" />
      {/* bluffs along the bank */}
      <path d="M 2 19 L 5 16 L 8 17 L 11 15 L 13 16 L 16 18 L 19 19 L 22 22"
            fill="none" stroke={LI.earth} strokeWidth="0.5" opacity="0.7" />
      {/* small wagon waving farewell at the upper bank */}
      <g transform="translate(15 4)">
        <path d="M 0 1.5 Q 1.8 -0.5 3.6 1.5 Z" fill={LI.white} stroke={LI.ink} strokeWidth="0.4" />
        <rect x="0" y="1.5" width="3.6" height="1" fill={LI.ink} opacity="0.7" />
        <circle cx="0.6" cy="2.6" r="0.4" fill="none" stroke={LI.ink} strokeWidth="0.3" />
        <circle cx="3.0" cy="2.6" r="0.4" fill="none" stroke={LI.ink} strokeWidth="0.3" />
      </g>
    </g>
  );
}

// ── BLUE MOUNTAINS — jagged forested range ────────────────────────────────
function PB_BlueMountains() {
  return (
    <g>
      <rect x="2" y="17" width="20" height="2" fill={LI.parchment} opacity="0.8" />
      {/* back range — distant blue */}
      <path d="M 2 13 L 5 9 L 8 11 L 11 7 L 14 10 L 17 8 L 20 11 L 22 13 L 22 18 L 2 18 Z"
            fill={LI.water} opacity="0.55" stroke={LI.ink} strokeWidth="0.3" strokeLinejoin="round" />
      {/* front range — forested, with conifers */}
      <path d="M 2 17 L 4 13 L 7 14 L 9 11 L 12 13 L 14 11 L 17 14 L 19 12 L 22 16 L 22 19 L 2 19 Z"
            fill={LI.sageDark} stroke={LI.ink} strokeWidth="0.4" strokeLinejoin="round" />
      {/* conifer suggestion — tiny triangles on ridge */}
      <path d="M 5 16 L 5.5 14.5 L 6 16 Z" fill={LI.ink} opacity="0.5" />
      <path d="M 8 15 L 8.5 13 L 9 15 Z" fill={LI.ink} opacity="0.5" />
      <path d="M 11 16 L 11.5 14 L 12 16 Z" fill={LI.ink} opacity="0.5" />
      <path d="M 14 14 L 14.5 12 L 15 14 Z" fill={LI.ink} opacity="0.5" />
      <path d="M 17 16 L 17.5 14 L 18 16 Z" fill={LI.ink} opacity="0.5" />
      <path d="M 20 15 L 20.5 13 L 21 15 Z" fill={LI.ink} opacity="0.5" />
    </g>
  );
}

// ── GRANDE RONDE VALLEY — panoramic vista, valley floor ───────────────────
function PB_GrandeRonde() {
  return (
    <g>
      {/* far ridge frames the vista */}
      <path d="M 0 8 L 4 6 L 8 7 L 12 5 L 16 7 L 20 6 L 24 8 L 24 11 L 0 11 Z"
            fill={LI.water} opacity="0.45" stroke={LI.ink} strokeWidth="0.3" strokeLinejoin="round" />
      {/* near ridges flanking */}
      <path d="M 0 11 L 3 9 L 6 11 L 8 11 L 8 18 L 0 18 Z"
            fill={LI.sageDark} stroke={LI.ink} strokeWidth="0.4" strokeLinejoin="round" />
      <path d="M 24 11 L 21 9 L 18 11 L 16 11 L 16 18 L 24 18 Z"
            fill={LI.sageDark} stroke={LI.ink} strokeWidth="0.4" strokeLinejoin="round" />
      {/* valley floor — broad meadow with river snake */}
      <rect x="8" y="11" width="8" height="8" fill={LI.sage} opacity="0.55" stroke={LI.ink} strokeWidth="0.3" />
      <path d="M 9 19 Q 10 16 11 14 Q 12 12 13 13 Q 14 15 15 19"
            stroke={LI.water} strokeWidth="0.6" fill="none" />
      {/* tiny cattle/dots on the floor */}
      <circle cx="10" cy="17" r="0.3" fill={LI.ink} opacity="0.6" />
      <circle cx="13" cy="16" r="0.3" fill={LI.ink} opacity="0.6" />
      <circle cx="11.5" cy="15" r="0.3" fill={LI.ink} opacity="0.6" />
      <circle cx="14" cy="17.5" r="0.3" fill={LI.ink} opacity="0.6" />
    </g>
  );
}

// ── START / END markers ───────────────────────────────────────────────────
function PB_IndependenceMO_Start() {
  return (
    <g>
      {/* "GO" star burst — start marker */}
      <circle cx="12" cy="12" r="9" fill={LI.bone} stroke={LI.ink} strokeWidth="0.5" />
      {/* compass star */}
      <path d="M 12 4 L 13.2 11 L 20 12 L 13.2 13 L 12 20 L 10.8 13 L 4 12 L 10.8 11 Z"
            fill={LI.rust} stroke={LI.ink} strokeWidth="0.4" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1.4" fill={LI.bone} stroke={LI.ink} strokeWidth="0.4" />
      {/* tiny banner */}
      <text x="12" y="13" fontSize="2.2" fontFamily="Georgia, serif" fontWeight="bold"
            fill={LI.ink} textAnchor="middle">MO</text>
    </g>
  );
}

function PB_OregonCity_End() {
  return (
    <g>
      {/* Willamette Falls + ribbon as "end" */}
      <circle cx="12" cy="12" r="9" fill={LI.bone} stroke={LI.ink} strokeWidth="0.5" />
      {/* falls — stepped cascade */}
      <path d="M 5 8 L 19 8 L 19 9.5 L 5 9.5 Z" fill={LI.water} stroke={LI.ink} strokeWidth="0.3" />
      <path d="M 6 9.5 L 18 9.5 Q 16 14 12 16 Q 8 14 6 9.5 Z"
            fill={LI.water} stroke={LI.ink} strokeWidth="0.3" />
      {/* cascade lines */}
      <line x1="8" y1="11" x2="8" y2="14" stroke={LI.white} strokeWidth="0.3" opacity="0.7" />
      <line x1="10" y1="11" x2="10" y2="15" stroke={LI.white} strokeWidth="0.3" opacity="0.7" />
      <line x1="12" y1="11" x2="12" y2="15.5" stroke={LI.white} strokeWidth="0.3" opacity="0.7" />
      <line x1="14" y1="11" x2="14" y2="15" stroke={LI.white} strokeWidth="0.3" opacity="0.7" />
      <line x1="16" y1="11" x2="16" y2="14" stroke={LI.white} strokeWidth="0.3" opacity="0.7" />
      {/* banner ribbon at top */}
      <path d="M 4 5 L 20 5 L 19 7 L 5 7 Z" fill={LI.rust} stroke={LI.ink} strokeWidth="0.3" />
      <text x="12" y="6.7" fontSize="1.8" fontFamily="Georgia, serif" fontWeight="bold"
            fill={LI.bone} textAnchor="middle" letterSpacing="0.2">END</text>
    </g>
  );
}

Object.assign(window, {
  BarePin,
  PB_CourthouseJail, PB_GuernseyRuts, PB_WillowSprings, PB_IceSlough,
  PB_PartingOfTheWays, PB_FarewellBend, PB_BlueMountains, PB_GrandeRonde,
  PB_IndependenceMO_Start, PB_OregonCity_End,
});
