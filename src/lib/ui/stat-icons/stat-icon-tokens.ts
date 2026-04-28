// Tokens shared by every stat icon — the SI palette + the kind union.
// Mirror of landmark-icon-tokens.ts but for the 8 (+2 fresh) watercolor
// stat glyphs replacing emoji in the top-bar readout and party-row mini.
//
// Naming intentionally matches `ICON.stats.X` keys in icon-dictionary.ts.
// Adding a new stat means: extend StatIconKind, add the kind to
// StatIcon.svelte's REGISTRY, add the glyph component file.

/** Watercolor palette ported verbatim from the handoff bundle's
 *  stat-icons.jsx. Inline these as hex strings inside SVG path data —
 *  CSS variable substitution doesn't work cleanly inside <svg> attrs
 *  rendered by SSR. */
export const SI = {
  ink:        '#2a1a08',
  paperWarm:  '#efe4c8',
  parchment:  '#e8d9b8',
  rust:       '#c96a2a',
  rustDeep:   '#a85a3a',
  meat:       '#a85a3a',
  meatLight:  '#c96a2a',
  bone:       '#efe4c8',
  pied:       '#a85a3a',
  hide:       '#efe4c8',
  hornCream:  '#d8c49a',
  sun:        '#f0c658',
  woodAccent: '#8a3a1a',
  squeeze:    '#e8c89a',
  heart:      '#c94a2a',
  highlight:  '#f0deb6',
  sage:       '#7a8a4a',
  sageDeep:   '#5a6a3a',
  river:      '#4a8bc9',
  riverDeep:  '#2a5a8a',
  muzzle:     '#c0907a',
  pipedEar:   '#b8845a',
  // Brass for the leg / compass glyph (fresh in matching vocabulary).
  brass:      '#c9a04a',
  brassDeep:  '#8a6a3a',
  // Cloud body for the weather glyph (fresh in matching vocabulary).
  cloud:      '#e8e2d4',
  cloudShade: '#b8a87a'
} as const;

/** Kind keys match `ICON.stats.X` in icon-dictionary.ts (10 stats).
 *  The bundle provides 8 (day/date/pace/rations/morale/health/cash/water);
 *  `leg` and `weather` are drawn fresh in matching vocabulary because
 *  they were added after the handoff was authored. */
export type StatIconKind =
  | 'day'
  | 'date'
  | 'pace'
  | 'rations'
  | 'morale'
  | 'health'
  | 'cash'
  | 'water'
  | 'leg'      // fresh — compass-style for "leg of the trail"
  | 'weather'; // fresh — sun-behind-cloud for current weather state
