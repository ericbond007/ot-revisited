import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/lib/game/rng';

describe('makeRng', () => {
  it('produces values in [0, 1)', () => {
    const rng = makeRng('seed-1');
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = makeRng('abc');
    const b = makeRng('abc');
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('diverges for different seeds', () => {
    const a = makeRng('one');
    const b = makeRng('two');
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('int(a, b) returns inclusive integers in range', () => {
    const rng = makeRng('r');
    const samples = Array.from({ length: 500 }, () => rng.int(3, 7));
    for (const n of samples) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
    }
    expect(new Set(samples)).toEqual(new Set([3, 4, 5, 6, 7]));
  });

  it('pick(arr) returns one of the elements', () => {
    const rng = makeRng('p');
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it('chance(p) returns true ~p of the time', () => {
    const rng = makeRng('c');
    let hits = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) if (rng.chance(0.3)) hits++;
    // loose bounds — deterministic but seed-specific
    expect(hits / n).toBeGreaterThan(0.25);
    expect(hits / n).toBeLessThan(0.35);
  });
});
