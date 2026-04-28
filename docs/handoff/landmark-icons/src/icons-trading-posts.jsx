/* global React, LI, HybridBadge */

// ============================================================================
// TRADING POST ICONS — 8 stop badges
// ============================================================================
// Each fort gets bespoke architecture per its postKind + historical record:
//   Hollenberg Ranch  — sod-and-timber road ranch, no walls, low German store
//   Fort Kearny       — US Army quartermaster cluster, sod-roof bldgs, US flag
//   Robidoux Post     — mountain man cabin + smithy + furs hanging
//   Fort Laramie      — whitewashed Old Bedlam, multi-story, US flag
//   Fort Bridger      — sparse log stockade, minimal, lonely
//   Fort Hall         — HBC adobe block + Union Jack flag (red/blue)
//   Fort Boise        — small HBC cottonwood-shaded station
//   Fort Walla Walla  — HBC river post, Union Jack
//   The Dalles        — end-of-trail river port, false-front town, gold tone
// ============================================================================

// ── HOLLENBERG RANCH ──────────────────────────────────────────────────────
function Lmk_Hollenberg() {
  return (
    <HybridBadge tone="warm" id="hollen">
      <rect x="1" y="18" width="22" height="5" fill={LI.sage} opacity="0.45" />
      {/* low single sod-roofed building, wider than tall */}
      <rect x="5" y="13" width="14" height="6" fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.4" />
      <rect x="5" y="12.5" width="14" height="0.8" fill={LI.sage} stroke={LI.ink} strokeWidth="0.2" />
      <rect x="13" y="13" width="6" height="6" fill={LI.ink} opacity="0.18" />
      {/* door + 2 windows */}
      <rect x="11" y="15.5" width="2" height="3.5" fill={LI.ink} opacity="0.85" />
      <rect x="7"  y="14.5" width="1.4" height="1.4" fill={LI.ink} opacity="0.65" />
      <rect x="15.6" y="14.5" width="1.4" height="1.4" fill={LI.ink} opacity="0.65" />
      {/* lantern post — road-ranch flavor */}
      <line x1="3" y1="13" x2="3" y2="19" stroke={LI.ink} strokeWidth="0.5" />
      <rect x="2.3" y="11" width="1.4" height="1.8" fill={LI.goldFlag} stroke={LI.ink} strokeWidth="0.3" />
    </HybridBadge>
  );
}

// ── FORT KEARNY ───────────────────────────────────────────────────────────
function Lmk_FortKearny() {
  return (
    <HybridBadge tone="warm" id="kearny">
      <rect x="1" y="18" width="22" height="5" fill={LI.sage} opacity="0.5" />
      <rect x="9" y="13" width="6" height="6" fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.4" />
      <rect x="9" y="12.5" width="6" height="0.7" fill={LI.sage} stroke={LI.ink} strokeWidth="0.2" />
      <rect x="12" y="13" width="3" height="6" fill={LI.ink} opacity="0.2" />
      <rect x="3" y="14" width="5" height="5" fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.4" />
      <rect x="3" y="13.6" width="5" height="0.6" fill={LI.sage} stroke={LI.ink} strokeWidth="0.2" />
      <rect x="6" y="14" width="2" height="5" fill={LI.ink} opacity="0.18" />
      <rect x="16" y="14" width="5" height="5" fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.4" />
      <rect x="16" y="13.6" width="5" height="0.6" fill={LI.sage} stroke={LI.ink} strokeWidth="0.2" />
      <rect x="19" y="14" width="2" height="5" fill={LI.ink} opacity="0.18" />
      {/* US flag */}
      <line x1="12" y1="13" x2="12" y2="4" stroke={LI.ink} strokeWidth="0.5" strokeLinecap="round" />
      <path d="M 12 4 L 16 5 L 12 6 Z" fill={LI.redFlag} stroke={LI.ink} strokeWidth="0.3" />
    </HybridBadge>
  );
}

// ── ROBIDOUX POST ─────────────────────────────────────────────────────────
function Lmk_Robidoux() {
  return (
    <HybridBadge tone="warm" id="robidoux">
      <rect x="1" y="18" width="22" height="5" fill={LI.earthLight} opacity="0.55" />
      {/* lone log cabin */}
      <rect x="7" y="13" width="9" height="6" fill={LI.earth} stroke={LI.ink} strokeWidth="0.4" />
      <rect x="11.5" y="13" width="4.5" height="6" fill={LI.ink} opacity="0.2" />
      {/* horizontal log lines */}
      <line x1="7" y1="14.5" x2="16" y2="14.5" stroke={LI.ink} strokeWidth="0.25" opacity="0.55" />
      <line x1="7" y1="16"   x2="16" y2="16"   stroke={LI.ink} strokeWidth="0.25" opacity="0.55" />
      <line x1="7" y1="17.5" x2="16" y2="17.5" stroke={LI.ink} strokeWidth="0.25" opacity="0.55" />
      {/* peaked plank roof */}
      <path d="M 6.5 13 L 11.5 9.5 L 16.5 13 Z" fill={LI.earth} stroke={LI.ink} strokeWidth="0.4" strokeLinejoin="round" />
      <path d="M 11.5 9.5 L 16.5 13 L 11.5 13 Z" fill={LI.ink} opacity="0.2" />
      {/* chimney smoke */}
      <rect x="13.5" y="10.5" width="1.2" height="2" fill={LI.brickDark} stroke={LI.ink} strokeWidth="0.2" />
      <path d="M 14 9.5 Q 14.6 8.2 14 7" stroke={LI.ink} strokeWidth="0.4" fill="none" opacity="0.55" />
      {/* hanging pelt */}
      <rect x="17" y="12" width="3" height="4" fill={LI.bone} stroke={LI.ink} strokeWidth="0.3" />
      <line x1="17" y1="12" x2="20" y2="12" stroke={LI.ink} strokeWidth="0.3" />
    </HybridBadge>
  );
}

// ── FORT LARAMIE ──────────────────────────────────────────────────────────
function Lmk_FortLaramie() {
  return (
    <HybridBadge tone="warm" id="laramie">
      <path d="M 5 12 L 12 8 L 19 12 L 19 19 L 5 19 Z"
            fill={LI.white} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
      <path d="M 12 8 L 19 12 L 12 12 Z" fill={LI.ink} opacity="0.2" />
      <rect x="14" y="12" width="5" height="7" fill={LI.ink} opacity="0.18" />
      <rect x="11" y="15" width="2" height="4" fill={LI.ink} opacity="0.85" />
      <rect x="6.8" y="13" width="1.3" height="1.3" fill={LI.ink} opacity="0.7" />
      <rect x="10"  y="13" width="1.3" height="1.3" fill={LI.ink} opacity="0.7" />
      <rect x="12.7" y="13" width="1.3" height="1.3" fill={LI.ink} opacity="0.7" />
      <rect x="15.7" y="13" width="1.3" height="1.3" fill={LI.ink} opacity="0.7" />
      <line x1="20.5" y1="5" x2="20.5" y2="19" stroke={LI.ink} strokeWidth="0.5" strokeLinecap="round" />
      <path d="M 20.5 5 L 22.7 6 L 20.5 7 Z" fill={LI.redFlag} stroke={LI.ink} strokeWidth="0.3" />
    </HybridBadge>
  );
}

// ── FORT BRIDGER ──────────────────────────────────────────────────────────
function Lmk_FortBridger() {
  return (
    <HybridBadge tone="warm" id="bridger">
      <rect x="1" y="18" width="22" height="5" fill={LI.earthLight} opacity="0.5" />
      {/* simple low log stockade */}
      <path d="M 5 12 L 7 11 L 9 12 L 11 11 L 13 12 L 15 11 L 17 12 L 19 11 L 19 19 L 5 19 Z"
            fill={LI.earth} stroke={LI.ink} strokeWidth="0.5" strokeLinejoin="round" />
      <rect x="13" y="11.5" width="6" height="7.5" fill={LI.ink} opacity="0.2" />
      {/* tiny gate */}
      <rect x="11" y="15" width="2" height="4" fill={LI.ink} opacity="0.85" />
      {/* lone signpost — Bridger's famous "famously thin" feel */}
      <line x1="3.5" y1="13" x2="3.5" y2="19" stroke={LI.ink} strokeWidth="0.5" />
      <rect x="2" y="13" width="3" height="1.6" fill={LI.bone} stroke={LI.ink} strokeWidth="0.3" />
    </HybridBadge>
  );
}

// ── FORT HALL — HBC ───────────────────────────────────────────────────────
function Lmk_FortHall() {
  return (
    <HybridBadge tone="cool" id="hall">
      {/* taller adobe quadrangle */}
      <rect x="5" y="11" width="14" height="8" fill={LI.bone} stroke={LI.ink} strokeWidth="0.5" />
      <rect x="14" y="11" width="5" height="8" fill={LI.ink} opacity="0.2" />
      {/* corner blockhouses */}
      <rect x="4" y="10" width="3" height="3" fill={LI.bone} stroke={LI.ink} strokeWidth="0.4" />
      <rect x="17" y="10" width="3" height="3" fill={LI.bone} stroke={LI.ink} strokeWidth="0.4" />
      <rect x="17" y="10" width="3" height="3" fill={LI.ink} opacity="0.2" />
      {/* gate */}
      <rect x="11" y="15" width="2" height="4" fill={LI.ink} opacity="0.85" />
      {/* small windows */}
      <rect x="7"  y="13" width="1.2" height="1.2" fill={LI.ink} opacity="0.65" />
      <rect x="10" y="13" width="1.2" height="1.2" fill={LI.ink} opacity="0.65" />
      <rect x="13" y="13" width="1.2" height="1.2" fill={LI.ink} opacity="0.65" />
      <rect x="15.7" y="13" width="1.2" height="1.2" fill={LI.ink} opacity="0.65" />
      {/* Union Jack — HBC */}
      <line x1="12" y1="11" x2="12" y2="3" stroke={LI.ink} strokeWidth="0.5" strokeLinecap="round" />
      <rect x="12" y="3" width="4" height="2.6" fill={LI.navyFlag} stroke={LI.ink} strokeWidth="0.3" />
      <line x1="12" y1="3" x2="16" y2="5.6" stroke={LI.white} strokeWidth="0.5" />
      <line x1="16" y1="3" x2="12" y2="5.6" stroke={LI.white} strokeWidth="0.5" />
      <line x1="14" y1="3" x2="14" y2="5.6" stroke={LI.redFlag} strokeWidth="0.4" />
      <line x1="12" y1="4.3" x2="16" y2="4.3" stroke={LI.redFlag} strokeWidth="0.4" />
    </HybridBadge>
  );
}

// ── FORT BOISE — small HBC ────────────────────────────────────────────────
function Lmk_FortBoise() {
  return (
    <HybridBadge tone="cool" id="boise">
      {/* cottonwood backdrop */}
      <ellipse cx="4" cy="12" rx="3" ry="5" fill={LI.sageDark} opacity="0.55" />
      <ellipse cx="20" cy="12" rx="3" ry="5" fill={LI.sageDark} opacity="0.55" />
      {/* small HBC cabin */}
      <rect x="8" y="13" width="8" height="6" fill={LI.bone} stroke={LI.ink} strokeWidth="0.5" />
      <rect x="12" y="13" width="4" height="6" fill={LI.ink} opacity="0.22" />
      {/* peaked roof */}
      <path d="M 7.5 13 L 12 10 L 16.5 13 Z" fill={LI.earth} stroke={LI.ink} strokeWidth="0.4" strokeLinejoin="round" />
      <path d="M 12 10 L 16.5 13 L 12 13 Z" fill={LI.ink} opacity="0.2" />
      <rect x="11" y="15" width="2" height="4" fill={LI.ink} opacity="0.85" />
      {/* HBC flagpole — small */}
      <line x1="7.5" y1="13" x2="7.5" y2="6" stroke={LI.ink} strokeWidth="0.4" />
      <rect x="7.5" y="6" width="2.4" height="1.6" fill={LI.navyFlag} stroke={LI.ink} strokeWidth="0.3" />
      <line x1="7.5" y1="6" x2="9.9" y2="7.6" stroke={LI.white} strokeWidth="0.3" />
      <line x1="9.9" y1="6" x2="7.5" y2="7.6" stroke={LI.white} strokeWidth="0.3" />
    </HybridBadge>
  );
}

// ── FORT WALLA WALLA — HBC river post ─────────────────────────────────────
function Lmk_FortWallaWalla() {
  return (
    <HybridBadge tone="cool" id="walla">
      {/* river band along bottom */}
      <rect x="1" y="18" width="22" height="5" fill={LI.water} opacity="0.55" />
      <path d="M 1 19 Q 6 18.4 12 19 T 23 19" stroke={LI.ink} strokeWidth="0.3" fill="none" opacity="0.5" />
      {/* squat adobe block */}
      <rect x="6" y="12" width="12" height="6" fill={LI.bone} stroke={LI.ink} strokeWidth="0.5" />
      <rect x="13" y="12" width="5" height="6" fill={LI.ink} opacity="0.22" />
      {/* parapet crenellations */}
      <rect x="6"  y="11" width="1.5" height="1" fill={LI.bone} stroke={LI.ink} strokeWidth="0.3" />
      <rect x="9"  y="11" width="1.5" height="1" fill={LI.bone} stroke={LI.ink} strokeWidth="0.3" />
      <rect x="12" y="11" width="1.5" height="1" fill={LI.bone} stroke={LI.ink} strokeWidth="0.3" />
      <rect x="15" y="11" width="1.5" height="1" fill={LI.bone} stroke={LI.ink} strokeWidth="0.3" />
      <rect x="11" y="14" width="2" height="4" fill={LI.ink} opacity="0.85" />
      {/* Union Jack on tall pole */}
      <line x1="20" y1="5" x2="20" y2="18" stroke={LI.ink} strokeWidth="0.5" />
      <rect x="20" y="5" width="2.4" height="1.6" fill={LI.navyFlag} stroke={LI.ink} strokeWidth="0.3" />
      <line x1="20" y1="5" x2="22.4" y2="6.6" stroke={LI.white} strokeWidth="0.3" />
      <line x1="22.4" y1="5" x2="20" y2="6.6" stroke={LI.white} strokeWidth="0.3" />
    </HybridBadge>
  );
}

// ── THE DALLES — end of trail river port ──────────────────────────────────
function Lmk_TheDalles() {
  return (
    <HybridBadge tone="gold" id="dalles">
      {/* Columbia river band */}
      <rect x="1" y="18" width="22" height="5" fill={LI.water} opacity="0.55" />
      <path d="M 1 19 Q 6 18.4 12 19 T 23 19" stroke={LI.ink} strokeWidth="0.3" fill="none" opacity="0.5" />
      {/* row of false-front buildings */}
      <rect x="3"  y="11" width="5" height="7" fill={LI.bone} stroke={LI.ink} strokeWidth="0.4" />
      <path d="M 3 11 L 5.5 8.5 L 8 11 Z" fill={LI.brick} stroke={LI.ink} strokeWidth="0.4" strokeLinejoin="round" />
      <rect x="9"  y="9.5" width="6" height="8.5" fill={LI.earthLight} stroke={LI.ink} strokeWidth="0.4" />
      <rect x="9"  y="9" width="6" height="1" fill={LI.brick} stroke={LI.ink} strokeWidth="0.3" />
      <rect x="16" y="11" width="5" height="7" fill={LI.bone} stroke={LI.ink} strokeWidth="0.4" />
      <path d="M 16 11 L 18.5 8.5 L 21 11 Z" fill={LI.brick} stroke={LI.ink} strokeWidth="0.4" strokeLinejoin="round" />
      {/* shadows */}
      <rect x="6"  y="11" width="2" height="7" fill={LI.ink} opacity="0.18" />
      <rect x="13" y="9.5" width="2" height="8.5" fill={LI.ink} opacity="0.18" />
      <rect x="19" y="11" width="2" height="7" fill={LI.ink} opacity="0.18" />
      {/* doors */}
      <rect x="5"  y="14" width="1.4" height="4" fill={LI.ink} opacity="0.85" />
      <rect x="11" y="14" width="2"   height="4" fill={LI.ink} opacity="0.85" />
      <rect x="18" y="14" width="1.4" height="4" fill={LI.ink} opacity="0.85" />
      {/* tiny sail in the water — port */}
      <path d="M 1.5 17 L 1.5 19 L 3.5 19 Z" fill={LI.white} stroke={LI.ink} strokeWidth="0.3" />
    </HybridBadge>
  );
}

Object.assign(window, {
  Lmk_Hollenberg, Lmk_FortKearny, Lmk_Robidoux, Lmk_FortLaramie,
  Lmk_FortBridger, Lmk_FortHall, Lmk_FortBoise, Lmk_FortWallaWalla,
  Lmk_TheDalles,
});
