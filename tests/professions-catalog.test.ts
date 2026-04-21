import { describe, it, expect } from 'vitest';
import { PROFESSIONS, getProfession } from '../src/lib/game/content/professions';
import { ITEMS } from '../src/lib/game/content/items';
import type { ProfessionId } from '../src/lib/game/types';

const EXPECTED: ProfessionId[] = [
  'banker', 'farmer', 'carpenter', 'doctor', 'blacksmith', 'hunter',
  'teamster', 'merchant', 'whore', 'scout', 'preacher', 'indian_trader', 'gunsmith'
];

describe('profession catalog', () => {
  it('has all 13 professions', () => {
    const ids = Object.keys(PROFESSIONS).sort();
    expect(ids).toEqual([...EXPECTED].sort());
  });

  it('every profession has a display name + bonus summary', () => {
    for (const p of Object.values(PROFESSIONS)) {
      expect(p.name).toBeTruthy();
      expect(p.bonusSummary).toBeTruthy();
    }
  });

  it('every starter-gear key exists in the item catalog (or is cash)', () => {
    for (const p of Object.values(PROFESSIONS)) {
      for (const g of p.starterGear) {
        if (g.item === 'cash') continue;
        expect(ITEMS[g.item]).toBeDefined();
      }
    }
  });

  it('getProfession throws for unknown id', () => {
    // @ts-expect-error - wrong id
    expect(() => getProfession('astronaut')).toThrow();
  });

  it('Whore profession is female-only', () => {
    const w = getProfession('whore');
    expect(w.femaleOnly).toBe(true);
  });
});
