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

export interface PostTheme {
  accent: string;
  glyph: string;
  tag: string;
}

export const POST_THEME: Record<PostKind, PostTheme> = {
  us_army:      { accent: '#4a6a8c', glyph: '🎖️', tag: 'U.S. Army post' },
  hbc:          { accent: '#1f5a3f', glyph: '🦫', tag: "Hudson's Bay Company" },
  mountain:     { accent: '#8a5a2a', glyph: '⛰️', tag: 'Mountain outpost' },
  frontier:     { accent: '#b86a42', glyph: '🏪', tag: 'Frontier post' },
  end_of_trail: { accent: '#c9a05a', glyph: '✨', tag: 'End of the trail' }
};
