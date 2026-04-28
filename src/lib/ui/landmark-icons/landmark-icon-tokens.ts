// Tokens shared by every landmark icon — the LI palette + the id union.
// Mirror of the existing landmark-art-tokens.ts (which serves the
// 480×200 illustrations) but for the 24×24 watercolor pin icon set.
//
// Naming intentionally matches landmarks.ts ids (snake_case). Any
// landmark added to LANDMARKS must also get an entry here + an icon
// component, or the dispatcher's fallback "?" glyph renders.

/** Watercolor palette ported verbatim from the handoff bundle's
 *  icon-base.jsx. Inline these as hex strings inside SVG path data —
 *  CSS variable substitution doesn't work cleanly inside <svg> attrs
 *  rendered by SSR. */
export const LI = {
  ink:        '#2a1a08',
  inkSoft:    '#4a3320',
  rust:       '#a83a18',
  rustDark:   '#7a2a10',
  earth:      '#8a6a3a',
  earthLight: '#b89a6a',
  paperWarm:  '#f0deb6',
  parchment:  '#e8d9b8',
  parchCool:  '#dfe2d8',
  parchGold:  '#f5e4b6',
  sage:       '#7a8458',
  sageDark:   '#4a5a38',
  water:      '#7a96a0',
  waterDark:  '#5a7080',
  redFlag:    '#a8281a',
  navyFlag:   '#1a3a6a',
  greenFlag:  '#2a5a3a',
  white:      '#f0e6c8',
  brick:      '#8a4a28',
  brickDark:  '#5a2a18',
  goldFlag:   '#c9a04a',
  bone:       '#d8c8a0'
} as const;

/** HybridBadge tone — drives the parchment fill behind the bespoke art.
 *  warm: default emigrant trail; cool: river / HBC post; gold: trail
 *  start (Independence MO) / end (Oregon City). */
export type LandmarkIconTone = 'warm' | 'cool' | 'gold';

/** Snake-case landmark ids matching `LANDMARKS[].id` in landmarks.ts.
 *  Keep this union in lockstep with the LANDMARKS array. */
export type LandmarkIconId =
  // Stops — circular badge
  | 'hollenberg_ranch'
  | 'fort_kearny'
  | 'robidoux_post'
  | 'fort_laramie'
  | 'fort_bridger'
  | 'fort_hall'
  | 'fort_boise'
  | 'fort_walla_walla'
  | 'the_dalles'
  | 'whitman_mission'
  | 'barlow_road'
  // Rivers — circular badge, cool tone
  | 'kansas_river'
  | 'big_blue_river'
  | 'north_platte_east'
  | 'north_platte_west'
  | 'sweetwater_1'
  | 'green_river'
  | 'bear_river'
  | 'three_island_crossing'
  // Arrival landmarks — circular badge, warm tone
  | 'alcove_spring'
  | 'ash_hollow'
  | 'chimney_rock'
  | 'scotts_bluff'
  | 'register_cliff'
  | 'independence_rock'
  | 'devils_gate'
  | 'south_pass'
  | 'pacific_springs'
  | 'soda_springs'
  | 'laurel_hill'
  // Pass-by landmarks — bare silhouette
  | 'courthouse_jail_rocks'
  | 'guernsey_ruts'
  | 'willow_springs'
  | 'ice_slough'
  | 'parting_of_the_ways'
  | 'farewell_bend'
  | 'blue_mountains'
  | 'grande_ronde_valley'
  // Trail termini — gold-tone badge. `independence_mo` is the city
  // (Independence, MO — start of trail). Note: this is distinct from
  // `independence_rock` above (the Wyoming granite landmark).
  | 'independence_mo'
  | 'oregon_city';
