/* global React, window */
/* eslint-disable react/jsx-no-undef */

// ============================================================================
// LandmarkIcon — unified dispatcher
// ============================================================================
// Map landmark id (from landmarks.ts) → icon component. All 38 landmarks have
// bespoke art. Stop landmarks render inside a circular HybridBadge; pass-by
// landmarks render as bare silhouette on parchment.
//
// Usage:
//   <LandmarkIcon id="chimney_rock" size={32} />
//   <LandmarkIcon id="parting_of_the_ways" size={24} />
//
// Requires: icon-base.jsx, icons-trading-posts.jsx, icons-rivers.jsx,
//           icons-arrival.jsx, icons-passbys.jsx — load IN THAT ORDER before
//           this file. Each one Object.assigns its components onto window.
// ============================================================================

const LANDMARK_ICON_MAP = {
  // ── trading posts ────────────────────────────────────────────────────────
  hollenberg_ranch:    { kind: "stop", Comp: () => window.Lmk_Hollenberg() },
  fort_kearny:         { kind: "stop", Comp: () => window.Lmk_FortKearny() },
  robidoux_post:       { kind: "stop", Comp: () => window.Lmk_Robidoux() },
  fort_laramie:        { kind: "stop", Comp: () => window.Lmk_FortLaramie() },
  fort_bridger:        { kind: "stop", Comp: () => window.Lmk_FortBridger() },
  fort_hall:           { kind: "stop", Comp: () => window.Lmk_FortHall() },
  fort_boise:          { kind: "stop", Comp: () => window.Lmk_FortBoise() },
  fort_walla_walla:    { kind: "stop", Comp: () => window.Lmk_FortWallaWalla() },
  the_dalles:          { kind: "stop", Comp: () => window.Lmk_TheDalles() },
  // ── river fords ─────────────────────────────────────────────────────────
  kansas_river:        { kind: "stop", Comp: () => window.Lmk_KansasRiver() },
  big_blue_river:      { kind: "stop", Comp: () => window.Lmk_BigBlueRiver() },
  north_platte_east:   { kind: "stop", Comp: () => window.Lmk_NorthPlatteEast() },
  north_platte_west:   { kind: "stop", Comp: () => window.Lmk_NorthPlatteWest() },
  sweetwater_1:        { kind: "stop", Comp: () => window.Lmk_SweetwaterFord() },
  green_river:         { kind: "stop", Comp: () => window.Lmk_GreenRiver() },
  bear_river:          { kind: "stop", Comp: () => window.Lmk_BearRiver() },
  three_island_crossing: { kind: "stop", Comp: () => window.Lmk_ThreeIsland() },
  // ── arrival landmarks ───────────────────────────────────────────────────
  alcove_spring:       { kind: "stop", Comp: () => window.Lmk_AlcoveSpring() },
  ash_hollow:          { kind: "stop", Comp: () => window.Lmk_AshHollow() },
  chimney_rock:        { kind: "stop", Comp: () => window.Lmk_ChimneyRock() },
  scotts_bluff:        { kind: "stop", Comp: () => window.Lmk_ScottsBluff() },
  register_cliff:      { kind: "stop", Comp: () => window.Lmk_RegisterCliff() },
  independence_rock:   { kind: "stop", Comp: () => window.Lmk_IndependenceRock() },
  devils_gate:         { kind: "stop", Comp: () => window.Lmk_DevilsGate() },
  south_pass:          { kind: "stop", Comp: () => window.Lmk_SouthPass() },
  pacific_springs:     { kind: "stop", Comp: () => window.Lmk_PacificSprings() },
  soda_springs:        { kind: "stop", Comp: () => window.Lmk_SodaSprings() },
  laurel_hill:         { kind: "stop", Comp: () => window.Lmk_LaurelHill() },
  // ── pass-bys (no badge) ─────────────────────────────────────────────────
  courthouse_jail_rocks: { kind: "passby", Comp: () => window.PB_CourthouseJail() },
  guernsey_ruts:       { kind: "passby", Comp: () => window.PB_GuernseyRuts() },
  willow_springs:      { kind: "passby", Comp: () => window.PB_WillowSprings() },
  ice_slough:          { kind: "passby", Comp: () => window.PB_IceSlough() },
  parting_of_the_ways: { kind: "passby", Comp: () => window.PB_PartingOfTheWays() },
  farewell_bend:       { kind: "passby", Comp: () => window.PB_FarewellBend() },
  blue_mountains:      { kind: "passby", Comp: () => window.PB_BlueMountains() },
  grande_ronde_valley: { kind: "passby", Comp: () => window.PB_GrandeRonde() },
  // ── start / end ─────────────────────────────────────────────────────────
  independence_mo:     { kind: "bookend", Comp: () => window.PB_IndependenceMO_Start() },
  oregon_city:         { kind: "bookend", Comp: () => window.PB_OregonCity_End() },
};

// Generic fallback for unknown ids — small parchment dot with question mark.
function FallbackIcon() {
  return (
    <g>
      <circle cx="12" cy="12" r="10" fill="#e8d9b8" stroke="#2a1a08" strokeWidth="0.8" />
      <text x="12" y="16" fontSize="10" fontFamily="Georgia, serif" textAnchor="middle"
            fill="#2a1a08">?</text>
    </g>
  );
}

function LandmarkIcon({ id, size = 24, className = "", style = {} }) {
  const entry = LANDMARK_ICON_MAP[id];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}
         className={className} style={{ display: "block", ...style }}>
      {entry ? entry.Comp() : <FallbackIcon />}
    </svg>
  );
}

window.LANDMARK_ICON_MAP = LANDMARK_ICON_MAP;
window.LandmarkIcon = LandmarkIcon;
