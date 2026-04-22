import { describe, it, expect } from 'vitest';
import { TEXT_POOLS, pickText, formatText } from '../src/lib/game/content/text-pools';
import { makeRng } from '../src/lib/game/rng';

describe('pickText', () => {
  it('throws on unknown key', () => {
    expect(() => pickText('nonexistent.key', makeRng('t'))).toThrow(/no entries/);
  });

  it('returns fallback when pool is missing and fallback given', () => {
    expect(pickText('nonexistent.key', makeRng('t'), 'fallback text')).toBe('fallback text');
  });

  it('is deterministic by seed (same rng → same variant)', () => {
    const tempKey = '__test__.det';
    (TEXT_POOLS as Record<string, readonly string[]>)[tempKey] = ['A', 'B', 'C', 'D'];
    try {
      const a = pickText(tempKey, makeRng('seed-1'));
      const b = pickText(tempKey, makeRng('seed-1'));
      expect(a).toBe(b);
    } finally {
      delete (TEXT_POOLS as Record<string, readonly string[]>)[tempKey];
    }
  });

  it('different seeds typically pick different variants across many rolls', () => {
    const tempKey = '__test__.spread';
    (TEXT_POOLS as Record<string, readonly string[]>)[tempKey] = ['A', 'B', 'C', 'D'];
    try {
      const seen = new Set<string>();
      for (let i = 0; i < 50; i++) seen.add(pickText(tempKey, makeRng(`s-${i}`)));
      expect(seen.size).toBeGreaterThan(1);
    } finally {
      delete (TEXT_POOLS as Record<string, readonly string[]>)[tempKey];
    }
  });
});

describe('formatText', () => {
  it('replaces {key} placeholders with values', () => {
    expect(formatText('Found {qty} lb of {item}.', { qty: 6, item: 'berries' }))
      .toBe('Found 6 lb of berries.');
  });

  it('renders missing keys as empty string', () => {
    expect(formatText('a {missing} z', {})).toBe('a  z');
  });

  it('handles repeat placeholders', () => {
    expect(formatText('{x} and {x}', { x: 'one' })).toBe('one and one');
  });
});
