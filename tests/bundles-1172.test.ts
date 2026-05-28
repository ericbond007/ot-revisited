import { describe, it, expect } from 'vitest';
import { BUNDLES } from '$lib/game/content/bundles';
import { ITEMS } from '$lib/game/content/items';
import { OUTFITTER_BUYABLES } from '$lib/game/content/outfitter';

describe('#1172 bundle presets', () => {
  it('ships exactly the 5 designed bundles', () => {
    expect(BUNDLES.map((b) => b.id)).toEqual([
      'marcy_topup', 'palmer_generous', 'bryant_minimum', 'frontier_starter', 'hunter_pack'
    ]);
  });
  it('has unique ids', () => {
    const ids = BUNDLES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('every kit item exists in ITEMS and is buyable at the outfitter', () => {
    const buyable = new Set(OUTFITTER_BUYABLES);
    for (const b of BUNDLES) {
      for (const id of Object.keys(b.kit)) {
        expect(ITEMS[id], `${b.id} -> ${id} missing from ITEMS`).toBeDefined();
        expect(buyable.has(id), `${b.id} -> ${id} not in OUTFITTER_BUYABLES`).toBe(true);
        expect(b.kit[id], `${b.id} -> ${id} qty must be positive`).toBeGreaterThan(0);
      }
    }
  });
  it('carries no cost field (a-la-carte pricing, spec decision)', () => {
    for (const b of BUNDLES) {
      expect((b as unknown as Record<string, unknown>).cost).toBeUndefined();
    }
  });
  it('every tone is a known value', () => {
    const tones = new Set(['rust', 'good', 'warn', 'neutral']);
    for (const b of BUNDLES) expect(tones.has(b.tone)).toBe(true);
  });
});
