// Sanity check: every trading post has a stock list, and every id in that
// list exists in both the item catalog and the price catalog. Catches typos
// and forgotten declarations as we add more posts.

import { describe, it, expect } from 'vitest';
import { LANDMARKS } from '../src/lib/game/content/landmarks';
import { ITEMS } from '../src/lib/game/content/items';
import { PRICES } from '../src/lib/game/content/prices';

describe('trading-post stock', () => {
  const posts = LANDMARKS.filter((l) => l.kind === 'trading_post');

  it('there is at least one trading post', () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  for (const post of posts) {
    it(`${post.id} declares a non-empty stock`, () => {
      expect(post.stock, `${post.id} missing stock`).toBeDefined();
      expect(post.stock!.length).toBeGreaterThan(0);
    });

    it(`${post.id} stock ids all exist in ITEMS + PRICES`, () => {
      for (const id of post.stock!) {
        expect(ITEMS[id], `${post.id}: ${id} not in ITEMS`).toBeDefined();
        expect(PRICES[id], `${post.id}: ${id} not in PRICES`).toBeDefined();
      }
    });
  }
});
