import { describe, it, expect } from 'vitest';
import { generateTrain } from '../src/lib/game/content/trains';
import { personaToDoctrine } from '../src/lib/game/systems/company-rest';
import { makeRng } from '../src/lib/game/rng';

describe('#1046 C1 — generateTrain stamps a chartered doctrine', () => {
  it('every generated train has a doctrine in the valid set', () => {
    const t = generateTrain('seed-a', 1, null, makeRng('seed-a'), { fresh: true });
    expect(['hard_driver', 'prudent', 'devout']).toContain(t.doctrine);
  });
  it('doctrine matches the first companion persona via personaToDoctrine', () => {
    const t = generateTrain('seed-b', 1, null, makeRng('seed-b'), { fresh: true });
    expect(t.doctrine).toBe(personaToDoctrine(t.companions[0]?.personaId));
  });
  it('a no-companion train still has a valid doctrine (defaults prudent)', () => {
    const t = generateTrain('seed-c', 1, null, makeRng('seed-c'), { fresh: true });
    if (t.companions.length === 0) expect(t.doctrine).toBe('prudent');
    else expect(['hard_driver', 'prudent', 'devout']).toContain(t.doctrine);
  });
});
