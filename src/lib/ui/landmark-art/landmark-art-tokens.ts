/**
 * landmark-art-tokens.ts
 * ──────────────────────
 * Illustration palette + viewport dimensions shared by every landmark art
 * component. These are NOT UI tokens — keep them out of theme.css. They're
 * the period palette specifically for landmark engravings/watercolors.
 *
 * Mirrors the JSX `LMK` constant in
 * docs/handoff/landmark-art/src/landmark-art-frame.jsx verbatim.
 *
 * `LandmarkId` uses the same snake_case ids as `LANDMARKS[].id` so a
 * single source of truth drives both map position and art dispatch. The
 * handoff used kebab-case (`'kansas-river'`); we re-mapped to our
 * existing convention rather than rename our LANDMARKS.
 */

export const LMK_VIEW_W = 480;
export const LMK_VIEW_H = 200;

/** Period palette — desaturated, warm. Used by all landmark art. */
export const LMK = {
  // sky / parchment grounds (per theme)
  parchment: '#e8d9b8',
  parchmentSh: '#cfbe98',
  paperWarm: '#f0deb6',
  paperCool: '#dfdfd0',
  paperGold: '#f5e4b6',
  // ink + earth
  ink: '#2a1a08',
  inkSoft: '#4a3320',
  earth: '#8a6a3a',
  earthDark: '#5a3a1a',
  earthLight: '#b89a6a',
  // greens
  sage: '#7a8458',
  sageDark: '#4a5638',
  sageLight: '#a3a878',
  // blues (sky / water)
  skyHi: '#cfd8d0',
  skyLo: '#e2d8b8',
  water: '#7a96a0',
  // accents
  rust: '#a83a18',
  brick: '#8a4a28',
  white: '#f0e6c8',
  redFlag: '#a8281a'
} as const;

export type LandmarkTone = 'warm' | 'cool' | 'gold';

/** Canonical id — matches `LANDMARKS[].id` in
 *  src/lib/game/content/landmarks.ts. Only landmarks that have a ported
 *  art component are listed here. Adding a new one is two lines: extend
 *  this union and add the row in `LandmarkArt.svelte`'s REGISTRY. */
export type LandmarkId =
  | 'independence'
  | 'kansas_river'
  | 'big_blue_river'
  | 'ft_kearny'
  | 'courthouse_rock'
  | 'chimney_rock'
  | 'scotts_bluff'
  | 'ft_laramie'
  | 'independence_rock'
  | 'devils_gate'
  | 'south_pass'
  | 'ft_bridger'
  | 'soda_springs'
  | 'ft_hall'
  | 'snake_three_island'
  | 'whitman_mission'
  | 'the_dalles'
  | 'barlow_road';
