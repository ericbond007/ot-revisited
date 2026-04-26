// Per-post-kind cosmetic theming. Used by TradeModal + TownStage to
// accent the post header with a kind-specific color and glyph. Purely
// visual — gameplay math (stock list, prices, services) reads from
// the landmark itself.
//
// Accent values are bespoke shades not in the brand palette: each
// matches the post's historical flavor (Army navy, HBC dark green,
// mountain man rust, frontier orange, end-of-trail gold). If/when
// the brand expands its color set to cover these (#161), swap to
// tokens here in one place.

import type { PostKind } from '$lib/game/content/landmarks';
import { ICON } from './icon-dictionary';

export interface PostTheme {
  accent: string;
  glyph: string;
  tag: string;
}

// Glyphs come from ICON.post_kinds (#161); accent + tag are post-theme
// specific.
export const POST_THEME: Record<PostKind, PostTheme> = {
  us_army:      { accent: '#4a6a8c', glyph: ICON.post_kinds.us_army,      tag: 'U.S. Army post' },
  hbc:          { accent: '#1f5a3f', glyph: ICON.post_kinds.hbc,          tag: "Hudson's Bay Company" },
  mountain:     { accent: '#8a5a2a', glyph: ICON.post_kinds.mountain,     tag: 'Mountain outpost' },
  frontier:     { accent: '#b86a42', glyph: ICON.post_kinds.frontier,     tag: 'Frontier post' },
  end_of_trail: { accent: '#c9a05a', glyph: ICON.post_kinds.end_of_trail, tag: 'End of the trail' }
};
