// Tokens shared by every profession icon — the LI palette + the kind
// union. Mirrors landmark-icon-tokens.ts; both icon sets use the same
// LI palette by design (the bundles ship the palette identically). The
// duplication is deliberate — keeps each module self-contained, lets
// either palette drift without touching the other.

/** Watercolor palette, identical to the LI export in
 *  landmark-icon-tokens.ts. Inline these as hex strings inside SVG
 *  path data — CSS variable substitution doesn't work cleanly inside
 *  <svg> attrs rendered by SSR. */
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

/** Optional badge tone — when supplied to ProfessionIcon, the bespoke
 *  art renders inside a circular HybridBadge frame (warm/cool/gold).
 *  When null, the bare silhouette renders directly. Used at the
 *  PartyPanel avatar corner badge (small, 12 px) and ProfessionPicker
 *  grid (medium, 24 px) — caller decides per slot. */
export type ProfessionIconBadge = 'warm' | 'cool' | 'gold' | null;

/** Profession ids match `ICON.professions.X` keys in
 *  icon-dictionary.ts and `ProfessionId` in game/types. 13 in total —
 *  no fresh glyphs needed; the bundle covers every id. */
export type ProfessionIconKind =
  | 'banker'
  | 'farmer'
  | 'carpenter'
  | 'doctor'
  | 'blacksmith'
  | 'hunter'
  | 'teamster'
  | 'merchant'
  | 'whore'
  | 'scout'
  | 'preacher'
  | 'indian_trader'
  | 'gunsmith'
  | 'teacher'
  | 'lawyer';
