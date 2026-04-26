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
  ft_kearny: [760, 273],
  courthouse_rock: [625, 248],
  chimney_rock: [605, 244],
  ft_laramie: [565, 234],
  independence_rock: [470, 215],
  south_pass: [405, 200],
  ft_hall: [290, 162],
  ft_boise: [190, 140],
  the_dalles: [115, 115],
  oregon_city: [75, 80]
};
