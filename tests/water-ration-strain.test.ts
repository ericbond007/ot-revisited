import { describe, it, expect } from 'vitest';
import { applyWaterRationStrain } from '../src/lib/game/systems/water-ration';
import type { GameState } from '../src/lib/game/types';

function st(waterRation: string, water: number, drycampDays = 0): GameState {
  return {
    waterRation, morale: 80,
    resources: { water, waterCap: 20 },
    party: [{ id: 'a', kind: 'adult', dead: false, health: 100, conditions: [] }],
    flags: drycampDays ? { _drycampDays: drycampDays } : {},
    eventLog: [], day: 50
  } as unknown as GameState;
}

describe('applyWaterRationStrain', () => {
  it('no strain on normal', () => {
    expect(applyWaterRationStrain(st('normal', 10)).morale).toBe(80);
  });
  it('conserve costs morale only', () => {
    const r = applyWaterRationStrain(st('conserve', 10));
    expect(r.morale).toBe(79);
    expect(r.party[0].health).toBe(100);
  });
  it('drycamp costs more morale, no HP for first 3 days', () => {
    const r = applyWaterRationStrain(st('drycamp', 10, 0));
    expect(r.morale).toBe(77);
    expect(r.party[0].health).toBe(100);
    expect(r.flags._drycampDays).toBe(1);
  });
  it('drycamp nicks HP after 3 consecutive days', () => {
    const r = applyWaterRationStrain(st('drycamp', 10, 3));
    expect(r.party[0].health).toBe(98);
  });
  it('does not strain when the keg is dry (dehydration owns it)', () => {
    const r = applyWaterRationStrain(st('drycamp', 0, 5));
    expect(r.morale).toBe(80);
    expect(r.party[0].health).toBe(100);
  });
  it('resets the drycamp counter when not drycamping', () => {
    const r = applyWaterRationStrain(st('conserve', 10, 4));
    expect(r.flags._drycampDays).toBeUndefined();
  });
});
