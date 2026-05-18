import { describe, it, expect } from 'vitest';
import { DEBRIS_CATALOG, hash32, hashFloats } from '../src/lib/ui/wagon/terrain/debris-field';

describe('debris catalog', () => {
  it('has 21 sprites across 4 categories', () => {
    expect(DEBRIS_CATALOG).toHaveLength(21);
    const cats = new Set(DEBRIS_CATALOG.map((s) => s.category));
    expect([...cats].sort()).toEqual(['bones', 'graves', 'junk', 'natural']);
  });
  it('every sprite has a non-empty name and a size class', () => {
    for (const s of DEBRIS_CATALOG) {
      expect(s.name).toMatch(/^[a-z-]+$/);
      expect(['small', 'large']).toContain(s.size);
    }
  });
});

describe('hash', () => {
  it('hash32 is deterministic and uint32', () => {
    expect(hash32(42)).toBe(hash32(42));
    expect(hash32(42)).not.toBe(hash32(43));
    expect(hash32(42)).toBeGreaterThanOrEqual(0);
    expect(hash32(42)).toBeLessThan(2 ** 32);
  });
  it('hashFloats yields k deterministic values in [0,1)', () => {
    const a = hashFloats(7, 8);
    expect(a).toHaveLength(8);
    expect(a).toEqual(hashFloats(7, 8));
    for (const v of a) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
