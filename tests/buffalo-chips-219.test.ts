import { describe, it, expect } from 'vitest';
import { fuelFlavorFor } from '../src/lib/game/systems/fire';
import { getCampAction } from '../src/lib/game/actions/camp-actions';
import { createInitialState } from '../src/lib/game/engine';
import { makeRng } from '../src/lib/game/rng';
import type { GameState } from '../src/lib/game/types';

function newGame(terrain: GameState['location']['terrain']): GameState {
  const s = createInitialState({
    seed: 'fuel-test',
    leader: { name: 'Ezra', profession: 'farmer' },
    companions: [{ name: 'Mary', profession: 'doctor' }],
    startDate: { year: 1848, month: 4, day: 15 }
  });
  return { ...s, location: { ...s.location, terrain } };
}

describe('#219 buffalo chips / sage / firewood — terrain flavor', () => {
  it('prairie returns buffalo chips on the plains', () => {
    const f = fuelFlavorFor('prairie');
    expect(f.material).toBe('buffalo chips');
    expect(f.source).toBe('plains');
  });

  it('desert returns sage brush on sagebrush flats', () => {
    const f = fuelFlavorFor('desert');
    expect(f.material).toBe('sage brush');
    expect(f.source).toBe('sagebrush flats');
  });

  it('forest / mountains / river default to firewood', () => {
    expect(fuelFlavorFor('forest').material).toBe('firewood');
    expect(fuelFlavorFor('mountains').material).toBe('firewood');
    expect(fuelFlavorFor('river').material).toBe('firewood');
  });

  it('camp gather log says "buffalo chips" on prairie', () => {
    const s = newGame('prairie');
    const action = getCampAction('gather_firewood');
    const after = action.apply(s, makeRng('chips-1'));
    const last = after.eventLog[after.eventLog.length - 1].text;
    expect(last).toMatch(/buffalo chips/i);
    expect(last).toMatch(/plains/i);
    expect(after.resources.firewood).toBeGreaterThan(0);
  });

  it('camp gather log says "sage brush" in desert', () => {
    const s = newGame('desert');
    const action = getCampAction('gather_firewood');
    const after = action.apply(s, makeRng('sage-1'));
    const last = after.eventLog[after.eventLog.length - 1].text;
    expect(last).toMatch(/sage brush/i);
    expect(after.resources.firewood).toBeGreaterThan(0);
  });

  it('camp gather log says "firewood" in the forest', () => {
    const s = newGame('forest');
    const action = getCampAction('gather_firewood');
    const after = action.apply(s, makeRng('wood-1'));
    const last = after.eventLog[after.eventLog.length - 1].text;
    expect(last).toMatch(/firewood/i);
    expect(last).toMatch(/forest/i);
  });

  it('the action label is generic ("Gather fuel"), not terrain-specific', () => {
    // The label is static — flavor lives in the log line. This keeps
    // the action grid stable when the player skims their options.
    const action = getCampAction('gather_firewood');
    expect(action.label).toBe('Gather fuel');
  });

  it('resource bucket is still called firewood (mechanic unchanged)', () => {
    const s = newGame('prairie');
    const action = getCampAction('gather_firewood');
    const after = action.apply(s, makeRng('chips-2'));
    expect(after.resources.firewood).toBeGreaterThan(0);
    // Sanity: terrain didn't accidentally redirect to a new bucket.
    expect((after.resources as unknown as Record<string, number>).buffalo_chips).toBeUndefined();
  });
});
