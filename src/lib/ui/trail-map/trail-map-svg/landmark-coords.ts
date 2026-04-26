// Per-landmark `[x, y]` lookup in the trail-map's 1000×380 viewBox.
//
// Coords were lifted verbatim from TrailMapModal.svelte's hand-placed
// landmark transforms (originally from the design handoff at
// docs/handoff/trail-map/src/trail-snippet.html). They're the same
// coord system the modal already paints; consumers use this map +
// interpolatePosition() to drop the wagon glyph in the right spot for
// any cumulative-mile value.
//
// Only the modal's plotted landmarks have coords here — 11 of the 32
// LANDMARKS entries. interpolatePosition() handles the gaps by
// interpolating between adjacent *plotted* landmarks, so the wagon
// advances proportionally over un-plotted intermediates (e.g. through
// Ash Hollow / North Platte crossings between Ft. Kearny and
// Courthouse Rock).

/** Modal viewBox dimensions — exposed so consumers can build window
 *  crops in the same coord-space (e.g. the snippet camera). */
export const TRAIL_VIEWBOX_W = 1000;
export const TRAIL_VIEWBOX_H = 380;

export const LANDMARK_COORDS: Record<string, readonly [number, number]> = {
  independence: [920, 305],
  // Independence → Ft. Kearny segment
  kansas_river: [861, 295],
  hollenberg_ranch: [803, 282],
  ft_kearny: [760, 273],
  // Ft. Kearny → Courthouse (~250 mi) — ash_hollow as midpoint anchor
  ash_hollow: [702, 265],
  // Ft. Kearny → Ft. Laramie cluster (~540–660 mi). Tight grouping
  // because the trail bunches up here historically too.
  courthouse_rock: [625, 248],
  chimney_rock: [605, 244],
  scotts_bluff: [590, 232],
  robidoux_post: [585, 252],
  ft_laramie: [565, 234],
  // Ft. Laramie → South Pass
  independence_rock: [470, 215],
  devils_gate: [455, 222],
  south_pass: [405, 200],
  // South Pass → Ft. Hall
  parting_of_ways: [395, 197],
  green_river: [375, 190],
  ft_bridger: [355, 183],
  bear_river: [320, 172],
  soda_springs: [310, 166],
  ft_hall: [290, 162],
  // Ft. Hall → Ft. Boise
  snake_three_island: [236, 153],
  ft_boise: [190, 140],
  // Ft. Boise → Blue Mountains — farewell_bend midway
  farewell_bend: [168, 136],
  // Ft. Boise → The Dalles
  blue_mountains: [148, 132],
  grande_ronde: [138, 128],
  ft_walla_walla: [128, 122],
  the_dalles: [115, 115],
  // The Dalles → Oregon City
  laurel_hill: [96, 98],
  oregon_city: [75, 80]
};
